import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI settings (Prisma 7). The CLI (migrate, studio) uses the DIRECT, non-pooled
// Neon connection. The running app uses the pooled DATABASE_URL via src/server/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // process.env (not prisma's env()) so `prisma generate` still works when it is unset.
    url: process.env.DIRECT_URL,
  },
});
