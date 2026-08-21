"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { linkFplTeam } from "@/lib/user";
import { getEntry } from "@/lib/fpl";
import { sendEmail } from "@/lib/email";
import { teamLinkedEmail } from "@/lib/email-templates";

type FplEntry = { name?: string; player_first_name?: string; player_last_name?: string };

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

  // Fetch the manager's team name from the FPL API
  let teamName: string | undefined;
  try {
    const entry = (await getEntry(fplTeamId)) as FplEntry;
    teamName = entry.name || undefined;
  } catch {
    // FPL API unreachable — link anyway, just without the name
  }

  await linkFplTeam(session.user.id, fplTeamId, teamName);

  // Fire-and-forget team-linked email — never blocks the redirect
  if (session.user.email) {
    const { subject, html } = teamLinkedEmail(session.user.email, fplTeamId, teamName);
    void sendEmail({ to: { address: session.user.email }, subject, html }).catch(console.error);
  }

  redirect("/");
}

