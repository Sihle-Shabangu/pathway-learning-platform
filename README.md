# Pathway

A learning and simulation management platform for educators (ADMIN) and learners (LEARNER).

> Work in progress. The full README (architecture, API table, metric definitions, deploy steps) is written in Phase 7.

## Local setup

Requirements: Node.js 22+, a Neon PostgreSQL database.

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the four values
npm run db:migrate          # applies migrations using DIRECT_URL
npm run db:seed             # idempotent: safe to run more than once
npm run dev                 # http://localhost:3000
```

Seeded accounts (password is the value of `SEED_PASSWORD`):

| Role | Email |
| --- | --- |
| Admin | admin@pathway.test |
| Learner | lerato@pathway.test (and 11 others, see `prisma/seed.ts`) |
| Inactive learner (cannot sign in) | pieter@pathway.test |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run typecheck` | Generate Next route types, then `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (`tests/unit`) |
| `npm run test:e2e` | Playwright tests (`tests/e2e`); needs a seeded database |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Seed the database |
