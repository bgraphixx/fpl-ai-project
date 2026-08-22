"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { clubColor, clubTextColor } from "@/lib/club-colors";
import { clubLogoSrc } from "@/lib/club-logos";
import type { DisplayPlayer } from "@/types/ui";
import type { Position } from "@/types/fpl";

type SortKey = "price" | "form" | "points";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "price", label: "£" },
  { key: "form", label: "Form" },
  { key: "points", label: "Pts" },
];

const POSITION_ORDER: { key: Position; label: string }[] = [
  { key: "GK", label: "Goalkeepers" },
  { key: "DEF", label: "Defenders" },
  { key: "MID", label: "Midfielders" },
  { key: "FWD", label: "Forwards" },
];

function ClubBadge({ club }: { club: string }) {
  const logoSrc = clubLogoSrc(club);
  return (
    <div
      className="cap mr-2.5 flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold"
      style={{ background: clubColor(club), color: clubTextColor(club) }}
    >
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt={club}
          width={18}
          height={18}
          className="object-contain"
          unoptimized
        />
      ) : (
        club
      )}
    </div>
  );
}

export function SquadTable({
  players,
  onSelectPlayer,
}: {
  players: DisplayPlayer[];
  onSelectPlayer?: (player: DisplayPlayer) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("price");

  const groups = useMemo(() => {
    return POSITION_ORDER.map(({ key, label }) => {
      const group = players
        .filter((p) => p.position === key)
        .sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));
      return { key, label, players: group };
    }).filter((g) => g.players.length > 0);
  }, [players, sortKey]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border-soft">
      <div className="flex items-center border-b border-border-soft px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-text-dim">
        <span className="flex-1">Player</span>
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            onClick={() => setSortKey(col.key)}
            className={`w-14 text-right ${sortKey === col.key ? "text-accent" : ""}`}
            type="button"
          >
            {col.label}
            {sortKey === col.key ? " ▾" : ""}
          </button>
        ))}
      </div>
      <div>
        {groups.map((group) => (
          <div key={group.key}>
            <div className="border-b border-border-soft/60 bg-surface-2/50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-text-dim">
              {group.label}
            </div>
            {group.players.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectPlayer?.(p)}
                className="flex w-full items-center border-b border-border-soft/60 px-4 py-2.5 text-left last:border-b-0 hover:bg-surface-2"
                type="button"
              >
                <ClubBadge club={p.club} />
                <div className="flex-1">
                  <div className="cap text-[15px] font-semibold leading-tight">{p.name}</div>
                  <div className="text-[10px] text-text-dim">{p.position}</div>
                </div>
                <span className="cap w-14 text-right text-[15px] font-semibold text-accent">
                  {p.price.toFixed(1)}
                </span>
                <span className="cap w-14 text-right text-[15px] font-semibold">
                  {p.form?.toFixed(1) ?? "–"}
                </span>
                <span className="cap w-14 text-right text-[15px] font-semibold">
                  {p.points ?? "–"}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

