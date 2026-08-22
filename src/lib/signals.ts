// Builds the per-player signals the AI reasons over (plan §5): fixture
// difficulty, recent form, injury/news, expected stats, price trend,
// ownership. Field names are FPL's as of the 2025/26 season — reconfirm
// against a live /bootstrap-static/ pull if these stop matching (plan §10).

import { computeUpcomingFixtures, type Fixture } from "@/lib/fixtures-lookahead";
import type { UpcomingFixture } from "@/types/ui";

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
  cost_change_event: number;
};

type BootstrapTeam = { id: number; short_name: string };

type Bootstrap = {
  elements: BootstrapElement[];
  teams: BootstrapTeam[];
};

const POSITION_MAP: Record<number, string> = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };

export type PlayerSignal = {
  id: number;
  name: string;
  position: string;
  club: string;
  price: number;
  form: number;
  pointsPerGame: number;
  ownership: number;
  chanceOfPlaying: number | null;
  news: string;
  expectedGoalInvolvements: number;
  priceChangeDirection: "rising" | "falling" | "stable";
  upcomingFixtures: UpcomingFixture[];
};

export function buildPlayerSignals(
  bootstrap: Bootstrap,
  fixtures: Fixture[],
  playerIds: number[],
  lookaheadGameweeks = 3,
): PlayerSignal[] {
  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t.short_name]));
  const elementById = new Map(bootstrap.elements.map((e) => [e.id, e]));

  return playerIds.map((id) => {
    const el = elementById.get(id);
    if (!el) throw new Error(`Unknown player id ${id}`);

    const upcomingFixtures = computeUpcomingFixtures(fixtures, el.team, teamById, lookaheadGameweeks);

    return {
      id: el.id,
      name: el.web_name,
      position: POSITION_MAP[el.element_type] ?? "UNK",
      club: teamById.get(el.team) ?? "UNK",
      price: el.now_cost / 10,
      form: Number(el.form) || 0,
      pointsPerGame: Number(el.points_per_game) || 0,
      ownership: Number(el.selected_by_percent) || 0,
      chanceOfPlaying: el.chance_of_playing_this_round,
      news: el.news,
      expectedGoalInvolvements: Number(el.expected_goal_involvements) || 0,
      priceChangeDirection:
        el.cost_change_event > 0 ? "rising" : el.cost_change_event < 0 ? "falling" : "stable",
      upcomingFixtures,
    };
  });
}
