"use client";

import { useState } from "react";
import Link from "next/link";
import { PitchFormation } from "@/components/PitchFormation";
import { SquadTable } from "@/components/SquadTable";
import { PlayerDetailPanel, type PlayerDetail } from "@/components/PlayerDetailPanel";
import { Countdown } from "@/components/Countdown";
import { RefreshSquadButton } from "@/components/RefreshSquadButton";
import { ViewToggle } from "@/components/ViewToggle";
import { DisplayModeToggle, type DisplayMode } from "@/components/DisplayModeToggle";
import type { DisplayPlayer } from "@/types/ui";
import type { CurrentSquad } from "@/lib/squad";

function toDetail(p: DisplayPlayer): PlayerDetail {
  return {
    id: p.id,
    name: p.name,
    club: p.club,
    position: p.position,
    price: p.price,
    badge: p.isCaptain ? "CAPTAIN" : p.isViceCaptain ? "VICE" : undefined,
    stats: [
      { label: "Form", value: p.form?.toFixed(1) ?? "–" },
      { label: "Owned", value: p.ownership ? `${p.ownership.toFixed(0)}%` : "–" },
      {
        label: "Status",
        value: p.availability === "available" ? "Fit" : p.availability === "doubtful" ? "Doubt" : "Out",
        tone: p.availability === "available" ? "success" : p.availability === "doubtful" ? "warning" : undefined,
      },
    ],
    fixtures: p.upcomingFixtures,
    fetchHistory: true,
  };
}

type Deadline = { deadlineISO: string; gameweek: number; fixtureCount: number } | null;

export function SquadView({ squad, deadline }: { squad: CurrentSquad; deadline: Deadline }) {
  const [view, setView] = useState<"pitch" | "table">("pitch");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("price");
  const [detail, setDetail] = useState<PlayerDetail | null>(null);

  const all = [...squad.starting, ...squad.bench];

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
      <div className="flex flex-1 flex-col gap-4">
        {deadline && (
          <Countdown
            deadlineISO={deadline.deadlineISO}
            gameweek={deadline.gameweek}
            fixtureCount={deadline.fixtureCount}
            freeTransfers={1}
          />
        )}

        <div className="flex items-center justify-between">
          <h1 className="cap text-2xl font-bold">Pick Team</h1>
          <div className="flex flex-col items-end gap-1 text-sm text-text-muted">
            <div className="flex items-center gap-3">
              <span>£{squad.bank.toFixed(1)}m ITB</span>
              <Link href="/squad/edit" className="cap font-semibold text-accent">
                Edit ›
              </Link>
            </div>
            <div className="text-[11px] font-medium bg-surface-2 px-2 py-0.5 rounded-full text-text-muted border border-border">
              XI xPts: <span className="font-bold text-accent">{squad.starting.reduce((sum, p) => sum + (p.expectedPoints || 0), 0).toFixed(1)}</span>
              <span className="text-text-dim mx-1.5">|</span>
              Squad: <span className="font-bold text-accent">{all.reduce((sum, p) => sum + (p.expectedPoints || 0), 0).toFixed(1)}</span>
            </div>
          </div>
        </div>
        <RefreshSquadButton lastSyncedAt={squad.lastSyncedAt} />

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/xi"
            className="cap flex flex-1 items-center justify-center gap-2 rounded-xl border border-success-deep bg-gradient-to-br from-[#123021] to-[#0f2418] px-4 py-3 text-[15px] font-bold text-accent"
          >
            ✨ Ask AI for my XI
          </Link>
          <Link
            href="/build"
            className="cap flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-[15px] font-bold text-text-muted"
          >
            Build from scratch
          </Link>
        </div>

        <ViewToggle view={view} onChange={setView} />

        <DisplayModeToggle mode={displayMode} onChange={setDisplayMode} />

        {view === "pitch" ? (
          <>
            <PitchFormation
              players={squad.starting}
              onSelectPlayer={(p) => setDetail(toDetail(p))}
              showPrice={displayMode === "price"}
              fixturesCount={displayMode === "price" ? 0 : displayMode === "next1" ? 1 : 3}
            />
            <div className="rounded-xl border border-border bg-surface-2 p-2.5">
              <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-text-dim">
                Bench
              </div>
              <div className="flex justify-between gap-1.5">
                {squad.bench.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDetail(toDetail(p))}
                    className="flex-1 text-center"
                    type="button"
                  >
                    <div className="cap truncate text-xs font-semibold">{p.name}</div>
                    <div className="text-[10px] text-text-muted">£{p.price.toFixed(1)}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <SquadTable players={all} onSelectPlayer={(p) => setDetail(toDetail(p))} />
        )}
      </div>

      <PlayerDetailPanel detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
