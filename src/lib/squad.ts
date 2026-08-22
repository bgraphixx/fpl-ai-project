import { prisma } from "@/lib/prisma";
import { getBootstrapStatic, getEntryPicks, getEventLive, getFixtures } from "@/lib/fpl";
import { pickableGameweek, targetGameweek } from "@/lib/gameweek";
import { computeUpcomingFixtures, type Fixture } from "@/lib/fixtures-lookahead";
import { computeExpectedPointsForElement } from "@/lib/signals";
import type { DisplayPlayer, StoredPick } from "@/types/ui";
import type { Position } from "@/types/fpl";
import type { PlayerHistory, TeamStrength } from "@prisma/client";

const POSITION_MAP: Record<number, Position> = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };

type BootstrapElement = {
  id: number;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  form: string;
  points_per_game: string;
  selected_by_percent: string;
  chance_of_playing_this_round: number | null;
  news: string;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  bps: number;
  minutes: number;
  cost_change_event: number;
  total_points: number;
};

type Bootstrap = {
  events: { id: number; deadline_time: string; finished: boolean; is_current: boolean; is_next: boolean }[];
  elements: BootstrapElement[];
  teams: { id: number; short_name: string }[];
};

type FplPick = {
  element: number;
  position: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  multiplier: number;
};

type FplEntryHistory = {
  bank: number;
  value: number;
  points: number;
  total_points: number;
  rank: number | null;
  points_on_bench: number;
  event_transfers_cost: number;
};

type FplPicksResponse = {
  picks: FplPick[];
  entry_history: FplEntryHistory;
};

type FplLiveResponse = {
  elements: {
    id: number;
    stats: { total_points: number };
    explain: { stats: { identifier: string; points: number; value: number }[] }[];
  }[];
};

export class TeamNotLinkedError extends Error {
  constructor() {
    super("No FPL Team ID linked to this account");
  }
}

export class NoActiveGameweekError extends Error {
  constructor() {
    super("Couldn't determine the current gameweek");
  }
}

export class NoStoredSquadError extends Error {
  constructor() {
    super("No squad stored yet");
  }
}

export type CurrentSquad = {
  // The gameweek recommendations should target (next actionable deadline).
  gameweek: number;
  bank: number;
  teamValue: number;
  starting: DisplayPlayer[];
  bench: DisplayPlayer[];
  source: "auto" | "manual";
  lastSyncedAt: Date;
  // Live gameweek scoring, for the Points page — for `pointsGameweek` (the
  // last gameweek FPL has actually published), which is usually a different
  // gameweek than `gameweek` above. Null for a manually-built squad, which
  // has no real FPL score.
  pointsGameweek: number;
  points: number | null;
  totalPoints: number | null;
  rank: number | null;
  pointsOnBench: number | null;
  transferCost: number | null;
};

// Joins a stored (or freshly-pulled) pick list against current bootstrap +
// live-points + fixtures data, so prices/injury-status/points/fixtures are
// always up to date even when the squad composition itself is read from a
// stale snapshot. `fixtures` is optional — the Points page's live-scoring
// path doesn't need it and skips the extra (still-cached) fetch.
function joinDisplaySquad(
  picks: StoredPick[],
  bootstrap: Bootstrap,
  live: FplLiveResponse | null,
  fixtures?: Fixture[],
  historyMap?: Map<number, PlayerHistory>,
  teamStrengthMap?: Map<number, TeamStrength>,
): { starting: DisplayPlayer[]; bench: DisplayPlayer[] } {
  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t.short_name]));
  const elementById = new Map(bootstrap.elements.map((e) => [e.id, e]));
  const liveById = new Map((live?.elements ?? []).map((e) => [e.id, e]));

  const toDisplay = (pick: StoredPick): DisplayPlayer | null => {
    const el = elementById.get(pick.id);
    if (!el) return null; // player no longer exists in bootstrap (rare)
    const chance = el.chance_of_playing_this_round;
    const liveEl = liveById.get(pick.id);
    const position = POSITION_MAP[el.element_type] ?? "MID";

    const upcomingFixtures = fixtures ? computeUpcomingFixtures(fixtures, el.team, teamById) : undefined;

    const history = historyMap?.get(el.id);
    const teamStrength = teamStrengthMap?.get(el.team);
    const opponentTeam = bootstrap.teams.find((t) => t.short_name === upcomingFixtures?.[0]?.opponent);
    const opponentStrength = opponentTeam ? teamStrengthMap?.get(opponentTeam.id) : undefined;

    const expectedPoints = computeExpectedPointsForElement(
      el,
      position,
      upcomingFixtures ?? [],
      history,
      teamStrength,
      opponentStrength,
    );

    return {
      id: el.id,
      name: el.web_name,
      club: teamById.get(el.team) ?? "UNK",
      position,
      price: el.now_cost / 10,
      form: Number(el.form) || 0,
      points: el.total_points,
      ownership: Number(el.selected_by_percent) || 0,
      availability: chance === null || chance >= 75 ? "available" : chance >= 25 ? "doubtful" : "unavailable",
      isCaptain: pick.isCaptain,
      isViceCaptain: pick.isViceCaptain,
      expectedPoints,
      gwPoints: liveEl?.stats.total_points,
      multiplier: pick.isCaptain ? 2 : 1,
      gwStatsBreakdown: liveEl?.explain[0]?.stats,
      upcomingFixtures,
    };
  };

  const starting = picks.filter((p) => !p.isBench).map(toDisplay).filter((p): p is DisplayPlayer => p !== null);
  const bench = picks.filter((p) => p.isBench).map(toDisplay).filter((p): p is DisplayPlayer => p !== null);
  return { starting, bench };
}

