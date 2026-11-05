# CrackIt

[![CI](https://github.com/mahfuzhasanreza/CrackIt/actions/workflows/ci.yml/badge.svg)](https://github.com/mahfuzhasanreza/CrackIt/actions/workflows/ci.yml)

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

## Deployment (Vercel + Neon)

Merging to `main` deploys to production; every PR gets a preview deployment with its own Neon
database branch. Vercel's build runs `pnpm vercel-build` (`prisma migrate deploy && next build`),
so migrations are applied before a deployment goes live. After each deployment,
`.github/workflows/deploy.yml` smoke-tests `/api/health` and `/login`.

One-time setup:

1. **Vercel:** import the GitHub repo (framework and build command come from `vercel.json`).
2. **Neon:** in Vercel → Integrations, add **Neon** and connect it to the project with
   "Create a database branch for each preview deployment" on. It sets `DATABASE_URL` (pooled) and
   `DATABASE_URL_UNPOOLED` (direct, used by migrations) for Production and every preview.
3. **Env vars** (Vercel → Settings → Environment Variables, Production + Preview):
   `AUTH_SECRET` (`openssl rand -base64 32`; use a different value for Preview).
4. **First user** (there's no sign-up page), from your machine:
   `DATABASE_URL="<Neon direct URL>" pnpm user:create --email you@example.com`
5. **GitHub secrets** (Settings → Secrets and variables → Actions):
   - `BACKUP_DATABASE_URL`: the Neon production _direct_ URL, and `BACKUP_PASSPHRASE`: a long
     random passphrase (keep a copy in your password manager). Used by the nightly
     `backup.yml`, which stores an encrypted `pg_dump` as a 30-day workflow artifact.
   - Optional `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel → Deployment Protection → Protection
     Bypass for Automation) to smoke-test protected preview deployments too.

Migrations must be backward compatible with the running code (add first, remove in a later
deploy): a migration can succeed while the build after it fails, leaving the old code live.

### Docker (any container host)

```bash
docker build -t crackit .                              # the Next.js server (standalone output)
docker build --target migrate -t crackit-migrate .     # `prisma migrate deploy`
docker run --rm -e DATABASE_URL crackit-migrate
docker run -p 3000:3000 -e DATABASE_URL -e AUTH_SECRET crackit
```

CI builds both images and smoke-tests them against Postgres.
