"use client";

import { useState } from "react";
import { TransferFlow } from "@/components/TransferFlow";
import { ManualTransferFlow } from "@/components/ManualTransferFlow";
import type { CurrentSquad } from "@/lib/squad";
import type { DisplayPlayer } from "@/types/ui";

export function TransfersContainer({
  squad,
  allPlayers,
}: {
  squad: CurrentSquad;
  allPlayers: DisplayPlayer[];
}) {
  const [mode, setMode] = useState<"manual" | "ai">("manual");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="cap text-2xl font-bold">Transfers</h1>
        <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
          <button
            onClick={() => setMode("manual")}
            className={`cap rounded-lg px-3 py-1.5 text-sm font-bold ${
              mode === "manual" ? "bg-accent text-accent-ink" : "text-text-muted"
            }`}
            type="button"
          >
            Manual
          </button>
          <button
            onClick={() => setMode("ai")}
            className={`cap rounded-lg px-3 py-1.5 text-sm font-bold ${
              mode === "ai" ? "bg-accent text-accent-ink" : "text-text-muted"
            }`}
            type="button"
          >
            ✨ Ask AI
          </button>
        </div>
      </div>

      {mode === "manual" ? (
        <ManualTransferFlow squad={squad} allPlayers={allPlayers} />
      ) : (
        <TransferFlow squad={squad} />
      )}
    </div>
  );
}
