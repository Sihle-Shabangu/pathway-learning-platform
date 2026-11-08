import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);
// Set E2E_BASE_URL to test a deployed site (e.g. the Vercel production URL) instead of a local server.
const REMOTE_URL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false, // tests share the seeded database
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"]],
  // Removes the learners and records the tests create, so demo data stays clean.
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: REMOTE_URL ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Only start a local server when not testing a deployed site.
  webServer: REMOTE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT}`,
        url: `http://localhost:${PORT}/login`,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
