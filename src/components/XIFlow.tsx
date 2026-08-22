"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, HighlightCard } from "@/components/ui/Card";
import { GeneratingScreen } from "@/components/GeneratingScreen";
import { PitchFormation } from "@/components/PitchFormation";
import { ViewToggle } from "@/components/ViewToggle";
import { SquadTable } from "@/components/SquadTable";
import { PlayerDetailPanel, type PlayerDetail } from "@/components/PlayerDetailPanel";
import type { CurrentSquad } from "@/lib/squad";
import type { DisplayPlayer } from "@/types/ui";

type XIResult = {
  startingXI: number[];
  bench: number[];
  formation: string;
  captainId: number;
  viceCaptainId: number;
  summary: string;
  detail: string;
  perPlayer: { id: number; summary: string; detail: string }[];
};

type Stage = "confirm" | "generating" | "results" | "error";

export function XIFlow({ squad }: { squad: CurrentSquad }) {
  const [stage, setStage] = useState<Stage>("confirm");
  const [result, setResult] = useState<XIResult | null>(null);
  const [selfCorrected, setSelfCorrected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlayerDetail | null>(null);
  const [view, setView] = useState<"pitch" | "table">("pitch");

  const allPlayers = [...squad.starting, ...squad.bench];
  const byId = new Map(allPlayers.map((p) => [p.id, p]));

  async function generate() {
    setStage("generating");
    setError(null);
    try {
      const res = await fetch("/api/recommend/xi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameweek: squad.gameweek,
          squadPlayerIds: allPlayers.map((p) => p.id),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong");
      }
      const body = await res.json();
      setResult(body.aiResult);
      setSelfCorrected(Boolean(body.selfCorrected));
      setStage("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("error");
    }
  }

  if (stage === "generating") {
    return (
      <GeneratingScreen
        title="Reading your gameweek"
        subtitle="Weighing form, fixtures and minutes across your 15 players."
        steps={["Pulled squad & prices", "Scored fixture difficulty", "Choosing captain…"]}
      />
    );
  }

  if (stage === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-[#ff5d5255] bg-[#241016] text-4xl">
          ⛔
        </div>
        <h1 className="cap mb-2.5 text-2xl font-bold">Models are busy</h1>
        <p className="mb-7 max-w-sm text-[15px] leading-relaxed text-text-muted">{error}</p>
        <Button onClick={generate}>Retry</Button>
      </div>
    );
  }

  if (stage === "results" && result) {
    const startingXIPlayers: DisplayPlayer[] = result.startingXI
      .map((id) => byId.get(id))
      .filter((p): p is DisplayPlayer => Boolean(p))
      .map((p) => ({
        ...p,
        isCaptain: p.id === result.captainId,
        isViceCaptain: p.id === result.viceCaptainId,
      }));
    const benchPlayers = result.bench.map((id) => byId.get(id)).filter(Boolean) as DisplayPlayer[];
    const allXIPlayers = [...startingXIPlayers, ...benchPlayers];
    const reasoningById = new Map(result.perPlayer.map((p) => [p.id, p]));

    function openDetail(p: DisplayPlayer) {
      const reasoning = reasoningById.get(p.id);
      setDetail({
        id: p.id,
        name: p.name,
        club: p.club,
        position: p.position,
        price: p.price,
        badge: p.isCaptain ? "CAPTAIN" : p.isViceCaptain ? "VICE" : undefined,
        stats: [
          { label: "Form", value: p.form?.toFixed(1) ?? "–" },
          { label: "Owned", value: p.ownership ? `${p.ownership.toFixed(0)}%` : "–" },
        ],
        reasoning: reasoning?.detail ?? reasoning?.summary ?? "No detail available.",
      });
    }

    return (
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="cap text-2xl font-bold">Recommended XI</h1>
            <span className="cap rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-accent">
              {result.formation}
            </span>
          </div>

          {selfCorrected && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#ffb23d66] bg-[#1c2116] p-3.5">
              <span className="text-lg">↻</span>
              <div>
                <div className="cap text-sm font-bold text-warning">We caught and fixed one thing</div>
                <div className="mt-0.5 text-[13px] leading-snug text-[#cdd8d1]">
                  The first draft broke a squad rule. We re-ran automatically — this XI is valid.
                </div>
              </div>
            </div>
          )}

          <HighlightCard className="text-[13px] leading-snug text-[#cdd8d1]">
            {result.summary}
          </HighlightCard>

          <ViewToggle view={view} onChange={setView} />

          {view === "pitch" ? (
            <>
              <PitchFormation players={startingXIPlayers} onSelectPlayer={openDetail} />

              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-text-dim">
                  Bench (in order)
                </div>
                <div className="flex gap-2">
                  {benchPlayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openDetail(p)}
                      className="flex-1 rounded-lg border border-border bg-surface-2 p-2 text-center"
                      type="button"
                    >
                      <div className="cap truncate text-xs font-semibold">{p.name}</div>
                      <div className="text-[10px] text-text-dim">{p.position}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <SquadTable players={allXIPlayers} onSelectPlayer={openDetail} />
          )}

          <button onClick={generate} className="cap text-sm font-semibold text-text-muted" type="button">
            Regenerate
          </button>
        </div>

        <PlayerDetailPanel detail={detail} onClose={() => setDetail(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="cap text-2xl font-bold">Confirm squad</h1>
      <p className="text-[15px] leading-relaxed text-text-muted">
        The AI will pick your best starting XI and captain from these 15 for GW{squad.gameweek}.
      </p>

      <HighlightCard className="flex items-center justify-between">
        <div>
          <div className="cap text-lg font-bold">{allPlayers.length} players ready</div>
          <div className="text-[13px] text-text-dim">GW{squad.gameweek}</div>
        </div>
        <div className="text-2xl text-success">✓</div>
      </HighlightCard>

      <Card className="flex items-center justify-between">
        <div>
          <div className="cap text-base font-bold">Data looks off?</div>
          <div className="text-[13px] text-text-dim">Edit the squad before generating</div>
        </div>
        <Link href="/squad/edit" className="cap text-sm font-semibold text-accent">
          Edit ›
        </Link>
      </Card>

      <div className="flex-1" />
      <Button onClick={generate} className="w-full">
        Generate my XI + captain
      </Button>
      <p className="text-center text-xs text-text-dim">Uses shared AI key · usually ~4s</p>
    </div>
  );
}
