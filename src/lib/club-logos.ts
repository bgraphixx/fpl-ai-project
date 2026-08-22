// Maps FPL short_name codes to the club crest SVG path in /public/images/clubs/.
// Falls back to an empty string for clubs not in the map (e.g. newly promoted
// teams not yet added to the Assets folder).

const CLUB_LOGO_MAP: Record<string, string> = {
  ARS: "/images/clubs/arsenal.svg",
  AVL: "/images/clubs/aston-villa.svg",
  BOU: "/images/clubs/bournemouth.svg",
  BRE: "/images/clubs/brentford.svg",
  BHA: "/images/clubs/brighton.svg",
  CHE: "/images/clubs/chelsea.svg",
  COV: "/images/clubs/coventry-city.svg",
  CRY: "/images/clubs/crystal-palace.svg",
  EVE: "/images/clubs/everton.svg",
  FUL: "/images/clubs/fulham.svg",
  HUL: "/images/clubs/hull-city.svg",
  IPS: "/images/clubs/ipswich-town.svg",
  LEE: "/images/clubs/leeds-united.svg",
  LIV: "/images/clubs/liverpool.svg",
  MCI: "/images/clubs/manchester-city.svg",
  MUN: "/images/clubs/manchester-united.svg",
  NEW: "/images/clubs/newcastle-united.svg",
  NFO: "/images/clubs/nottingham-forest.svg",
  SUN: "/images/clubs/sunderland.svg",
  TOT: "/images/clubs/tottenham-hotspur.svg",
  // Add newly promoted/relegated teams here each season:
  // BUR: "/images/clubs/burnley.svg",
  // LEI: "/images/clubs/leicester-city.svg",
  // SOU: "/images/clubs/southampton.svg",
  // WHU: "/images/clubs/west-ham.svg",
  // WOL: "/images/clubs/wolverhampton.svg",
};

/**
 * Returns the public path to the club's crest SVG.
 * Returns an empty string for clubs without a logo asset.
 */
export function clubLogoSrc(shortName: string): string {
  return CLUB_LOGO_MAP[shortName] ?? "";
}
