import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeagueClassicStandings, getLeagueH2HStandings } from "@/lib/fpl";
import { FplClassicStandingsResponse, FplH2HStandingsResponse } from "@/types/fpl";
import { StateScreen } from "@/components/StateScreen";
import { ClassicStandingsTable, H2HStandingsTable } from "@/components/StandingsTable";

export default async function LeagueStandingsPage(props: {
  params: Promise<{ type: string; id: string }>;
}) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { fplTeamId: true },
  });

  if (!user?.fplTeamId) {
    redirect("/onboarding");
  }

  const { type, id } = params;
  const leagueId = Number(id);

  if (isNaN(leagueId) || (type !== "classic" && type !== "h2h")) {
    return (
      <StateScreen
        icon="❓"
        title="Invalid League"
        message="The league you are trying to view does not exist or is invalid."
        action="Go back to Leagues"
        actionHref="/leagues"
      />
    );
  }

  let dataClassic: FplClassicStandingsResponse | null = null;
  let dataH2H: FplH2HStandingsResponse | null = null;

  try {
    if (type === "classic") {
      dataClassic = (await getLeagueClassicStandings(leagueId)) as FplClassicStandingsResponse;
    } else {
      dataH2H = (await getLeagueH2HStandings(leagueId)) as FplH2HStandingsResponse;
    }
  } catch (err) {
    return (
      <StateScreen
        icon="⚠"
        tone="warning"
        title="Couldn't reach FPL"
        message="We couldn't pull the league standings — the official FPL service isn't responding right now."
        action="Back to Leagues"
        actionHref="/leagues"
      />
    );
  }

  if (type === "classic" && dataClassic) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/leagues"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
          >
            ←
          </Link>
          <div>
            <h1 className="cap text-2xl font-bold tracking-tight">{dataClassic.league.name}</h1>
            <p className="text-sm text-text-muted">Classic League</p>
          </div>
        </div>
        <ClassicStandingsTable initialData={dataClassic} fplTeamId={user.fplTeamId} leagueId={leagueId} />
      </div>
    );
  } else if (dataH2H) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/leagues"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
          >
            ←
          </Link>
          <div>
            <h1 className="cap text-2xl font-bold tracking-tight">{dataH2H.league.name}</h1>
            <p className="text-sm text-text-muted">Head-to-Head League</p>
          </div>
        </div>
        <H2HStandingsTable initialData={dataH2H} fplTeamId={user.fplTeamId} leagueId={leagueId} />
      </div>
    );
  }
}


