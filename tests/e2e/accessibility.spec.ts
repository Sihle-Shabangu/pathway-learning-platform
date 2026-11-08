import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

/** Runs axe (WCAG 2.1 A + AA rules) and fails on serious or critical violations. */
async function expectNoSeriousViolations(page: Page, name: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
  expect(summary, `${name} has accessibility violations`).toEqual([]);
}

test.describe("accessibility (axe, WCAG 2.1 AA)", () => {
  test("login page", async ({ page }) => {
    await page.goto("/login");
    await expectNoSeriousViolations(page, "login");
  });

  test("admin pages", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, "admin@pathway.test", /\/admin$/);
    await page.getByRole("heading", { name: "Needs attention" }).waitFor();
    await expectNoSeriousViolations(page, "admin dashboard");

    await page.goto("/admin/learners");
    await page.getByText(/Showing \d+/).waitFor();
    await expectNoSeriousViolations(page, "learners");

    await page.getByLabel("Search").fill("Sipho");
    await page.getByRole("link", { name: "Sipho Ndlovu" }).first().click();
    await page.getByRole("heading", { name: "Score over time" }).waitFor();
    await page.getByRole("button", { name: /show attempt/i }).first().click();
    await expectNoSeriousViolations(page, "learner detail");

    await page.goto("/admin/activities");
    await page.getByRole("button", { name: "Assign" }).first().waitFor();
    await expectNoSeriousViolations(page, "activities");

    await page.goto("/admin/audit");
    await page.getByText(/\d+ entr(y|ies) · page/).waitFor();
    await expectNoSeriousViolations(page, "audit log");
  });

  test("learner pages", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, "lerato@pathway.test", /\/learner$/);
    await page.getByRole("heading", { name: "Assigned activities" }).waitFor();
    await expectNoSeriousViolations(page, "learner dashboard");

    await page.goto("/learner/progress");
    await page.getByRole("heading", { name: "Score trend" }).waitFor();
    await expectNoSeriousViolations(page, "my progress");

    await page.goto("/learner");
    await page.getByRole("link", { name: /Resume simulation/ }).click();
    await page.locator('section[aria-label="Symptoms"]:visible').waitFor();
    await expectNoSeriousViolations(page, "simulation workbench");
  });

  test("results page", async ({ page }) => {
    await signIn(page, "thabo@pathway.test", /\/learner$/);
    await page.getByRole("link", { name: /^Review/ }).first().click();
    await page.getByRole("heading", { name: "What an expert would have done" }).waitFor();
    await expectNoSeriousViolations(page, "results");
  });
});
