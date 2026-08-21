import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBootstrapStatic, getFixtures } from "@/lib/fpl";
import { buildPlayerSignals } from "@/lib/signals";
import { buildXIPrompt } from "@/lib/prompts";
import { toSquadPlayers } from "@/lib/recommend-helpers";
import { validateStartingXI, formationLabel } from "@/lib/fpl-rules";
import { generateWithValidation, recommendationErrorResponse } from "@/lib/generate-with-validation";
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
  const signals = buildPlayerSignals(bootstrap as never, fixtures as never, squadPlayerIds);
  const squadPlayers = toSquadPlayers(bootstrap as never, squadPlayerIds);
  const squadById = new Map<number, SquadPlayer>(squadPlayers.map((p) => [p.id, p]));

  const messages = buildXIPrompt(signals);

  let outcome;
  try {
    outcome = await generateWithValidation<XIResponse>(messages, (aiResult) => {
      const startingXIPlayers = aiResult.startingXI
        .map((id) => squadById.get(id))
        .filter((p): p is SquadPlayer => Boolean(p));
      if (startingXIPlayers.length !== aiResult.startingXI.length) {
        return { valid: false, errors: ["startingXI contains a player id not in the squad"] };
      }
      return validateStartingXI(startingXIPlayers);
    });
  } catch (err) {
    return recommendationErrorResponse(err);
  }

  const { result: aiResult, modelUsed, selfCorrected } = outcome;
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
        selfCorrected,
      },
    },
  });

  return NextResponse.json({ recommendation, aiResult, selfCorrected });
}
