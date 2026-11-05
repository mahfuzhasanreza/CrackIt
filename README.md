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

## Scripts

```bash
pnpm check          # lint + typecheck + format check + unit tests
pnpm build          # production build
pnpm test:watch     # tests in watch mode
```

Health check: `GET /api/health` (includes a database ping).
