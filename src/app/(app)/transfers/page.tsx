import { auth } from "@/lib/auth";
import {
  getSquad,
  getAllPlayers,
  TeamNotLinkedError,
  NoActiveGameweekError,
  type CurrentSquad,
} from "@/lib/squad";
import { TransfersContainer } from "@/components/TransfersContainer";
import { StateScreen } from "@/components/StateScreen";
import type { DisplayPlayer } from "@/types/ui";

type LoadResult =
  | { kind: "ok"; squad: CurrentSquad; allPlayers: DisplayPlayer[] }
  | { kind: "not-linked" }
  | { kind: "no-gameweek" }
  | { kind: "unreachable" };

async function loadData(userId: string): Promise<LoadResult> {
  try {
    const [squad, allPlayers] = await Promise.all([getSquad(userId), getAllPlayers()]);
    return { kind: "ok", squad, allPlayers };
  } catch (err) {
    if (err instanceof TeamNotLinkedError) return { kind: "not-linked" };
    if (err instanceof NoActiveGameweekError) return { kind: "no-gameweek" };
    return { kind: "unreachable" };
  }
}

export default async function TransfersPage() {
  const session = await auth();
  const result = await loadData(session!.user.id);

  if (result.kind === "ok") {
    return <TransfersContainer squad={result.squad} allPlayers={result.allPlayers} />;
  }

  if (result.kind === "not-linked") {
    return (
      <StateScreen
        icon="🔗"
        title="No team linked yet"
        message="Link your FPL Team ID to manage transfers for your real squad."
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
