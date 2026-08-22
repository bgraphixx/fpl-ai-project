import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBootstrapStatic, getElementSummary } from "@/lib/fpl";

type ElementSummary = {
  history: { round: number; total_points: number }[];
};

type BootstrapElement = { id: number; total_points: number };

// Season points history for one player — for the Pick Team / Transfers
// detail panel's "last 3 GW" trend. `getElementSummary` is already cached
// (same 40-min-TTL/FplCache mechanism as everything else in lib/fpl.ts), so
// this only hits live FPL the first time a given player is looked up after
// its cache entry goes stale.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const playerId = Number(id);
  if (!Number.isInteger(playerId) || playerId <= 0) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  try {
    const [summary, bootstrap] = await Promise.all([
      getElementSummary(playerId) as Promise<ElementSummary>,
      getBootstrapStatic() as Promise<{ elements: BootstrapElement[] }>,
    ]);

    const seasonTotal = bootstrap.elements.find((e) => e.id === playerId)?.total_points ?? 0;
    const last3 = summary.history
      .slice(-3)
      .reverse()
      .map((h) => ({ round: h.round, totalPoints: h.total_points }));

    return NextResponse.json({ seasonTotal, last3 });
  } catch {
    return NextResponse.json({ error: "Couldn't reach FPL" }, { status: 502 });
  }
}
