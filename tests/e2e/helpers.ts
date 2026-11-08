import { expect, type Page } from "@playwright/test";

export const PASSWORD = process.env.SEED_PASSWORD ?? "";

/** Signs in through the real login form and waits for the role's dashboard. */
export async function signIn(page: Page, email: string, landing: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in to pathway/i }).click();
  await expect(page).toHaveURL(landing);
}
