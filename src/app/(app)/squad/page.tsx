import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBootstrapStatic, getFixtures } from "@/lib/fpl";
import { targetGameweek } from "@/lib/gameweek";
import { getSquad, TeamNotLinkedError, NoActiveGameweekError, type CurrentSquad } from "@/lib/squad";
import { SquadView } from "@/components/SquadView";
import { StateScreen } from "@/components/StateScreen";

type LoadResult =
  | { kind: "ok"; squad: CurrentSquad }
  | { kind: "not-linked" }
  | { kind: "no-gameweek" }
  | { kind: "unreachable" };

type BootstrapStatic = {
  events: { id: number; deadline_time: string; finished: boolean; is_current: boolean; is_next: boolean }[];
};

async function loadSquad(userId: string): Promise<LoadResult> {
  try {
    return { kind: "ok", squad: await getSquad(userId) };
  } catch (err) {
    if (err instanceof TeamNotLinkedError) return { kind: "not-linked" };
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

export default async function SquadPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const [result, deadline] = await Promise.all([loadSquad(session.user.id), loadDeadline()]);

  if (result.kind === "ok") return <SquadView squad={result.squad} deadline={deadline} />;

  if (result.kind === "not-linked") {
    return (
      <StateScreen
        icon="🔗"
        title="No team linked yet"
        message="Link your FPL Team ID to pull your squad automatically."
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
        message="Your team is linked, but FPL hasn't recorded a squad for this gameweek yet — common pre-season or for a brand-new team."
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
      message="We couldn't pull your squad — the official FPL service isn't responding right now. This is on their side, not yours."
      action="Try again"
      actionHref="/squad"
    />
  );
}
