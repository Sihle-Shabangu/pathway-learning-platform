import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("audit log", () => {
  test("an admin can open the audit log and filter it", async ({ page }) => {
    await signIn(page, "admin@pathway.test", /\/admin$/);
    await page.getByRole("link", { name: "Audit log" }).first().click();
    await expect(page.getByRole("heading", { name: "Audit log", level: 1 })).toBeVisible();
    await expect(page.getByText(/\d+ entr(y|ies) · page 1 of \d+/)).toBeVisible({ timeout: 20_000 });

    // Filter by action: only "Simulation completed" rows remain.
    await page.getByLabel("Action", { exact: true }).click();
    await page.getByRole("option", { name: "Simulation completed" }).click();
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toContainText("Simulation completed", { timeout: 20_000 });
    for (const text of await rows.allInnerTexts()) expect(text).toContain("Simulation completed");

    // Filter by who as well: Thabo's completion only.
    await page.getByLabel("Who", { exact: true }).fill("thabo");
    await expect(rows).toHaveCount(1, { timeout: 20_000 });
    await expect(rows.first()).toContainText("Thabo Mthembu completed a simulation with 100/100");

    // An impossible date range is caught in the browser.
    await page.getByLabel("From", { exact: true }).fill("2030-01-10");
    await page.getByLabel("To", { exact: true }).fill("2030-01-01");
    await expect(page.getByRole("alert").filter({ hasText: "start date must be on or before" })).toBeVisible();

    // Clearing restores the full log.
    await page.getByRole("button", { name: "Clear filters" }).first().click();
    await expect(page.getByLabel("Who", { exact: true })).toHaveValue("");
  });

  test("the audit API validates dates and is admin-only", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await signIn(admin, "admin@pathway.test", /\/admin$/);
    const bad = await admin.request.get("/api/audit?from=2030-02-01&to=2030-01-01");
    expect(bad.status()).toBe(400);
    expect((await bad.json()).error.fields.from).toBeTruthy();
    await adminContext.close();

    // A separate session for the learner (each user gets their own cookies).
    const learnerContext = await browser.newContext();
    const learner = await learnerContext.newPage();
    await signIn(learner, "lerato@pathway.test", /\/learner$/);
    expect((await learner.request.get("/api/audit")).status()).toBe(403);
    await learnerContext.close();
  });
});
