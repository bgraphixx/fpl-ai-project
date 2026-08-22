import { getBootstrapStatic } from "@/lib/fpl";
import { targetGameweek } from "@/lib/gameweek";
import { BuildFlow } from "@/components/BuildFlow";
import { StateScreen } from "@/components/StateScreen";

type BootstrapStatic = {
  events: { id: number; deadline_time: string; finished: boolean; is_current: boolean; is_next: boolean }[];
};

async function loadGameweek(): Promise<number | null> {
  try {
    const bootstrap = (await getBootstrapStatic()) as BootstrapStatic;
    return targetGameweek(bootstrap.events)?.id ?? null;
  } catch {
    return null;
  }
}

export default async function BuildPage() {
  const gameweek = await loadGameweek();

  if (gameweek === null) {
    return (
      <StateScreen
        icon="⚠"
        tone="warning"
        title="Couldn't reach FPL"
        message="We couldn't determine the current gameweek right now."
        action="Try again"
        actionHref="/build"
      />
    );
  }

  return <BuildFlow gameweek={gameweek} />;
}
