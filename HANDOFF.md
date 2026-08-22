# Session handoff — FPL AI Picker

Written to carry context into a new chat. Covers everything built/fixed since the initial scaffold,
current state, and the one known open problem.

## What exists now

A working Next.js 16 (App Router) + Prisma/Postgres + NextAuth app, mobile-first, matching the
design reference in `Reference/FPL AI Picker.dc.html`. Five nav tabs: **Points, Pick Team,
Transfers, Fixtures, Settings** (mirrors the real FPL app's tab bar). Auth flows (login/register/
onboarding) and the three AI recommendation modes (XI, Transfer, Build) are folded into the pages
they belong to rather than a standalone "AI mode picker" landing page.

Docker Compose (`app` + `postgres`) deploys via Dokploy per the original plan. Local Postgres runs
on host port **5433** (5432 was already taken by another project).

## Major work done this session, roughly in order

1. **Backend scaffold** (Next.js, Prisma schema, NextAuth Credentials/JWT, FPL proxy, OpenRouter
   gateway, deterministic squad validator) — see `README.md` for the up-to-date file map.
2. **Gameweek bug fix**: `lib/gameweek.ts` now has two functions instead of one —
   `pickableGameweek()` (the last GW FPL has actually published picks/points for) and
   `targetGameweek()` (the next actionable deadline, for recommendations). They're often different
   gameweeks; conflating them broke squad fetching entirely.
3. **AI reliability**: `lib/openrouter.ts` races every model in the fallback chain in parallel
   (first valid response wins, losers get cancelled) instead of trying them sequentially — a
   sequential chain was measured taking up to 2.4 minutes and still failing. Default model list
   re-verified live against a realistic prompt (not just "say OK") on 2026-08-22:
   `liquid/lfm-2.5-2.6b:free`, `nvidia/nemotron-3-super-120b-a12b:free`,
   `nvidia/nemotron-nano-9b-v2:free`, `z-ai/glm-5.2:free`. Per-attempt diagnostics logged
   server-side (`OpenRouter: trying X…` / `succeeded in Yms`) and returned in the 503 body.
   **Known residual issue**: XI (small prompt, ~15 players) is reliably fast now (~15-20s). Build/
   Transfer (larger candidate prompts) are still noticeably less reliable — free-tier model
   quality degrades with prompt size. Candidate pool already trimmed to 6/position to help.
4. **Shared (non-team) FPL data caching**: every endpoint that isn't team-specific
   (bootstrap-static, fixtures, event-live) goes through `lib/fpl.ts`'s `cached()` wrapper
   (Postgres-backed, 40-min TTL) and is proactively re-warmed every 30 minutes by
   `lib/cache-refresh.ts` + `src/instrumentation.ts` (Next's official startup hook — no extra
   container needed). Verified working under `next dev`, `next start`, and the actual
   `node .next/standalone/server.js` entrypoint the Dockerfile uses.
5. **Team-specific data caching**: `SquadSnapshot` is now the read path for squad data —
   `getStoredSquad()` reads the latest snapshot (auto or manual) and re-joins it against the
   (already-cached) bootstrap/live/fixtures data, so prices/points/fixtures stay current even
   though composition is read from storage. `refreshSquadFromFpl()` — wired to an explicit
   **Refresh button** (`RefreshSquadButton`, shows "Synced Xm ago") — is now the *only* code path
   that calls FPL live for team-specific data. `GET /squad` dropped from 400–2600ms to ~195ms.
   Side effect (not a bug): a manual edit (squad editor / manual transfer) is now what every page
   shows until you hit Refresh, since it's just "the latest snapshot" like an auto-pull.
