import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refreshSquadFromFpl, TeamNotLinkedError, NoActiveGameweekError } from "@/lib/squad";

// The "Refresh" button — the only path that pulls team-specific data
// (picks, points, rank) live from FPL. Everything else reads GET /api/squad
// (the stored snapshot).
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const squad = await refreshSquadFromFpl(session.user.id);
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
