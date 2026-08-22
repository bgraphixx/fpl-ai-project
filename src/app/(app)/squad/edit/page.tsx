import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getSquad,
  getAllPlayers,
  TeamNotLinkedError,
  NoActiveGameweekError,
  type CurrentSquad,
} from "@/lib/squad";
import { SquadEditor } from "@/components/SquadEditor";
import { StateScreen } from "@/components/StateScreen";
import type { DisplayPlayer } from "@/types/ui";

type LoadResult =
  | { kind: "ok"; squad: CurrentSquad; allPlayers: DisplayPlayer[] }
  | { kind: "no-squad" }
  | { kind: "unreachable" };

async function loadData(userId: string): Promise<LoadResult> {
  try {
    const [squad, allPlayers] = await Promise.all([getSquad(userId), getAllPlayers()]);
    return { kind: "ok", squad, allPlayers };
  } catch (err) {
    if (err instanceof TeamNotLinkedError || err instanceof NoActiveGameweekError) {
      return { kind: "no-squad" };
    }
    return { kind: "unreachable" };
  }
}

export default async function SquadEditPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const result = await loadData(session.user.id);

  if (result.kind === "ok") {
    return (
      <SquadEditor
        initialSquad={[...result.squad.starting, ...result.squad.bench]}
        allPlayers={result.allPlayers}
        gameweek={result.squad.gameweek}
      />
    );
  }

  if (result.kind === "no-squad") {
    return (
      <StateScreen
        icon="◵"
        title="No squad to edit yet"
        message="Link your team or build a squad first."
        action="Go to squad"
        actionHref="/squad"
      />
    );
  }

  return (
    <StateScreen
      icon="⚠"
      tone="warning"
      title="Couldn't reach FPL"
      message="We couldn't load your squad or the player list right now."
      action="Try again"
      actionHref="/squad/edit"
    />
  );
}
