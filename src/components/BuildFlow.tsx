"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GeneratingScreen } from "@/components/GeneratingScreen";
import { PitchFormation } from "@/components/PitchFormation";
import { SquadTable } from "@/components/SquadTable";
import { PlayerDetailPanel, type PlayerDetail } from "@/components/PlayerDetailPanel";
import type { DisplayPlayer } from "@/types/ui";
import type { Position } from "@/types/fpl";

type BuildResult = {
  squad: number[];
  startingXI: number[];
  formation: string;
  captainId: number;
  viceCaptainId: number;
  summary: string;
  detail: string;
  perPlayer: { id: number; summary: string; detail: string }[];
};

type PlayerInfo = { name: string; club: string; price: number; position: Position };

type Stage = "confirm" | "generating" | "results" | "error";

export function BuildFlow({ gameweek }: { gameweek: number }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("confirm");
  const [budget, setBudget] = useState(100.0);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [players, setPlayers] = useState<Record<number, PlayerInfo>>({});
  const [view, setView] = useState<"pitch" | "table">("table");
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlayerDetail | null>(null);
  const [saving, setSaving] = useState(false);

  async function generate() {
    setStage("generating");
    setError(null);
    try {
      const res = await fetch("/api/recommend/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameweek, budget }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong");
      }
      const body = await res.json();
      setResult(body.aiResult);
      setPlayers(body.players ?? {});
      setStage("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("error");
    }
  }

  async function useSquad() {
    if (!result) return;
    setSaving(true);
    try {
      const totalValue = result.squad.reduce((sum, id) => sum + (players[id]?.price ?? 0), 0);
      await fetch("/api/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameweek,
          players: result.squad,
          bank: Math.max(0, budget - totalValue),
          teamValue: totalValue,
        }),
      });
      router.push("/squad");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (stage === "generating") {
    return (
      <GeneratingScreen
        title="Drafting your squad"
        subtitle="Balancing premiums against value picks within budget."
        steps={["Scanned the full player pool", "Balancing budget across positions", "Locking formation…"]}
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
    const toDisplay = (id: number): DisplayPlayer => {
      const info = players[id];
      return {
        id,
        name: info?.name ?? `#${id}`,
        club: info?.club ?? "UNK",
        position: info?.position ?? "MID",
        price: info?.price ?? 0,
        isCaptain: id === result.captainId,
        isViceCaptain: id === result.viceCaptainId,
      };
    };
    const squadPlayers = result.squad.map(toDisplay);
    const startingXIPlayers = result.startingXI.map(toDisplay);
    const totalValue = result.squad.reduce((sum, id) => sum + (players[id]?.price ?? 0), 0);
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
        stats: [],
        reasoning: reasoning?.detail ?? reasoning?.summary ?? "No detail available.",
      });
    }

    return (
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="cap text-2xl font-bold">Your new squad</h1>
            <span className="text-sm text-text-muted">£{totalValue.toFixed(1)}m</span>
          </div>

          <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
            <button
              onClick={() => setView("pitch")}
              className={`cap flex-1 rounded-lg py-2 text-[15px] font-bold ${view === "pitch" ? "bg-accent text-accent-ink" : "text-text-muted"}`}
              type="button"
            >
              ◈ Pitch
            </button>
            <button
              onClick={() => setView("table")}
              className={`cap flex-1 rounded-lg py-2 text-[15px] font-bold ${view === "table" ? "bg-accent text-accent-ink" : "text-text-muted"}`}
              type="button"
            >
              ▦ Table
            </button>
          </div>

          <Card className="text-[13px] leading-snug text-[#cdd8d1]">{result.summary}</Card>

          {view === "pitch" ? (
            <PitchFormation players={startingXIPlayers} onSelectPlayer={openDetail} />
          ) : (
            <SquadTable players={squadPlayers} onSelectPlayer={openDetail} />
          )}

          <div className="flex gap-2.5">
            <Button variant="secondary" className="flex-1" onClick={generate}>
              Regenerate
            </Button>
            <Button className="flex-[1.3]" onClick={useSquad} disabled={saving}>
              {saving ? "Saving…" : "Use this squad"}
            </Button>
          </div>
        </div>

        <PlayerDetailPanel detail={detail} onClose={() => setDetail(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="cap text-2xl font-bold">Build a squad</h1>
      <p className="text-[15px] leading-relaxed text-text-muted">
        A full 15 from nothing — new team, wildcard or free hit.
      </p>

      <Card>
        <div className="text-[11px] font-bold uppercase tracking-wider text-text-dim">Budget</div>
        <div className="cap my-1.5 text-5xl font-bold">
          £{budget.toFixed(1)}
          <span className="text-2xl text-text-muted">m</span>
        </div>
        <input
          type="range"
          min={90}
          max={100}
          step={0.5}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full accent-[#b6ff3d]"
        />
        <div className="mt-2 flex justify-between text-xs text-text-dim">
          <span>£90m</span>
          <span>£100m</span>
        </div>
      </Card>

      <div className="flex-1" />
      <Button onClick={generate} className="w-full">
        Build my squad
      </Button>
    </div>
  );
}
