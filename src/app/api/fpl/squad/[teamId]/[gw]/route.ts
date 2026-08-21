import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEntryPicks } from "@/lib/fpl";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; gw: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId, gw } = await params;
  const data = await getEntryPicks(Number(teamId), Number(gw));
  return NextResponse.json(data);
}
