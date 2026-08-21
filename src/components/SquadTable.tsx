"use client";

import { useMemo, useState } from "react";
import { clubColor, clubTextColor } from "@/lib/club-colors";
import type { DisplayPlayer } from "@/types/ui";

type SortKey = "price" | "form" | "points";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "price", label: "£" },
  { key: "form", label: "Form" },
  { key: "points", label: "Pts" },
];

export function SquadTable({
  players,
  onSelectPlayer,
}: {
  players: DisplayPlayer[];
  onSelectPlayer?: (player: DisplayPlayer) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("price");

  const sorted = useMemo(
    () => [...players].sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0)),
    [players, sortKey],
  );

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
        {sorted.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectPlayer?.(p)}
            className="flex w-full items-center border-b border-border-soft/60 px-4 py-2.5 text-left last:border-b-0 hover:bg-surface-2"
            type="button"
          >
            <div
              className="cap mr-2.5 flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold"
              style={{ background: clubColor(p.club), color: clubTextColor(p.club) }}
            >
              {p.club}
            </div>
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
    </div>
  );
}
