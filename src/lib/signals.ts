// Builds the per-player signals the AI reasons over (plan §5): fixture
// difficulty, recent form, injury/news, expected stats, price trend,
// ownership. Field names are FPL's as of the 2025/26 season — reconfirm
// against a live /bootstrap-static/ pull if these stop matching (plan §10).

import { computeUpcomingFixtures, type Fixture } from "@/lib/fixtures-lookahead";
import { calculateExpectedPoints } from "@/lib/expected-points";
import type { UpcomingFixture } from "@/types/ui";
import type { Position } from "@/types/fpl";
import type { PlayerHistory, TeamStrength } from "@prisma/client";

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
};

type BootstrapTeam = { id: number; short_name: string };

type Bootstrap = {
  elements: BootstrapElement[];
  teams: BootstrapTeam[];
};

const POSITION_MAP: Record<number, Position> = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };

export type PlayerSignal = {
  id: number;
  name: string;
  position: Position;
  club: string;
  price: number;
  form: number;
  pointsPerGame: number;
  ownership: number;
  chanceOfPlaying: number | null;
  news: string;
  expectedGoalInvolvements: number;
  expectedPoints: number;
  priceChangeDirection: "rising" | "falling" | "stable";
  upcomingFixtures: UpcomingFixture[];
};

// Minimal structural shape needed for the xPts calc — deliberately loose so
// both signals.ts's and squad.ts's (slightly different) BootstrapElement
// types satisfy it without importing one from the other.
type ElementForExpectedPoints = {
  id: number;
  team: number;
  now_cost: number;
  points_per_game: string;
  chance_of_playing_this_round: number | null;
  expected_goals: string;
  expected_assists: string;
  expected_goals_conceded: string;
  bps: number;
  minutes: number;
};

export type LiveElementStats = {
  minutes: number;
  bps: number;
  expected_goals: number;
  expected_assists: number;
  expected_goals_conceded: number;
};

type MinimalFixture = { team_h: number; team_a: number; started: boolean; finished: boolean };
type MinimalEventLive = { elements: { id: number; stats: Record<string, number> }[] };

// xPts is meant to be a forward-looking projection, not a live scoreboard.
// While a player's fixture this gameweek is still being played (started but
// not finished), FPL's bootstrap-static season totals already include that
// in-progress, incomplete contribution — using them as-is would let this
// week's still-developing result leak into a number that's supposed to be
// about a *future* fixture. This reconstructs "season totals as of the end
// of the last finished gameweek" by finding which teams have a live fixture
// right now and returning their players' current-gameweek stats so callers
// can subtract them back out. Once a match finishes, its contribution
// counts normally — this only ever excludes an in-progress match.
export function buildLiveAdjustmentMap(
  elements: { id: number; team: number }[],
  currentGameweekFixtures: MinimalFixture[],
  eventLive: MinimalEventLive | null,
): Map<number, LiveElementStats> {
  const adjustments = new Map<number, LiveElementStats>();
  if (!eventLive) return adjustments;

  const liveTeamIds = new Set(
    currentGameweekFixtures.filter((f) => f.started && !f.finished).flatMap((f) => [f.team_h, f.team_a]),
  );
  if (liveTeamIds.size === 0) return adjustments;

  const liveStatsById = new Map(eventLive.elements.map((e) => [e.id, e.stats]));
  for (const el of elements) {
    if (!liveTeamIds.has(el.team)) continue;
    const stats = liveStatsById.get(el.id);
    if (!stats) continue;
    adjustments.set(el.id, {
      minutes: Number(stats.minutes) || 0,
      bps: Number(stats.bps) || 0,
      expected_goals: Number(stats.expected_goals) || 0,
      expected_assists: Number(stats.expected_assists) || 0,
      expected_goals_conceded: Number(stats.expected_goals_conceded) || 0,
    });
  }
  return adjustments;
}

