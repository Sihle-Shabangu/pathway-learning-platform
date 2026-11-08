import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hardwareTroubleshooting as scenario } from "@/lib/simulation/scenarios/hardware-troubleshooting";
import type { SimulationState } from "@/lib/simulation/types";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { applyAction, getAttemptView, startOrResume, type SimulationView } from "@/server/services/simulation.service";
import { createFixtures } from "./helpers/fixtures";

/** Things that would give the answer away if they reached the browser early. */
function secretsFor(faultId: string): string[] {
  const fault = scenario.faults.find((f) => f.id === faultId)!;
  return [fault.id, fault.name, fault.explanation];
}

async function storedState(attemptId: string): Promise<SimulationState> {
  const row = await prisma.simulationAttempt.findUniqueOrThrow({ where: { id: attemptId } });
  return row.state as unknown as SimulationState;
}

describe("simulation.service", () => {
  const fixtures = createFixtures();
  let learner: { id: string };
  let otherLearner: { id: string };
  let assignmentId: string;

  beforeAll(async () => {
    const admin = await fixtures.user({ role: "ADMIN", cohort: null });
    learner = await fixtures.user();
    otherLearner = await fixtures.user();
    const activity = await fixtures.activity(admin.id);
    assignmentId = (await fixtures.assignment(activity.id, learner.id)).id;
  });

  afterAll(async () => {
    await fixtures.cleanup();
  });

  it("starts an attempt with a server-generated seed and marks the assignment in progress", async () => {
    const view = await startOrResume(learner, assignmentId);
    expect(view.status).toBe("IN_PROGRESS");
    expect(view.step).toBe(0);
    expect(view.score).toBe(100);

    const row = await prisma.simulationAttempt.findUniqueOrThrow({ where: { id: view.attemptId } });
    expect(row.seed).toBe((row.state as unknown as SimulationState).seed);
    const assignment = await prisma.assignment.findUniqueOrThrow({ where: { id: assignmentId } });
    expect(assignment.status).toBe("IN_PROGRESS");
  });

  it("resuming returns the same attempt instead of creating a new one", async () => {
    const first = await startOrResume(learner, assignmentId);
    const second = await startOrResume(learner, assignmentId);
    expect(second.attemptId).toBe(first.attemptId);
    expect(await prisma.simulationAttempt.count({ where: { assignmentId } })).toBe(1);
  });

  it("persists state after every action, so a reload continues where it left off", async () => {
    const { attemptId } = await startOrResume(learner, assignmentId);
    const response = await applyAction(learner, attemptId, { actionId: "check_outlet", expectedStep: 0 });
    expect(response.view.step).toBe(1);

    const reloaded = await getAttemptView(learner, attemptId);
    expect(reloaded.step).toBe(1);
    expect(reloaded.decisions[0].actionId).toBe("check_outlet");
  });

  it("rejects a duplicate submission of the same step with 409", async () => {
    const { attemptId, step } = await startOrResume(learner, assignmentId);
    await applyAction(learner, attemptId, { actionId: "check_power_led", expectedStep: step });
    const duplicate = applyAction(learner, attemptId, { actionId: "check_power_led", expectedStep: step });
    await expect(duplicate).rejects.toBeInstanceOf(AppError);
    await expect(duplicate).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    expect((await storedState(attemptId)).step).toBe(step + 1); // the duplicate changed nothing
  });

  it("rejects concurrent submissions of the same step: exactly one wins", async () => {
    const { attemptId, step } = await startOrResume(learner, assignmentId);
    const results = await Promise.allSettled([
      applyAction(learner, attemptId, { actionId: "listen_beeps", expectedStep: step }),
      applyAction(learner, attemptId, { actionId: "listen_beeps", expectedStep: step }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect((await storedState(attemptId)).step).toBe(step + 1);
  });

  it("a learner cannot read or act on another learner's attempt (404)", async () => {
    const { attemptId, step } = await startOrResume(learner, assignmentId);
    await expect(getAttemptView(otherLearner, attemptId)).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    await expect(
      applyAction(otherLearner, attemptId, { actionId: "check_outlet", expectedStep: step }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(startOrResume(otherLearner, assignmentId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects locked and unknown actions with a 400", async () => {
    const { attemptId, step } = await startOrResume(learner, assignmentId);
    await expect(
      applyAction(learner, attemptId, { actionId: "launch_rocket", expectedStep: step }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("never includes the fault in responses before completion, then reveals it after", async () => {
    let view: SimulationView = await startOrResume(learner, assignmentId);
    const { faultId } = await storedState(view.attemptId);
    const secrets = secretsFor(faultId);

    const assertHidden = (payload: unknown) => {
      const json = JSON.stringify(payload);
      for (const secret of secrets) expect(json).not.toContain(secret);
    };
    assertHidden(view);
    assertHidden(await getAttemptView(learner, view.attemptId));
    expect(view.result).toBeNull();

    // Play the expert path for whichever fault the server picked.
    const expertPath = scenario.faults.find((f) => f.id === faultId)!.expertPath;
    for (const actionId of expertPath) {
      const response = await applyAction(learner, view.attemptId, { actionId, expectedStep: view.step });
      view = response.view;
      if (view.status !== "COMPLETED") assertHidden(response);
    }

    expect(view.status).toBe("COMPLETED");
    expect(view.result?.faultId).toBe(faultId);
    expect(view.result?.expertPath.length).toBeGreaterThan(0);

    const attempt = await prisma.simulationAttempt.findUniqueOrThrow({ where: { id: view.attemptId } });
    expect(attempt.completedAt).not.toBeNull();
    expect(attempt.score).toBe(view.score);
    const assignment = await prisma.assignment.findUniqueOrThrow({ where: { id: assignmentId } });
    expect(assignment.status).toBe("COMPLETED");
    expect(assignment.completedAt).not.toBeNull();

    const completedAudit = await prisma.auditLog.findFirst({
      where: { entityId: view.attemptId, action: "simulation.completed" },
    });
    expect(completedAudit).not.toBeNull();
  });

  it("refuses further actions on a completed attempt with 409", async () => {
    const view = await startOrResume(learner, assignmentId); // returns the completed attempt for review
    expect(view.status).toBe("COMPLETED");
    await expect(
      applyAction(learner, view.attemptId, { actionId: "check_outlet", expectedStep: view.step }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
