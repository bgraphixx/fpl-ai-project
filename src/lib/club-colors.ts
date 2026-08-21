// Club shirt colors for player chips, matching the design reference. Falls
// back to a deterministic hash-based color for any club not in the map, so
// promoted/relegated teams each season don't need a manual update.
const CLUB_COLORS: Record<string, string> = {
  ARS: "#ef2b3d",
  AVL: "#7a003c",
  BOU: "#d71920",
  BRE: "#e30613",
  BHA: "#0057b8",
  BUR: "#6c1d45",
  CHE: "#1c4fd8",
  CRY: "#1b458f",
  EVE: "#274488",
  FUL: "#000000",
  IPS: "#4477bb",
  LEI: "#003090",
  LIV: "#d0021b",
  MCI: "#6cabdd",
  MUN: "#da291c",
  NEW: "#111111",
  NFO: "#dd0000",
  SOU: "#d71920",
  TOT: "#132257",
  WHU: "#7a263a",
  WOL: "#fdb913",
  SUN: "#e00000",
};

const FALLBACK_PALETTE = [
  "#5c6bc0", "#26a69a", "#8d6e63", "#78909c", "#7e57c2", "#26c6da",
];

export function clubColor(shortName: string): string {
  if (CLUB_COLORS[shortName]) return CLUB_COLORS[shortName];
  let hash = 0;
  for (let i = 0; i < shortName.length; i++) hash = (hash * 31 + shortName.charCodeAt(i)) | 0;
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}

// MCI's light blue and WOL's gold read better with dark text than white.
const LIGHT_BG_CLUBS = new Set(["MCI", "WOL"]);

export function clubTextColor(shortName: string): string {
  return LIGHT_BG_CLUBS.has(shortName) ? "#06210a" : "#ffffff";
}
