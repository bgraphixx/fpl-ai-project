import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { linkFplTeam } from "@/lib/user";

const schema = z.object({ fplTeamId: z.number().int().positive() });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await linkFplTeam(session.user.id, parsed.data.fplTeamId);
  return NextResponse.json({ user });
}
