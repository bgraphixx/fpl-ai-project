import { describe, expect, test } from "vitest";
import {
  validateFullSquad,
  validateStartingXI,
  computeTransferCost,
  formationLabel,
} from "@/lib/fpl-rules";
import type { SquadPlayer } from "@/types/fpl";

function player(id: number, position: SquadPlayer["position"], club: string, price = 5.0): SquadPlayer {
  return { id, position, club, price };
}

// A legal 15-man squad: 2 GK / 5 DEF / 5 MID / 3 FWD, no more than 3 per club.
// Clubs are assigned from a single running counter across the whole squad
// (not reset per position) so exactly 5 clubs end up with 3 players each.
function legalSquad(): SquadPlayer[] {
  const squad: SquadPlayer[] = [];
  let id = 1;
  const spread = (count: number, position: SquadPlayer["position"]) => {
    for (let i = 0; i < count; i++) {
      squad.push(player(id, position, `CLUB${id % 5}`, 5.0));
      id++;
    }
  };
  spread(2, "GK");
  spread(5, "DEF");
  spread(5, "MID");
  spread(3, "FWD");
  return squad;
}

describe("validateFullSquad", () => {
  test("accepts a legal 15-man squad within budget", () => {
    const result = validateFullSquad(legalSquad(), 100.0);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects wrong position counts", () => {
    const squad = legalSquad();
    squad.pop(); // drop one FWD -> 14 players, 2 FWD instead of 3
    const result = validateFullSquad(squad, 100.0);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("15 players"))).toBe(true);
  });

  test("rejects a squad over budget", () => {
    const squad = legalSquad().map((p) => ({ ...p, price: 10.0 })); // 15 * 10 = 150m
    const result = validateFullSquad(squad, 100.0);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("exceeds budget"))).toBe(true);
  });

  test("rejects more than 3 players from one club", () => {
    const squad = legalSquad().map((p) => ({ ...p, club: "SAME" }));
    const result = validateFullSquad(squad, 100.0);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Max 3 players per club"))).toBe(true);
  });
});

describe("validateStartingXI", () => {
  function legalXI(): SquadPlayer[] {
    const squad: SquadPlayer[] = [];
    let id = 1;
    const spread = (count: number, position: SquadPlayer["position"]) => {
      for (let i = 0; i < count; i++) {
        squad.push(player(id, position, `CLUB${id % 4}`));
        id++;
      }
    };
    spread(1, "GK");
    spread(4, "DEF");
    spread(4, "MID");
    spread(2, "FWD");
    return squad;
  }

  test("accepts a legal 4-4-2", () => {
    const result = validateStartingXI(legalXI());
    expect(result.valid).toBe(true);
  });

  test("rejects more than 1 goalkeeper", () => {
    const xi = legalXI();
    xi[1] = { ...xi[1], position: "GK" };
    const result = validateStartingXI(xi);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("exactly 1 GK"))).toBe(true);
  });

  test("formationLabel reflects the outfield split", () => {
    expect(formationLabel(legalXI())).toBe("4-4-2");
  });
});

describe("computeTransferCost", () => {
  test("free transfers cost nothing", () => {
    expect(computeTransferCost(1, 1)).toBe(0);
    expect(computeTransferCost(0, 2)).toBe(0);
  });

  test("charges 4 points per transfer beyond the free allowance", () => {
    expect(computeTransferCost(3, 1)).toBe(8); // 2 extra transfers
    expect(computeTransferCost(2, 0)).toBe(8);
  });

  test("never charges negative hits", () => {
    expect(computeTransferCost(0, 5)).toBe(0);
  });
});
