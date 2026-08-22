import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEntry } from "@/lib/fpl";
import { FplEntry, FplLeagueClassic, FplLeagueH2H } from "@/types/fpl";
import { StateScreen } from "@/components/StateScreen";

function LeagueCard({ league, type }: { league: FplLeagueClassic | FplLeagueH2H; type: "classic" | "h2h" }) {
  const movement = league.entry_last_rank - league.entry_rank;
  const isUp = movement > 0;
  const isDown = movement < 0;

  return (
    <Link href={`/leagues/${type}/${league.id}`} className="block">
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-4 transition-colors hover:bg-surface-3">
      <div>
        <div className="font-semibold text-text">{league.name}</div>
        <div className="text-sm text-text-muted">Rank: {league.entry_rank}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {league.entry_last_rank === 0 ? (
           <div className="text-sm text-text-muted">New</div>
        ) : movement !== 0 ? (
          <div className={`flex items-center gap-1 text-sm font-medium ${isUp ? "text-green-500" : "text-red-500"}`}>
            <span>{isUp ? "▲" : "▼"}</span>
            <span>{Math.abs(movement)}</span>
          </div>
        ) : (
          <div className="text-sm text-text-muted">-</div>
        )}
      </div>
    </div>
    </Link>
  );
}

export default async function LeaguesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { fplTeamId: true },
  });

  if (!user?.fplTeamId) {
    return (
      <StateScreen
        icon="🔗"
        title="No team linked yet"
        message="Link your FPL Team ID to view your leagues."
        action="Link FPL Team ID"
        actionHref="/onboarding"
      />
    );
  }

  let entry: FplEntry;
  try {
    entry = (await getEntry(user.fplTeamId)) as FplEntry;
  } catch (err) {
    return (
      <StateScreen
        icon="⚠"
        tone="warning"
        title="Couldn't reach FPL"
        message="We couldn't pull your leagues — the official FPL service isn't responding right now."
        action="Try again"
        actionHref="/leagues"
      />
    );
  }

  const classicLeagues = entry.leagues?.classic || [];
  const h2hLeagues = entry.leagues?.h2h || [];

  return (
    <div className="space-y-8">
      <h1 className="cap text-2xl font-bold tracking-tight">Your Leagues</h1>

      {classicLeagues.length > 0 && (
        <section>
          <h2 className="mb-4 cap text-lg font-semibold tracking-tight text-text-muted">Classic Leagues</h2>
          <div className="flex flex-col gap-3">
            {classicLeagues.map((league) => (
              <LeagueCard key={league.id} league={league} type="classic" />
            ))}
          </div>
        </section>
      )}

      {h2hLeagues.length > 0 && (
        <section>
          <h2 className="mb-4 cap text-lg font-semibold tracking-tight text-text-muted">Head-to-Head Leagues</h2>
          <div className="flex flex-col gap-3">
            {h2hLeagues.map((league) => (
              <LeagueCard key={league.id} league={league} type="h2h" />
            ))}
          </div>
        </section>
      )}

      {classicLeagues.length === 0 && h2hLeagues.length === 0 && (
        <StateScreen
          icon="🏆"
          title="No leagues found"
          message="You are not currently participating in any Classic or Head-to-Head leagues."
          action="Go to Points"
          actionHref="/"
        />
      )}
    </div>
  );
}
