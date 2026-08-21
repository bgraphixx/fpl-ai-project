# FPL AI Picker

A multi-user Next.js app that uses an LLM (via OpenRouter free models) reasoning over
live official FPL data to help a small group of friends make Fantasy Premier League
decisions: gameweek XI + captain, transfer suggestions, and full squad builds. See
`Reference/FPL AI Picker.dc.html` for the UI design catalog.

## Stack

- Next.js (App Router) — React frontend + API routes, no separate backend
- Postgres via docker-compose, Prisma as the ORM
- NextAuth (Auth.js) v5, Credentials provider, JWT sessions
- OpenRouter for AI, called server-side only, with a configurable model fallback chain

## Local development

1. Start Postgres:

   ```bash
   docker compose up -d postgres
   ```

   This maps to host port **5433** (5432 is often already taken by another local
   project). See `docker-compose.yml`.

2. Copy the env file and fill in secrets:

   ```bash
   cp .env.example .env
   ```

   Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`. Get an `OPENROUTER_API_KEY`
   from https://openrouter.ai/. Verify the current free-tier model lineup at
   https://openrouter.ai/models?max_price=0 and set `OPENROUTER_MODELS` if the defaults
   in `src/lib/openrouter.ts` are stale.

3. Apply the database schema:

   ```bash
   npm run db:migrate
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

## Project layout

- `src/lib/fpl.ts` — FPL API proxy + DB-backed cache (bootstrap-static, fixtures cached;
  entry picks fetched fresh every time since they reflect the user's own transfers)
- `src/lib/openrouter.ts` — OpenRouter gateway with a model fallback chain (429/5xx on one
  model falls through to the next)
- `src/lib/signals.ts` — builds the per-player signals (form, fixture difficulty, xGI,
  injury news, price trend, ownership) the AI reasons over
- `src/lib/prompts.ts` — prompt builders for the three modes, asking for structured JSON output
- `src/lib/fpl-rules.ts` — deterministic FPL squad/formation/budget/transfer-cost validator;
  the LLM proposes, this validates, invalid proposals are rejected before being shown
- `src/app/api/recommend/{xi,transfer,build}` — the three recommendation modes
- `src/app/api/squad` — auto-pulls a squad from FPL and stores a snapshot; manual edits
  are sent directly to the recommend routes as a request-scoped override rather than
  overwriting the stored snapshot (see plan §6)
- `prisma/schema.prisma` — data model (see plan §8)

## Deployment

Docker Compose stack (`app` + `postgres`), intended for Dokploy. See `Dockerfile` and
`docker-compose.yml`. Required production env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`,
`NEXTAUTH_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODELS`.

## Open questions

See plan §10 — notably: exact free OpenRouter model shortlist (verify live), whether to
prune old `Recommendation` rows over time, and confirming FPL's current starting-XI
formation rules and `bootstrap-static` field names each season.
