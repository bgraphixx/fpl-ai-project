import { PlayerChip } from "@/components/PlayerChip";
import type { DisplayPlayer } from "@/types/ui";

const ROW_ORDER = ["FWD", "MID", "DEF", "GK"] as const;

// Renders a starting XI (or any position-balanced player list) as pitch rows,
// forwards nearest the opponent goal down to the keeper — mirrors the design
// reference's pitch view.
export function PitchFormation({
  players,
  onSelectPlayer,
}: {
  players: DisplayPlayer[];
  onSelectPlayer?: (player: DisplayPlayer) => void;
}) {
  const rows = ROW_ORDER.map((pos) => players.filter((p) => p.position === pos)).filter(
    (row) => row.length > 0,
  );

  return (
    <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-success-deep bg-[repeating-linear-gradient(#1e7a3c_0_46px,#1a6f36_46px_92px)]">
      <div className="pointer-events-none absolute left-1/2 top-2 h-14 w-32 -translate-x-1/2 border-2 border-b-0 border-white/20" />
      <div className="pointer-events-none absolute left-1/2 top-2 h-11 w-11 -translate-x-1/2 rounded-full border-2 border-white/20" />
      <div className="flex h-full flex-col justify-around gap-4 px-2 py-6">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap justify-evenly gap-y-3">
            {row.map((p) => (
              <PlayerChip key={p.id} player={p} onClick={() => onSelectPlayer?.(p)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
