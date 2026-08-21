"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GeneratingScreen } from "@/components/GeneratingScreen";
import { clubColor, clubTextColor } from "@/lib/club-colors";
import type { CurrentSquad } from "@/lib/squad";

type TransferResult = {
  transfersOut: number[];
  transfersIn: number[];
  transfersMade: number;
  hitWorthIt: boolean;
  summary: string;
  detail: string;
  perPlayer: { id: number; summary: string; detail: string }[];
};

type Stage = "confirm" | "generating" | "results" | "error";

type IncomingPlayer = { name: string; club: string; price: number; position: string };

export function TransferFlow({ squad }: { squad: CurrentSquad }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("confirm");
  const [freeTransfers, setFreeTransfers] = useState(1);
  const [allowHits, setAllowHits] = useState(true);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [incomingPlayers, setIncomingPlayers] = useState<Record<number, IncomingPlayer>>({});
  const [hitCost, setHitCost] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const allPlayers = [...squad.starting, ...squad.bench];
  const byId = new Map(allPlayers.map((p) => [p.id, p]));

  async function generate() {
    setStage("generating");
    setError(null);
    try {
      const res = await fetch("/api/recommend/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameweek: squad.gameweek,
          squadPlayerIds: allPlayers.map((p) => p.id),
          freeTransfers,
          bank: squad.bank,
          allowHits,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong");
      }
      const body = await res.json();
      setResult(body.aiResult);
      setIncomingPlayers(body.incomingPlayers ?? {});
      setHitCost(body.hitCost ?? 0);
      setStage("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("error");
    }
  }

  async function applyTransfers() {
    if (!result) return;
    setApplying(true);
    try {
      const resultingIds = allPlayers
        .map((p) => p.id)
        .filter((id) => !result.transfersOut.includes(id))
        .concat(result.transfersIn);
      const totalValue = squad.teamValue - squad.bank; // rough baseline, refined below
      void totalValue;
      await fetch("/api/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameweek: squad.gameweek,
          players: resultingIds,
          bank: squad.bank,
          teamValue: squad.teamValue,
        }),
      });
      router.push("/squad");
      router.refresh();
    } finally {
      setApplying(false);
    }
  }

  if (stage === "generating") {
    return (
      <GeneratingScreen
        title="Weighing your transfers"
        subtitle="Comparing your 15 against the best available replacements."
        steps={["Pulled squad & prices", "Scanned the transfer market", "Checking if a hit pays off…"]}
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
    return (
      <div className="flex flex-col gap-4">
        <h1 className="cap text-2xl font-bold">Suggested transfers</h1>

        {hitCost > 0 && (
          <div className="flex items-center gap-3.5 rounded-2xl border border-captain bg-gradient-to-br from-[#3a1520] to-[#241016] p-3.5">
            <div className="cap text-3xl font-bold leading-none text-captain">−{hitCost}</div>
            <div>
              <div className="cap text-base font-bold">
                Takes {result.transfersMade > freeTransfers ? "a hit" : "your free transfer(s)"}
              </div>
              <div className="text-[13px] leading-snug text-[#e6b8c6]">{result.summary}</div>
            </div>
          </div>
        )}
        {hitCost === 0 && (
          <Card className="text-[13px] leading-snug text-[#cdd8d1]">{result.summary}</Card>
        )}

        <div className="flex flex-col gap-3.5">
          {result.transfersOut.map((outId, i) => {
            const inId = result.transfersIn[i];
            const outP = byId.get(outId);
            const inReasoning = result.perPlayer.find((p) => p.id === inId);
            if (!outP) return null;
            return (
              <Card key={outId}>
                <div className="flex items-center gap-2.5">
                  <PlayerPill name={outP.name} club={outP.club} price={outP.price} tag="OUT" tone="out" />
                  <div className="text-xl text-accent">→</div>
                  {incomingPlayers[inId] ? (
                    <PlayerPill
                      name={incomingPlayers[inId].name}
                      club={incomingPlayers[inId].club}
                      price={incomingPlayers[inId].price}
                      tag="IN"
                      tone="in"
                    />
                  ) : (
                    <PlayerPillIn playerId={inId} />
                  )}
                </div>
                {inReasoning && (
                  <p className="mt-2.5 border-t border-border-soft pt-2.5 text-[13px] leading-snug text-text-muted">
                    {inReasoning.detail}
                  </p>
                )}
              </Card>
            );
          })}
        </div>

        <div className="mt-2 flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={generate}>
            Regenerate
          </Button>
          <Button className="flex-[1.4]" onClick={applyTransfers} disabled={applying}>
            {applying ? "Applying…" : "Apply to my squad"}
          </Button>
        </div>
        <p className="text-center text-xs text-text-dim">
          Saves this squad here — you&apos;ll still need to make the transfer on the official site.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="cap text-2xl font-bold">Confirm inputs</h1>

      <div className="flex gap-3">
        <Card className="flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-dim">
            Free transfers
          </div>
          <input
            type="number"
            min={0}
            max={5}
            value={freeTransfers}
            onChange={(e) => setFreeTransfers(Number(e.target.value))}
            className="cap mt-1 w-full bg-transparent text-3xl font-bold outline-none"
          />
        </Card>
        <Card className="flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-dim">
            In the bank
          </div>
          <div className="cap mt-1 text-3xl font-bold">£{squad.bank.toFixed(1)}m</div>
        </Card>
      </div>

      <Card>
        <div className="mb-2.5 flex items-center justify-between">
          <div className="cap text-base font-bold">Allow point hits?</div>
          <button
            onClick={() => setAllowHits((v) => !v)}
            className={`cap flex items-center gap-2 rounded-full py-1 pl-3 pr-1 text-[13px] font-bold ${
              allowHits ? "bg-success-deep text-accent-ink" : "bg-surface text-text-dim"
            }`}
            type="button"
          >
            {allowHits ? "Yes" : "No"}
            <span className="h-5 w-5 rounded-full bg-accent-ink/80" />
          </button>
        </div>
        <p className="text-[13px] leading-relaxed text-text-muted">
          If a −4 clearly pays off, the AI can suggest it. Cost is always shown up front.
        </p>
      </Card>

      <div className="flex-1" />
      <Button onClick={generate} className="w-full">
        Suggest transfers
      </Button>
    </div>
  );
}

function PlayerPill({
  name,
  club,
  price,
  tag,
  tone,
}: {
  name: string;
  club: string;
  price: number;
  tag: string;
  tone: "in" | "out";
}) {
  return (
    <div className={`flex flex-1 items-center gap-2.5 ${tone === "out" ? "opacity-75" : ""}`}>
      <div
        className="cap flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold"
        style={{ background: clubColor(club), color: clubTextColor(club) }}
      >
        {club}
      </div>
      <div>
        <div className="cap text-[15px] font-semibold leading-tight">{name}</div>
        <div className={`text-[11px] ${tone === "out" ? "text-danger" : "text-success"}`}>
          {tag} · £{price.toFixed(1)}
        </div>
      </div>
    </div>
  );
}

// The "in" player isn't in the user's squad, so we don't have full display
// data for it client-side — render what the AI response gave us.
function PlayerPillIn({ playerId }: { playerId: number }) {
  return (
    <div className="flex flex-1 items-center gap-2.5">
      <div className="cap flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-[11px] font-bold text-text-dim">
        #{playerId}
      </div>
      <div className="text-[11px] text-success">IN</div>
    </div>
  );
}
