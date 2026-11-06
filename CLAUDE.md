@AGENTS.md

# CrackIt — conventions for Claude Code

Personal interview-prep tracker (SWE/full-stack + university lecturer). The full product and
architecture plan is in `PLAN.md`; implement it phase by phase (section 11).

## Stack

- Next.js 16 (App Router, Turbopack, `cacheComponents` + `partialPrefetching` on), React 19, TypeScript strict
- PostgreSQL 16 + Prisma 7 (local DB via Docker Compose on port 5433; prod on Neon)
- Auth.js v5 Credentials (email + password, JWT sessions, open sign-up at /register)
- Tailwind CSS v4 + shadcn/ui (Radix, `new-york`), lucide icons, sonner toasts, next-themes
- Zod v4 for all validation; Vitest + Testing Library; Playwright for e2e
- pnpm; hosted on Vercel; CI on GitHub Actions

## Next.js 16 notes (differs from older docs)

- Middleware is now **`src/proxy.ts`** (Node.js runtime by default). Use it only for optimistic
  auth redirects; always re-check auth in Server Actions / data access.
- `params`, `searchParams`, `cookies()`, `headers()` are async — `await` them.
- With Cache Components, data is dynamic by default; opt in to caching with `"use cache"`.
  Do not export `runtime` / `dynamic` route segment config. Use `await connection()` to force
  request-time evaluation.
- `next lint` is gone — use `pnpm lint` (ESLint flat config).
- When unsure, read `node_modules/next/dist/docs/` before writing code.

## Architecture (modular monolith, layered)

```
UI (Server/Client Components)
  → Server Actions (src/modules/<feature>/actions.ts): auth() → Zod parse → service → revalidate
    → Services (service.ts): business rules, pure where possible, unit-tested
      → Repositories (repository.ts): the ONLY place that imports the Prisma client
        → PostgreSQL
```

- Feature code lives in `src/modules/<feature>/`:
  `validators.ts`, `repository.ts`, `service.ts`, `actions.ts`, `components/`, `__tests__/` (or `*.test.ts` beside the file).
- Routes live in `src/app/` and stay thin: fetch via services, render module components.
- Shared helpers: `src/lib/` (`env.ts`, `db.ts`, `result.ts`, `utils.ts`, later `dates.ts`).
- Shared UI primitives: `src/components/ui/` (shadcn — add with `pnpm dlx shadcn@latest add <name>`).
- Actions and services return `Result<T>` from `@/lib/result` (`ok(...)` / `err(code, msg)`);
  throw only for truly unexpected errors.
- Every table has `userId`, `createdAt`, `updatedAt`; every query filters by `userId`.
- Store time as `timestamptz` (UTC). Compute "days" in the user's timezone with `dayStartHour`.
- Env vars: add to the Zod schema in `src/lib/env.ts` **and** `.env.example`. Never read
  `process.env` elsewhere. `env.ts` is `server-only`.

## Commands

