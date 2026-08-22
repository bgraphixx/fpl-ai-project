import { PlayerChip } from "@/components/PlayerChip";
import type { DisplayPlayer } from "@/types/ui";

const ROW_ORDER = ["GK", "DEF", "MID", "FWD"] as const;

// Renders a starting XI as pitch rows — GK at the top (own goal, which the
// decoration below sits next to), forwards at the bottom, matching the
// official FPL app layout.
export function PitchFormation({
  players,
  onSelectPlayer,
  showPrice = true,
  showPoints = false,
  fixturesCount = 0,
}: {
  players: DisplayPlayer[];
  onSelectPlayer?: (player: DisplayPlayer) => void;
  showPrice?: boolean;
  showPoints?: boolean;
  fixturesCount?: 0 | 1 | 3;
}) {
  const rows = ROW_ORDER.map((pos) => players.filter((p) => p.position === pos)).filter(
    (row) => row.length > 0,
  );

  return (
    <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-success-deep bg-[repeating-linear-gradient(#1e7a3c_0_46px,#1a6f36_46px_92px)]">
      {/* Own goal markings at the top, next to the GK row */}
      <div className="pointer-events-none absolute top-2 left-1/2 h-14 w-32 -translate-x-1/2 border-2 border-b-0 border-white/20" />
      <div className="pointer-events-none absolute top-[calc(3.5rem-1.375rem)] left-1/2 h-11 w-11 -translate-x-1/2 rounded-full border-2 border-white/20" />
      {/* Center line */}
      <div className="pointer-events-none absolute left-0 right-0 top-1/2 border-t border-white/10" />
      <div className="flex h-full flex-col justify-around gap-4 px-2 py-6">
        {rows.map((row, i) => (
          <div key={i} className="flex justify-evenly gap-1.5">
            {row.map((p) => (
              <PlayerChip
                key={p.id}
                player={p}
                onClick={() => onSelectPlayer?.(p)}
                showPrice={showPrice}
                showPoints={showPoints}
                fixturesCount={fixturesCount}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
