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
  Import types/enums from `@/generated/prisma/client` or `@/generated/prisma/enums`.
- Runtime client is `db` from `@/lib/db` (uses `@prisma/adapter-pg`). Repositories only.
- Constraints Prisma can't express (CHECK, `NULLS NOT DISTINCT`, partial/exclusion indexes):
  `pnpm db:migrate -- --create-only --name <name>`, then hand-edit the SQL. Keep the matching
  `@@unique`/`@@index` in the schema when one exists so Prisma doesn't see drift, and verify with
  `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`.
- Default tracks/topics/activity types are data in `src/modules/*/defaults.ts`; seeding logic is
  `prisma/seed-defaults.ts` (idempotent).

## Rules

- Run `pnpm check` (and `pnpm build` for routing/config changes) before saying a task is done.
- Every service gets unit tests for its business rules; bug fixes get a regression test.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, `ci:`) —
  enforced by commitlint. One branch + PR per phase; never commit directly to `main`.
- No `any`; prefer `type` aliases; named exports except where Next requires default exports.
- Keep Client Components small and leaf-level; default to Server Components.
- Don't add dependencies without a reason noted in the PR description.
