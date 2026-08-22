import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getSquad, saveManualSquad, TeamNotLinkedError, NoActiveGameweekError } from "@/lib/squad";

// Reads the stored squad (fast — no live FPL call). Seeds it with a live
// pull the first time a team is linked. Use POST /api/squad/refresh to
// force a fresh pull from FPL.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const squad = await getSquad(session.user.id);
    return NextResponse.json(squad);
  } catch (err) {
    if (err instanceof TeamNotLinkedError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof NoActiveGameweekError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Couldn't reach FPL" }, { status: 502 });
  }
}

const storedPickSchema = z.object({
  id: z.number().int(),
  isCaptain: z.boolean(),
  isViceCaptain: z.boolean(),
  isBench: z.boolean(),
});

const manualSquadSchema = z.object({
  gameweek: z.number().int().positive(),
  players: z.array(storedPickSchema).length(15),
  bank: z.number().min(0),
  teamValue: z.number().min(0),
});

// Persists a manually-edited squad (squad editor, manual transfer, or a
// saved AI build) as the new latest snapshot — it becomes what every page
// shows until the user hits Refresh.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = manualSquadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { gameweek, players, bank, teamValue } = parsed.data;

  const snapshot = await saveManualSquad(session.user.id, gameweek, players, bank, teamValue);
  return NextResponse.json({ snapshot });
}
