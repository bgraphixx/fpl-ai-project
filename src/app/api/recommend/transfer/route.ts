import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBootstrapStatic, getFixtures } from "@/lib/fpl";
import { getTransferCandidates } from "@/lib/squad";
import { buildPlayerSignals } from "@/lib/signals";
import { buildTransferPrompt } from "@/lib/prompts";
import { toSquadPlayers } from "@/lib/recommend-helpers";
import { validateTransfer, computeTransferCost } from "@/lib/fpl-rules";
import { generateWithValidation, recommendationErrorResponse } from "@/lib/generate-with-validation";
import { sendEmail } from "@/lib/email";
import { transferRecommendationEmail } from "@/lib/email-templates";

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
  const squadSignals = buildPlayerSignals(bootstrap as never, fixtures as never, squadPlayerIds);
  const candidateSignals = buildPlayerSignals(bootstrap as never, fixtures as never, candidatePlayerIds);
  const squadPlayers = toSquadPlayers(bootstrap as never, squadPlayerIds);
  const previousSquadValue = squadPlayers.reduce((sum, p) => sum + p.price, 0);

  const messages = buildTransferPrompt(squadSignals, candidateSignals, freeTransfers, bank, allowHits);

  let outcome;
  try {
    outcome = await generateWithValidation<TransferResponse>(messages, (aiResult) => {
      if (aiResult.transfersOut.length !== aiResult.transfersIn.length) {
        return { valid: false, errors: ["transfersOut and transfersIn must be the same length"] };
      }
      if (!allowHits && aiResult.transfersMade > freeTransfers) {
        return { valid: false, errors: [`The user disallowed hits — transfersMade must be ≤ ${freeTransfers}`] };
      }
      const resultingIds = squadPlayerIds
        .filter((id) => !aiResult.transfersOut.includes(id))
        .concat(aiResult.transfersIn);
      if (new Set(resultingIds).size !== 15) {
        return { valid: false, errors: ["Resulting squad doesn't have 15 unique players"] };
      }
      const resultingPlayers = toSquadPlayers(bootstrap as never, resultingIds);
      return validateTransfer(resultingPlayers, previousSquadValue, bank);
    });
  } catch (err) {
    return recommendationErrorResponse(err);
  }

  const { result: aiResult, modelUsed, selfCorrected } = outcome;
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
        selfCorrected,
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

  return NextResponse.json({ recommendation, aiResult, hitCost, selfCorrected, incomingPlayers });
}
