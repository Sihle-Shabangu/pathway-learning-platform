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

## Deploying to Vercel with Neon

1. **Create the database.** In Neon, create a project and copy two connection strings from *Connection details*:
   the **pooled** string (host contains `-pooler`) and the **direct** string (pooling turned off).
2. **Import the repository** into Vercel (*Add New → Project*). The framework is detected as Next.js and
   `vercel.json` sets the build command to `npm run vercel-build`, which runs
   `prisma generate && prisma migrate deploy && next build`, so migrations are applied on every deploy.
3. **Set environment variables** in *Project → Settings → Environment Variables* (Production and Preview):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon **pooled** connection string (used by the app at runtime) |
   | `DIRECT_URL` | Neon **direct** connection string (used by `prisma migrate deploy` during the build) |
   | `AUTH_SECRET` | A random secret, e.g. `npx auth secret` or `openssl rand -base64 32` |
   | `SEED_PASSWORD` | Only needed if you run the seed against this database |

   `AUTH_TRUST_HOST` is not needed on Vercel. Set it to `true` only when running `next start` yourself
   (for example a local production check), otherwise Auth.js rejects the host with `UntrustedHost`.
4. **Deploy.** The first build creates the tables.
5. **Seed demo data (optional)** from your machine against the same database:
   `npm run db:seed` with `DATABASE_URL`, `DIRECT_URL` and `SEED_PASSWORD` in your local `.env`.
   The seed is idempotent, so running it again is safe.

Local production check: `npm run build` then `AUTH_TRUST_HOST=true npx next start`.
