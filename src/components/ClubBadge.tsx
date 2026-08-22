import Image from "next/image";
import { clubColor } from "@/lib/club-colors";
import { clubLogoSrc } from "@/lib/club-logos";

// Club crest on a light gray circle — guarantees contrast for every crest
// regardless of the club's own colors (e.g. Brighton's navy/blue crest was
// unreadable on a Brighton-blue chip). Gray rather than pure white: several
// crest SVGs (Bournemouth, Newcastle, Everton, ~half the set) use fill="white"
// for parts of their design, which vanished against a pure-white backdrop.
// Falls back to the club-colored short-name text on the same circle for any
// club without a crest asset yet (not needed for the current season's 20
// clubs, but promotion/relegation adds new ones each year — see
// lib/club-logos.ts).
export function ClubBadge({
  club,
  size = 40,
  className = "",
}: {
  club: string;
  size?: number;
  className?: string;
}) {
  const logoSrc = clubLogoSrc(club);
  const imageSize = Math.round(size * 0.72);

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#dcdfdc] shadow-lg ${className}`}
      style={{ width: size, height: size }}
    >
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt={club}
          width={imageSize}
          height={imageSize}
          className="object-contain"
          unoptimized
        />
      ) : (
        <span
          className="cap font-bold"
          style={{ color: clubColor(club), fontSize: size * 0.3 }}
        >
          {club}
        </span>
      )}
    </div>
  );
}
