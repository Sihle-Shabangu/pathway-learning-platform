import { expect, test } from "@playwright/test";
import { expertPathForSymptoms, signIn, simulationActivityId } from "./helpers";

test("a learner completes the simulation and the score appears on the admin learner-detail page", async ({ browser }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const learner = { name: `E2E Learner ${stamp}`, email: `e2e-${stamp}@pathway.test`, password: `e2e-pass-${stamp}` };

  // --- Setup (as admin, through the real API): a fresh learner with the activity assigned.
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await signIn(admin, "admin@pathway.test", /\/admin$/);
  const created = await admin.request.post("/api/learners", { data: { ...learner, cohort: "e2e" } });
  expect(created.status()).toBe(201);
  const { id: learnerId } = await created.json();
  const assigned = await admin.request.post("/api/assignments", {
    data: { activityId: await simulationActivityId(admin.request), learnerIds: [learnerId] },
  });
  expect((await assigned.json()).added).toBe(1);

  // --- The learner plays the simulation in the browser.
  const learnerContext = await browser.newContext();
  const page = await learnerContext.newPage();
  await signIn(page, learner.email, /\/learner$/, learner.password);
  await page.getByRole("link", { name: "Start: Diagnose the dead workstation" }).click();
  await expect(page).toHaveURL(/\/learner\/simulation\//);

  const symptoms = await page.locator('section[aria-label="Symptoms"]:visible').innerText();
  for (const label of expertPathForSymptoms(symptoms)) {
    const saved = page.waitForResponse((r) => r.url().includes("/actions") && r.request().method() === "POST");
    await page.getByRole("button", { name: label, exact: true }).click();
    expect((await saved).status()).toBe(200);
  }

  await expect(page).toHaveURL(/\/learner\/results\//);
  const gauge = page.getByRole("img", { name: /Final score: \d+ out of 100/ });
  await expect(gauge).toBeVisible();
  const score = Number((await gauge.getAttribute("aria-label"))!.match(/(\d+) out of/)![1]);
  expect(score).toBeGreaterThanOrEqual(90);
  await expect(page.getByRole("heading", { name: "What an expert would have done" })).toBeVisible();

  // --- The admin sees the same score on the learner's detail page.
  await admin.goto(`/admin/learners/${learnerId}`);
  await expect(admin.getByRole("heading", { name: learner.name })).toBeVisible();
  await admin.getByRole("button", { name: /show attempt/i }).click();
  await expect(admin.getByText(`Final score ${score}/100`)).toBeVisible();
  await expect(admin.getByText("Hidden fault:")).toBeVisible();

  // --- Tidy up: deactivate (soft delete) the test learner.
  const deactivated = await admin.request.patch(`/api/learners/${learnerId}`, { data: { status: "INACTIVE" } });
  expect(deactivated.status()).toBe(200);

  await learnerContext.close();
  await adminContext.close();
});
