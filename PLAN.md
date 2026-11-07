# CrackIt - Interview Prep Tracker: Implementation Plan

A personal, single-user (multi-user-ready) web app to track everything in the job hunt:
**Software Engineer / Full-Stack prep** and **University Lecturer prep** — time (study, gaps,
sleep, other), what was learned, checklists, problems solved, applications and interviews.

---

## 1. Goals & Non-Goals

**Goals**

- Track 100% of each day: study per track/topic, breaks/gaps, sleep, other activities.
- One-click timer that survives refresh/closing the tab (state lives in the DB).
- Log what was learned, checklists/roadmaps, DSA problems, mock interviews, teaching demos.
- Track applications (industry + academic) and every interview round.
- Analytics: hours per day/week/track, streaks, sleep trend, untracked time, goal vs actual.
- Production-grade: Docker, CI/CD, tests, migrations, backups.

**Non-Goals (v1)**

- Native mobile app (the site will be a responsive PWA instead).
- Social / multi-tenant features (schema keeps `user_id` everywhere so it's possible later).

---

## 2. Tech Stack

| Concern          | Choice                                                                                                                   | Why                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Framework        | **Next.js 16 (App Router, Turbopack, Cache Components) + TypeScript (strict)**                                           | Server Components + Server Actions, one deployable                                                                                      |
| DB               | **PostgreSQL 16** — local: Docker; prod: **Neon** (via Vercel Marketplace)                                               | Relational data, `timestamptz`, partial indexes, good aggregation; Neon is serverless-friendly and has DB branching for preview deploys |
| ORM / migrations | **Prisma ORM + Prisma Migrate**                                                                                          | Typed client, `schema.prisma` as single source of truth, SQL migration files in git                                                     |
| Validation       | **Zod**                                                                                                                  | Shared schemas for forms, actions and API                                                                                               |
| Auth             | **Auth.js (NextAuth v5) Credentials provider** — email + password, hashed with **bcryptjs/argon2**, JWT sessions         | Private site; public sign-up disabled                                                                                                   |
| UI               | **Tailwind CSS + shadcn/ui + lucide icons**                                                                              | Fast, consistent, accessible                                                                                                            |
| Forms            | react-hook-form + zod resolver                                                                                           |                                                                                                                                         |
| Charts           | Recharts                                                                                                                 | Daily/weekly bars, 24h timeline, heatmap                                                                                                |
| Client data      | TanStack Query (only for live widgets: timer, dashboard refresh)                                                         |                                                                                                                                         |
| Dates            | date-fns + date-fns-tz                                                                                                   | Store UTC, render in user tz (e.g. `Asia/Dhaka`)                                                                                        |
| Markdown notes   | `react-markdown` + simple textarea/editor                                                                                | Learning notes                                                                                                                          |
| Testing          | **Vitest** (unit/integration), **Testcontainers or CI Postgres service**, **Playwright** (e2e)                           |                                                                                                                                         |
| Lint/format      | ESLint + Prettier, Husky + lint-staged, commitlint (Conventional Commits)                                                |                                                                                                                                         |
| Logging          | pino (JSON logs)                                                                                                         |                                                                                                                                         |
| Container        | Docker Compose for local Postgres; multi-stage Dockerfile (`output: "standalone"`) kept as a portable, CI-verified build | Same DB locally as prod; no vendor lock-in                                                                                              |
| CI               | GitHub Actions (lint, typecheck, tests, build, e2e, Docker build)                                                        | Quality gate on every PR                                                                                                                |
| CD / Hosting     | **Vercel** — preview deploy per PR, production on `main`, migrations run by GitHub Actions                               | Zero-ops HTTPS, CDN, previews                                                                                                           |
| Rate limiting    | Login-attempt table in Postgres (or Upstash Redis later)                                                                 | Protects the credentials login                                                                                                          |
| Package manager  | pnpm                                                                                                                     |                                                                                                                                         |

---

## 3. Architecture

**Modular monolith, feature-based, layered.** Each feature module owns its schema,
validation, data access, business logic, server actions and UI.

```
UI (Server/Client Components)
   │  calls
Server Actions / Route Handlers   ← auth check, Zod validation, revalidatePath
   │  calls
Services (business rules)         ← e.g. "only one running timer", split at midnight, streaks
   │  calls
Repositories (Prisma queries)     ← only layer that touches the DB
   │
PostgreSQL
```

Rules

- Components never import `prisma` directly; only repositories do. One shared `PrismaClient` singleton in `src/lib/db.ts` (avoids connection exhaustion during dev hot-reload and on serverless).
- Next 16 renamed middleware to **`src/proxy.ts`**, which runs on the Node.js runtime, so it can call `auth()` directly — no edge-safe config split needed. Proxy does only optimistic redirects; real authorization is re-checked in every Server Action / data access.
- All timestamps stored as `timestamptz` (UTC). Day boundaries computed in the user's timezone.
- Every table has `user_id`, `created_at`, `updated_at`; queries always filter by `user_id`.
- Server Actions return a typed `Result<T>` (`{ ok: true, data } | { ok: false, error }`).

### Folder structure

```
crackit/
├─ .github/workflows/        ci.yml, deploy.yml, backup.yml
├─ prisma/
│  ├─ schema.prisma          all models (grouped by module with comments)
│  ├─ migrations/            generated SQL migrations (committed)
│  └─ seed.ts                tracks, topics, activity types
├─ scripts/                  create-user.ts, reset-password.ts (CLI, no public sign-up)
├─ e2e/                      Playwright tests
├─ public/                   manifest.json, icons (PWA)
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/
│  │  ├─ (app)/              protected layout (sidebar + active-timer bar)
│  │  │  ├─ dashboard/
│  │  │  ├─ timer/
│  │  │  ├─ timeline/        day view / calendar of time entries
│  │  │  ├─ journal/         daily log + "what I learned"
│  │  │  ├─ checklists/
│  │  │  ├─ problems/        DSA tracker
│  │  │  ├─ topics/          roadmap per track
│  │  │  ├─ applications/    kanban pipeline
│  │  │  ├─ interviews/
│  │  │  ├─ lecturer/        teaching demos, research, publications
│  │  │  ├─ resources/
│  │  │  ├─ analytics/
│  │  │  └─ settings/
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/
│  │  │  ├─ health/          for Docker/CI health checks
│  │  │  └─ export/          JSON/CSV export
│  │  └─ layout.tsx
│  ├─ modules/
│  │  ├─ time-tracking/  { validators.ts, repository.ts, service.ts, actions.ts, components/ , __tests__/ }
│  │  ├─ tracks-topics/
│  │  ├─ journal/
│  │  ├─ checklists/
│  │  ├─ problems/
│  │  ├─ applications/
│  │  ├─ interviews/
│  │  ├─ lecturer/
│  │  ├─ resources/
│  │  ├─ goals/
│  │  └─ analytics/      (read-only service over the others; SQL aggregations)
│  ├─ components/ui/         shadcn components
│  ├─ lib/                   db.ts (Prisma singleton), password.ts, env.ts (zod-validated env), logger.ts, dates.ts, result.ts
│  ├─ auth.ts                Auth.js config: Credentials provider + Prisma user lookup
│  └─ proxy.ts               (Next 16 replacement for middleware) optimistic redirect of (app) routes
├─ Dockerfile                portable production build (verified in CI)
├─ docker-compose.yml        dev: postgres + postgres-test + adminer
├─ vercel.json               (optional) region close to Neon DB
├─ CLAUDE.md                 conventions for Claude Code
└─ .env.example              DATABASE_URL, DIRECT_URL, AUTH_SECRET, ...
```

---

## 4. Data Model (PostgreSQL)

### Core

- **users** — id, email (unique), password_hash, name, timezone (default `Asia/Dhaka`), day_start_hour (e.g. 4 = day "ends" at 4 AM for night owls), created_at
- **login_attempts** — id, email, ip, success, created_at (rate limit: e.g. 5 failures / 15 min → lockout)
- **tracks** — id, user_id, name (`SWE / Full-Stack`, `University Lecturer`), color, target_hours_per_week, is_active
- **topics** — id, user_id, track_id, parent_id (tree), name, status (`not_started|learning|revising|confident`), priority, order
  - SWE seed: DSA (Arrays, Graphs, DP…), System Design, JavaScript/TS, React/Next.js, Node/Backend, Databases, OS/Networking, Behavioral
  - Lecturer seed: Subject knowledge (per course), Teaching demo, Lesson planning, Research & publications, Viva/Board questions, Written test, CV/teaching statement

### Time tracking (the heart of the app)

- **activity_types** — id, user_id, name, color, category (`study|sleep|break|work|exercise|personal|other`), is_productive
  - seed: Study, Sleep, Break/Gap, Meal, Exercise, Commute, Prayer, Social/Phone, Other
- **time_entries** — id, user_id, activity_type_id, track_id?, topic_id?, started_at, ended_at (NULL = running), source (`timer|manual`), note, focus_rating (1–5), interruptions
  - Partial unique index: `UNIQUE(user_id) WHERE ended_at IS NULL` → only one running timer
  - Check: `ended_at > started_at`
  - Overlap prevention in service layer (or Postgres exclusion constraint with `tstzrange` + `btree_gist`)
  - Prisma can't express partial indexes / check / exclusion constraints in `schema.prisma`: create the migration with `prisma migrate dev --create-only`, then add the raw SQL to that migration file.
- **Gap / untracked time** is computed, not stored: `24h − Σ(tracked)` per day; the timeline shows grey holes you can click to fill.
- **pomodoro_settings** (optional) on user settings.

### Learning & journal

- **daily_logs** — id, user_id, date (unique per user), mood, energy, sleep_quality, wake_time, bed_time, plan_for_day, reflection, wins, blockers
- **learning_entries** — id, user_id, date, track_id, topic_id?, title, content_md, source_url, confidence (1–5), revisit_at (spaced repetition)
- **tags** + **learning_entry_tags**, **problem_tags** (generic tagging)

### Checklists & goals

- **checklists** — id, user_id, track_id?, title, type (`roadmap|daily_habit|one_off`), recurrence (`none|daily|weekly`)
- **checklist_items** — id, checklist_id, title, order, due_date, priority, done_at
- **checklist_item_completions** — item_id, date (for recurring daily habits / streaks)
- **goals** — id, user_id, track_id?, metric (`hours|problems|entries`), period (`day|week|month`), target, starts_on, ends_on

### SWE prep

- **problems** — id, user_id, title, platform (LeetCode/Codeforces/…), url, difficulty, patterns[] (tags), status (`todo|attempted|solved|needs_revision`), time_spent_min, solved_at, attempts, notes_md, next_review_at
- **projects** (portfolio) — name, repo_url, live_url, stack, status, notes

### Lecturer prep

- **teaching_demos** — id, user_id, topic, course, date, duration_min, audience (self/recorded/mock panel), self_score, feedback, recording_url
- **publications** — title, venue, status (`idea|writing|submitted|accepted|published`), submitted_at, url
- **courses** (subjects you may teach) — name, code, syllabus_url, readiness (1–5)

### Job hunt

- **organizations** — name, type (`company|university`), website, location, notes
- **applications** — id, user_id, organization_id, track_id, role, job_url, source, status (`wishlist|applied|oa|interviewing|offer|rejected|withdrawn`), applied_at, salary_range, deadline, notes
- **application_events** — application_id, status_from, status_to, at (pipeline history)
- **interviews** — id, application_id, round (`screening|OA|technical|system_design|behavioral|HR|teaching_demo|viva|written`), scheduled_at, duration_min, interviewer, questions_md, my_answers_md, outcome, self_rating, lessons_learned
- **mock_interviews** — date, platform/partner, type, score, feedback

### Resources

- **resources** — title, type (`book|course|video|article|sheet`), url, track_id, total_units, completed_units, status

### Key indexes

- `time_entries(user_id, started_at)`, `learning_entries(user_id, date)`, `problems(user_id, status)`, `applications(user_id, status)`, `interviews(scheduled_at)`.

---

## 5. Features & Pages

| Page                 | What it does                                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**        | Running timer, today's 24h ring/timeline (study/sleep/gap/other), today's checklist, hours this week vs goal per track, current streak, upcoming interviews & revision due |
| **Timer**            | Start/stop/switch activity in one click; pick track + topic; Pomodoro mode; keyboard shortcuts; persistent top bar on every page                                           |
| **Timeline**         | Day view (24h vertical blocks) + week/month calendar; add/edit manual entries; click gaps to fill; entries crossing midnight split visually                                |
| **Journal**          | Daily log (sleep, mood, plan, reflection) + "What I learned" entries with markdown, tags, revisit dates                                                                    |
| **Topics / Roadmap** | Tree per track with status; progress %; time spent per topic                                                                                                               |
| **Checklists**       | Roadmaps, one-off lists, daily habits with streaks                                                                                                                         |
| **Problems**         | DSA table with filters (pattern, difficulty, status), revision queue                                                                                                       |
| **Lecturer**         | Teaching demos, course readiness, publications, viva question bank                                                                                                         |
| **Applications**     | Kanban by status, drag-and-drop, history                                                                                                                                   |
| **Interviews**       | Calendar + detail page with questions asked & lessons learned                                                                                                              |
| **Resources**        | Books/courses progress                                                                                                                                                     |
| **Analytics**        | Hours/day stacked bars, track split, GitHub-style heatmap, sleep trend, avg gap, focus rating, problems/week, application funnel                                           |
| **Settings**         | Timezone, day start hour, activity types, tracks, goals, export/import JSON/CSV                                                                                            |

---

## 6. Key Business Rules

1. Only one running timer; starting a new one auto-stops the current one (in a DB transaction).
2. Manual entries cannot overlap existing ones (validation error shows the conflict).
3. "Day" = `[day_start_hour, next day's day_start_hour)` in the user's timezone; entries are split at boundaries for reports.
4. Gap = untracked time within the day (plus the explicit "Break/Gap" activity reported separately).
5. Sleep: either tracked as an entry or derived from daily_log bed/wake times (entry wins).
6. Streak = consecutive days with study time ≥ configured minimum (e.g. 1 h).
7. Spaced repetition for problems/learning: next review at +1, +3, +7, +14, +30 days on each successful review.

---

## 7. Docker

Vercel builds and runs the app itself, so Docker's job here is **local development parity + a portable build**:

- **docker-compose.yml (dev)**: `postgres:16` (port 5432, named volume), `postgres-test` (port 5433, tmpfs, for integration tests), `adminer` (DB UI). App runs locally with `pnpm dev`.
- **Dockerfile** (multi-stage): `deps` (pnpm install --frozen-lockfile) → `builder` (`prisma generate` + `pnpm build`, Next `output: "standalone"`) → `runner` (node:22-alpine, non-root user, `HEALTHCHECK` hitting `/api/health`). Built in CI on every PR so you can move off Vercel to any VPS/Fly/Railway any time.
- `src/lib/env.ts` validates env vars with Zod at startup; `.env` files never committed.

---

## 8. CI/CD (GitHub Actions + Vercel)

**Branching**: `main` (production) + short-lived feature branches → PR → squash merge. Conventional commits. Branch protection on `main`: CI must pass.

**Environments**

|                   | Database                                              | App                |
| ----------------- | ----------------------------------------------------- | ------------------ |
| Local             | Docker Postgres                                       | `pnpm dev`         |
| CI                | Postgres service container                            | built app for e2e  |
| Preview (each PR) | Neon branch (auto-created by Neon–Vercel integration) | Vercel preview URL |
| Production        | Neon `main` branch                                    | Vercel production  |

**Neon + Prisma connection strings**

- `DATABASE_URL` = Neon **pooled** URL (`-pooler` host) → used by the app at runtime.
- `DIRECT_URL` = Neon **direct** URL → used by the Prisma CLI (`migrate`, `studio`, `db seed`). Prisma 7 no longer has `directUrl` in `schema.prisma`; `prisma.config.ts` picks `DIRECT_URL ?? DATABASE_URL`, and the app connects through the `@prisma/adapter-pg` driver adapter with `DATABASE_URL`.

**`ci.yml`** — on every PR and push:

1. Checkout, setup pnpm + Node 22, cache.
2. `pnpm install` (runs `prisma generate` via `postinstall`).
3. `pnpm lint` · `pnpm typecheck` · `pnpm format:check`
4. Postgres service container → `prisma migrate deploy` → `pnpm test` (Vitest + coverage).
5. `pnpm build`
6. Playwright e2e against the built app (seeded test user).
7. `docker build` (no push) to keep the Dockerfile healthy.
8. Dependabot + CodeQL (optional).

**Deploy flow (Vercel Git integration does the deploy; Actions does the migrations)**

- PR opened → Vercel builds a **preview**; Neon creates a DB branch; the preview's build command runs `prisma migrate deploy && next build` against that branch.
- Merge to `main` → `deploy.yml` runs `prisma migrate deploy` against production `DIRECT_URL` (GitHub secret) **first**, then triggers the production deploy with `vercel deploy --prod` (Vercel CLI + `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`), then smoke-tests `/api/health`. (Disable Vercel's automatic production deploys from Git so prod never deploys before migrations.)
- Migrations must be backward-compatible (expand → migrate → contract) because the old version keeps serving during deploy.
- Rollback: Vercel "Instant Rollback" for the app; for the DB, Neon point-in-time restore.

**Backups**: Neon has point-in-time restore (limited history on free tier) — additionally `backup.yml` runs a scheduled GitHub Action (daily) that does `pg_dump` of production and stores it as an encrypted artifact (or pushes to Cloudflare R2/S3).

---

## 9. Testing Strategy

- **Unit** (Vitest): services — timer rules, overlap detection, day splitting across midnight/timezone, streaks, gap calculation, spaced repetition.
- **Integration**: repositories + actions against a real Postgres (CI service / Testcontainers).
- **E2E** (Playwright): login → start timer → switch activity → stop → see entry on timeline; add learning entry; move application on kanban.
- Target: ≥80% coverage on `modules/*/service.ts`.

---

## 10. Security & Quality

- **Email + password auth**: Auth.js Credentials provider (requires `session: { strategy: "jwt" }`); passwords hashed with argon2id (or bcryptjs, cost 12); constant-time comparison and a generic "invalid email or password" error.
- **Sign-up**: originally CLI-only (`pnpm user:create`); open registration at `/register` was added later (rate-limited per IP; new accounts get the starter tracks). `pnpm user:reset-password` for resets; password change lives in Settings.
- Login rate limit + lockout via `login_attempts`; strong `AUTH_SECRET`; secure, httpOnly cookies (default in Auth.js).
- All routes under `(app)` protected by `proxy.ts`; every action re-checks `auth()` → Zod parse → service; ownership check by `user_id`.
- Security headers (CSP, X-Frame-Options, Referrer-Policy) in `next.config.ts`; HTTPS/HSTS handled by Vercel.
- Secrets only in Vercel env vars / GitHub secrets; Neon DB requires SSL; daily backups with a tested restore script.
- Accessibility: shadcn/Radix primitives, keyboard shortcuts for timer.

---

## 11. Implementation Phases (each = one or more Claude Code sessions / PRs)

| Phase                           | Deliverable                                                                                                                                               | Done when                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **0. Foundation**               | `create-next-app` (TS, Tailwind, App Router, src/), pnpm, ESLint/Prettier, Husky, shadcn init, `env.ts`, folder structure, `CLAUDE.md`                    | `pnpm dev` runs, lint passes                     |
| **1. DB & Docker dev**          | docker-compose (Postgres), Prisma setup, users/tracks/topics/activity_types models, first migration, seed script                                          | `pnpm db:migrate && pnpm db:seed` works          |
| **2. Auth & layout**            | Auth.js Credentials (email + password), password hashing, `user:create` script, login rate limit, protected `(app)` layout, sidebar, theme toggle         | You can log in; wrong passwords are rate-limited |
| **3. Time tracking (MVP core)** | time_entries schema, service (single running timer, overlap check, midnight split), timer bar, timeline day view, manual entry CRUD                       | Can track a full day incl. sleep & gaps          |
| **4. CI**                       | `ci.yml` with lint/typecheck/test/build + Postgres service; unit tests for timer service                                                                  | Green CI on PR                                   |
| **5. Dashboard v1**             | Today breakdown, week hours per track, streak                                                                                                             | Dashboard shows real data                        |
| **6. Journal & learning log**   | daily_logs, learning_entries, tags, markdown                                                                                                              |                                                  |
| **7. Topics & checklists**      | Topic tree per track, checklists, daily habits                                                                                                            |                                                  |
| **8. Deploy (Vercel + Neon)**   | Vercel project, Neon integration (preview DB branches), env vars, `deploy.yml` (migrate → deploy → smoke test), Dockerfile, `backup.yml`, health endpoint | Merge to main = live site                        |
| **9. SWE prep**                 | Problems tracker + revision queue, projects                                                                                                               |                                                  |
| **10. Lecturer prep**           | Teaching demos, courses, publications, viva bank                                                                                                          |                                                  |
| **11. Job hunt**                | Organizations, applications kanban, interviews, mock interviews                                                                                           |                                                  |
| **12. Analytics**               | Charts, heatmap, funnel, goals vs actual                                                                                                                  |                                                  |
| **13. Polish**                  | PWA (installable on phone), export/import, keyboard shortcuts, Playwright e2e suite                                                                       |                                                  |

> Deploy early (Phase 8 can move right after Phase 3) so you start using the timer daily while building the rest.

---

## 12. How to drive this with Claude Code

1. Keep this file as `PLAN.md` in the repo root.
2. Phase 0: ask Claude Code to scaffold and create `CLAUDE.md` containing: stack, folder rules (section 3), layer rules, commands (`pnpm dev|lint|typecheck|test|db:migrate|db:seed|db:studio|user:create`), "always add tests for services", "use Conventional Commits".
3. For each phase, prompt like:
   > "Implement Phase 3 from PLAN.md (time tracking). Follow the architecture in CLAUDE.md. Add the Prisma models + migration (with raw SQL for the partial unique index), the service with unit tests for the business rules in section 6, server actions, and the UI. Run lint, typecheck and tests before finishing."
4. One branch + PR per phase; let CI verify before merging.
5. Use `/code-review` on each branch before merging.

---

## 13. Decisions

| Decision | Choice                                                    | Date       |
| -------- | --------------------------------------------------------- | ---------- |
| Auth     | Email + password (Auth.js Credentials, no public sign-up) | 2026-11-05 |
| Hosting  | Vercel (app) + Neon (Postgres)                            | 2026-11-05 |
| ORM      | Prisma                                                    | 2026-11-05 |

Still open (not blocking): track expenses/health later? (Easy to add as new activity types/modules.)
