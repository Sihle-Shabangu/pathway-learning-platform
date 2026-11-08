# Pathway: design decisions

This document explains how the interface is put together and why. The Stitch export in `/design` was the visual
reference; where it conflicted with accessibility, accessibility won (each case is listed below).

## Palette and rationale

All colours are CSS variables in `src/app/globals.css`, mapped into Tailwind and shadcn/ui tokens
(`bg-primary`, `text-muted-foreground`, `bg-sim-panel`, …). Components never hard-code brand hex values.

| Token | Value | Used for | Contrast (text on white unless noted) |
| --- | --- | --- | --- |
| Primary | `#2F4FD8` | Primary buttons, links, active navigation, focus rings | 6.50:1 |
| Primary hover | `#233DB0` | Hover/pressed primary | 7.88:1 on primary-soft |
| Primary soft | `#EEF1FD` | Selected rows, secondary buttons, highlight panels | n/a (background) |
| Accent / progress | `#0E9F96` | Progress bars, completion bars, progress ring (fills only) | 3.27:1, so never used for small text |
| Accent text | `#0B7A73` | Teal text on light surfaces | 5.19:1 |
| Highlight | `#F5A524` | Chart series 3 and achievement fills only, never text on white | n/a |
| Success / text | `#16A34A` / `#15803D` | Fill and icon / text | 3.30:1 / 5.02:1 |
| Warning / text | `#D97706` / `#B45309` | Fill and icon / text | 3.19:1 / 5.02:1 |
| Danger | `#DC2626` | Destructive buttons, errors | 4.83:1 |
| Background / surface | `#F7F8FB` / `#FFFFFF` | Page / cards | n/a |
| Border / input border | `#E3E6EE` / `#8A91A5` | Dividers / form field outlines | n/a / 3.15:1 (non-text 3:1 rule) |
| Text / muted | `#18203A` / `#5A6378` | Body / secondary text | 15.1:1 / 6.02:1 |
| Simulation bg / panel / text | `#0F1A2E` / `#16233D` / `#E6ECF7` | Dark workbench | 13.2:1 (text on panel) |
| Simulation accents | `#7B93FF`, `#4ADE80`, `#F87171`, `#FBBF24`, `#2DD4BF`, muted `#A9B6D3` | Links, good, costly, warning, score, secondary text on dark | all ≥ 4.86:1 on every dark surface |

**Why this palette:** a calm, confident blue reads as "institutional and trustworthy" for educators; teal is reserved
for progress so "how far along" always looks the same; amber is kept rare so achievements feel special. The
simulation switches to a dark "instrument bench" theme so learners feel they have entered a different mode of work,
and so readouts and feedback colours stand out.

**Where accessibility overrode the spec:** the specified success (`#16A34A`) and warning (`#D97706`) colours are only
about 3.2:1 on white, below AA for normal text. They are kept for fills and icons, and darker `*-text` variants are
used for words. Input borders use a darker grey than general borders so form fields are visible to low-vision users.

Contrast ratios were calculated with the WCAG relative-luminance formula, not estimated.

## Typography

- **Inter** for all interface text (loaded with `next/font`, self-hosted, no layout shift).
- **JetBrains Mono** only for simulation readouts: step counter, live score, score deltas, labels in the PC
  illustration. Monospace there signals "instrument reading" and keeps changing numbers from jumping in width.
- Scale: page titles 24–30px semibold, card titles 16px semibold (real `<h2>` elements), body 14–16px.

## Shape, spacing, elevation

