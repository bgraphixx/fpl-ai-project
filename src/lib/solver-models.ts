import solver, { type Model as LPModel, type SolveResult } from "javascript-lp-solver";
import type { PlayerSignal } from "@/lib/signals";

export type SolverTransferResult = {
  transfersIn: number[];
  transfersOut: number[];
  transfersMade: number;
  projectedPoints: number;
};

export type SolverXIResult = {
  startingXI: number[];
  captainId: number;
  viceCaptainId: number;
  projectedPoints: number;
};

/**
 * Mathematically finds the optimal 11 starters and captain to maximize
 * expected points while obeying valid FPL formation rules.
 */
export function solveStartingXI(squad: PlayerSignal[]): SolverXIResult {
  const model: LPModel = {
    optimize: "expectedPoints",
    opType: "max",
    constraints: {
      starters: { equal: 11 },
      GK: { equal: 1 },
      DEF: { min: 3 },
      MID: { min: 2 },
      FWD: { min: 1 },
      captains: { equal: 1 },
      viceCaptains: { equal: 1 },
    },
    variables: {},
    ints: {},
  };

  for (const player of squad) {
    const startVar = `start_${player.id}`;
    const capVar = `cap_${player.id}`;
    const viceVar = `vice_${player.id}`;

    // Starter variable
    model.variables[startVar] = {
      expectedPoints: player.expectedPoints,
      starters: 1,
      [player.position]: 1,
      // Captains and vice captains must be starters
      [`is_starter_${player.id}`]: 1,
    };
    model.ints![startVar] = 1;

    // Captain variable (gets double points)
    model.variables[capVar] = {
      expectedPoints: player.expectedPoints, // 1x extra point
      captains: 1,
      [`is_starter_${player.id}`]: -1, // Constraint: cap <= start (so cap - start <= 0)
      [`is_cap_or_vice_${player.id}`]: 1,
    };
    model.ints![capVar] = 1;
    model.constraints[`is_starter_${player.id}`] = { max: 0 }; // cap + vice <= start -> (cap+vice) - start <= 0

    // Vice Captain variable (no extra points unless cap doesn't play, but we don't model that here. 
    // We just pick the second highest expected points as vice).
    // To encourage picking the second best, we give it a tiny fractional point bonus (0.01)
    model.variables[viceVar] = {
      expectedPoints: 0.01 * player.expectedPoints, 
      viceCaptains: 1,
      [`is_starter_${player.id}`]: -1,
      [`is_cap_or_vice_${player.id}`]: 1,
    };
    model.ints![viceVar] = 1;
    model.constraints[`is_cap_or_vice_${player.id}`] = { max: 1 }; // Can't be both cap and vice
  }

  const results = solver.Solve(model) as SolveResult;
  const startingXI: number[] = [];
  let captainId = squad[0].id;
  let viceCaptainId = squad[1].id;

  for (const key of Object.keys(results)) {
    if (results[key] === 1) {
      if (key.startsWith("start_")) startingXI.push(parseInt(key.split("_")[1], 10));
      if (key.startsWith("cap_")) captainId = parseInt(key.split("_")[1], 10);
      if (key.startsWith("vice_")) viceCaptainId = parseInt(key.split("_")[1], 10);
    }
  }

  return {
    startingXI,
    captainId,
    viceCaptainId,
    projectedPoints: results.result,
  };
}

/**
 * Mathematically finds the optimal transfers to maximize expected points
 * net of any transfer hits (-4 pts), while obeying budget and club limits.
 */
export function solveTransfers(
  currentSquad: PlayerSignal[],
  candidatePool: PlayerSignal[],
  bank: number,
  freeTransfers: number,
  allowHits: boolean,
): SolverTransferResult {
  const currentSquadIds = new Set(currentSquad.map((p) => p.id));
  const currentSquadValue = currentSquad.reduce((sum, p) => sum + p.price, 0);
  const totalBudget = bank + currentSquadValue;

  const model: LPModel = {
    optimize: "netPoints",
    opType: "max",
    constraints: {
      squadSize: { equal: 15 },
      GK: { equal: 2 },
      DEF: { equal: 5 },
      MID: { equal: 5 },
      FWD: { equal: 3 },
      budget: { max: totalBudget },
    },
    variables: {},
    ints: {},
  };

  // If hits are not allowed, cap the incoming transfers to freeTransfers
  if (!allowHits) {
    model.constraints.transfersIn = { max: freeTransfers };
  }

  // Club limits
  const allClubs = new Set(candidatePool.map((p) => p.club));
  for (const club of allClubs) {
    model.constraints[`club_${club}`] = { max: 3 };
  }

  for (const player of candidatePool) {
    const isCurrent = currentSquadIds.has(player.id);
    const varName = `squad_${player.id}`;
    
    model.variables[varName] = {
      netPoints: player.expectedPoints,
      squadSize: 1,
      [player.position]: 1,
      budget: player.price,
      [`club_${player.club}`]: 1,
      transfersIn: isCurrent ? 0 : 1,
    };
    model.ints![varName] = 1;
  }

  // Model the -4 hit penalty variable
  // We want: NetPoints = Sum(PlayerPoints) - 4 * Hits
  // Hits >= TransfersIn - FreeTransfers
  // In javascript-lp-solver, we can just add variables that have a negative objective value
  // and are tied to the TransfersIn constraint.
  // Actually, modeling the exact hit penalty in standard LP format can be tricky without 
  // complex indicator variables, but since FPL transfers are usually small (0-3),
  // we can run the solver multiple times with exactly 0, 1, 2, 3 transfers forced, 
  // and pick the one with the highest net score! This is much more reliable in JS LP solver.

  let bestResult: SolverTransferResult = { transfersIn: [], transfersOut: [], transfersMade: 0, projectedPoints: -999 };

  const maxTransfers = allowHits ? 3 : freeTransfers; // Usually don't recommend > 3 hits
  
  for (let t = 0; t <= maxTransfers; t++) {
    const runModel: LPModel = JSON.parse(JSON.stringify(model));
    runModel.constraints.transfersIn = { equal: t };

    const results = solver.Solve(runModel) as SolveResult;
    
    if (results.feasible) {
      // Calculate net points manually
      const hitCost = Math.max(0, t - freeTransfers) * 4;
      const netPoints = results.result - hitCost;

      if (netPoints > bestResult.projectedPoints) {
        const selectedIds = new Set<number>();
        for (const key of Object.keys(results)) {
          if (results[key] === 1 && key.startsWith("squad_")) {
            selectedIds.add(parseInt(key.split("_")[1], 10));
          }
        }

        const transfersIn = Array.from(selectedIds).filter((id) => !currentSquadIds.has(id));
        const transfersOut = Array.from(currentSquadIds).filter((id) => !selectedIds.has(id));

        bestResult = {
          transfersIn,
          transfersOut,
          transfersMade: t,
          projectedPoints: netPoints,
        };
      }
    }
  }

  return bestResult;
}
