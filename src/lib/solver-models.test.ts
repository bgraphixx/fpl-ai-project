import { describe, expect, test } from "vitest";
import { solveStartingXI, solveTransfers } from "@/lib/solver-models";
import type { PlayerSignal } from "@/lib/signals";
import type { Position } from "@/types/fpl";

function signal(
  id: number,
  position: Position,
  club: string,
  price: number,
  expectedPoints: number,
): PlayerSignal {
  return {
    id,
    name: `Player ${id}`,
    position,
    club,
    price,
    form: 0,
    pointsPerGame: 0,
    ownership: 0,
    chanceOfPlaying: null,
    news: "",
    expectedGoalInvolvements: 0,
    expectedPoints,
    priceChangeDirection: "stable",
    upcomingFixtures: [],
  };
}

// A legal 15-man squad (2 GK / 5 DEF / 5 MID / 3 FWD), each with a distinct
// expectedPoints so the solver's picks are distinguishable from an arbitrary
// tie-break.
function legalSquadSignals(): PlayerSignal[] {
  const squad: PlayerSignal[] = [];
  let id = 1;
  let xp = 1;
  const spread = (count: number, position: Position) => {
    for (let i = 0; i < count; i++) {
      squad.push(signal(id, position, `CLUB${id % 5}`, 4.5, xp));
      id++;
      xp++;
    }
  };
  spread(2, "GK");
  spread(5, "DEF");
  spread(5, "MID");
  spread(3, "FWD");
  return squad;
}

describe("solveStartingXI", () => {
  test("returns a legal formation drawn from the squad", () => {
    const squad = legalSquadSignals();
    const result = solveStartingXI(squad);

    expect(result.startingXI).toHaveLength(11);

    const byId = new Map(squad.map((p) => [p.id, p]));
    const positions = result.startingXI.map((id) => byId.get(id)!.position);
    const count = (pos: Position) => positions.filter((p) => p === pos).length;

    expect(count("GK")).toBe(1);
    expect(count("DEF")).toBeGreaterThanOrEqual(3);
    expect(count("DEF")).toBeLessThanOrEqual(5);
    expect(count("MID")).toBeGreaterThanOrEqual(2);
    expect(count("FWD")).toBeGreaterThanOrEqual(1);
    expect(count("DEF") + count("MID") + count("FWD")).toBe(10);
  });

  test("captain and vice-captain are distinct starters", () => {
    const squad = legalSquadSignals();
    const result = solveStartingXI(squad);

    expect(result.captainId).not.toBe(result.viceCaptainId);
    expect(result.startingXI).toContain(result.captainId);
    expect(result.startingXI).toContain(result.viceCaptainId);
  });

  test("picks the highest-xPts eligible players over lower ones at the same position", () => {
    // Every player above already has a distinct ascending expectedPoints
    // (assigned in squad order: GKs lowest, FWDs highest) — the solver
    // should prefer the two highest-xPts GKs' single starting slot, i.e.
    // the second (higher-xPts) goalkeeper.
    const squad = legalSquadSignals();
    const result = solveStartingXI(squad);
    const gks = squad.filter((p) => p.position === "GK").sort((a, b) => b.expectedPoints - a.expectedPoints);
    expect(result.startingXI).toContain(gks[0].id);
    expect(result.startingXI).not.toContain(gks[1].id);
  });
});

describe("solveTransfers", () => {
  test("never proposes a squad over the available budget", () => {
    const currentSquad = legalSquadSignals();
    // Candidate pool = current squad (can always "buy back" what you own)
    // plus a few affordable same-position alternatives.
    const candidatePool = [
      ...currentSquad,
      signal(101, "FWD", "CLUBX", 4.0, 20), // cheap, high xPts — should look attractive
    ];
    const bank = 0.5; // very little spare budget

    const result = solveTransfers(currentSquad, candidatePool, bank, 1, true);

    const priceById = new Map(candidatePool.map((p) => [p.id, p.price]));
    const currentValue = currentSquad.reduce((sum, p) => sum + p.price, 0);
    const totalBudget = bank + currentValue;

    const finalSquadIds = new Set(currentSquad.map((p) => p.id));
    for (const outId of result.transfersOut) finalSquadIds.delete(outId);
    for (const inId of result.transfersIn) finalSquadIds.add(inId);

    const finalValue = [...finalSquadIds].reduce((sum, id) => sum + (priceById.get(id) ?? 0), 0);
    expect(finalValue).toBeLessThanOrEqual(totalBudget + 1e-6);
  });

  test("caps transfers at the free allowance when hits aren't allowed", () => {
    const currentSquad = legalSquadSignals();
    const candidatePool = [
      ...currentSquad,
      signal(101, "FWD", "CLUBX", 4.5, 50),
      signal(102, "MID", "CLUBY", 4.5, 50),
      signal(103, "DEF", "CLUBZ", 4.5, 50),
    ];
    const freeTransfers = 1;

    const result = solveTransfers(currentSquad, candidatePool, 5, freeTransfers, false);
    expect(result.transfersMade).toBeLessThanOrEqual(freeTransfers);
  });
});
