# Progress

| Feature | Status (Done / Partial / Not started / Blocked) | Notes |
| --- | --- | --- |
| Step 0: scaffold, SPEC, CLAUDE.md, git hook | Done | Next.js 16.4.5 scaffolded into a temp dir and moved in; route protection will live in `src/proxy.ts` (Next 16 rename of middleware). |
| Phase 1: Prisma schema + migration | Done | Prisma 7.10.1 pinned (npm `latest` tag points to an 8.0 RC). `prisma.config.ts` uses DIRECT_URL; runtime uses pooled DATABASE_URL via `@prisma/adapter-neon`. Migration `20261108162937_init` applied to Neon. |
| Phase 1: Auth.js login + route protection | Done | Auth.js v5 (5.0.0-beta.32), credentials + bcryptjs, JWT (12h) carrying id + role. `src/proxy.ts` (Next 16 name for middleware) redirects by role; layouts and pages re-check the role on the server and reload the user from the DB so deactivation takes effect immediately. |
| Phase 1: Login page | Done | Matches /design layout. Loading spinner, inline Zod errors, error banner, success toast, password visibility toggle. Omitted design items that would be fake: "Forgot password", "Keep me signed in", SSO/FERPA claims. |
| Phase 1: Idempotent seed | Done | `npm run db:seed`. 1 admin, 12 learners (2025-A / 2025-B, 2 inactive), 1 activity, 12 assignments (5 completed, 3 in progress, 4 not started; 4 overdue, 3 of them for active learners), 8 attempts, 26 audit entries. Verified: re-running creates nothing new. Decision histories are hand-authored for now and will be regenerated through the real engine in Phase 3. |
| Phase 2: Admin dashboard (KPIs, charts, feed, needs attention) | Done | `/api/stats` -> `stats.service.getDashboard()`. TanStack Query refetches every 10s. 30-day completions line, completion-rate-per-activity bars (each with a screen-reader table), audit feed (sign-ins excluded as noise), overdue list. Quick actions: Add learner (`/admin/learners?new=1` opens the drawer) and Assign activity (Activities page). |
| Phase 2: Learners list (search, filters, pagination, drawer, deactivate) | Done | Server-side search (name/email, case-insensitive), status and cohort filters, 10 per page. Add/edit side drawer with shared Zod schema; duplicate email returns `fields.email`. Deactivate/reactivate via confirm dialog (soft delete). Table >= 768px, cards below. New learners get an admin-set temporary password (there is no email/invite system). |
| Phase 2: Learner detail | Done | Profile, summary stats, score-over-time chart, assignments with expandable attempts showing every decision. The hidden fault is shown only for completed attempts (`attempt-view.ts`). |
| Phase 2: Activities (create, assign) | Done | Cards with assigned/completed/avg score/completion. Create dialog (scenario must exist in the catalog). Assign dialog: individual learners and/or a whole cohort, optional due date (end of that day, UTC). `createMany(skipDuplicates)` skips existing assignments; toast reports added/skipped. Only ACTIVE learners can be assigned. The assign picker loads up to 100 active learners. |
| Phase 2: stats.service tests | Done | `tests/unit/stats.service.test.ts`: pure rate and bucketing tests (zero assignments returns null) and DB tests on tagged fixtures for each metric definition and the overdue list. Plus `admin.services.test.ts`: duplicate email field error, audit on create, soft delete, search, skip-existing assignment. |
| Phase 3: Simulation engine + tests | Not started | |
| Phase 3: simulation.service + tests | Not started | |
| Phase 3: Simulation workbench UI | Not started | |
| Phase 3: Results screen | Not started | |
| Phase 4: Learner dashboard | Not started | |
| Phase 4: My Progress | Not started | |
| Phase 4: Cross-learner access test | Not started | |
| Phase 5: Deploy readiness | Not started | |
| Phase 6: Hardening (states, mobile, a11y, 404/500) | Not started | |
| Phase 6: Playwright e2e (learner completes simulation) | Not started | |
| Phase 7: README, DESIGN, DEVELOPMENT_SUMMARY | Not started | |
| Phase 8.1: CSV export | Not started | |
| Phase 8.2: Audit log page with filters | Not started | |
| Phase 8.3: Playwright e2e (admin adds + assigns) | Not started | |

## Decisions log
- **Cache Components off** (`next.config.ts`). Next 16 scaffolds it on; with it on, every session read must sit inside `<Suspense>` or the build fails. All pages here are per-user, so the classic per-request rendering model is simpler and easier to explain.
- **bcryptjs** instead of native `bcrypt`: same algorithm and hash format, no native build step on Windows or Vercel.
- **Login uses a server action** calling `signIn(..., { redirect: false })` so the form can show a toast and then navigate; `/` is redirected to the role's dashboard by the proxy.
- **Accessibility over the design:** success/warning text uses darker tokens (`#15803D`, `#B45309`, both 5.0:1 on white) because the spec colours are only ~3.2:1. Input borders use `#8A91A5` (3.15:1) to meet the non-text contrast rule. Buttons and inputs are 40px tall.
- **Seed emails use the reserved `.test` TLD** so no real address can receive mail.
- **Unit tests run against the Neon database** for services (added from Phase 2). Each test creates and cleans up its own uniquely named rows.
- **Admin data views are client components using TanStack Query against `/api/*`.** Server pages only check the role. This keeps the layer rule (UI -> API -> services) and gives every view the same loading, error-with-retry and empty states.
- **API responses use ISO date strings** in their DTO types, so client types match what JSON actually carries.
- **Completions chart counts all completions** (including learners deactivated since), because those completions happened. The KPI and per-activity rates follow the active-learner definitions exactly.
- **Bulk assignment writes one audit entry per assign action** (with added/skipped counts) rather than one per learner.
- **Known gap until Phase 8:** the "Audit log" nav item 404s until the audit page is built (Phase 8.2). The learner "My progress" link 404s until Phase 4.
