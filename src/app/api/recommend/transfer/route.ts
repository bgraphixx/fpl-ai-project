import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBootstrapStatic, getFixtures } from "@/lib/fpl";
import { getTransferCandidates, getLiveAdjustmentMap } from "@/lib/squad";
import { buildPlayerSignals } from "@/lib/signals";
import { buildTransferPrompt } from "@/lib/prompts";
import { computeTransferCost } from "@/lib/fpl-rules";
import { generateNarration, recommendationErrorResponse } from "@/lib/generate-with-validation";
import { sendEmail } from "@/lib/email";
import { transferRecommendationEmail } from "@/lib/email-templates";
import { solveTransfers } from "@/lib/solver-models";

const requestSchema = z.object({
  gameweek: z.number().int().positive(),
  squadPlayerIds: z.array(z.number().int()).length(15),
  freeTransfers: z.number().int().min(0),
  bank: z.number().min(0),
  allowHits: z.boolean().default(true),
});

type TransferResponse = {
  transfersOut: number[];
  transfersIn: number[];
  transfersMade: number;
  hitWorthIt: boolean;
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
  const { gameweek, squadPlayerIds, freeTransfers, bank, allowHits } = parsed.data;

  const [bootstrap, fixtures, candidatePlayerIds] = await Promise.all([
    getBootstrapStatic(),
    getFixtures(gameweek),
    getTransferCandidates(squadPlayerIds),
  ]);

  const allPlayerIds = [...squadPlayerIds, ...candidatePlayerIds];
  const [historyRecords, teamStrengths, liveAdjustmentMap] = await Promise.all([
    prisma.playerHistory.findMany({ where: { id: { in: allPlayerIds } } }),
    prisma.teamStrength.findMany(),
    getLiveAdjustmentMap(bootstrap as never),
  ]);

  const historyMap = new Map(historyRecords.map(h => [h.id, h]));
  const teamStrengthMap = new Map(teamStrengths.map(t => [t.id, t]));

  const squadSignals = buildPlayerSignals(bootstrap as never, fixtures as never, squadPlayerIds, historyMap, teamStrengthMap, liveAdjustmentMap);
  const candidateSignals = buildPlayerSignals(bootstrap as never, fixtures as never, candidatePlayerIds, historyMap, teamStrengthMap, liveAdjustmentMap);

  // 1. Math Solver Engine
  const solverResult = solveTransfers(squadSignals, candidateSignals, bank, freeTransfers, allowHits);

  // 2. Analyst LLM
  const messages = buildTransferPrompt(squadSignals, candidateSignals, solverResult, freeTransfers, bank);

  let aiResult: TransferResponse;
  let modelUsed: string;

  try {
    const outcome = await generateNarration<TransferResponse>(messages, [
      "summary",
      "detail",
      "perPlayer",
    ]);
    aiResult = outcome.result;
    modelUsed = outcome.modelUsed;
  } catch (err) {
    return recommendationErrorResponse(err);
  }

  // Enforce solver's math
  aiResult.transfersOut = solverResult.transfersOut;
  aiResult.transfersIn = solverResult.transfersIn;
  aiResult.transfersMade = solverResult.transfersMade;
  aiResult.hitWorthIt = solverResult.transfersMade > freeTransfers;

  const hitCost = computeTransferCost(aiResult.transfersMade, freeTransfers);
  const incomingPlayers = Object.fromEntries(
    candidateSignals
      .filter((s) => aiResult.transfersIn.includes(s.id))
      .map((s) => [s.id, { name: s.name, club: s.club, price: s.price, position: s.position }]),
  );

  const recommendation = await prisma.recommendation.create({
    data: {
      userId: session.user.id,
      gameweek,
      mode: "transfer",
      inputSignals: { squadSignals, candidateSignals } as never,
      modelUsed,
      summary: {
        text: aiResult.summary,
        hitCost,
        perPlayer: aiResult.perPlayer.map((p) => ({ id: p.id, text: p.summary })),
      },
      detail: {
        text: aiResult.detail,
        transfersOut: aiResult.transfersOut,
        transfersIn: aiResult.transfersIn,
        hitWorthIt: aiResult.hitWorthIt,
        hitCost,
        perPlayer: aiResult.perPlayer,
      },
    },
  });

  // Fire-and-forget transfer recommendation email
  if (session.user.email) {
    const elements = (bootstrap as { elements: { id: number; web_name: string }[] }).elements;
    const nameById = new Map(elements.map((e) => [e.id, e.web_name]));
    const outNames = aiResult.transfersOut.map((id) => nameById.get(id) ?? `#${id}`);
    const inNames = aiResult.transfersIn.map((id) => nameById.get(id) ?? `#${id}`);
    const { subject, html } = transferRecommendationEmail(session.user.email, gameweek, inNames, outNames, hitCost, aiResult.summary);
    void sendEmail({ to: { address: session.user.email }, subject, html }).catch(console.error);
  }

  return NextResponse.json({ recommendation, aiResult, hitCost, incomingPlayers });
}
