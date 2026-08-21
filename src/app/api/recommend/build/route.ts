import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBootstrapStatic, getFixtures } from "@/lib/fpl";
import { getTransferCandidates } from "@/lib/squad";
import { buildPlayerSignals } from "@/lib/signals";
import { buildSquadPrompt } from "@/lib/prompts";
import { toSquadPlayers } from "@/lib/recommend-helpers";
import { validateFullSquad, validateStartingXI, formationLabel } from "@/lib/fpl-rules";
import { generateWithValidation, recommendationErrorResponse } from "@/lib/generate-with-validation";
import type { SquadPlayer } from "@/types/fpl";

const requestSchema = z.object({
  gameweek: z.number().int().positive(),
  budget: z.number().positive().default(100.0),
});

type BuildResponse = {
  squad: number[];
  startingXI: number[];
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
  const { gameweek, budget } = parsed.data;

  const [bootstrap, fixtures, candidatePlayerIds] = await Promise.all([
    getBootstrapStatic(),
    getFixtures(gameweek),
    getTransferCandidates([]),
  ]);
  const candidateSignals = buildPlayerSignals(bootstrap as never, fixtures as never, candidatePlayerIds);

  const messages = buildSquadPrompt(candidateSignals, budget);

  let outcome;
  try {
    outcome = await generateWithValidation<BuildResponse>(messages, (aiResult) => {
      if (new Set(aiResult.squad).size !== 15) {
        return { valid: false, errors: ["squad must contain 15 unique player ids"] };
      }
      const squadPlayers = toSquadPlayers(bootstrap as never, aiResult.squad);
      const squadValidation = validateFullSquad(squadPlayers, budget);
      if (!squadValidation.valid) return squadValidation;

      const squadById = new Map<number, SquadPlayer>(squadPlayers.map((p) => [p.id, p]));
      const startingXIPlayers = aiResult.startingXI
        .map((id) => squadById.get(id))
        .filter((p): p is SquadPlayer => Boolean(p));
      if (startingXIPlayers.length !== aiResult.startingXI.length) {
        return { valid: false, errors: ["startingXI contains a player id not in the built squad"] };
      }
      return validateStartingXI(startingXIPlayers);
    });
  } catch (err) {
    return recommendationErrorResponse(err);
  }

  const { result: aiResult, modelUsed, selfCorrected } = outcome;
  const squadPlayers = toSquadPlayers(bootstrap as never, aiResult.squad);
  const squadById = new Map<number, SquadPlayer>(squadPlayers.map((p) => [p.id, p]));
  const startingXIPlayers = aiResult.startingXI
    .map((id) => squadById.get(id))
    .filter((p): p is SquadPlayer => Boolean(p));

  const players = Object.fromEntries(
    candidateSignals
      .filter((s) => aiResult.squad.includes(s.id))
      .map((s) => [s.id, { name: s.name, club: s.club, price: s.price, position: s.position }]),
  );

  const recommendation = await prisma.recommendation.create({
    data: {
      userId: session.user.id,
      gameweek,
      mode: "build",
      inputSignals: candidateSignals as never,
      modelUsed,
      summary: {
        text: aiResult.summary,
        perPlayer: aiResult.perPlayer.map((p) => ({ id: p.id, text: p.summary })),
      },
      detail: {
        text: aiResult.detail,
        squad: aiResult.squad,
        formation: formationLabel(startingXIPlayers),
        captainId: aiResult.captainId,
        viceCaptainId: aiResult.viceCaptainId,
        perPlayer: aiResult.perPlayer,
        selfCorrected,
      },
    },
  });

  return NextResponse.json({ recommendation, aiResult, selfCorrected, players });
}