6. **UX overhaul** (most recent chunk):
   - `ClubBadge` — one shared crest-badge component (was duplicated ad-hoc in ~6 places) on a
     **light gray** backdrop, not white — half the crest SVGs use `fill="white"` for parts of
     their design and vanished on a pure-white circle. Found this live, not in a design doc.
   - Pitch goal-box decoration moved from bottom to top (next to the GK row, which was already in
     the correct position — don't reverse row order, only the decoration was wrong).
   - Points page pitch chips: crest+name+points only, no price. Click a player → real per-gameweek
     goals/assists/bonus/clean-sheet breakdown (from data already fetched, no new API calls).
   - Pick Team / Build: new Price / Next game / Next 3 toggle on the pitch view.
   - Transfers: Off / Next game / Next 3 fixtures toggle, but price *always* shown (explicit user
     requirement — budget matters when comparing transfer targets). Mobile pitch rows no longer
     wrap — chips are `flex-1 min-w-0` and shrink together instead (verified at 375px width).
   - Click-to-detail everywhere (Pick Team + Transfers, both pitch and table): fixtures, season
     total, last-3-GW points — lazily fetched from a new `GET /api/fpl/player/[id]/history` route
     (itself cached the same way as everything else — `getElementSummary` had been defined but
     never called until now).
   - Fixtures page: real crests instead of colored text chips.
   - Found and fixed a real crash in passing: `/`, `/squad`, `/transfers` used `session!.user.id`
     without a null check (would hard-crash instead of redirecting to `/login` if the session was
     ever null). Now guarded consistently with the other pages.

## Known open problem: SquadSnapshot row growth

**Not fixed yet — this is the next thing to pick up.** Every `refreshSquadFromFpl()` call (Refresh
button, or first-time auto-seed) and every manual save (`saveManualSquad`, used by the squad
editor, manual transfers, and "use this AI squad") does `prisma.squadSnapshot.create` — a plain
insert, no dedup, no cap. Already 230+ rows from testing alone in ~24 hours. `getStoredSquad()`
only ever reads the single latest row, so everything older is pure clutter with no current read
benefit.

Two things worth deciding together, not separately:
- **Dedup**: skip the insert if the new picks/bank/teamValue are identical to the current latest
  snapshot (common case: user clicks Refresh but nothing's changed since the last sync).
- **Retention**: even with dedup, real changes accumulate over a season. Either cap to the last N
  rows per user, or prune anything older than some age, on a schedule (could piggyback on the
  existing 30-min `lib/cache-refresh.ts` job, or a separate lighter one).

One constraint to keep in mind: the original plan (§v2, in `AGENTS.md`'s referenced planning doc)
explicitly left room for a **team planner** feature later — "setting squads up to 3 gameweeks
ahead" — which would want *some* historical/future snapshot data to exist per gameweek. Don't
design the fix in a way that forecloses that (e.g. a hard "only ever keep 1 row per user" upsert
would need revisiting then) — a retention window (e.g. keep last 10, or last 60 days) is safer than
a hard single-row upsert.

## Heads up: concurrent work

Another session has been actively modifying this codebase in parallel throughout — club crest
assets, `lib/club-logos.ts`, and (as of right when this was written) a new `javascript-lp-solver`
dependency just appeared in `package.json`, suggesting squad-optimization work is in progress
elsewhere. A fresh session should re-read files before editing rather than trusting this document's
descriptions of exact current file contents — the *architecture and decisions* above should still
hold, but line-level details may have moved.

## Orientation for a fresh session

- `README.md` has the up-to-date file map and local dev setup (docker-compose port 5433, env vars).
- `prisma/schema.prisma` — current data model, two migrations applied since the original scaffold
  (`add_fpl_team_name`, `add_squad_snapshot_points`).
- `.env` has `OPENROUTER_API_KEY` already set (gitignored, not in this file).
- No outstanding plan file — the plan mode file at
  `~/.claude/plans/tingly-scribbling-piglet.md` covered the just-completed UX overhaul and has been
  fully executed; safe to ignore/overwrite in a new session.
- `npm run build && npm run lint` were clean as of the end of this session.
