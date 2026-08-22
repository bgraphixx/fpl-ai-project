import type { Position } from "@/types/fpl";

type ExpectedPointsInputs = {
  position: Position;
  price: number; 
  pointsPerGame: number; 
  chanceOfPlaying: number | null; 
  expectedGoals: number; 
  expectedAssists: number; 
  expectedGoalsConceded: number; 
  bps: number; 
  minutesPerGame: number; 
  
  // Historical Prior (PlayerHistory)
  historicalXG?: number;
  historicalXA?: number;
  historicalXGC?: number;
  historicalSaves?: number;
  historicalBPS?: number;
  historicalStarts?: number;
  historicalMinutes?: number;

  // Granular Fixture Difficulty (TeamStrength)
  teamAttackStrength?: number;
  opponentDefenseStrength?: number;
  teamDefenseStrength?: number;
  opponentAttackStrength?: number;
};

/**
 * Calculates a mathematically sound "Expected Points" (xPts) projection
 * for a player's upcoming gameweek based on underlying FPL statistics.
 */
export function calculateExpectedPoints(inputs: ExpectedPointsInputs): number {
  const {
    position,
    price,
    pointsPerGame,
    chanceOfPlaying,
    expectedGoals,
    expectedAssists,
    expectedGoalsConceded,
    bps,
    minutesPerGame,
  } = inputs;

  // 1. Availability Multiplier
  const playChance = chanceOfPlaying === null ? 1.0 : chanceOfPlaying / 100;
  if (playChance === 0) return 0;

  // 2. Minutes Projection (Appearance points)
  let expectedMinsPoints = 0;
  if (minutesPerGame >= 60) expectedMinsPoints = 2;
  else if (minutesPerGame > 0) expectedMinsPoints = 1;
  else expectedMinsPoints = 0;

  // 3. Attacking Returns
  let expectedAttackingPoints = 0;
  if (position === "FWD") {
    expectedAttackingPoints = expectedGoals * 4 + expectedAssists * 3;
  } else if (position === "MID") {
    expectedAttackingPoints = expectedGoals * 5 + expectedAssists * 3;
  } else {
    expectedAttackingPoints = expectedGoals * 6 + expectedAssists * 3;
  }

  // 4. Defensive Returns
  let csProbability = Math.exp(-expectedGoalsConceded);
  csProbability = Math.max(0.05, Math.min(0.6, csProbability));
  
  let expectedDefensivePoints = 0;
  if (position === "GK" || position === "DEF") {
    expectedDefensivePoints = csProbability * 4;
  } else if (position === "MID") {
    expectedDefensivePoints = csProbability * 1;
  }

  // 5. Bonus Points
  let expectedBonus = 0;
  if (bps > 15) {
    expectedBonus = (bps - 15) / 10;
  }

  const baseExpectedPoints = expectedMinsPoints + expectedAttackingPoints + expectedDefensivePoints + expectedBonus;

  // 6. Cold Start / Gameweek 1 Bias Correction (Bayesian Prior)
  let adjustedPoints = baseExpectedPoints;
  if (minutesPerGame < 45) {
    let historicalPrior = 0;

    // Use historical xG/xA if they played over 450 minutes (approx 5 full games) last season
    const hMins = inputs.historicalMinutes || 0;
    if (hMins > 450) {
      const hAppearances = hMins / 90;
      const hXG = (inputs.historicalXG || 0) / hAppearances;
      const hXA = (inputs.historicalXA || 0) / hAppearances;
      const hXGC = (inputs.historicalXGC || 0) / hAppearances;
      const hBPS = (inputs.historicalBPS || 0) / hAppearances;
      
      let hAttPts = 0;
      if (position === "FWD") hAttPts = hXG * 4 + hXA * 3;
      else if (position === "MID") hAttPts = hXG * 5 + hXA * 3;
      else hAttPts = hXG * 6 + hXA * 3;

      let hCsProb = Math.exp(-hXGC);
      hCsProb = Math.max(0.05, Math.min(0.6, hCsProb));
      
      let hDefPts = 0;
      if (position === "GK" || position === "DEF") hDefPts = hCsProb * 4;
      else if (position === "MID") hDefPts = hCsProb * 1;

      const hBonus = hBPS > 15 ? (hBPS - 15) / 10 : 0;
      const hMinsPts = 2; // Assuming they start if we project them

      historicalPrior = hMinsPts + hAttPts + hDefPts + hBonus;

      // Penalize impact subs (played a lot of minutes, but rarely started)
      if (inputs.historicalStarts !== undefined) {
        const startRatio = inputs.historicalStarts / (hMins / 90);
        if (startRatio < 0.5) {
          historicalPrior *= 0.6; // Heavy penalty for rotation risks
        }
      }
    } else {
      // Fallback: Use historical PPG or Price
      let pricePrior = 0;
      if (position === "FWD" || position === "MID") pricePrior = (price / 10) * 5.0;
      else pricePrior = (price / 10) * 7.0;
      historicalPrior = pointsPerGame > 0 ? pointsPerGame : pricePrior;
    }

    const priorWeight = 1 - (minutesPerGame / 45); 
    adjustedPoints = (baseExpectedPoints * (1 - priorWeight)) + (historicalPrior * priorWeight);
  }

  // 7. Granular Fixture Difficulty Multiplier
  let fdrMultiplier = 1.0;
  if (inputs.teamAttackStrength && inputs.opponentDefenseStrength) {
    // Attack multiplier: Attacker's Team Attack vs Opponent's Team Defense
    // E.g., 1250 attack vs 1050 defense = +200 diff -> 1.20x multiplier
    const attackDiff = inputs.teamAttackStrength - inputs.opponentDefenseStrength;
    const attackMult = 1 + (attackDiff / 1000);

    // Defense multiplier: Team Defense vs Opponent's Attack
    const defenseDiff = (inputs.teamDefenseStrength || 1100) - (inputs.opponentAttackStrength || 1100);
    const defenseMult = 1 + (defenseDiff / 1000);

    // Blend them based on position
    if (position === "FWD") {
      fdrMultiplier = attackMult;
    } else if (position === "MID") {
      fdrMultiplier = (attackMult * 0.7) + (defenseMult * 0.3); // Mids rely more on attack
    } else {
      fdrMultiplier = (attackMult * 0.2) + (defenseMult * 0.8); // Defenders rely heavily on defense
    }
    
    // Clamp multiplier between 0.6x and 1.4x to avoid extreme outliers
    fdrMultiplier = Math.max(0.6, Math.min(1.4, fdrMultiplier));
  }

  let finalProjected = adjustedPoints * fdrMultiplier * playChance;
  finalProjected = Math.max(0, finalProjected);
  return Math.round(finalProjected * 100) / 100;
}
