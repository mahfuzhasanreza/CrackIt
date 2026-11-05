# CrackIt

Personal tracker for cracking interviews — software engineer / full-stack and university
lecturer prep. Tracks time (study, gaps, sleep, other), what was learned, checklists, problems,
applications and interviews.

- Product & architecture plan: [`PLAN.md`](./PLAN.md)
- Conventions for contributors / Claude Code: [`CLAUDE.md`](./CLAUDE.md)

## Requirements

- Node.js ≥ 22 (see `.nvmrc`)
- pnpm 9 (`corepack enable`)
- Docker with the Compose plugin (local PostgreSQL)

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm db:up          # Postgres on :5433 (dev) and :5434 (tests), Adminer on :8080
pnpm db:deploy      # apply migrations
pnpm db:seed        # dev user + default tracks, topics, activity types
pnpm dev            # http://localhost:3000
```

Set `AUTH_SECRET` in `.env` (`openssl rand -base64 32`). Log in as the seeded dev user
`dev@crackit.local` / `crackit-dev-password`, or create your own account (there is no sign-up page):

```bash
pnpm user:create --email you@example.com --name "Your Name"   # prompts for a password (12+ chars)
pnpm user:reset-password --email you@example.com                # also signs out all sessions
```

## Scripts

```bash
pnpm check          # lint + typecheck + format check + unit tests
pnpm build          # production build
pnpm test:watch     # tests in watch mode
pnpm test:int       # integration tests against the test DB (needs `pnpm db:up`)
pnpm build && pnpm test:e2e   # Playwright e2e (uses the test DB on :5434)
```

Health check: `GET /api/health` (includes a database ping).