// Shared by buildPlayerSignals (below) and squad.ts's joinDisplaySquad /
// getAllPlayers — the one place that turns a bootstrap element + its
// upcoming fixtures/history/team-strength context into a per-fixture xPts
// number, so this math only exists once. Computes one projection per
// upcoming fixture (not just the next one) so "Next 3"-style UI can sum
// them, using the *same* underlying per-90 rates for each — only the
// opponent-strength multiplier varies fixture to fixture. Resolves each
// fixture's opponent strength via `opponentTeamId` (an O(1) map read)
// rather than a per-fixture reverse lookup by short name.
export function attachExpectedPoints(
  el: ElementForExpectedPoints,
  position: Position,
  upcomingFixtures: UpcomingFixture[],
  history: PlayerHistory | undefined,
  teamStrengthMap: Map<number, TeamStrength>,
  liveAdjustment?: LiveElementStats,
): UpcomingFixture[] {
  // Bootstrap's expected_goals/expected_assists/etc. are season totals, not
  // per-90 — divide by appearances (minutes / 90) to get a per-game rate
  // for calculateExpectedPoints. If a live adjustment is present, subtract
  // this gameweek's in-progress contribution first (see buildLiveAdjustmentMap).
  const minutes = Math.max(0, (Number(el.minutes) || 0) - (liveAdjustment?.minutes ?? 0));
  const rawXG = Math.max(0, (Number(el.expected_goals) || 0) - (liveAdjustment?.expected_goals ?? 0));
  const rawXA = Math.max(0, (Number(el.expected_assists) || 0) - (liveAdjustment?.expected_assists ?? 0));
  const rawXGC = Math.max(0, (Number(el.expected_goals_conceded) || 0) - (liveAdjustment?.expected_goals_conceded ?? 0));
  const rawBPS = Math.max(0, (Number(el.bps) || 0) - (liveAdjustment?.bps ?? 0));

  const appearances = Math.max(1, minutes / 90);
  const xGPerGame = rawXG / appearances;
  const xAPerGame = rawXA / appearances;
  const xGCPerGame = rawXGC / appearances;
  const bpsPerGame = rawBPS / appearances;
  const avgMinutes = minutes / appearances; // ~90

  const price = el.now_cost / 10;
  // With a live adjustment, this season's points-per-game isn't settled
  // yet either (it's partly from the same in-progress match) — fall back to
  // the cold-start prior's price-based estimate instead of a live-tainted number.
  const pointsPerGame = liveAdjustment ? 0 : Number(el.points_per_game) || 0;
  const teamStrength = teamStrengthMap.get(el.team);

  return upcomingFixtures.map((fixture) => {
    const opponentStrength = teamStrengthMap.get(fixture.opponentTeamId);
    const isHome = fixture.isHome;

    const expectedPoints = calculateExpectedPoints({
      position,
      price,
      pointsPerGame,
      chanceOfPlaying: el.chance_of_playing_this_round,
      expectedGoals: xGPerGame,
      expectedAssists: xAPerGame,
      expectedGoalsConceded: xGCPerGame,
      bps: bpsPerGame,
      minutesPerGame: avgMinutes,

      historicalXG: history ? Number(history.pastSeasonXG) : undefined,
      historicalXA: history ? Number(history.pastSeasonXA) : undefined,
      historicalXGC: history ? Number(history.pastSeasonXGC) : undefined,
      historicalSaves: history?.pastSeasonSaves,
      historicalBPS: history?.pastSeasonBPS,
      historicalStarts: history?.pastSeasonStarts,
      historicalMinutes: history?.pastSeasonMinutes,

      teamAttackStrength: teamStrength ? (isHome ? teamStrength.strengthAttackHome : teamStrength.strengthAttackAway) : undefined,
      teamDefenseStrength: teamStrength ? (isHome ? teamStrength.strengthDefenseHome : teamStrength.strengthDefenseAway) : undefined,
      opponentAttackStrength: opponentStrength ? (!isHome ? opponentStrength.strengthAttackHome : opponentStrength.strengthAttackAway) : undefined,
      opponentDefenseStrength: opponentStrength ? (!isHome ? opponentStrength.strengthDefenseHome : opponentStrength.strengthDefenseAway) : undefined,
    });

    return { ...fixture, expectedPoints };
  });
}

export function buildPlayerSignals(
  bootstrap: Bootstrap,
  fixtures: Fixture[],
  playerIds: number[],
  historyMap: Map<number, PlayerHistory>,
  teamStrengthMap: Map<number, TeamStrength>,
  liveAdjustmentMap: Map<number, LiveElementStats> = new Map(),
  lookaheadGameweeks = 3,
): PlayerSignal[] {
  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t.short_name]));
  const elementById = new Map(bootstrap.elements.map((e) => [e.id, e]));

  return playerIds.map((id) => {
    const el = elementById.get(id);
    if (!el) throw new Error(`Unknown player id ${id}`);

    const rawUpcomingFixtures = computeUpcomingFixtures(fixtures, el.team, teamById, lookaheadGameweeks);
    const position = POSITION_MAP[el.element_type] ?? "UNK";

    const history = historyMap.get(el.id);
    const liveAdjustment = liveAdjustmentMap.get(el.id);
    const upcomingFixtures = attachExpectedPoints(el, position, rawUpcomingFixtures, history, teamStrengthMap, liveAdjustment);
    const expectedPoints = upcomingFixtures[0]?.expectedPoints ?? 0;

    return {
      id: el.id,
      name: el.web_name,
      position,
      club: teamById.get(el.team) ?? "UNK",
      price: el.now_cost / 10,
      form: Number(el.form) || 0,
      pointsPerGame: Number(el.points_per_game) || 0,
      ownership: Number(el.selected_by_percent) || 0,
      chanceOfPlaying: el.chance_of_playing_this_round,
      news: el.news,
      expectedGoalInvolvements: Number(el.expected_goal_involvements) || 0,
      expectedPoints,
      priceChangeDirection:
        el.cost_change_event > 0 ? "rising" : el.cost_change_event < 0 ? "falling" : "stable",
      upcomingFixtures,
    };
  });
}