| Command                                                | Purpose                                                                |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `pnpm dev`                                             | Dev server (http://localhost:3000)                                     |
| `pnpm build` / `pnpm start`                            | Production build / serve                                               |
| `pnpm lint` / `pnpm lint:fix`                          | ESLint                                                                 |
| `pnpm typecheck`                                       | `tsc --noEmit`                                                         |
| `pnpm format` / `pnpm format:check`                    | Prettier (with Tailwind class sorting)                                 |
| `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Vitest                                                                 |
| `pnpm check`                                           | lint + typecheck + format:check + test (run before finishing any task) |
| `pnpm test:int`                                        | Integration tests (`*.int.test.ts`) against the test DB on :5434       |

| `pnpm db:up` / `pnpm db:down` | Start/stop local Postgres (dev :5433, test :5434) via Docker |
| `pnpm db:migrate` | Create + apply a migration in dev (`-- --name <name>`) |
| `pnpm db:deploy` | Apply pending migrations (CI / prod) |
| `pnpm db:seed` / `pnpm db:reset` / `pnpm db:studio` | Seed dev user + defaults / reset DB / browse data |

| `pnpm user:create -- --email <e> [--name <n>]` | Create a login (password prompted; or `CRACKIT_PASSWORD`) |
| `pnpm user:reset-password -- --email <e>` | New password + sign out all sessions |
| `pnpm test:e2e` | Playwright against the prod build + test DB (`pnpm build` first) |

## Auth

- Auth.js v5 Credentials, JWT sessions (`src/auth.ts`); logic in `src/modules/auth/`.
- Open sign-up at `/register` (`auth/registration.ts`): 5 attempts per IP per hour
  (`signup_attempts`), new users get the starter tracks/topics/activities, then are signed in.
  `pnpm user:create` still works for scripted accounts.
- `src/proxy.ts` only does optimistic redirects (signed JWT present). `/login` is always
  reachable so a stale JWT can't cause a redirect loop.
- Authoritative check = DAL: `getCurrentUser()` / `requireUser()` from `@/modules/auth/dal`
  (verifies the user still exists and `sessionVersion` matches). Call `requireUser()` in every
  page that shows user data **and** in every Server Action / Route Handler.
- Anything reading the session must render inside `<Suspense>` (Cache Components); never
  `await` the session at the top level of a layout.
- Same for client route hooks in shared UI: `usePathname()` / `useParams()` suspend on routes
  with dynamic params (e.g. `/applications/[id]`), so read them in a small leaf inside
  `<Suspense>` (see `components/app-shell/sidebar-nav.tsx`) or `next build` fails.
- Rate limit: 5 failures / 15 min per email, 20 per IP (`login_attempts` table).

## Prisma 7 notes

- Config lives in `prisma.config.ts` (CLI URL = `DIRECT_URL ?? DATABASE_URL`, seed command).
  The schema's `datasource` has no `url`.
- Client is generated to `src/generated/prisma` (git-ignored, regenerated on `postinstall`).
  `prisma migrate dev` does **not** regenerate it in Prisma 7 — run `pnpm db:generate` after.
  Import types/enums from `@/generated/prisma/client` or `@/generated/prisma/enums`.
- Runtime client is `db` from `@/lib/db` (uses `@prisma/adapter-pg`). Repositories only.
- Constraints Prisma can't express (CHECK, `NULLS NOT DISTINCT`, partial/exclusion indexes):
  `pnpm db:migrate -- --create-only --name <name>`, then hand-edit the SQL. Keep the matching
  `@@unique`/`@@index` in the schema when one exists so Prisma doesn't see drift, and verify with
  `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`.
- Default tracks/topics/activity types are data in `src/modules/*/defaults.ts`; seeding logic is
  `prisma/seed-defaults.ts` (idempotent).

## Testing

- Unit (`*.test.ts`): pure logic — validators, date math, summaries. No DB.
- Integration (`*.int.test.ts`): services against real Postgres (`pnpm db:up` first). Use
  `createTestUser()` from `test/factories.ts` (fresh user per test, no cleanup needed).
- E2E (`e2e/*.spec.ts`): Playwright on the prod build. Users in `e2e/fixtures.ts`, reset by
  `e2e/setup-db.ts`. Radix Selects: use `pick(page, label, option)` from `e2e/helpers.ts`.

## Forms & Server Actions

- Actions in `src/modules/<feature>/actions.ts` take `(prevState, formData)` and return
  `ActionState` (`src/lib/action-state.ts`; build it with `toActionState` / `invalidState` /
  `formFields` from `src/lib/action-result.ts`); `"use server"` files may only
  export async functions, so shared constants/types live elsewhere.
- After a successful mutation call `refresh()` from `next/cache` (nothing is cached yet).
- Submit with `useNoResetSubmit(action)` (not `<form action>`) when the form must keep input on
  validation errors — React 19 resets forms after every action, and Radix Selects reset too.
- Show feedback with `useActionFeedback(state, onSuccess)` (sonner toasts). If the mutation can
  unmount the submitting component (a deleted card, an item leaving a list), use
  `useToastAction(action, onSuccess)` from `@/hooks/use-toast-action`
  instead: it toasts when the action returns, not in an effect.
- Render user markdown with `<Markdown>` from `@/components/markdown` (no raw HTML). 1–5 scales
  use `<RatingInput>` from `@/components/rating-input`.

## Time tracking rules (enforced in service AND database)

- One running entry per user (partial unique index); no overlaps (GiST exclusion on
  `tstzrange`); `ended_at > started_at`; entries ≤ 24h; no future times; study needs a track.
- Day = `[dayStartHour, next dayStartHour)` in the user's timezone — use `src/lib/dates.ts`
  (`dayWindow`, `logicalDateKey`, `parseLocalDateTime`); never do tz math by hand.

## Journal rules

- One `daily_logs` row per user per logical day (`date` is `@db.Date`; convert with
  `dateKeyToDb` / `dbDateToKey`). Bedtime ≥ 12:00 is the night before; see `journal/sleep.ts`.
- Learning entries revise at +1, +3, +7, +14, +30 days (`src/lib/spaced-repetition.ts`);
  "forgot" restarts the schedule. Tags (`src/lib/tags.ts`, storage in `modules/tags`) are
  lower-cased per user and shared by learning notes and problems; unused tags are deleted
  (add new taggables to `deleteOrphanTags`).

## Topics & checklists rules

- Roadmap progress counts leaf topics only (not started 0, learning ⅓, revising ⅔,
  confident 1); time per topic rolls up to parents (`tracks-topics/roadmap.ts`). Max 4 levels.
- Checklist `type` and `recurrence` are fixed after creation; HABIT ⇔ recurrence ≠ NONE (DB CHECK).
  Habits are ticked per period (logical day, or Monday of the week) in
  `checklist_item_completions`; other items use `done_at`. Streaks: `checklists/habits.ts`.

## Problems & projects rules

- Problem status changes live in `problems/rules.ts` (pure): an attempt adds time and an
  attempt; solving sets SOLVED, keeps the first `solved_at` and schedules a revision tomorrow;
  failing a previously solved problem → NEEDS_REVISION; revision "forgot" → NEEDS_REVISION.
  DB CHECK: SOLVED / NEEDS_REVISION require `solved_at`. One problem per link per user.

## Lecturer rules

- Publications past WRITING need `submitted_on` (DB CHECK); `lecturer/rules.ts` fills it with the
  entered date, else the existing one, else today. Viva questions use the shared spaced-repetition
  schedule (first practice tomorrow). Demo dates can't be in the future.

## Job hunt rules

- Pipeline rules live in `jobs/rules.ts`: leaving WISHLIST records `applied_on` (DB CHECK);
  every status change writes an `application_events` row; adding an interview moves the
  application forward (OA round → OA, others → INTERVIEWING), never backwards or out of
  OFFER / REJECTED / WITHDRAWN. Organizations are found-or-created by name (case-insensitive).
- Kanban uses `@dnd-kit/core` (mouse, touch and keyboard sensors + announcements); every card
  also has a "Move to" menu as the non-drag alternative.
- Date keys as labels: `formatDateKey` from `@/lib/dates` (works on server and client).

## Resources rules

- Progress is counted in units (`completed_units` ≤ `total_units`; no total = open-ended).
  `resources/rules.ts`: any progress starts a planned/dropped resource (`started_on`), reaching
  the total marks it DONE (`finished_on`), dropping below re-opens it; a status picked by hand
  wins (DONE fills the progress). DB CHECKs back the units and both dates.

## Analytics & goals rules

- `/analytics?range=7d|30d|90d|12m` (default 30d). Aggregations are pure in
  `analytics/compute.ts`; `analytics/service.ts` loads everything in one pass. Buckets: daily up
  to 30 days, weekly for 90, monthly for 12 months. KPIs compare against the previous range of
  the same length.
- Sleep is per night, keyed by the wake-up day; tracked sleep wins over journal bed/wake times.
  Focus is weighted by session length. The funnel counts the furthest stage an application ever
  reached for every earlier stage too.
- Goals (`goals` table): study minutes (optionally per track — DB CHECK), problems solved or
  learning notes, per day / week (Monday) / month. The form takes hours for study.

## Settings, backup, PWA & shortcuts

- `/settings?tab=general|tracks|activities|data`. A new track can include its topics as an
  indented outline (`tracks-topics/outline.ts`: one per line, ≤ 4 levels, unique siblings), or
  start from a starter template; existing tracks' topics are edited on `/topics`. Password change verifies the current one and
  bumps `sessionVersion` (signs out everywhere), then redirects to `/login?password=changed`.
  Activity types with time entries can't be deleted — archive them. Track/activity colors come
  from the chart palette (`ColorChoice`).
- Backup = `GET/POST /api/backup` (route handlers: no Server Action body limit). Format in
  `backup/spec.ts` (`TABLES`, parents first). **Add every new user-owned table to `TABLES`,
  `readAll`, `deleteAll` and `INSERT` in `backup/repository.ts`** — `MODEL_TABLE` in
  `spec.ts` fails typecheck until you do; add a row to the round-trip test's `seed()` too. Import validates + remaps every id
  (`remap.ts`) before deleting anything, then replaces in one transaction. CSV via
  `/api/export/[kind]` with formula-injection escaping (`csv.ts`).
- PWA: `app/manifest.ts`, icons in `public/icons` (`node scripts/generate-icons.mjs public/icons`),
  `public/sw.js` only serves `/offline.html` when a navigation fails — never cache user data.
- Shortcuts: `components/shortcuts/keymap.ts` (pure matcher) + `keyboard-shortcuts.tsx` (help on
  `?`). Keys are ignored while typing, with modifiers, or when a dialog/menu is open.
- E2E: Next keeps the previous page mounted (hidden) after client redirects; `page.reload()`
  before asserting on a page reached by a redirect from a form.

## Charts & colors

- Series colors come from `src/lib/palette.ts` (validated categorical palette, light + dark
  steps). Assign slots in order; never invent hues. Use `seriesVars(hex)` + the `bg-series` /
  `border-series` utilities so dark mode uses the dark step.
- Text never uses a series color; every chart has a legend (≥2 series), hover/focus tooltips,
  and a table view. Run the dataviz palette validator before adding new chart colors.
- Shared charts live in `src/components/charts/` (`ColumnChart` + `TableView`, client
  `LineChart` with crosshair + arrow keys, `niceTicks`). Heatmap levels use the validated `HEAT`
  ramp; single-series charts use `ACCENT`, sleep uses `SLEEP`. SVG marks: `stroke-series` /
  `fill-series`.

## Rules

- Run `pnpm check` (and `pnpm build` for routing/config changes) before saying a task is done.
- Every service gets unit tests for its business rules; bug fixes get a regression test.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, `ci:`) —
  enforced by commitlint. One branch + PR per phase; never commit directly to `main`.
- No `any`; prefer `type` aliases; named exports except where Next requires default exports.
- Keep Client Components small and leaf-level; default to Server Components.
- Don't add dependencies without a reason noted in the PR description.
