"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { validateStartingXI } from "@/lib/fpl-rules";
import { PitchFormation } from "@/components/PitchFormation";
import { SquadTable } from "@/components/SquadTable";
import { PlayerDetailPanel, type PlayerDetail } from "@/components/PlayerDetailPanel";
import { Countdown } from "@/components/Countdown";
import { RefreshSquadButton } from "@/components/RefreshSquadButton";
import { ViewToggle } from "@/components/ViewToggle";
import { DisplayModeToggle, type DisplayMode } from "@/components/DisplayModeToggle";
import type { DisplayPlayer, StoredPick } from "@/types/ui";
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
  const router = useRouter();
  const [view, setView] = useState<"pitch" | "table">("pitch");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("price");
  const [detail, setDetail] = useState<PlayerDetail | null>(null);

  const [draftStarting, setDraftStarting] = useState(squad.starting);
  const [draftBench, setDraftBench] = useState(squad.bench);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [swappingId, setSwappingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [prevSquad, setPrevSquad] = useState(squad);
  if (squad !== prevSquad) {
    setPrevSquad(squad);
    setDraftStarting(squad.starting);
    setDraftBench(squad.bench);
    setHasChanges(false);
    setSwappingId(null);
    setErrorMsg(null);
  }

  const all = [...draftStarting, ...draftBench];

  const xiXpts = draftStarting.reduce((sum, p) => sum + (p.expectedPoints || 0), 0);
  const squadXpts = all.reduce((sum, p) => sum + (p.expectedPoints || 0), 0);

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      const players: StoredPick[] = [
        ...draftStarting.map((p) => ({
          id: p.id,
          isCaptain: p.isCaptain ?? false,
          isViceCaptain: p.isViceCaptain ?? false,
          isBench: false,
        })),
        ...draftBench.map((p) => ({
          id: p.id,
          isCaptain: p.isCaptain ?? false,
          isViceCaptain: p.isViceCaptain ?? false,
          isBench: true,
        })),
      ];
      await fetch("/api/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameweek: squad.gameweek,
          players,
          bank: squad.bank,
          teamValue: squad.teamValue,
        }),
      });
      setHasChanges(false);
      router.refresh();
    } catch {
      setErrorMsg("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  function handleSelectPlayer(p: DisplayPlayer) {
    if (swappingId) {
      if (swappingId === p.id) {
        setSwappingId(null);
        return;
      }
      
      const p1Index = draftStarting.findIndex(x => x.id === swappingId);
      const isP1Starting = p1Index !== -1;
      const p1 = isP1Starting ? draftStarting[p1Index] : draftBench.find(x => x.id === swappingId)!;
      
      const p2Index = draftStarting.findIndex(x => x.id === p.id);
      const isP2Starting = p2Index !== -1;
      const p2 = isP2Starting ? draftStarting[p2Index] : draftBench.find(x => x.id === p.id)!;

      let newStarting = [...draftStarting];
      let newBench = [...draftBench];

      if (isP1Starting && !isP2Starting) {
        newStarting = newStarting.map(x => x.id === p1.id ? p2 : x);
        newBench = newBench.map(x => x.id === p2.id ? p1 : x);
      } else if (!isP1Starting && isP2Starting) {
        newBench = newBench.map(x => x.id === p1.id ? p2 : x);
        newStarting = newStarting.map(x => x.id === p2.id ? p1 : x);
      } else if (isP1Starting && isP2Starting) {
        const idx1 = newStarting.findIndex(x => x.id === p1.id);
        const idx2 = newStarting.findIndex(x => x.id === p2.id);
        newStarting[idx1] = p2;
        newStarting[idx2] = p1;
      } else {
        const idx1 = newBench.findIndex(x => x.id === p1.id);
        const idx2 = newBench.findIndex(x => x.id === p2.id);
        newBench[idx1] = p2;
        newBench[idx2] = p1;
      }

      const validation = validateStartingXI(newStarting);
      if (!validation.valid) {
        setErrorMsg(validation.errors[0]);
      } else {
        setDraftStarting(newStarting);
        setDraftBench(newBench);
        setHasChanges(true);
        setErrorMsg(null);
      }
      setSwappingId(null);
    } else {
      setDetail({
        ...toDetail(p),
        onMakeCaptain: p.isCaptain ? undefined : () => makeCaptain(p.id),
        onMakeViceCaptain: p.isViceCaptain ? undefined : () => makeViceCaptain(p.id),
        onSubstitute: () => {
          setSwappingId(p.id);
          setDetail(null);
        }
      });
    }
  }

  function makeCaptain(id: number) {
    setDraftStarting(prev => prev.map(p => ({ ...p, isCaptain: p.id === id, isViceCaptain: p.id === id ? false : p.isViceCaptain })));
    setDraftBench(prev => prev.map(p => ({ ...p, isCaptain: p.id === id, isViceCaptain: p.id === id ? false : p.isViceCaptain })));
    setHasChanges(true);
    setDetail(null);
  }

  function makeViceCaptain(id: number) {
    setDraftStarting(prev => prev.map(p => ({ ...p, isViceCaptain: p.id === id, isCaptain: p.id === id ? false : p.isCaptain })));
    setDraftBench(prev => prev.map(p => ({ ...p, isViceCaptain: p.id === id, isCaptain: p.id === id ? false : p.isCaptain })));
    setHasChanges(true);
    setDetail(null);
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
      <div className="flex flex-1 flex-col gap-2.5">
        {deadline && (
          <Countdown
            deadlineISO={deadline.deadlineISO}
            gameweek={deadline.gameweek}
            fixtureCount={deadline.fixtureCount}
            freeTransfers={1}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h1 className="cap text-xl font-bold">Pick Team</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span>£{squad.bank.toFixed(1)}m ITB</span>
            <span className="text-[11px] font-medium bg-surface-2 px-2 py-0.5 rounded-full border border-border">
              xPts XI <span className="font-bold text-accent">{xiXpts.toFixed(1)}</span>
              <span className="text-text-dim mx-1">|</span>
              Sqd <span className="font-bold text-accent">{squadXpts.toFixed(1)}</span>
            </span>
            <RefreshSquadButton lastSyncedAt={squad.lastSyncedAt} />
            {hasChanges && (
              <button
                onClick={saveChanges}
                disabled={isSaving}
                className="cap font-semibold text-accent-ink bg-accent px-3 py-1 rounded-md disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Team"}
              </button>
            )}
          </div>
        </div>

        {swappingId && (
          <div className="flex items-center justify-between rounded-xl bg-accent px-4 py-2.5 text-[15px] font-bold text-accent-ink shadow-md">
            <span>Select a player to swap with</span>
            <button
              onClick={() => setSwappingId(null)}
              className="rounded-lg bg-black/20 px-3 py-1 text-xs font-semibold"
              type="button"
            >
              Cancel
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center justify-between rounded-xl bg-[#241016] border border-danger/50 px-4 py-2.5 text-[14px] font-bold text-danger shadow-md">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xl leading-none"
              type="button"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <DisplayModeToggle mode={displayMode} onChange={setDisplayMode} />
        </div>

        {view === "pitch" ? (
          <>
            <PitchFormation
              players={draftStarting}
              onSelectPlayer={handleSelectPlayer}
              highlightedId={swappingId}
              showPrice={displayMode === "price"}
              fixturesCount={displayMode === "price" ? 0 : displayMode === "next1" ? 1 : 3}
            />
            <div className="rounded-xl border border-border bg-surface-2 p-2.5">
              <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-text-dim">
                Bench
              </div>
              <div className="flex justify-between gap-1.5">
                {draftBench.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPlayer(p)}
                    className={`flex-1 text-center py-1 rounded-md ${swappingId === p.id ? 'bg-accent/20 ring-1 ring-accent' : ''}`}
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
          <SquadTable
            players={all}
            onSelectPlayer={handleSelectPlayer}
            fixturesCount={displayMode === "price" ? 0 : displayMode === "next1" ? 1 : 3}
          />
        )}

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
      </div>

      <PlayerDetailPanel detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
