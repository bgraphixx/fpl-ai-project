import { prisma } from "@/lib/prisma";
import { pickableGameweek, targetGameweek } from "@/lib/gameweek";

const FPL_BASE = "https://fantasy.premierleague.com/api";

// TTLs give headroom over the 30-minute background refresh (lib/cache-refresh.ts)
// so a single missed or slow cron cycle still serves cached data instead of
// falling back to a live FPL call mid-request.
const BOOTSTRAP_TTL_MS = 40 * 60 * 1000;
const FIXTURES_TTL_MS = 40 * 60 * 1000;
const ELEMENT_SUMMARY_TTL_MS = 40 * 60 * 1000;
const EVENT_LIVE_TTL_MS = 40 * 60 * 1000;
const LEAGUE_STANDINGS_TTL_MS = 15 * 60 * 1000;

async function fplFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${FPL_BASE}${path}`, {
    headers: { "User-Agent": "fpl-ai-picker/1.0" },
  });
  if (!res.ok) {
    throw new Error(`FPL request failed: ${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function writeCache<T>(key: string, ttlMs: number, payload: T): Promise<T> {
  const now = new Date();
  await prisma.fplCache.upsert({
    where: { key },
    create: { key, payload: payload as object, fetchedAt: now, expiresAt: new Date(now.getTime() + ttlMs) },
    update: { payload: payload as object, fetchedAt: now, expiresAt: new Date(now.getTime() + ttlMs) },
  });
  return payload;
}

async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = await prisma.fplCache.findUnique({ where: { key } });
  if (hit && hit.expiresAt > new Date()) {
    return hit.payload as T;
  }
  return writeCache(key, ttlMs, await fetcher());
}

// Bypasses the TTL check and always hits FPL, overwriting the cache — used
// by the background refresh job (lib/cache-refresh.ts) so requests almost
// never need to fall back to a live call.
async function forceRefresh<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  return writeCache(key, ttlMs, await fetcher());
}

// Full player/team/gameweek dataset. Changes slowly (prices, news) — cached.
export function getBootstrapStatic() {
  return cached("bootstrap-static", BOOTSTRAP_TTL_MS, () => fplFetch("/bootstrap-static/"));
}

// All fixtures, or fixtures for a single gameweek when `event` is given.
export function getFixtures(event?: number) {
  const key = event ? `fixtures:${event}` : "fixtures:all";
  const path = event ? `/fixtures/?event=${event}` : "/fixtures/";
  return cached(key, FIXTURES_TTL_MS, () => fplFetch(path));
}

// Per-player history, upcoming fixtures with FDR, past seasons.
export function getElementSummary(playerId: number) {
  return cached(`element-summary:${playerId}`, ELEMENT_SUMMARY_TTL_MS, () =>
    fplFetch(`/element-summary/${playerId}/`),
  );
}

// Manager basic info. Not cached — small payload, rarely reused.
export function getEntry(teamId: number) {
  return fplFetch(`/entry/${teamId}/`);
}

// A manager's squad for a gameweek. Reflects the user's own transfers, so
// no cache — pull fresh every time (plan §4).
export function getEntryPicks(teamId: number, gameweek: number) {
  return fplFetch(`/entry/${teamId}/event/${gameweek}/picks/`);
}

export function getEntryTransfers(teamId: number) {
  return fplFetch(`/entry/${teamId}/transfers/`);
}

// Live per-player stats for a gameweek — not team-specific, shared across
// every user, so it's cached and kept warm the same way as bootstrap/fixtures.
export function getEventLive(gameweek: number) {
  return cached(`event-live:${gameweek}`, EVENT_LIVE_TTL_MS, () => fplFetch(`/event/${gameweek}/live/`));
}

// Fetch classic league standings, cached for 15 minutes.
export function getLeagueClassicStandings(leagueId: number, page: number = 1) {
  return cached(`league-classic:${leagueId}:page:${page}`, LEAGUE_STANDINGS_TTL_MS, () =>
    fplFetch(`/leagues-classic/${leagueId}/standings/?page_new_entries=1&page_standings=${page}`)
  );
}

// Fetch H2H league standings, cached for 15 minutes.
export function getLeagueH2HStandings(leagueId: number, page: number = 1) {
  return cached(`league-h2h:${leagueId}:page:${page}`, LEAGUE_STANDINGS_TTL_MS, () =>
    fplFetch(`/leagues-h2h/${leagueId}/standings/?page_new_entries=1&page_standings=${page}`)
  );
}

type BootstrapEvent = { id: number; deadline_time: string; finished: boolean; is_current: boolean; is_next: boolean };

// Proactively refreshes every non-team-specific FPL endpoint the app uses:
// bootstrap-static, the full fixture list, the pickable/target gameweeks'
// fixtures, and live stats for the pickable gameweek. Called on server
// startup and every 30 minutes after (lib/cache-refresh.ts) so requests
// read from Postgres instead of depending on a live FPL round-trip.
export async function refreshSharedFplCache(): Promise<void> {
  const bootstrap = await forceRefresh("bootstrap-static", BOOTSTRAP_TTL_MS, () => fplFetch("/bootstrap-static/"));
  const events = (bootstrap as { events: BootstrapEvent[] }).events;

  const pickableGw = pickableGameweek(events);
  const targetGw = targetGameweek(events);
  const gameweeksToWarm = new Set([pickableGw?.id, targetGw?.id].filter((id): id is number => id != null));

  await Promise.all([
    forceRefresh("fixtures:all", FIXTURES_TTL_MS, () => fplFetch("/fixtures/")),
    ...[...gameweeksToWarm].map((gw) =>
      forceRefresh(`fixtures:${gw}`, FIXTURES_TTL_MS, () => fplFetch(`/fixtures/?event=${gw}`)),
    ),
    pickableGw
      ? forceRefresh(`event-live:${pickableGw.id}`, EVENT_LIVE_TTL_MS, () =>
          fplFetch(`/event/${pickableGw.id}/live/`),
        )
      : Promise.resolve(),
  ]);
}
