import type { Position } from "@/types/fpl";

export type UpcomingFixture = {
  opponent: string;
  difficulty: number;
  isHome: boolean;
};

// Normalized shape stored in SquadSnapshot.players — just enough to
// reconstruct the squad by re-joining with fresh bootstrap data on read, so
// stored squads never go stale on price/injury/points even between refreshes.
export type StoredPick = {
  id: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isBench: boolean;
};

export type DisplayPlayer = {
  id: number;
  name: string;
  club: string;
  position: Position;
  price: number;
  form?: number;
  points?: number;
  ownership?: number;
  availability?: "available" | "doubtful" | "unavailable";
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  // Live points for the gameweek shown on the Points page: raw score before
  // the captain/triple-captain multiplier is applied.
  gwPoints?: number;
  multiplier?: number;
  upcomingFixtures?: UpcomingFixture[];
  // Per-stat point breakdown for the current gameweek (goals, assists, bonus,
  // etc.) — from FPL's live `explain` array. Only meaningful alongside
  // gwPoints, for the Points page's "why did they score X" detail view.
  gwStatsBreakdown?: { identifier: string; points: number; value: number }[];
};
