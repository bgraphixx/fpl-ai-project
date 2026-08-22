import Image from "next/image";
import { clubColor, clubTextColor } from "@/lib/club-colors";
import { clubLogoSrc } from "@/lib/club-logos";
import type { DisplayPlayer } from "@/types/ui";

const AVAILABILITY_DOT: Record<NonNullable<DisplayPlayer["availability"]>, string> = {
  available: "text-success",
  doubtful: "text-warning-deep",
  unavailable: "text-danger",
};

// Player badge for the pitch view: club-colored square with crest SVG,
// name + price underneath, optional captain/vice-captain armband badge.
export function PlayerChip({
  player,
  onClick,
}: {
  player: DisplayPlayer;
  onClick?: () => void;
}) {
  const bg = clubColor(player.club);
  const fg = clubTextColor(player.club);
  const logoSrc = clubLogoSrc(player.club);

  return (
    <button
      onClick={onClick}
      className="flex w-[70px] flex-col items-center gap-1 sm:w-[78px]"
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
        <div
          className="cap flex h-10 w-10 items-center justify-center rounded-[9px] text-[13px] font-bold shadow-lg sm:h-11 sm:w-11"
          style={{ background: bg, color: fg }}
        >
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt={player.club}
              width={28}
              height={28}
              className="object-contain drop-shadow-sm sm:h-[30px] sm:w-[30px]"
              unoptimized
            />
          ) : (
            player.club
          )}
        </div>
      </div>
      <div className="min-w-[62px] rounded-md bg-surface/90 px-1.5 py-0.5 text-center">
        <div className="cap truncate text-[12px] font-semibold leading-tight">{player.name}</div>
        <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-accent">
          £{player.price.toFixed(1)}
          {player.availability && (
            <span className={AVAILABILITY_DOT[player.availability]}>●</span>
          )}
        </div>
      </div>
    </button>
  );
}
