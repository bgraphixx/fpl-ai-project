import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBootstrapStatic, getFixtures } from "@/lib/fpl";
import { currentGameweek } from "@/lib/gameweek";
import { Countdown } from "@/components/Countdown";
import { ModeCard } from "@/components/ModeCard";
import { StateScreen } from "@/components/StateScreen";

type BootstrapStatic = {
  events: { id: number; deadline_time: string; finished: boolean; is_current: boolean; is_next: boolean }[];
};

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user?.fplTeamId) {
    return (
      <StateScreen
        icon="🔗"
        title="No team linked yet"
        message="You can browse the app, but picks, transfers and captaincy all need your squad. Link a Team ID to switch it on."
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

  let deadlineISO: string | null = null;
  let gameweek: number | null = null;
  let fixtureCount = 0;

  try {
    const bootstrap = (await getBootstrapStatic()) as BootstrapStatic;
    const gw = currentGameweek(bootstrap.events);
    if (gw) {
      deadlineISO = gw.deadline_time;
      gameweek = gw.id;
      const fixtures = (await getFixtures(gameweek)) as unknown[];
      fixtureCount = fixtures.length;
    }
  } catch {
    // FPL unreachable — mode cards still work off cached/manual data.
  }

  return (
    <div className="flex flex-col gap-6">
      {deadlineISO && gameweek ? (
        <Countdown
          deadlineISO={deadlineISO}
          gameweek={gameweek}
          fixtureCount={fixtureCount}
          freeTransfers={1}
        />
      ) : (
        <div className="rounded-2xl border border-warning-deep/40 bg-surface-2 p-4 text-sm text-text-muted">
          Couldn&apos;t reach FPL for the current gameweek deadline. You can still generate
          recommendations.
        </div>
      )}

      <div>
        <h1 className="cap mb-3 text-2xl font-bold">Get a recommendation</h1>
        <div className="flex flex-col gap-3">
          <ModeCard
            href="/xi"
            icon="◈"
            title="Set my XI + captain"
            subtitle="Best starting 11 from your squad"
            featured
          />
          <ModeCard
            href="/transfers"
            icon="⇄"
            title="Suggest transfers"
            subtitle="Who to move on, within your budget"
          />
          <ModeCard
            href="/build"
            icon="✦"
            title="Build from scratch"
            subtitle="New team · wildcard · free hit"
          />
        </div>
      </div>
    </div>
  );
}
