"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { linkFplTeam } from "@/lib/user";

export async function linkTeamAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };

  const raw = String(formData.get("fplTeamId") ?? "").replace(/\D/g, "");
  const fplTeamId = Number(raw);
  if (!raw || !Number.isInteger(fplTeamId) || fplTeamId <= 0) {
    return { error: "Enter a valid FPL Team ID." };
  }

  await linkFplTeam(session.user.id, fplTeamId);
  redirect("/");
}
