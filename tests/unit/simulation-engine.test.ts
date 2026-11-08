import { describe, expect, it } from "vitest";
import { apply, availableActions, finalScore, isComplete, SimulationError, start } from "@/lib/simulation/engine";
import { hardwareTroubleshooting as scenario } from "@/lib/simulation/scenarios/hardware-troubleshooting";
import type { SimulationState } from "@/lib/simulation/types";

// faults[seed % 3]: 0 = FAULTY_RAM, 1 = FAILING_PSU, 2 = CPU_OVERHEATING
const RAM_SEED = 300;
const PSU_SEED = 301;
const CPU_SEED = 302;

/** Applies a list of action ids in order and returns the final state. */
function play(seed: number, actionIds: string[]): SimulationState {
  let state = start(scenario, seed);
  for (const actionId of actionIds) {
    state = apply(scenario, state, actionId).state;
  }
  return state;
}

function lockedIds(state: SimulationState): string[] {
  return availableActions(scenario, state)
    .filter((action) => action.locked)
    .map((action) => action.id);
}

describe("start", () => {
  it("picks the fault from the seed: faults[seed % faults.length]", () => {
    expect(start(scenario, RAM_SEED).faultId).toBe("FAULTY_RAM");
    expect(start(scenario, PSU_SEED).faultId).toBe("FAILING_PSU");
    expect(start(scenario, CPU_SEED).faultId).toBe("CPU_OVERHEATING");
  });

  it("gives the same fault for the same seed every time", () => {
    for (const seed of [0, 7, 12345, 2_000_000_011]) {
      expect(start(scenario, seed).faultId).toBe(start(scenario, seed).faultId);
    }
  });

  it("starts at full score with nothing done", () => {
    const state = start(scenario, RAM_SEED);
    expect(state).toMatchObject({ step: 0, score: 100, flags: [], decisions: [], status: "IN_PROGRESS", bonus: 0 });
    expect(isComplete(state)).toBe(false);
  });
});

describe("expert paths", () => {
  it.each([
    ["FAULTY_RAM", RAM_SEED],
    ["FAILING_PSU", PSU_SEED],
    ["CPU_OVERHEATING", CPU_SEED],
  ])("the optimal path for %s completes with a score of at least 90", (faultId, seed) => {
    const fault = scenario.faults.find((f) => f.id === faultId)!;
    const state = play(seed, fault.expertPath);
    expect(isComplete(state)).toBe(true);
    expect(finalScore(state)).toBeGreaterThanOrEqual(90);
    expect(state.decisions.every((decision) => decision.correct)).toBe(true);
  });

  it("awards the efficiency bonus when solved in 6 actions or fewer, without exceeding 100", () => {
    // Lucky guess (-10) then the bonus (+10) brings the score back to 100.
    const state = play(PSU_SEED, ["unplug", "ground", "replace_psu"]);
    expect(isComplete(state)).toBe(true);
    expect(state.bonus).toBe(10);
    expect(finalScore(state)).toBe(100);
  });

  it("does not award the bonus after more than 6 actions", () => {
    const state = play(CPU_SEED, ["check_power_led", "listen_beeps", "check_outlet", ...scenario.faults[2].expertPath]);
    expect(state.step).toBe(8);
    expect(state.bonus).toBe(0);
    expect(finalScore(state)).toBe(100);
  });
});

describe("safety", () => {
  it("a repair before unplugging and grounding costs 15 points and sets static_risk", () => {
    const before = play(RAM_SEED, ["listen_beeps"]);
    const result = apply(scenario, before, "reseat_ram");
    expect(result.scoreDelta).toBe(-15);
    expect(result.correct).toBe(false);
    expect(result.state.flags).toContain("static_risk");
    expect(result.feedback).toMatch(/static/i);
    expect(result.state.score).toBe(85);
  });

  it("the same repair after both safety steps has no penalty", () => {
    const before = play(RAM_SEED, ["listen_beeps", "unplug", "ground"]);
    const result = apply(scenario, before, "reseat_ram");
    expect(result.scoreDelta).toBe(0);
    expect(result.state.flags).not.toContain("static_risk");
  });

  it("only one of the two safety steps is not enough", () => {
    const before = play(PSU_SEED, ["unplug"]);
    expect(apply(scenario, before, "replace_psu").state.flags).toContain("static_risk");
  });
});

