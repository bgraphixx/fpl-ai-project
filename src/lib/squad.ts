import { prisma } from "@/lib/prisma";
import { getBootstrapStatic, getEntryPicks } from "@/lib/fpl";
import { currentGameweek } from "@/lib/gameweek";
import type { DisplayPlayer } from "@/types/ui";
import type { Position } from "@/types/fpl";

const POSITION_MAP: Record<number, Position> = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };

type BootstrapElement = {
  id: number;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  form: string;
  selected_by_percent: string;
  chance_of_playing_this_round: number | null;
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

type FplPicksResponse = {
  picks: FplPick[];
  entry_history: { bank: number; value: number };
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

export type CurrentSquad = {
  gameweek: number;
  bank: number;
  teamValue: number;
  starting: DisplayPlayer[];
  bench: DisplayPlayer[];
  source: "auto";
};

// Auto-pulls the user's current-gameweek squad from FPL, joins it with
// bootstrap-static for display data, and stores a snapshot (plan §6).
export async function getCurrentSquad(userId: string): Promise<CurrentSquad> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.fplTeamId) throw new TeamNotLinkedError();

  const bootstrap = (await getBootstrapStatic()) as Bootstrap;
  const gw = currentGameweek(bootstrap.events);
  if (!gw) throw new NoActiveGameweekError();

  const picks = (await getEntryPicks(user.fplTeamId, gw.id)) as FplPicksResponse;

  await prisma.squadSnapshot.create({
    data: {
      userId: user.id,
      gameweek: gw.id,
      players: picks.picks as never,
      bank: picks.entry_history.bank / 10,
      teamValue: picks.entry_history.value / 10,
      source: "auto",
    },
  });

  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t.short_name]));
  const elementById = new Map(bootstrap.elements.map((e) => [e.id, e]));

  const toDisplay = (pick: FplPick): DisplayPlayer => {
    const el = elementById.get(pick.element);
    if (!el) throw new Error(`Unknown player id ${pick.element}`);
    const chance = el.chance_of_playing_this_round;
    return {
      id: el.id,
      name: el.web_name,
      club: teamById.get(el.team) ?? "UNK",
      position: POSITION_MAP[el.element_type] ?? "MID",
      price: el.now_cost / 10,
      form: Number(el.form) || 0,
      ownership: Number(el.selected_by_percent) || 0,
      availability: chance === null || chance >= 75 ? "available" : chance >= 25 ? "doubtful" : "unavailable",
      isCaptain: pick.is_captain,
      isViceCaptain: pick.is_vice_captain,
    };
  };

  const starting = picks.picks.filter((p) => p.multiplier > 0).map(toDisplay);
  const bench = picks.picks.filter((p) => p.multiplier === 0).map(toDisplay);

  return {
    gameweek: gw.id,
    bank: picks.entry_history.bank / 10,
    teamValue: picks.entry_history.value / 10,
    starting,
    bench,
    source: "auto",
  };
}

// Top players by total points per position, excluding ones already owned.
// Keeps the AI prompt's candidate pool to a sane size instead of sending the
// full ~600-player database (which would blow the context window).
export async function getTransferCandidates(
  excludePlayerIds: number[],
  perPosition = 10,
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

// Every player in the game, for the squad-edit search sheet.
export async function getAllPlayers(): Promise<DisplayPlayer[]> {
  const bootstrap = (await getBootstrapStatic()) as Bootstrap;
  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t.short_name]));

  return bootstrap.elements.map((el) => {
    const chance = el.chance_of_playing_this_round;
    return {
      id: el.id,
      name: el.web_name,
      club: teamById.get(el.team) ?? "UNK",
      position: POSITION_MAP[el.element_type] ?? "MID",
      price: el.now_cost / 10,
      form: Number(el.form) || 0,
      ownership: Number(el.selected_by_percent) || 0,
      availability:
        chance === null || chance >= 75 ? "available" : chance >= 25 ? "doubtful" : "unavailable",
    };
  });
}
