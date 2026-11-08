import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("an admin adds a learner and assigns the activity, and the learner can start it", async ({ browser }) => {
  test.setTimeout(150_000);
  const stamp = Date.now();
  const learner = { name: `E2E Admin Flow ${stamp}`, email: `e2e-${stamp}@pathway.test`, password: `e2e-pass-${stamp}` };

  // --- Admin adds the learner through the drawer.
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await signIn(admin, "admin@pathway.test", /\/admin$/);
  await admin.getByRole("link", { name: "Add learner" }).click();
  const drawer = admin.getByRole("dialog", { name: "Add a new learner" });
  await expect(drawer).toBeVisible({ timeout: 20_000 });
  await drawer.getByLabel("Full name").fill(learner.name);
  await drawer.getByLabel("Email").fill(learner.email);
  await drawer.getByLabel("Cohort").fill("2025-A");
  await drawer.getByLabel("Temporary password").fill(learner.password);
  await drawer.getByRole("button", { name: "Add learner" }).click();
  await expect(admin.getByText(`${learner.name} has been added.`)).toBeVisible({ timeout: 20_000 });
  await expect(drawer).toBeHidden();

  // Adding the same email again shows the duplicate-email field error.
  await admin.getByRole("button", { name: "Add learner" }).first().click();
  const again = admin.getByRole("dialog", { name: "Add a new learner" });
  await again.getByLabel("Full name").fill("Someone Else");
  await again.getByLabel("Email").fill(learner.email);
  await again.getByLabel("Cohort").fill("2025-A");
  await again.getByLabel("Temporary password").fill("another-password");
  await again.getByRole("button", { name: "Add learner" }).click();
  await expect(again.getByText("A user with this email already exists.")).toBeVisible({ timeout: 20_000 });
  await again.getByRole("button", { name: "Cancel" }).click();

  // --- Admin assigns the activity to that learner through the dialog.
  await admin.getByRole("link", { name: "Activities" }).first().click();
  await admin.getByRole("button", { name: "Assign", exact: true }).first().click({ timeout: 20_000 });
  const dialog = admin.getByRole("dialog", { name: "Assign activity" });
  await dialog.getByLabel("Filter learners").fill(learner.email);
  await dialog.getByLabel(new RegExp(learner.name)).check({ timeout: 20_000 });
  await dialog.getByLabel("Due date (optional)").fill("2030-12-31");
  await dialog.getByRole("button", { name: "Assign to 1 learner" }).click();
  await expect(admin.getByText("Assigned to 1 learner.")).toBeVisible({ timeout: 20_000 });

  // --- The new learner signs in and sees the activity, due on the chosen date, ready to start.
  const learnerContext = await browser.newContext();
  const page = await learnerContext.newPage();
  await signIn(page, learner.email, /\/learner$/, learner.password);
  await expect(page.getByRole("heading", { name: `Hi, E2E` })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start: Diagnose the dead workstation" })).toBeVisible();
  await expect(page.getByText("Due 31 Dec 2030")).toBeVisible();

  await learnerContext.close();
  await adminContext.close();
});
