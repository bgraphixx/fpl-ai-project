import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFixtures } from "@/lib/fpl";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventParam = searchParams.get("event");
  const event = eventParam ? Number(eventParam) : undefined;

  const data = await getFixtures(event);
  return NextResponse.json(data);
}
