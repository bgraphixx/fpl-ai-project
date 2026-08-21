import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { linkFplTeam } from "@/lib/user";
import { getEntry } from "@/lib/fpl";

const schema = z.object({ fplTeamId: z.number().int().positive() });

type FplEntry = { name?: string };

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let teamName: string | undefined;
  try {
    const entry = (await getEntry(parsed.data.fplTeamId)) as FplEntry;
    teamName = entry.name || undefined;
  } catch {
    // FPL API unreachable — link anyway without name
  }

  const user = await linkFplTeam(session.user.id, parsed.data.fplTeamId, teamName);
  return NextResponse.json({ user });
}

