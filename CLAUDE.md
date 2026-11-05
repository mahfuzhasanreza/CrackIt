@AGENTS.md

# CrackIt — conventions for Claude Code

Personal interview-prep tracker (SWE/full-stack + university lecturer). The full product and
architecture plan is in `PLAN.md`; implement it phase by phase (section 11).

## Stack

- Next.js 16 (App Router, Turbopack, `cacheComponents` + `partialPrefetching` on), React 19, TypeScript strict
- PostgreSQL 16 + Prisma 7 (local DB via Docker Compose on port 5433; prod on Neon)
- Auth.js v5 Credentials (email + password, JWT sessions, no public sign-up)
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
- `src/proxy.ts` only does optimistic redirects (signed JWT present). `/login` is always
  reachable so a stale JWT can't cause a redirect loop.
- Authoritative check = DAL: `getCurrentUser()` / `requireUser()` from `@/modules/auth/dal`
  (verifies the user still exists and `sessionVersion` matches). Call `requireUser()` in every
  page that shows user data **and** in every Server Action / Route Handler.
- Anything reading the session must render inside `<Suspense>` (Cache Components); never
  `await` the session at the top level of a layout.
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
- Learning entries revise at +1, +3, +7, +14, +30 days (`journal/spaced-repetition.ts`);
  "forgot" restarts the schedule. Tags are lower-cased per user; unused tags are deleted.

## Topics & checklists rules

- Roadmap progress counts leaf topics only (not started 0, learning ⅓, revising ⅔,
  confident 1); time per topic rolls up to parents (`tracks-topics/roadmap.ts`). Max 4 levels.
- Checklist `type` and `recurrence` are fixed after creation; HABIT ⇔ recurrence ≠ NONE (DB CHECK).
  Habits are ticked per period (logical day, or Monday of the week) in
  `checklist_item_completions`; other items use `done_at`. Streaks: `checklists/habits.ts`.

## Charts & colors

- Series colors come from `src/lib/palette.ts` (validated categorical palette, light + dark
  steps). Assign slots in order; never invent hues. Use `seriesVars(hex)` + the `bg-series` /
  `border-series` utilities so dark mode uses the dark step.
- Text never uses a series color; every chart has a legend (≥2 series), hover/focus tooltips,
  and a table view. Run the dataviz palette validator before adding new chart colors.

## Rules

- Run `pnpm check` (and `pnpm build` for routing/config changes) before saying a task is done.
- Every service gets unit tests for its business rules; bug fixes get a regression test.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, `ci:`) —
  enforced by commitlint. One branch + PR per phase; never commit directly to `main`.
- No `any`; prefer `type` aliases; named exports except where Next requires default exports.
- Keep Client Components small and leaf-level; default to Server Components.
- Don't add dependencies without a reason noted in the PR description.
