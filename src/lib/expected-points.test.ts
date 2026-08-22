import { describe, expect, test } from "vitest";
import { calculateExpectedPoints } from "@/lib/expected-points";

// A settled (non-cold-start) forward: 60+ minutes, so the cold-start blend
// (which only kicks in under 45 minutes/game) never applies here.
const baseForward = {
  position: "FWD" as const,
  price: 8.0,
  pointsPerGame: 5.0,
  chanceOfPlaying: null,
  expectedGoals: 1,
  expectedAssists: 0,
  expectedGoalsConceded: 1,
  bps: 24, // logistic bonus curve midpoint: exactly 1.5 of the 3-point max
  minutesPerGame: 60,
};

describe("calculateExpectedPoints", () => {
  test("chanceOfPlaying 0 short-circuits to exactly 0", () => {
    const result = calculateExpectedPoints({ ...baseForward, chanceOfPlaying: 0 });
    expect(result).toBe(0);
  });

  test("fixture-difficulty multiplier scales performance points but not appearance points", () => {
    // Regression test: the multiplier used to apply to the whole score,
    // including the flat "played 60+ minutes" component, which shouldn't
    // move with how hard the fixture is.
    const neutral = calculateExpectedPoints(baseForward);

    const favourable = calculateExpectedPoints({
      ...baseForward,
      teamAttackStrength: 2000,
      opponentDefenseStrength: 500, // pushes fdrMultiplier to its 1.4 clamp for a FWD
    });

    // baseAppearancePoints = 2 (60+ mins), basePerformancePoints = 4 (1 goal
    // * 4) + 0 (FWD has no defensive points) + 1.5 (bonus at bps=24) = 5.5.
    // neutral = (2 + 5.5 * 1.0) * 1.0 = 7.5
    // favourable = (2 + 5.5 * 1.4) * 1.0 = 9.7
    expect(neutral).toBeCloseTo(7.5, 2);
    expect(favourable).toBeCloseTo(9.7, 2);
    // The appearance component (2) must be identical in both — only the
    // performance component (5.5) should have scaled by the multiplier.
    expect(favourable - neutral).toBeCloseTo(5.5 * (1.4 - 1.0), 2);
  });

  test("bonus points are capped at 3, however extreme the BPS input", () => {
    const large = calculateExpectedPoints({ ...baseForward, bps: 1_000 });
    const huge = calculateExpectedPoints({ ...baseForward, bps: 1_000_000 });
    // Both already saturated near the logistic curve's asymptote — an
    // uncapped linear formula would keep growing without bound instead.
    expect(huge).toBeCloseTo(large, 1);
    expect(huge).toBeLessThan(2 /* appearance */ + 4 /* 1 goal */ + 3 /* bonus cap */ + 0.01);
  });

  test("cold start (0 minutes this season) blends fully toward the historical/price prior", () => {
    const result = calculateExpectedPoints({
      ...baseForward,
      minutesPerGame: 0,
      pointsPerGame: 5.0,
      historicalMinutes: 0, // no last-season track record either
    });
    // priorWeight = 1 - (0/45) = 1 -> fully the pointsPerGame fallback prior,
    // no appearance points assumed (they haven't proven they'll start).
    expect(result).toBeCloseTo(5.0, 1);
  });

  test("a proven starter's cold-start prior comes from last season's underlying stats, not just price", () => {
    const withHistory = calculateExpectedPoints({
      ...baseForward,
      minutesPerGame: 0,
      historicalMinutes: 3000, // well over the 450-minute threshold
      historicalXG: 10,
      historicalXA: 5,
      historicalXGC: 20,
      historicalBPS: 800,
      historicalStarts: 30, // high start ratio -> no rotation-risk penalty
    });
    const priceOnly = calculateExpectedPoints({
      ...baseForward,
      minutesPerGame: 0,
      pointsPerGame: 0,
      historicalMinutes: 0,
    });
    expect(withHistory).not.toBeCloseTo(priceOnly, 1);
    expect(withHistory).toBeGreaterThan(0);
  });
});
