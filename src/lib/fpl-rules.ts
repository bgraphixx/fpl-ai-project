import type { Position, SquadPlayer, ValidationResult } from "@/types/fpl";
import type { DisplayPlayer } from "@/types/ui";

export const SQUAD_SIZE: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
const MAX_PER_CLUB = 3;
export const MAX_SQUAD_VALUE = 100.0;
const HIT_COST_PER_TRANSFER = 4;

// FPL currently allows any starting XI with 1 GK, 3-5 DEF, 2-5 MID, 1-3 FWD
// summing to 10 outfield players (plan §10 — reconfirm at build time in case
// the rule changes between seasons).
const MIN_DEF = 3;
const MAX_DEF = 5;
const MIN_MID = 2;
const MAX_MID = 5;
const MIN_FWD = 1;
const MAX_FWD = 3;

function countByPosition(players: SquadPlayer[]): Record<Position, number> {
  return players.reduce(
    (acc, p) => {
      acc[p.position] += 1;
      return acc;
    },
    { GK: 0, DEF: 0, MID: 0, FWD: 0 } as Record<Position, number>,
  );
}

function countByClub(players: SquadPlayer[]): Record<string, number> {
  return players.reduce((acc, p) => {
    acc[p.club] = (acc[p.club] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// Validates a full 15-man squad: position counts, club limit, budget.
export function validateFullSquad(
  players: SquadPlayer[],
  budget: number = MAX_SQUAD_VALUE,
): ValidationResult {
  const errors: string[] = [];

  if (players.length !== 15) {
    errors.push(`Squad must have exactly 15 players, got ${players.length}`);
  }

  const byPosition = countByPosition(players);
  for (const pos of Object.keys(SQUAD_SIZE) as Position[]) {
    if (byPosition[pos] !== SQUAD_SIZE[pos]) {
      errors.push(`Squad must have exactly ${SQUAD_SIZE[pos]} ${pos}, got ${byPosition[pos]}`);
    }
  }

  const byClub = countByClub(players);
  for (const [club, count] of Object.entries(byClub)) {
    if (count > MAX_PER_CLUB) {
      errors.push(`Max ${MAX_PER_CLUB} players per club — ${club} has ${count}`);
    }
  }

  const totalValue = players.reduce((sum, p) => sum + p.price, 0);
  if (totalValue > budget + 1e-6) {
    errors.push(`Squad value ${totalValue.toFixed(1)}m exceeds budget ${budget.toFixed(1)}m`);
  }

  return { valid: errors.length === 0, errors };
}

// Validates a starting XI: 1 GK + a valid outfield formation, drawn from a
// 15-man squad, respecting the per-club limit within the XI itself.
export function validateStartingXI(startingXI: SquadPlayer[]): ValidationResult {
  const errors: string[] = [];

  if (startingXI.length !== 11) {
    errors.push(`Starting XI must have exactly 11 players, got ${startingXI.length}`);
  }

  const byPosition = countByPosition(startingXI);
  if (byPosition.GK !== 1) {
    errors.push(`Starting XI must have exactly 1 GK, got ${byPosition.GK}`);
  }
  if (byPosition.DEF < MIN_DEF || byPosition.DEF > MAX_DEF) {
    errors.push(`DEF count must be between ${MIN_DEF} and ${MAX_DEF}, got ${byPosition.DEF}`);
  }
  if (byPosition.MID < MIN_MID || byPosition.MID > MAX_MID) {
    errors.push(`MID count must be between ${MIN_MID} and ${MAX_MID}, got ${byPosition.MID}`);
  }
  if (byPosition.FWD < MIN_FWD || byPosition.FWD > MAX_FWD) {
    errors.push(`FWD count must be between ${MIN_FWD} and ${MAX_FWD}, got ${byPosition.FWD}`);
  }

  const byClub = countByClub(startingXI);
  for (const [club, count] of Object.entries(byClub)) {
    if (count > MAX_PER_CLUB) {
      errors.push(`Max ${MAX_PER_CLUB} players per club — ${club} has ${count}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function formationLabel(startingXI: SquadPlayer[]): string {
  const byPosition = countByPosition(startingXI);
  return `${byPosition.DEF}-${byPosition.MID}-${byPosition.FWD}`;
}

// Cost of a transfer plan given free transfers available. Each transfer
// beyond the free allowance costs HIT_COST_PER_TRANSFER points.
export function computeTransferCost(transfersMade: number, freeTransfers: number): number {
  const extra = Math.max(0, transfersMade - freeTransfers);
  return extra * HIT_COST_PER_TRANSFER;
}

// Validates the resulting 15-man squad after a transfer: still legal under
// the standard squad rules, and affordable given the funds available
// (previous squad value + bank) rather than the flat 100m budget.
export function validateTransfer(
  resultingSquad: SquadPlayer[],
  previousSquadValue: number,
  bank: number,
): ValidationResult {
  const availableFunds = previousSquadValue + bank;
  return validateFullSquad(resultingSquad, availableFunds);
}

export type BestXIResult = {
  startingIds: number[];
  benchIds: number[];
  captainId: number;
  viceCaptainId: number;
};

// Deterministically picks the highest-xPts legal starting XI (+ captain/vice)
// out of a full 15-man squad. For a fixed pair of group sizes (d DEF, m MID,
// f FWD), the best selection is always "the top d/m/f players in each group
// by xPts" — so trying every legal (d, m, f) combination and keeping the
// highest-scoring one is optimal, without needing the LP solver (solveStartingXI
// in solver-models.ts) that the AI recommendation routes use server-side.
export function pickBestStartingXI(squad: DisplayPlayer[]): BestXIResult {
  const byPosition = (pos: Position) =>
    squad.filter((p) => p.position === pos).sort((a, b) => (b.expectedPoints ?? 0) - (a.expectedPoints ?? 0));

  const gk = byPosition("GK");
  const def = byPosition("DEF");
  const mid = byPosition("MID");
  const fwd = byPosition("FWD");

  let best: { ids: number[]; total: number } | null = null;
  for (let d = MIN_DEF; d <= Math.min(MAX_DEF, def.length); d++) {
    for (let m = MIN_MID; m <= Math.min(MAX_MID, mid.length); m++) {
      const f = 10 - d - m;
      if (f < MIN_FWD || f > MAX_FWD || f > fwd.length || gk.length < 1) continue;
      const chosen = [gk[0], ...def.slice(0, d), ...mid.slice(0, m), ...fwd.slice(0, f)];
      const total = chosen.reduce((sum, p) => sum + (p.expectedPoints ?? 0), 0);
      if (!best || total > best.total) best = { ids: chosen.map((p) => p.id), total };
    }
  }
  if (!best) throw new Error("pickBestStartingXI: no legal starting XI could be formed from this squad");

  const startingSet = new Set(best.ids);
  const bench = squad.filter((p) => !startingSet.has(p.id));
  // Bench order: reserve GK first (FPL convention), then outfield reserves by xPts.
  const benchGK = bench.filter((p) => p.position === "GK");
  const benchOutfield = bench
    .filter((p) => p.position !== "GK")
    .sort((a, b) => (b.expectedPoints ?? 0) - (a.expectedPoints ?? 0));

  const startingByXpts = squad
    .filter((p) => startingSet.has(p.id))
    .sort((a, b) => (b.expectedPoints ?? 0) - (a.expectedPoints ?? 0));

  return {
    startingIds: best.ids,
    benchIds: [...benchGK, ...benchOutfield].map((p) => p.id),
    captainId: startingByXpts[0].id,
    viceCaptainId: startingByXpts[1].id,
  };
}
