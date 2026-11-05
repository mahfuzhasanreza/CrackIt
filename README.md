# CrackIt

Personal tracker for cracking interviews — software engineer / full-stack and university
lecturer prep. Tracks time (study, gaps, sleep, other), what was learned, checklists, problems,
applications and interviews.

- Product & architecture plan: [`PLAN.md`](./PLAN.md)
- Conventions for contributors / Claude Code: [`CLAUDE.md`](./CLAUDE.md)

## Requirements

- Node.js ≥ 22 (see `.nvmrc`)
- pnpm 9 (`corepack enable`)
- Docker (from Phase 1, for local PostgreSQL)

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm dev            # http://localhost:3000
```

## Scripts

```bash
pnpm check          # lint + typecheck + format check + unit tests
pnpm build          # production build
pnpm test:watch     # tests in watch mode
```

Health check: `GET /api/health`.
