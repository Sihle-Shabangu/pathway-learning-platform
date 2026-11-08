import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const PASSWORD = process.env.SEED_PASSWORD ?? "";

/** Signs in through the real login form and waits for the role's dashboard. */
export async function signIn(page: Page, email: string, landing: RegExp, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /sign in to pathway/i }).click();
  // Generous timeout: the first sign-in after a code change also waits for the dev server to compile.
  await expect(page).toHaveURL(landing, { timeout: 20_000 });
}

/** The seeded simulation activity's id, read through the admin API. */
export async function simulationActivityId(adminRequest: APIRequestContext): Promise<string> {
  const activities: { id: string; title: string; scenarioKey: string }[] = await (
    await adminRequest.get("/api/activities")
  ).json();
  // Match on title too: other activities (e.g. ones admins create) can use the same scenario.
  const activity = activities.find(
    (candidate) => candidate.scenarioKey === "hardware-troubleshooting" && candidate.title === "Diagnose the dead workstation",
  );
  if (!activity) throw new Error("Seeded simulation activity not found. Run npm run db:seed.");
  return activity.id;
}

/**
 * The expert path for the fault, chosen from the symptoms the learner can see.
 * This mirrors how a learner reasons; it does not peek at hidden data.
 */
export function expertPathForSymptoms(symptoms: string): string[] {
  if (/repeating pattern of beeps/i.test(symptoms)) {
    return [
      "Listen for beep codes",
      "Unplug the power cable",
      "Ground yourself (anti-static strap)",
      "Reseat the RAM",
      "Test one RAM stick at a time",
      "Replace the faulty RAM module",
    ];
  }
  if (/burning smell/i.test(symptoms)) {
    return [
      "Check the outlet and power cable",
      "Unplug the power cable",
      "Ground yourself (anti-static strap)",
      "Use a PSU tester",
      "Replace the power supply",
    ];
  }
  return [
    "Open BIOS temperature readings",
    "Unplug the power cable",
    "Ground yourself (anti-static strap)",
    "Inspect the CPU heatsink",
    "Clean dust and reapply thermal paste",
  ];
}
