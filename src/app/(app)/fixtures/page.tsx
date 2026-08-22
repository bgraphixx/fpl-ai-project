import { getBootstrapStatic, getFixtures } from "@/lib/fpl";
import { pickableGameweek } from "@/lib/gameweek";
import { FixturesView } from "@/components/FixturesView";
import { StateScreen } from "@/components/StateScreen";

type BootstrapEvent = { id: number; deadline_time: string; finished: boolean; is_current: boolean; is_next: boolean };
type BootstrapTeam = { id: number; name: string; short_name: string };
type BootstrapStatic = { events: BootstrapEvent[]; teams: BootstrapTeam[] };

type LoadResult =
  | { kind: "ok"; events: BootstrapEvent[]; teams: BootstrapTeam[]; gameweek: number; fixtures: unknown }
  | { kind: "unreachable" };

async function loadFixtures(): Promise<LoadResult> {
  try {
    const bootstrap = (await getBootstrapStatic()) as BootstrapStatic;
    const gw = pickableGameweek(bootstrap.events) ?? bootstrap.events.find(e => e.is_next) ?? bootstrap.events[0];
    if (!gw) return { kind: "unreachable" };

    const fixtures = await getFixtures(gw.id);
    return { kind: "ok", events: bootstrap.events, teams: bootstrap.teams, gameweek: gw.id, fixtures };
  } catch {
    return { kind: "unreachable" };
  }
}

export default async function FixturesPage() {
  const result = await loadFixtures();

  if (result.kind === "ok") {
    return (
      <FixturesView
        events={result.events}
        teams={result.teams}
        initialGameweek={result.gameweek}
        initialFixtures={result.fixtures as never}
      />
    );
  }

  return (
    <StateScreen
      icon="⚠"
      tone="warning"
      title="Couldn't reach FPL"
      message="We couldn't load the fixture list right now — the official FPL service isn't responding."
      action="Try again"
      actionHref="/fixtures"
    />
  );
}
