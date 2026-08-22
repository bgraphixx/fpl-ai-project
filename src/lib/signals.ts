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
): UpcomingFixture[] {
  // Bootstrap's expected_goals/expected_assists/etc. are season totals, not
  // per-90 — divide by appearances (minutes / 90) to get a per-game rate
  // for calculateExpectedPoints.
  const minutes = Number(el.minutes) || 0;
  const appearances = Math.max(1, minutes / 90);
  const xGPerGame = (Number(el.expected_goals) || 0) / appearances;
  const xAPerGame = (Number(el.expected_assists) || 0) / appearances;
  const xGCPerGame = (Number(el.expected_goals_conceded) || 0) / appearances;
  const bpsPerGame = (Number(el.bps) || 0) / appearances;
  const avgMinutes = minutes / appearances; // ~90

  const price = el.now_cost / 10;
  const pointsPerGame = Number(el.points_per_game) || 0;
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
    const upcomingFixtures = attachExpectedPoints(el, position, rawUpcomingFixtures, history, teamStrengthMap);
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
