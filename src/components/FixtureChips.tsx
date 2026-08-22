import { fdrColor } from "@/lib/club-colors";
import type { UpcomingFixture } from "@/types/ui";

// FDR-colored fixture pills, shared by PlayerChip (compact, under the pitch
// chip), the manual-transfer table/search rows, and the player detail panel.
export function FixtureChips({
  fixtures,
  size = "md",
}: {
  fixtures?: UpcomingFixture[];
  size?: "sm" | "md";
}) {
  if (!fixtures || fixtures.length === 0) {
    return <span className="text-xs text-text-dim">No fixture data</span>;
  }

  const chipClass =
    size === "sm"
      ? "cap rounded px-1 py-px text-[9px] font-bold"
      : "cap rounded px-1.5 py-0.5 text-[11px] font-bold";

  const isSmall = size === "sm";

  return (
    <div className={`flex ${isSmall ? "w-full flex-col items-stretch gap-[2px]" : "flex-wrap gap-1"}`}>
      {fixtures.map((f, i) => {
        const { bg, fg } = fdrColor(f.difficulty);
        return (
          <div
            key={i}
            className={`${chipClass} ${isSmall ? "text-center" : ""}`}
            style={{ background: bg, color: fg }}
          >
            {f.opponent} {f.isHome ? "(H)" : "(A)"}
          </div>
        );
      })}
    </div>
  );
}
