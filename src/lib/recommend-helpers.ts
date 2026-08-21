import type { Position, SquadPlayer } from "@/types/fpl";

type BootstrapElement = {
  id: number;
  team: number;
  element_type: number;
  now_cost: number;
};

type BootstrapTeam = { id: number; short_name: string };

const POSITION_MAP: Record<number, Position> = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };

export function toSquadPlayers(
  bootstrap: { elements: BootstrapElement[]; teams: BootstrapTeam[] },
  playerIds: number[],
): SquadPlayer[] {
  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t.short_name]));
  const elementById = new Map(bootstrap.elements.map((e) => [e.id, e]));

  return playerIds.map((id) => {
    const el = elementById.get(id);
    if (!el) throw new Error(`Unknown player id ${id}`);
    return {
      id: el.id,
      position: POSITION_MAP[el.element_type] ?? "MID",
      club: teamById.get(el.team) ?? "UNK",
      price: el.now_cost / 10,
    };
  });
}

// AI responses are asked for raw JSON but models sometimes wrap it in
// markdown fences anyway — strip those before parsing.
export function parseAIJson<T>(content: string): T {
  const trimmed = content.trim();
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(stripped) as T;
}
