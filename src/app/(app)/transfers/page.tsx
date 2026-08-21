import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentSquad, TeamNotLinkedError, NoActiveGameweekError, type CurrentSquad } from "@/lib/squad";
import { TransferFlow } from "@/components/TransferFlow";
import { StateScreen } from "@/components/StateScreen";

type LoadResult =
  | { kind: "ok"; squad: CurrentSquad }
  | { kind: "not-linked" }
  | { kind: "no-gameweek" }
  | { kind: "unreachable" };

async function loadSquad(userId: string): Promise<LoadResult> {
  try {
    return { kind: "ok", squad: await getCurrentSquad(userId) };
  } catch (err) {
    if (err instanceof TeamNotLinkedError) return { kind: "not-linked" };
    if (err instanceof NoActiveGameweekError) return { kind: "no-gameweek" };
    return { kind: "unreachable" };
  }
}

export default async function TransfersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const result = await loadSquad(session.user.id);

  if (result.kind === "ok") return <TransferFlow squad={result.squad} />;

  if (result.kind === "not-linked") {
    return (
      <StateScreen
        icon="🔗"
        title="No team linked yet"
        message="Link your FPL Team ID so the AI can suggest transfers for your real squad."
        action="Link FPL Team ID"
        actionHref="/onboarding"
      />
    );
  }

  if (result.kind === "no-gameweek") {
    return (
      <StateScreen
        icon="◵"
        title="No squad yet"
        message="FPL hasn't recorded a squad for this gameweek yet."
        action="Build one from scratch"
        actionHref="/build"
      />
    );
  }

  return (
    <StateScreen
      icon="⚠"
      tone="warning"
      title="Couldn't reach FPL"
      message="We couldn't pull your squad — the official FPL service isn't responding right now."
      action="Try again"
      actionHref="/transfers"
    />
  );
}
