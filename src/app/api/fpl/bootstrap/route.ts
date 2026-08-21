import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBootstrapStatic } from "@/lib/fpl";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getBootstrapStatic();
  return NextResponse.json(data);
}