// Live-pulls the user's squad from FPL, joins it for display, and stores a
// snapshot. This is the "Refresh" action — the only path that talks to FPL
// for team-specific data; everything else reads the stored snapshot.
export async function refreshSquadFromFpl(userId: string): Promise<CurrentSquad> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.fplTeamId) throw new TeamNotLinkedError();

  const bootstrap = (await getBootstrapStatic()) as Bootstrap;
  const pickableGw = pickableGameweek(bootstrap.events);
  if (!pickableGw) throw new NoActiveGameweekError();
  const targetGw = targetGameweek(bootstrap.events) ?? pickableGw;

  const [picks, live, fixtures] = await Promise.all([
    getEntryPicks(user.fplTeamId, pickableGw.id) as Promise<FplPicksResponse>,
    getEventLive(pickableGw.id).catch(() => null) as Promise<FplLiveResponse | null>,
    getFixtures() as Promise<Fixture[]>,
  ]);

  const storedPicks: StoredPick[] = picks.picks.map((p) => ({
    id: p.element,
    isCaptain: p.is_captain,
    isViceCaptain: p.is_vice_captain,
    isBench: p.multiplier === 0,
  }));

  const [historyRecords, teamStrengths] = await Promise.all([
    prisma.playerHistory.findMany({ where: { id: { in: storedPicks.map(p => p.id) } } }),
    prisma.teamStrength.findMany()
  ]);
  const historyMap = new Map(historyRecords.map(h => [h.id, h]));
  const teamStrengthMap = new Map(teamStrengths.map(t => [t.id, t]));

  const snapshot = await prisma.squadSnapshot.create({
    data: {
      userId: user.id,
      gameweek: pickableGw.id,
      players: storedPicks as never,
      bank: picks.entry_history.bank / 10,
      teamValue: picks.entry_history.value / 10,
      source: "auto",
      points: picks.entry_history.points,
      totalPoints: picks.entry_history.total_points,
      rank: picks.entry_history.rank,
      pointsOnBench: picks.entry_history.points_on_bench,
      transferCost: picks.entry_history.event_transfers_cost,
    },
  });

  const { starting, bench } = joinDisplaySquad(storedPicks, bootstrap, live, fixtures, historyMap, teamStrengthMap);

  return {
    gameweek: targetGw.id,
    bank: picks.entry_history.bank / 10,
    teamValue: picks.entry_history.value / 10,
    starting,
    bench,
    source: "auto",
    lastSyncedAt: snapshot.createdAt,
    pointsGameweek: pickableGw.id,
    points: picks.entry_history.points,
    totalPoints: picks.entry_history.total_points,
    rank: picks.entry_history.rank,
    pointsOnBench: picks.entry_history.points_on_bench,
    transferCost: picks.entry_history.event_transfers_cost,
  };
}

// Reads the most recent stored snapshot (auto or manual — a manual edit
// becomes the squad shown everywhere until the next Refresh) and re-joins
// it against current bootstrap/live data. No live FPL call for team-specific
// data — this is the fast path every page load uses.
export async function getStoredSquad(userId: string): Promise<CurrentSquad | null> {
  const snapshot = await prisma.squadSnapshot.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!snapshot) return null;

  const [bootstrap, fixtures] = await Promise.all([
    getBootstrapStatic() as Promise<Bootstrap>,
    getFixtures() as Promise<Fixture[]>,
  ]);
  const pickableGw = pickableGameweek(bootstrap.events);
  const targetGw = targetGameweek(bootstrap.events) ?? pickableGw;
  const live = pickableGw
    ? ((await getEventLive(pickableGw.id).catch(() => null)) as FplLiveResponse | null)
    : null;

  const storedPicks = snapshot.players as unknown as StoredPick[];
  
  const [historyRecords, teamStrengths] = await Promise.all([
    prisma.playerHistory.findMany({ where: { id: { in: storedPicks.map(p => p.id) } } }),
    prisma.teamStrength.findMany()
  ]);
  const historyMap = new Map(historyRecords.map(h => [h.id, h]));
  const teamStrengthMap = new Map(teamStrengths.map(t => [t.id, t]));

  const { starting, bench } = joinDisplaySquad(storedPicks, bootstrap, live, fixtures, historyMap, teamStrengthMap);

  return {
    gameweek: targetGw?.id ?? snapshot.gameweek,
    bank: Number(snapshot.bank),
    teamValue: Number(snapshot.teamValue),
    starting,
    bench,
    source: snapshot.source,
    lastSyncedAt: snapshot.createdAt,
    pointsGameweek: pickableGw?.id ?? snapshot.gameweek,
    points: snapshot.points,
    totalPoints: snapshot.totalPoints,
    rank: snapshot.rank,
    pointsOnBench: snapshot.pointsOnBench,
    transferCost: snapshot.transferCost,
  };
}

