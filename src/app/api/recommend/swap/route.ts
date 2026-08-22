import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBootstrapStatic, getFixtures } from "@/lib/fpl";
import { buildPlayerSignals } from "@/lib/signals";
import { buildSwapPrompt } from "@/lib/prompts";
import { generateNarration, recommendationErrorResponse } from "@/lib/generate-with-validation";

const requestSchema = z.object({
  outPlayerId: z.number().int(),
  squadPlayerIds: z.array(z.number().int()).length(15),
  bank: z.number().min(0),
  gameweek: z.number().int().positive(),
});

type SwapAiResponse = { suggestedId: number; reasoning: string };

// Candidate pool is pre-trimmed to keep the prompt small/reliable, same
// rationale as getTransferCandidates in squad.ts.
const CANDIDATE_POOL_SIZE = 15;

// Single-swap "Consult AI" for the manual Transfers player-detail panel.
// No solver here (that's overkill for a 1-for-1 swap) — the deterministic
// xPts ranking (same one the picker UI shows) is the ground truth; the AI's
// job is just to explain the top pick or flag a caveat.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { outPlayerId, squadPlayerIds, bank, gameweek } = parsed.data;

  const [bootstrap, fixtures] = await Promise.all([getBootstrapStatic(), getFixtures(gameweek)]);
  const elements = (bootstrap as { elements: { id: number; element_type: number; total_points: number }[] }).elements;
  const outEl = elements.find((e) => e.id === outPlayerId);
  if (!outEl) return NextResponse.json({ error: "Unknown player" }, { status: 400 });

  const squadIds = new Set(squadPlayerIds);
  const candidateIds = elements
    .filter((e) => e.element_type === outEl.element_type && !squadIds.has(e.id))
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, CANDIDATE_POOL_SIZE)
    .map((e) => e.id);

  const [historyRecords, teamStrengths] = await Promise.all([
    prisma.playerHistory.findMany(),
    prisma.teamStrength.findMany(),
  ]);
  const historyMap = new Map(historyRecords.map((h) => [h.id, h]));
  const teamStrengthMap = new Map(teamStrengths.map((t) => [t.id, t]));

  const [outSignal] = buildPlayerSignals(bootstrap as never, fixtures as never, [outPlayerId], historyMap, teamStrengthMap);
  const candidateSignals = buildPlayerSignals(bootstrap as never, fixtures as never, candidateIds, historyMap, teamStrengthMap)
    .filter((c) => bank + outSignal.price >= c.price)
    .sort((a, b) => b.expectedPoints - a.expectedPoints)
    .slice(0, 10);

  if (candidateSignals.length === 0) {
    return NextResponse.json({ error: "No affordable replacement candidates found" }, { status: 422 });
  }

  const messages = buildSwapPrompt(outSignal, candidateSignals, bank);

  let aiResult: SwapAiResponse;
  try {
    const outcome = await generateNarration<SwapAiResponse>(messages, ["suggestedId", "reasoning"]);
    aiResult = outcome.result;
  } catch (err) {
    return recommendationErrorResponse(err);
  }

  // Ground the AI's pick in the deterministic list — if it names an id
  // outside the candidate pool, fall back to the top-ranked candidate.
  const suggested = candidateSignals.find((c) => c.id === aiResult.suggestedId) ?? candidateSignals[0];

  return NextResponse.json({
    suggested: {
      id: suggested.id,
      name: suggested.name,
      club: suggested.club,
      price: suggested.price,
      expectedPoints: suggested.expectedPoints,
    },
    reasoning: aiResult.reasoning,
  });
}
