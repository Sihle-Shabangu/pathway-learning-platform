import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true }, // resolves the "@/..." import alias from tsconfig.json
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["dotenv/config"],
    // Service tests share one Neon database; run files one at a time to keep them independent.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
