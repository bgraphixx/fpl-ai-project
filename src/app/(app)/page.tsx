import { auth } from "@/lib/auth";
import { getSquad, TeamNotLinkedError, NoActiveGameweekError, type CurrentSquad } from "@/lib/squad";
import { PointsView } from "@/components/PointsView";
import { StateScreen } from "@/components/StateScreen";

type LoadResult =
  | { kind: "ok"; squad: CurrentSquad }
  | { kind: "not-linked" }
  | { kind: "no-gameweek" }
  | { kind: "unreachable" };

async function loadSquad(userId: string): Promise<LoadResult> {
  try {
    return { kind: "ok", squad: await getSquad(userId) };
  } catch (err) {
    if (err instanceof TeamNotLinkedError) return { kind: "not-linked" };
    if (err instanceof NoActiveGameweekError) return { kind: "no-gameweek" };
    return { kind: "unreachable" };
  }
}

export default async function PointsPage() {
  const session = await auth();
  const result = await loadSquad(session!.user.id);

  if (result.kind === "ok") return <PointsView squad={result.squad} />;

  if (result.kind === "not-linked") {
    return (
      <StateScreen
        icon="🔗"
        title="No team linked yet"
        message="Link your FPL Team ID to see your live gameweek points."
        action="Link FPL Team ID"
        actionHref="/onboarding"
        secondary={
          <>
            Prefer to build one by hand?{" "}
            <a href="/build" className="font-semibold text-accent">
              Enter manually
            </a>
          </>
        }
      />
    );
  }

  if (result.kind === "no-gameweek") {
    return (
      <StateScreen
        icon="◵"
        title="No points yet"
        message="FPL hasn't recorded any gameweek scores yet — common pre-season or for a brand-new team."
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
      message="We couldn't pull your points — the official FPL service isn't responding right now. This is on their side, not yours."
      action="Try again"
      actionHref="/"
    />
  );
}
