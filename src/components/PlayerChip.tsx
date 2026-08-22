import { ClubBadge } from "@/components/ClubBadge";
import { FixtureChips } from "@/components/FixtureChips";
import type { DisplayPlayer } from "@/types/ui";

const AVAILABILITY_DOT: Record<NonNullable<DisplayPlayer["availability"]>, string> = {
  available: "text-success",
  doubtful: "text-warning-deep",
  unavailable: "text-danger",
};

// Player badge for the pitch view: club crest, name underneath, and either
// price, points, or upcoming-fixture pills depending on the page — plus an
// optional captain/vice-captain armband badge.
//
// Chips are flex-1/min-w-0 rather than a fixed width so a row of 5 always
// fits on one line and shrinks together instead of wrapping (no horizontal
// scroll) — see PitchFormation, which drops flex-wrap for the same reason.
export function PlayerChip({
  player,
  onClick,
  showPrice = true,
  showPoints = false,
  isHighlighted = false,
  fixturesCount = 0,
}: {
  player: DisplayPlayer;
  onClick?: () => void;
  showPrice?: boolean;
  showPoints?: boolean;
  isHighlighted?: boolean;
  fixturesCount?: 0 | 1 | 3;
}) {
  const containerClasses = [
    "flex min-w-0 flex-1 flex-col items-center gap-1",
    isHighlighted ? "bg-accent/20 ring-2 ring-accent rounded-md shadow-[0_0_15px_rgba(205,255,0,0.5)]" : "",
  ].join(" ");

  return (
    <button
      onClick={onClick}
      className={containerClasses}
      type="button"
    >
      <div className="relative">
        {player.isCaptain && (
          <span className="cap absolute -right-2 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-captain text-[11px] font-bold text-white">
            C
          </span>
        )}
        {player.isViceCaptain && (
          <span className="cap absolute -right-2 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-vice text-[11px] font-bold text-accent-ink">
            V
          </span>
        )}
        <ClubBadge club={player.club} size={38} />
      </div>
      <div className="min-w-0 max-w-full rounded-md bg-surface/90 px-1.5 py-0.5 text-center">
        <div className="cap truncate text-[11px] font-semibold leading-tight sm:text-[12px]">
          {player.name}
        </div>
        {player.expectedPoints !== undefined && (
          <div className="text-[9px] font-medium text-accent bg-accent/10 rounded-sm mx-auto w-max px-1 mb-0.5">
            {(fixturesCount > 1
              ? (player.upcomingFixtures ?? [])
                  .slice(0, fixturesCount)
                  .reduce((sum, f) => sum + (f.expectedPoints ?? 0), 0)
              : player.expectedPoints
            ).toFixed(1)}{" "}
            xPts
          </div>
        )}
        {showPoints ? (
          <div className="cap text-[11px] font-bold text-accent">
            {(player.gwPoints ?? 0) * (player.multiplier ?? 1)} pts
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-accent">
            {showPrice && <span>£{player.price.toFixed(1)}</span>}
            {player.availability && (
              <span className={AVAILABILITY_DOT[player.availability]}>●</span>
            )}
          </div>
        )}
        {fixturesCount > 0 && (
          <div className="mt-0.5 flex justify-center">
            <FixtureChips fixtures={player.upcomingFixtures?.slice(0, fixturesCount)} size="sm" />
          </div>
        )}
      </div>
    </button>
  );
}
