import { expect, test } from "@playwright/test";

const PASSWORD = process.env.SEED_PASSWORD ?? "";

test.describe("login and route protection", () => {
  test("an unauthenticated visitor is sent to /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("wrong password shows an error and stays on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("admin@pathway.test");
    await page.getByLabel("Password", { exact: true }).fill("definitely-wrong");
    await page.getByRole("button", { name: /sign in to pathway/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Sign-in failed" })).toContainText("Invalid email or password");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("empty fields show inline validation errors", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in to pathway/i }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toBeVisible();
  });

  test("an admin lands on /admin and cannot open learner pages", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("admin@pathway.test");
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in to pathway/i }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: /welcome back, thandi/i })).toBeVisible();

    await page.goto("/learner");
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("a learner lands on /learner and cannot open admin pages", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("lerato@pathway.test");
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in to pathway/i }).click();
    await expect(page).toHaveURL(/\/learner$/);
    await expect(page.getByRole("heading", { name: /hi, lerato/i })).toBeVisible();

    await page.goto("/admin/learners");
    await expect(page).toHaveURL(/\/learner$/);
  });

  test("an inactive learner cannot sign in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("pieter@pathway.test");
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in to pathway/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Sign-in failed" })).toContainText("Invalid email or password");
  });
});