Cards 12px radius, inputs and buttons 8px, soft two-layer shadow (`shadow-card`), spacing on an 8px grid
(Tailwind's 4px steps used in pairs). Buttons and inputs are 40px tall: larger than the shadcn default 32px, to match
the design and give comfortable touch targets.

## Navigation model

- **Role-based home:** after sign-in the proxy sends admins to `/admin` and learners to `/learner`. There is no role
  selector; the account decides.
- **Admin:** Dashboard, Learners, Activities, Audit log.
- **Learner:** Home, My progress. The simulation and results are reached from activity cards rather than the nav,
  because they always belong to a specific assignment.
- **Desktop (≥ 1024px):** fixed left sidebar with the signed-in user and sign-out at the bottom.
- **Mobile and tablet (< 1024px):** compact top bar (logo, sign-out) and a fixed bottom navigation bar with icon + label.
- A "Skip to main content" link is the first focusable element on every app page.

## 3-click rule

**What counts:** clicks from the role's landing page (after sign-in) to the screen or form where the task is done.
Typing into a form and pressing its submit button are the task itself and are not counted.

Every row was **verified against the running app** with a Playwright script that performs the journey, counts the
clicks and checks it lands on the right screen (run on 8 November 2026).

| Role | Primary task | Path from the landing page | Clicks |
| --- | --- | --- | --- |
| Admin | See key metrics | Dashboard is the landing page | 0 |
| Admin | Act on an overdue learner | **View** in Needs attention → learner detail | 1 |
| Admin | Add a learner | **Add learner** → drawer opens on the Learners page | 1 |
| Admin | Assign an activity | **Assign activity** → **Assign** on the activity card → dialog | 2 |
| Admin | Create an activity | **Activities** → **Create activity** → dialog | 2 |
| Admin | Review a learner's attempt | **Learners** → learner name → **Show attempt** | 3 |
| Admin | Deactivate a learner | **Learners** → row menu → **Deactivate** → confirmation dialog | 3 |
| Admin | Check the audit log | **Audit log** | 1 |
| Admin | Export all results as CSV | **Learners** → **Export all results (CSV)** | 2 |
| Learner | Start or resume the simulation | **Resume simulation** (or **Start** on the activity card) | 1 |
| Learner | Review a finished attempt | **Review** on the activity card | 1 |
| Learner | See progress over time | **My progress** | 1 |

Deactivation adds a confirmation step on purpose, because it removes the learner's access.

## Responsive approach

Mobile-first Tailwind classes with three breakpoints that matter:

- **< 768px:** tables become stacked cards (learners list, attempt history); filters stack.
- **768–1023px:** tables appear; navigation stays at the bottom.
- **≥ 1024px:** sidebar navigation; the simulation shows symptoms, illustration and actions side by side.

The simulation on small screens keeps the illustration on top and turns Symptoms / Actions / Findings into tabs, so
the action list is never more than one tap away. Every page was checked at 375px wide.

## Accessibility decisions

- **Contrast:** WCAG AA for all text on every surface, light and dark (calculated, see palette).
- **Focus:** a visible 2px focus ring on every interactive element, including the parts of the SVG workstation.
- **Status never by colour alone:** every status pill has an icon and a word ("Completed", "Overdue"), score changes
  have a sign (+/−), and good or costly decisions have both an icon with an accessible name and a coloured border.
- **Icon-only buttons** (sign out, row menu, show password) have `aria-label`s.
- **Forms:** visible labels, inline errors linked with `aria-describedby`, `aria-invalid`, disabled + spinner while
  submitting, success toast.
- **Charts:** every chart has a screen-reader data table; single-series charts have no legend (the title names the
  series) and tooltips use text colours, not series colours.
- **Live regions:** the simulation announces each action's result and the live score politely.
- **Reduced motion:** animations and transitions are effectively disabled when the OS asks for reduced motion.
- **Automated check:** `tests/e2e/accessibility.spec.ts` runs axe (WCAG 2.1 A/AA rules) on every page and fails on
  serious or critical violations.

## Simulation UX decisions

- **Dark workbench, light everything else:** a deliberate mode switch so the simulation feels like hands-on work.
- **Symptoms first, fault never:** the learner sees what a technician would observe; the fault's name, explanation
  and expert path are only sent by the server once the attempt is complete.
- **The illustration is a map, not a puzzle:** clicking (or pressing Enter on) a part highlights its related actions
  instead of performing anything, so nothing happens by accident and keyboard users get the same help.
- **Actions grouped by intent** (Safety, Investigate, Repair, Diagnose) with a one-line hint per group, which teaches
  the professional order of work without forcing it.
- **Locked actions stay visible** with a lock icon and a hint ("Check the BIOS temperatures first…"), so learners
  can see what evidence would unlock them.
- **Immediate, specific feedback** after every action, with the score change, plus a findings log (newest first).
- **Mistakes cost points but never end the attempt:** a wrong diagnosis or an unsafe repair is explained and the
  learner continues, because the goal is learning, not punishment.
- **"Exit and save" is honest:** state is saved on the server after every action, so leaving loses nothing.
- **Results teach:** score, outcome band, decision-by-decision review, the hidden fault explained, and the expert
  path with "You did this / Missed" against each step.
- **Design items left out on purpose:** elements in the Stitch export that would need data or systems this app
  doesn't have (telemetry readings, timers, PDF export, competency rubrics, badges, notifications) were not built
  rather than faked.
