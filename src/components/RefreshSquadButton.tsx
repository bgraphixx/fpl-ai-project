"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Pulls fresh picks/points/rank from FPL and re-renders. Team-specific data
// otherwise always reads from the stored snapshot (fast, no live FPL call) —
// this is the explicit "sync now" action.
export function RefreshSquadButton({ lastSyncedAt }: { lastSyncedAt: Date }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/squad/refresh", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't refresh");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't refresh");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs text-text-dim">
      <span>Synced {timeAgo(lastSyncedAt)}</span>
      <button
        onClick={refresh}
        disabled={refreshing}
        className="cap flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 font-semibold text-accent disabled:opacity-50"
        type="button"
      >
        <span className={refreshing ? "animate-spin" : ""}>↻</span>
        {refreshing ? "Syncing…" : "Refresh"}
      </button>
      {error && <span className="text-danger">{error}</span>}
    </div>
  );
}
