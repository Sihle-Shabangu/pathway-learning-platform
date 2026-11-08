import { execSync } from "node:child_process";

/**
 * Runs after all e2e tests. Uses the same script as `npm run db:clean-tests`, in a child process,
 * because Playwright loads tests as CommonJS and the Prisma 7 client is ESM-only.
 */
export default function globalTeardown() {
  execSync("npx tsx scripts/clean-test-data.ts", { stdio: "inherit" });
}
