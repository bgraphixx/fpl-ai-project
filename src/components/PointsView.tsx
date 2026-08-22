"use client";

import { useState } from "react";
import Image from "next/image";
import { clubColor, clubTextColor } from "@/lib/club-colors";
import { clubLogoSrc } from "@/lib/club-logos";
import { PitchFormation } from "@/components/PitchFormation";
import { RefreshSquadButton } from "@/components/RefreshSquadButton";
import type { CurrentSquad } from "@/lib/squad";
import type { DisplayPlayer } from "@/types/ui";
import type { Position } from "@/types/fpl";

const POSITION_ORDER: { key: Position; label: string }[] = [
  { key: "GK", label: "Goalkeepers" },
  { key: "DEF", label: "Defenders" },
  { key: "MID", label: "Midfielders" },
  { key: "FWD", label: "Forwards" },
];

function ClubBadgeSmall({ club }: { club: string }) {
  const logoSrc = clubLogoSrc(club);
  return (
    <div
      className="cap flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
      style={{ background: clubColor(club), color: clubTextColor(club) }}
    >
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt={club}
          width={20}
          height={20}
          className="object-contain"
          unoptimized
        />
      ) : (
        club
      )}
    </div>
  );
}

function PlayerPointsRow({ player }: { player: DisplayPlayer }) {
  const raw = player.gwPoints ?? 0;
  const multiplier = player.multiplier ?? 1;
  const contribution = raw * multiplier;

  return (
    <div className="flex items-center gap-3 border-b border-border-soft/60 py-2.5 last:border-b-0">
      <ClubBadgeSmall club={player.club} />
      <div className="flex-1">
        <div className="cap flex items-center gap-1.5 text-[15px] font-semibold leading-tight">
          {player.name}
          {player.isCaptain && (
            <span className="cap rounded bg-captain px-1.5 py-0.5 text-[10px] font-bold text-white">
              C
            </span>
          )}
          {player.isViceCaptain && (
            <span className="cap rounded bg-vice px-1.5 py-0.5 text-[10px] font-bold text-accent-ink">
              V
            </span>
          )}
        </div>
        <div className="text-[11px] text-text-dim">{player.position}</div>
      </div>
      <div className="cap text-right text-[15px] font-bold">
        {contribution}
        {multiplier > 1 && <span className="ml-1 text-xs text-text-dim">({raw} × {multiplier})</span>}
      </div>
    </div>
  );
}

export function PointsView({ squad }: { squad: CurrentSquad }) {
  const [view, setView] = useState<"pitch" | "table">("pitch");
  const benchPoints = squad.bench.reduce((sum, p) => sum + (p.gwPoints ?? 0), 0);

  // Group starting XI by position for table view
  const startingGroups = POSITION_ORDER.map(({ key, label }) => ({
    key,
    label,
    players: squad.starting.filter((p) => p.position === key),
  })).filter((g) => g.players.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="cap text-2xl font-bold">Points</h1>
        <RefreshSquadButton lastSyncedAt={squad.lastSyncedAt} />
      </div>

      <div className="rounded-2xl border border-success-deep bg-gradient-to-br from-[#14351f] to-[#0c1c13] p-5">
        <div className="cap text-xs font-bold uppercase tracking-widest text-accent">
          Gameweek {squad.pointsGameweek}
        </div>
        <div className="cap mt-1.5 text-5xl font-bold leading-none">{squad.points ?? "–"}</div>
        {squad.points === null && (
          <p className="mt-1 text-xs text-[#cdd8d1]">
            No live score yet — this squad hasn&apos;t been synced from FPL. Hit Refresh.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#cdd8d1]">
          <span>
            Rank{" "}
            <b className="text-text">
              {squad.rank ? squad.rank.toLocaleString() : "—"}
            </b>
          </span>
          <span>
            Season total <b className="text-text">{squad.totalPoints ?? "–"}</b>
          </span>
          {(squad.transferCost ?? 0) > 0 && (
            <span className="text-captain">
              Hit taken <b>−{squad.transferCost}</b>
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
        <button
          onClick={() => setView("pitch")}
          className={`cap flex-1 rounded-lg py-2 text-[15px] font-bold ${
            view === "pitch" ? "bg-accent text-accent-ink" : "text-text-muted"
          }`}
          type="button"
        >
          ◈ Pitch
        </button>
        <button
          onClick={() => setView("table")}
          className={`cap flex-1 rounded-lg py-2 text-[15px] font-bold ${
            view === "table" ? "bg-accent text-accent-ink" : "text-text-muted"
          }`}
          type="button"
        >
          ▦ Table
        </button>
      </div>

      {view === "pitch" ? (
        <>
          <PitchFormation players={squad.starting} />

          <div className="rounded-xl border border-border bg-surface-2 p-2.5">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
                Bench
              </span>
              <span className="text-[10px] text-text-dim">{benchPoints} pts (not counted)</span>
            </div>
            <div className="flex justify-between gap-1.5">
              {squad.bench.map((p) => (
                <div key={p.id} className="flex-1 text-center">
                  <div className="cap truncate text-xs font-semibold">{p.name}</div>
                  <div className="text-[10px] text-text-muted">
                    {p.gwPoints ?? 0} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <h2 className="cap mb-2 text-sm font-bold uppercase tracking-wider text-text-dim">
              Starting XI
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border-soft">
              {startingGroups.map((group) => (
                <div key={group.key}>
                  <div className="border-b border-border-soft/60 bg-surface-2/50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-text-dim">
                    {group.label}
                  </div>
                  <div className="px-4">
                    {group.players.map((p) => (
                      <PlayerPointsRow key={p.id} player={p} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="cap text-sm font-bold uppercase tracking-wider text-text-dim">Bench</h2>
              <span className="text-xs text-text-dim">{benchPoints} pts (not counted)</span>
            </div>
            <div className="rounded-2xl border border-border-soft bg-surface-2/40 px-4 opacity-70">
              {squad.bench.map((p) => (
                <PlayerPointsRow key={p.id} player={p} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

