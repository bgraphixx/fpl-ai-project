import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBootstrapStatic, getFixtures } from "@/lib/fpl";
import { targetGameweek } from "@/lib/gameweek";
import { getPublicSquad, NoActiveGameweekError, type CurrentSquad } from "@/lib/squad";
import { SquadView } from "@/components/SquadView";
import { StateScreen } from "@/components/StateScreen";
import Link from "next/link";

type LoadResult =
  | { kind: "ok"; squad: CurrentSquad }
  | { kind: "no-gameweek" }
  | { kind: "unreachable" };

type BootstrapStatic = {
  events: { id: number; deadline_time: string; finished: boolean; is_current: boolean; is_next: boolean }[];
};

async function loadSquad(teamId: number): Promise<LoadResult> {
  try {
    return { kind: "ok", squad: await getPublicSquad(teamId) };
  } catch (err) {
    if (err instanceof NoActiveGameweekError) return { kind: "no-gameweek" };
    return { kind: "unreachable" };
  }
}

async function loadDeadline(): Promise<{ deadlineISO: string; gameweek: number; fixtureCount: number } | null> {
  try {
    const bootstrap = (await getBootstrapStatic()) as BootstrapStatic;
    const gw = targetGameweek(bootstrap.events);
    if (!gw) return null;
    const fixtures = (await getFixtures(gw.id)) as unknown[];
    return { deadlineISO: gw.deadline_time, gameweek: gw.id, fixtureCount: fixtures.length };
  } catch {
    return null;
  }
}

export default async function PublicSquadPage(props: {
  params: Promise<{ teamId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await props.params;
  const teamId = Number(params.teamId);

  if (isNaN(teamId)) {
    return (
      <StateScreen
        icon="❓"
        title="Invalid Team"
        message="The team you are trying to view does not exist or is invalid."
        action="Go back to Leagues"
        actionHref="/leagues"
      />
    );
  }

  const [result, deadline] = await Promise.all([loadSquad(teamId), loadDeadline()]);

  if (result.kind === "ok") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link
            href="/leagues"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
          >
            ←
          </Link>
          <div>
            <h1 className="cap text-2xl font-bold tracking-tight">Manager&apos;s Squad</h1>
            <p className="text-sm text-text-muted">Viewing Team ID: {teamId}</p>
          </div>
        </div>
        <SquadView squad={result.squad} deadline={deadline} isPublic={true} />
      </div>
    );
  }

  if (result.kind === "no-gameweek") {
    return (
      <StateScreen
        icon="◵"
        title="No squad yet"
        message="FPL hasn't recorded a squad for this gameweek yet — common pre-season."
        action="Back to Leagues"
        actionHref="/leagues"
      />
    );
  }

  return (
    <StateScreen
      icon="⚠"
      tone="warning"
      title="Couldn't reach FPL"
      message="We couldn't pull this squad — the official FPL service isn't responding right now or the team doesn't exist."
      action="Back to Leagues"
      actionHref="/leagues"
    />
  );
}
