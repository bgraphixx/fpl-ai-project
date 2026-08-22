import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBootstrapStatic, getFixtures } from "@/lib/fpl";
import { buildPlayerSignals } from "@/lib/signals";
import { getLiveAdjustmentMap } from "@/lib/squad";
import { buildXIPrompt } from "@/lib/prompts";
import { toSquadPlayers } from "@/lib/recommend-helpers";
import { formationLabel } from "@/lib/fpl-rules";
import { generateNarration, recommendationErrorResponse } from "@/lib/generate-with-validation";
import { sendEmail } from "@/lib/email";
import { xiRecommendationEmail } from "@/lib/email-templates";
import { solveStartingXI } from "@/lib/solver-models";
import type { SquadPlayer } from "@/types/fpl";

const requestSchema = z.object({
  gameweek: z.number().int().positive(),
  squadPlayerIds: z.array(z.number().int()).length(15),
});

type XIResponse = {
  startingXI: number[];
  bench: number[];
  formation: string;
  captainId: number;
  viceCaptainId: number;
  summary: string;
  detail: string;
  perPlayer: { id: number; summary: string; detail: string }[];
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { gameweek, squadPlayerIds } = parsed.data;

  const [bootstrap, fixtures] = await Promise.all([getBootstrapStatic(), getFixtures(gameweek)]);
  const [historyRecords, teamStrengths, liveAdjustmentMap] = await Promise.all([
    prisma.playerHistory.findMany({ where: { id: { in: squadPlayerIds } } }),
    prisma.teamStrength.findMany(),
    getLiveAdjustmentMap(bootstrap as never),
  ]);

  const historyMap = new Map(historyRecords.map(h => [h.id, h]));
  const teamStrengthMap = new Map(teamStrengths.map(t => [t.id, t]));

  const signals = buildPlayerSignals(bootstrap as never, fixtures as never, squadPlayerIds, historyMap, teamStrengthMap, liveAdjustmentMap);
  const squadPlayers = toSquadPlayers(bootstrap as never, squadPlayerIds);
  const squadById = new Map<number, SquadPlayer>(squadPlayers.map((p) => [p.id, p]));

  // 1. Math Solver Engine (Determines the optimal squad instantly)
  let solverResult;
  try {
    solverResult = solveStartingXI(signals);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't compute a starting XI for this squad" },
      { status: 422 },
    );
  }

  // 2. Analyst LLM (Explains the mathematical choices)
  const messages = buildXIPrompt(signals, solverResult);

  let aiResult: XIResponse;
  let modelUsed: string;

  try {
    const outcome = await generateNarration<XIResponse>(messages, [
      "summary",
      "detail",
      "perPlayer",
    ]);
    aiResult = outcome.result;
    modelUsed = outcome.modelUsed;
  } catch (err) {
    return recommendationErrorResponse(err);
  }

  // Enforce solver's output over any LLM hallucinations just in case
  aiResult.startingXI = solverResult.startingXI;
  aiResult.captainId = solverResult.captainId;
  aiResult.viceCaptainId = solverResult.viceCaptainId;
  aiResult.bench = squadPlayerIds.filter((id) => !solverResult.startingXI.includes(id));

  const startingXIPlayers = aiResult.startingXI
    .map((id) => squadById.get(id))
    .filter((p): p is SquadPlayer => Boolean(p));

  const recommendation = await prisma.recommendation.create({
    data: {
      userId: session.user.id,
      gameweek,
      mode: "xi",
      inputSignals: signals as never,
      modelUsed,
      summary: {
        text: aiResult.summary,
        perPlayer: aiResult.perPlayer.map((p) => ({ id: p.id, text: p.summary })),
      },
      detail: {
        text: aiResult.detail,
        formation: formationLabel(startingXIPlayers),
        bench: aiResult.bench,
        captainId: aiResult.captainId,
        viceCaptainId: aiResult.viceCaptainId,
        perPlayer: aiResult.perPlayer,
      },
    },
  });

  // Fire-and-forget XI recommendation email
  if (session.user.email) {
    const elements = (bootstrap as { elements: { id: number; web_name: string }[] }).elements;
    const captainName = elements.find((e) => e.id === aiResult.captainId)?.web_name ?? "Unknown";
    const formation = formationLabel(startingXIPlayers);
    const { subject, html } = xiRecommendationEmail(session.user.email, gameweek, formation, captainName, aiResult.summary);
    void sendEmail({ to: { address: session.user.email }, subject, html }).catch(console.error);
  }

  return NextResponse.json({ recommendation, aiResult });
}

