import { prisma } from "@/lib/prisma";

const FPL_BASE = "https://fantasy.premierleague.com/api";

const BOOTSTRAP_TTL_MS = 20 * 60 * 1000;
const FIXTURES_TTL_MS = 20 * 60 * 1000;
const ELEMENT_SUMMARY_TTL_MS = 20 * 60 * 1000;

async function fplFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${FPL_BASE}${path}`, {
    headers: { "User-Agent": "fpl-ai-picker/1.0" },
  });
  if (!res.ok) {
    throw new Error(`FPL request failed: ${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = await prisma.fplCache.findUnique({ where: { key } });
  if (hit && hit.expiresAt > new Date()) {
    return hit.payload as T;
  }

  const payload = await fetcher();
  const now = new Date();
  await prisma.fplCache.upsert({
    where: { key },
    create: { key, payload: payload as object, fetchedAt: now, expiresAt: new Date(now.getTime() + ttlMs) },
    update: { payload: payload as object, fetchedAt: now, expiresAt: new Date(now.getTime() + ttlMs) },
  });
  return payload;
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

export function getEventLive(gameweek: number) {
  return fplFetch(`/event/${gameweek}/live/`);
}