describe("unlocking", () => {
  it("hearing the beep code unlocks 'Reseat the RAM' (RAM fault)", () => {
    const initial = start(scenario, RAM_SEED);
    expect(lockedIds(initial)).toContain("reseat_ram");
    const after = apply(scenario, initial, "listen_beeps").state;
    expect(lockedIds(after)).not.toContain("reseat_ram");
  });

  it("listening for beeps does not unlock RAM actions when memory is fine", () => {
    const after = play(PSU_SEED, ["listen_beeps"]);
    expect(lockedIds(after)).toContain("reseat_ram");
  });

  it("high BIOS temperatures unlock 'Inspect the CPU heatsink' (CPU fault)", () => {
    const initial = start(scenario, CPU_SEED);
    expect(lockedIds(initial)).toContain("inspect_heatsink");
    expect(lockedIds(apply(scenario, initial, "bios_temps").state)).not.toContain("inspect_heatsink");
  });

  it("the PSU tester confirms the PSU fault with evidence", () => {
    const result = apply(scenario, start(scenario, PSU_SEED), "psu_tester");
    expect(result.state.flags).toContain("psu_confirmed");
    expect(result.feedback).toMatch(/12V/);
  });

  it("reports locked actions with their hint", () => {
    const reseat = availableActions(scenario, start(scenario, RAM_SEED)).find((a) => a.id === "reseat_ram");
    expect(reseat).toMatchObject({ locked: true, lockHint: expect.any(String) });
  });
});

describe("rejections", () => {
  it("rejects a locked action with a typed error", () => {
    expect(() => apply(scenario, start(scenario, RAM_SEED), "reseat_ram")).toThrowError(SimulationError);
    try {
      apply(scenario, start(scenario, RAM_SEED), "reseat_ram");
    } catch (error) {
      expect((error as SimulationError).code).toBe("ACTION_LOCKED");
    }
  });

  it("rejects an unknown action", () => {
    expect(() => apply(scenario, start(scenario, RAM_SEED), "kick_the_case")).toThrowError(
      expect.objectContaining({ code: "UNKNOWN_ACTION" }),
    );
  });

  it("rejects any action once the attempt is complete", () => {
    const done = play(PSU_SEED, scenario.faults[1].expertPath);
    expect(() => apply(scenario, done, "check_outlet")).toThrowError(expect.objectContaining({ code: "ATTEMPT_COMPLETE" }));
  });
});

describe("scoring rules", () => {
  it("a redundant investigation costs 3 points", () => {
    const once = play(CPU_SEED, ["check_power_led"]);
    const again = apply(scenario, once, "check_power_led");
    expect(again.scoreDelta).toBe(-3);
    expect(again.correct).toBe(false);
    expect(again.state.score).toBe(97);
  });

  it("the first investigation is free", () => {
    expect(apply(scenario, start(scenario, CPU_SEED), "check_power_led").scoreDelta).toBe(0);
  });

  it("a wrong diagnosis costs 15 points with fault-specific feedback, and the learner continues", () => {
    const result = apply(scenario, start(scenario, RAM_SEED), "diagnose_psu");
    expect(result.scoreDelta).toBe(-15);
    expect(result.feedback).toMatch(/the beep pattern points to memory, not power/i);
    expect(isComplete(result.state)).toBe(false);
  });

  it("a correct diagnosis is free and does not end the attempt", () => {
    const result = apply(scenario, start(scenario, CPU_SEED), "diagnose_cpu");
    expect(result.scoreDelta).toBe(0);
    expect(result.correct).toBe(true);
    expect(isComplete(result.state)).toBe(false);
  });

  it("replacing a part without evidence costs points and the problem persists", () => {
    const result = apply(scenario, play(RAM_SEED, ["unplug", "ground"]), "replace_motherboard");
    expect(result.scoreDelta).toBe(-20);
    expect(result.feedback).toMatch(/persists/);
    expect(isComplete(result.state)).toBe(false);
  });

  it("the right part on a lucky guess fixes the fault but costs 10 points", () => {
    const result = apply(scenario, play(PSU_SEED, ["unplug", "ground"]), "replace_psu");
    expect(result.scoreDelta).toBe(-10);
    expect(isComplete(result.state)).toBe(true);
  });

  it("clamps the score at 0", () => {
    const state = play(RAM_SEED, Array(8).fill("replace_motherboard"));
    expect(state.score).toBe(0);
    expect(finalScore(state)).toBe(0);
  });

  it("never goes above 100", () => {
    const state = play(RAM_SEED, scenario.faults[0].expertPath);
    expect(state.score).toBeLessThanOrEqual(100);
  });
});

describe("decision log and purity", () => {
  it("logs every decision with step, action, delta, correctness and feedback", () => {
    const state = play(RAM_SEED, ["listen_beeps", "diagnose_psu"]);
    expect(state.decisions).toEqual([
      expect.objectContaining({ step: 1, actionId: "listen_beeps", scoreDelta: 0, correct: true, feedback: expect.any(String) }),
      expect.objectContaining({ step: 2, actionId: "diagnose_psu", scoreDelta: -15, correct: false }),
    ]);
  });

  it("never mutates the state it is given", () => {
    const initial = start(scenario, RAM_SEED);
    const snapshot = JSON.stringify(initial);
    apply(scenario, initial, "listen_beeps");
    apply(scenario, initial, "diagnose_cpu");
    expect(JSON.stringify(initial)).toBe(snapshot);
  });

  it("returns a new state object every time", () => {
    const initial = start(scenario, RAM_SEED);
    const next = apply(scenario, initial, "listen_beeps").state;
    expect(next).not.toBe(initial);
    expect(next.flags).not.toBe(initial.flags);
    expect(next.decisions).not.toBe(initial.decisions);
  });
});
