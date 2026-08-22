import type { UpcomingFixture } from "@/types/ui";

export type Fixture = {
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
};

// A team's next N fixtures (opponent short name + fixture difficulty rating),
// shared by the AI signal builder, the manual-transfer candidate search, and
// the Fixtures page.
export function computeUpcomingFixtures(
  fixtures: Fixture[],
  teamId: number,
  teamById: Map<number, string>,
  lookaheadGameweeks = 3,
): UpcomingFixture[] {
  return fixtures
    .filter((f) => f.event !== null && (f.team_h === teamId || f.team_a === teamId))
    .slice(0, lookaheadGameweeks)
    .map((f) => {
      const isHome = f.team_h === teamId;
      const opponentTeamId = isHome ? f.team_a : f.team_h;
      return {
        opponent: teamById.get(opponentTeamId) ?? "UNK",
        difficulty: isHome ? f.team_h_difficulty : f.team_a_difficulty,
        isHome,
      };
    });
}
