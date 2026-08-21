import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSquad, TeamNotLinkedError, NoActiveGameweekError } from "@/lib/squad";

// Auto-pulls the user's current-gameweek squad from FPL and stores a
// snapshot. The client may later send an edited player list to the
// /api/recommend/* routes for that one generation without persisting the
// edit (plan §6 — manual overrides are request-scoped, not silently
// written over the auto-pulled snapshot).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const squad = await getCurrentSquad(session.user.id);
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

const manualSquadSchema = z.object({
  gameweek: z.number().int().positive(),
  players: z.array(z.unknown()).length(15),
  bank: z.number().min(0),
  teamValue: z.number().min(0),
});

// Persists a manually-edited squad as its own snapshot (source "manual"),
// distinct from the auto-pulled one for the same gameweek.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = manualSquadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { gameweek, players, bank, teamValue } = parsed.data;

  const snapshot = await prisma.squadSnapshot.create({
    data: {
      userId: session.user.id,
      gameweek,
      players: players as never,
      bank,
      teamValue,
      source: "manual",
    },
  });

  return NextResponse.json({ snapshot });
}