// Stored squad if one exists, else seeds it with a live pull (first-ever
// visit for a newly-linked team).
export async function getSquad(userId: string): Promise<CurrentSquad> {
  const stored = await getStoredSquad(userId);
  if (stored) return stored;
  return refreshSquadFromFpl(userId);
}

// Persists a manually-edited squad (from the squad editor or a manual
// transfer) as the new latest snapshot — it becomes what every page shows
// until the user hits Refresh. Has no real FPL score, so points/rank etc.
// are left null.
export async function saveManualSquad(
  userId: string,
  gameweek: number,
  players: StoredPick[],
  bank: number,
  teamValue: number,
) {
  return prisma.squadSnapshot.create({
    data: {
      userId,
      gameweek,
      players: players as never,
      bank,
      teamValue,
      source: "manual",
    },
  });
}

// Top players by total points per position, excluding ones already owned.
// Keeps the AI prompt's candidate pool to a sane size — free-tier models
// get noticeably less reliable (more timeouts, truncated JSON) as the
// candidate list grows, so this is deliberately tight rather than just
// "small enough to fit the context window".
export async function getTransferCandidates(
  excludePlayerIds: number[],
  perPosition = 6,
): Promise<number[]> {
  const bootstrap = (await getBootstrapStatic()) as Bootstrap;
  const excluded = new Set(excludePlayerIds);

  const byPosition = new Map<number, typeof bootstrap.elements>();
  for (const el of bootstrap.elements) {
    if (excluded.has(el.id)) continue;
    const list = byPosition.get(el.element_type) ?? [];
    list.push(el);
    byPosition.set(el.element_type, list);
  }

  const candidates: number[] = [];
  for (const list of byPosition.values()) {
    list.sort((a, b) => b.total_points - a.total_points);
    candidates.push(...list.slice(0, perPosition).map((e) => e.id));
  }
  return candidates;
}

// Every player in the game, with upcoming fixtures and xPts — for the
// squad-edit and manual-transfer search sheets.
export async function getAllPlayers(): Promise<DisplayPlayer[]> {
  const [bootstrap, fixtures] = await Promise.all([
    getBootstrapStatic() as Promise<Bootstrap>,
    getFixtures() as Promise<Fixture[]>,
  ]);
  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t.short_name]));

  const [historyRecords, teamStrengths] = await Promise.all([
    prisma.playerHistory.findMany(),
    prisma.teamStrength.findMany(),
  ]);
  const historyMap = new Map(historyRecords.map((h) => [h.id, h]));
  const teamStrengthMap = new Map(teamStrengths.map((t) => [t.id, t]));

  return bootstrap.elements.map((el) => {
    const chance = el.chance_of_playing_this_round;
    const position = POSITION_MAP[el.element_type] ?? "MID";
    const upcomingFixtures = computeUpcomingFixtures(fixtures, el.team, teamById);

    const history = historyMap.get(el.id);
    const teamStrength = teamStrengthMap.get(el.team);
    const opponentTeam = bootstrap.teams.find((t) => t.short_name === upcomingFixtures[0]?.opponent);
    const opponentStrength = opponentTeam ? teamStrengthMap.get(opponentTeam.id) : undefined;

    const expectedPoints = computeExpectedPointsForElement(
      el,
      position,
      upcomingFixtures,
      history,
      teamStrength,
      opponentStrength,
    );

    return {
      id: el.id,
      name: el.web_name,
      club: teamById.get(el.team) ?? "UNK",
      position,
      price: el.now_cost / 10,
      form: Number(el.form) || 0,
      points: el.total_points,
      ownership: Number(el.selected_by_percent) || 0,
      availability:
        chance === null || chance >= 75 ? "available" : chance >= 25 ? "doubtful" : "unavailable",
      expectedPoints,
      upcomingFixtures,
    };
  });
}
