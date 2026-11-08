/**
 * Idempotent seed: safe to run any number of times.
 * - Users are upserted by email (password refreshed from SEED_PASSWORD).
 * - The activity is found by scenarioKey or created.
 * - Assignments are upserted on (activityId, learnerId).
 * - Attempts and their audit entries are only created for assignments that have no attempts yet,
 *   so re-running never duplicates history or wipes real learner progress.
 *
 * Run with: npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import type { AssignmentStatus, Prisma } from "../src/generated/prisma/client";
import { prisma } from "../src/server/db";
import type { ActionGroup, Decision, SimulationState } from "../src/lib/simulation/types";

const SCENARIO_KEY = "hardware-troubleshooting";
const FAULTS = ["FAULTY_RAM", "FAILING_PSU", "CPU_OVERHEATING"] as const; // same order as the scenario
type FaultId = (typeof FAULTS)[number];

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number, hour = 10) => {
  const date = new Date(Date.now() - days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date;
};

// Picks a seed whose fault (seed % 3) matches the one we want, like the engine does.
const seedFor = (fault: FaultId, base: number) => base * FAULTS.length + FAULTS.indexOf(fault);

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------
const ADMIN = { name: "Thandi Naidoo", email: "admin@pathway.test" };

type LearnerSeed = { name: string; email: string; cohort: string; active: boolean };
const LEARNERS: LearnerSeed[] = [
  { name: "Lerato Mokoena", email: "lerato@pathway.test", cohort: "2025-A", active: true },
  { name: "Thabo Mthembu", email: "thabo@pathway.test", cohort: "2025-A", active: true },
  { name: "Sipho Ndlovu", email: "sipho@pathway.test", cohort: "2025-A", active: true },
  { name: "Ayesha Patel", email: "ayesha@pathway.test", cohort: "2025-A", active: true },
  { name: "Kagiso Dlamini", email: "kagiso@pathway.test", cohort: "2025-A", active: true },
  { name: "Pieter van Wyk", email: "pieter@pathway.test", cohort: "2025-A", active: false },
  { name: "Zanele Khumalo", email: "zanele@pathway.test", cohort: "2025-B", active: true },
  { name: "Brandon Pillay", email: "brandon@pathway.test", cohort: "2025-B", active: true },
  { name: "Nomsa Zulu", email: "nomsa@pathway.test", cohort: "2025-B", active: true },
  { name: "Ethan Botha", email: "ethan@pathway.test", cohort: "2025-B", active: true },
  { name: "Fatima Adams", email: "fatima@pathway.test", cohort: "2025-B", active: true },
  { name: "Lindiwe Sithole", email: "lindiwe@pathway.test", cohort: "2025-B", active: false },
];

// ---------------------------------------------------------------------------
// Decision histories. Each step is [actionId, label, group, scoreDelta, correct, feedback, flags?].
// ---------------------------------------------------------------------------
type Step = [string, string, ActionGroup, number, boolean, string, string[]?];

type AttemptSeed = {
  fault: FaultId;
  seedBase: number;
  steps: Step[];
  bonus?: number; // efficiency bonus applied on completion
  completed: boolean;
};

const RAM_EXPERT: AttemptSeed = {
  fault: "FAULTY_RAM",
  seedBase: 1401,
  completed: true,
  bonus: 10,
  steps: [
    ["listen_beeps", "Listen for beep codes", "investigate", 0, true, "Three short beeps repeating: the motherboard is reporting a memory error.", ["heard_beep_code"]],
    ["unplug", "Unplug the power cable", "safety", 0, true, "Power disconnected. Wait a few seconds for the capacitors to drain.", ["unplugged"]],
    ["ground", "Ground yourself", "safety", 0, true, "Anti-static strap attached to the bare chassis.", ["grounded"]],
    ["reseat_ram", "Reseat the RAM", "repair", 0, true, "Both modules reseated firmly. The beep code continues, so one module is likely faulty.", ["ram_reseated"]],
    ["run_memory_test", "Test one RAM stick at a time", "investigate", 0, true, "With only the slot B module installed the beeps return. The slot A module boots cleanly.", ["bad_module_found"]],
    ["replace_ram", "Replace the faulty RAM module", "repair", 0, true, "New module installed. The workstation passes POST and shows a display. Fault fixed."],
  ],
};

const PSU_WITH_MISTAKES: AttemptSeed = {
  fault: "FAILING_PSU",
  seedBase: 2207,
  completed: true,
  steps: [
    ["check_power_led", "Check the power LED", "investigate", 0, true, "The power LED flickers, then goes dark. Power delivery is unstable."],
    // Two penalties on one action: no safety precautions (-15) and an unjustified part swap (-15).
    ["replace_motherboard", "Replace the motherboard", "repair", -30, false, "Unsafe: you worked inside a powered case without grounding. Static can destroy components. You also swapped an expensive part without evidence: the machine still shuts down at random.", ["static_risk"]],
    ["check_outlet", "Check the outlet and cable", "investigate", 0, true, "Outlet and cable test fine with another device. The problem is inside the PC."],
    ["unplug", "Unplug the power cable", "safety", 0, true, "Power disconnected.", ["unplugged"]],
    ["ground", "Ground yourself", "safety", 0, true, "Anti-static strap attached.", ["grounded"]],
    ["psu_tester", "Use a PSU tester", "investigate", 0, true, "The 12V rail reads 10.9V, well outside tolerance. The PSU is failing.", ["psu_confirmed"]],
    ["replace_psu", "Replace the PSU", "repair", 0, true, "New PSU installed. Stable power, no more shutdowns. Fault fixed."],
  ],
};

const CPU_WRONG_DIAGNOSIS: AttemptSeed = {
  fault: "CPU_OVERHEATING",
  seedBase: 3302,
  completed: true,
  steps: [
    ["bios_temps", "Open BIOS temperatures", "investigate", 0, true, "CPU reads 96°C within minutes of booting. That is far too hot.", ["high_cpu_temp"]],
    ["diagnose_psu", "Diagnose: failing PSU", "diagnose", -15, false, "Not quite. The temperature readings point to cooling, not power."],
    ["listen_beeps", "Listen for beep codes", "investigate", 0, true, "A single short beep: POST completes normally."],
    ["unplug", "Unplug the power cable", "safety", 0, true, "Power disconnected.", ["unplugged"]],
    ["ground", "Ground yourself", "safety", 0, true, "Anti-static strap attached.", ["grounded"]],
    ["inspect_heatsink", "Inspect the heatsink", "investigate", 0, true, "Heatsink fins are packed with dust and the thermal paste has dried out.", ["heatsink_dirty"]],
    ["reapply_paste", "Clean dust and reapply thermal paste", "repair", 0, true, "Cleaned and re-pasted. Temperatures settle around 45°C under load. Fault fixed."],
  ],
};

const RAM_SKIPPED_SAFETY: AttemptSeed = {
  fault: "FAULTY_RAM",
  seedBase: 4105,
  completed: true,
  steps: [
    ["check_power_led", "Check the power LED", "investigate", 0, true, "The power LED is on and the fans spin. Power is reaching the board."],
    ["listen_beeps", "Listen for beep codes", "investigate", 0, true, "Three short beeps repeating: a memory error code.", ["heard_beep_code"]],
    ["listen_beeps", "Listen for beep codes", "investigate", -3, false, "You already heard this beep pattern. Repeating the check adds no new information."],
    ["reseat_ram", "Reseat the RAM", "repair", -15, false, "Unsafe: the PC is still plugged in and you aren't grounded. Static can destroy memory.", ["static_risk", "ram_reseated"]],
    ["run_memory_test", "Test one RAM stick at a time", "investigate", 0, true, "The slot B module fails on its own.", ["bad_module_found"]],
    ["replace_ram", "Replace the faulty RAM module", "repair", -15, false, "Unsafe: still not unplugged and grounded. The new module works, but you took a real risk. Fault fixed."],
  ],
};

const PSU_EXPERT: AttemptSeed = {
  fault: "FAILING_PSU",
  seedBase: 5011,
  completed: true,
  bonus: 10,
  steps: [
    ["check_outlet", "Check the outlet and cable", "investigate", 0, true, "Outlet and cable are fine. The fault is inside the PC."],
    ["unplug", "Unplug the power cable", "safety", 0, true, "Power disconnected.", ["unplugged"]],
    ["ground", "Ground yourself", "safety", 0, true, "Anti-static strap attached.", ["grounded"]],
    ["psu_tester", "Use a PSU tester", "investigate", 0, true, "The 12V rail reads 10.9V, well outside tolerance.", ["psu_confirmed"]],
    ["replace_psu", "Replace the PSU", "repair", 0, true, "New PSU installed. Stable power. Fault fixed."],
  ],
};

const CPU_IN_PROGRESS: AttemptSeed = {
  fault: "CPU_OVERHEATING",
  seedBase: 6120,
  completed: false,
  steps: [
    ["check_power_led", "Check the power LED", "investigate", 0, true, "The power LED is on. The PC boots, then switches off after a few minutes."],
    ["bios_temps", "Open BIOS temperatures", "investigate", 0, true, "CPU reads 94°C shortly after boot. That is far too hot.", ["high_cpu_temp"]],
  ],
};

const RAM_IN_PROGRESS: AttemptSeed = {
  fault: "FAULTY_RAM",
  seedBase: 7003,
  completed: false,
  steps: [
    ["listen_beeps", "Listen for beep codes", "investigate", 0, true, "Three short beeps repeating: a memory error code.", ["heard_beep_code"]],
  ],
};

const PSU_IN_PROGRESS: AttemptSeed = {
  fault: "FAILING_PSU",
  seedBase: 8044,
  completed: false,
  steps: [
    ["check_outlet", "Check the outlet and cable", "investigate", 0, true, "Outlet and cable are fine. The fault is inside the PC."],
    ["unplug", "Unplug the power cable", "safety", 0, true, "Power disconnected.", ["unplugged"]],
  ],
};

function buildState(attempt: AttemptSeed): SimulationState {
  const steps = attempt.steps;
  const flags = new Set<string>();
  let score = 100;
  const decisions: Decision[] = steps.map((step, index) => {
    const [actionId, actionLabel, group, scoreDelta, correct, feedback, setsFlags] = step;
    score = Math.max(0, Math.min(100, score + scoreDelta));
    setsFlags?.forEach((flag) => flags.add(flag));
    return { step: index + 1, actionId, actionLabel, group, scoreDelta, correct, feedback };
  });
  if (attempt.completed && attempt.bonus) {
    score = Math.min(100, score + attempt.bonus);
  }
  return {
    scenarioKey: SCENARIO_KEY,
    seed: seedFor(attempt.fault, attempt.seedBase),
    faultId: attempt.fault,
    step: decisions.length,
    score,
    flags: [...flags],
    performedActionIds: decisions.map((d) => d.actionId),
    decisions,
    status: attempt.completed ? "COMPLETED" : "IN_PROGRESS",
  };
}

// ---------------------------------------------------------------------------
// Who gets what
// ---------------------------------------------------------------------------
type AssignmentPlan = {
  email: string;
  status: AssignmentStatus;
  assignedDaysAgo: number;
  dueInDays: number | null; // negative = overdue
  attempt?: AttemptSeed;
  completedDaysAgo?: number;
};

const PLAN: AssignmentPlan[] = [
  { email: "lerato@pathway.test", status: "IN_PROGRESS", assignedDaysAgo: 20, dueInDays: 5, attempt: CPU_IN_PROGRESS },
  { email: "thabo@pathway.test", status: "COMPLETED", assignedDaysAgo: 28, dueInDays: -10, attempt: RAM_EXPERT, completedDaysAgo: 24 },
  { email: "sipho@pathway.test", status: "COMPLETED", assignedDaysAgo: 28, dueInDays: -10, attempt: PSU_WITH_MISTAKES, completedDaysAgo: 18 },
  { email: "ayesha@pathway.test", status: "COMPLETED", assignedDaysAgo: 21, dueInDays: 3, attempt: PSU_EXPERT, completedDaysAgo: 9 },
  { email: "kagiso@pathway.test", status: "NOT_STARTED", assignedDaysAgo: 21, dueInDays: -4 },
  { email: "pieter@pathway.test", status: "NOT_STARTED", assignedDaysAgo: 21, dueInDays: -4 },
  { email: "zanele@pathway.test", status: "IN_PROGRESS", assignedDaysAgo: 14, dueInDays: -2, attempt: RAM_IN_PROGRESS },
  { email: "brandon@pathway.test", status: "NOT_STARTED", assignedDaysAgo: 14, dueInDays: -1 },
  { email: "nomsa@pathway.test", status: "COMPLETED", assignedDaysAgo: 14, dueInDays: 7, attempt: CPU_WRONG_DIAGNOSIS, completedDaysAgo: 6 },
  { email: "ethan@pathway.test", status: "COMPLETED", assignedDaysAgo: 14, dueInDays: 7, attempt: RAM_SKIPPED_SAFETY, completedDaysAgo: 2 },
  { email: "fatima@pathway.test", status: "IN_PROGRESS", assignedDaysAgo: 7, dueInDays: 10, attempt: PSU_IN_PROGRESS },
  { email: "lindiwe@pathway.test", status: "NOT_STARTED", assignedDaysAgo: 7, dueInDays: null },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("SEED_PASSWORD must be set in .env and be at least 8 characters.");
  }
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: { passwordHash, role: "ADMIN", status: "ACTIVE" },
    create: { ...ADMIN, passwordHash, role: "ADMIN", status: "ACTIVE", createdAt: daysAgo(60) },
  });

  const learnerIdByEmail = new Map<string, string>();
  for (const [index, learner] of LEARNERS.entries()) {
    const status = learner.active ? "ACTIVE" : "INACTIVE";
    const user = await prisma.user.upsert({
      where: { email: learner.email },
      update: { passwordHash },
      create: {
        name: learner.name,
        email: learner.email,
        cohort: learner.cohort,
        role: "LEARNER",
        status,
        passwordHash,
        createdAt: daysAgo(45 - index),
        lastActiveAt: learner.active ? daysAgo(index % 5) : daysAgo(30),
      },
    });
    learnerIdByEmail.set(learner.email, user.id);
  }

  let activity = await prisma.activity.findFirst({ where: { scenarioKey: SCENARIO_KEY } });
  if (!activity) {
    activity = await prisma.activity.create({
      data: {
        title: "Diagnose the dead workstation",
        description:
          "A lab workstation won't work properly. Investigate the symptoms safely, find the hidden hardware fault and repair it.",
        type: "SIMULATION",
        scenarioKey: SCENARIO_KEY,
        estimatedMinutes: 20,
        createdById: admin.id,
        createdAt: daysAgo(30),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "activity.created",
        entityType: "Activity",
        entityId: activity.id,
        metadata: { title: activity.title },
        createdAt: daysAgo(30),
      },
    });
  }

  let attemptsCreated = 0;
  for (const plan of PLAN) {
    const learnerId = learnerIdByEmail.get(plan.email)!;
    const assignedAt = daysAgo(plan.assignedDaysAgo, 9);
    const dueDate = plan.dueInDays === null ? null : daysAgo(-plan.dueInDays, 17);
    const completedAt = plan.completedDaysAgo !== undefined ? daysAgo(plan.completedDaysAgo, 14) : null;

    const existing = await prisma.assignment.findUnique({
      where: { activityId_learnerId: { activityId: activity.id, learnerId } },
      include: { _count: { select: { attempts: true } } },
    });
    if (existing && existing._count.attempts > 0) continue; // real or seeded history exists: leave it alone

    const assignment = await prisma.assignment.upsert({
      where: { activityId_learnerId: { activityId: activity.id, learnerId } },
      update: { status: plan.status, dueDate, completedAt },
      create: { activityId: activity.id, learnerId, status: plan.status, assignedAt, dueDate, completedAt },
    });

    if (!existing) {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "assignment.created",
          entityType: "Assignment",
          entityId: assignment.id,
          metadata: { learnerId, activityId: activity.id },
          createdAt: assignedAt,
        },
      });
    }

    if (plan.attempt) {
      const state = buildState(plan.attempt);
      const startedAt = completedAt
        ? new Date(completedAt.getTime() - 25 * 60 * 1000)
        : daysAgo(1, 15);
      const attempt = await prisma.simulationAttempt.create({
        data: {
          assignmentId: assignment.id,
          scenarioKey: SCENARIO_KEY,
          seed: state.seed,
          state: state as unknown as Prisma.InputJsonValue,
          score: state.score,
          startedAt,
          completedAt,
        },
      });
      attemptsCreated += 1;

      await prisma.auditLog.create({
        data: {
          actorId: learnerId,
          action: "simulation.started",
          entityType: "SimulationAttempt",
          entityId: attempt.id,
          metadata: { assignmentId: assignment.id },
          createdAt: startedAt,
        },
      });
      if (completedAt) {
        await prisma.auditLog.create({
          data: {
            actorId: learnerId,
            action: "simulation.completed",
            entityType: "SimulationAttempt",
            entityId: attempt.id,
            metadata: { assignmentId: assignment.id, score: state.score },
            createdAt: completedAt,
          },
        });
      }
    }
  }

  const counts = {
    users: await prisma.user.count(),
    activities: await prisma.activity.count(),
    assignments: await prisma.assignment.count(),
    attempts: await prisma.simulationAttempt.count(),
    auditLogs: await prisma.auditLog.count(),
  };
  console.log(`Seed complete. New attempts this run: ${attemptsCreated}.`, counts);
  console.log(`Sign in as ${ADMIN.email} (admin) or lerato@pathway.test (learner) with SEED_PASSWORD.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
