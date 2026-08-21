"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clubColor, clubTextColor } from "@/lib/club-colors";
import { Button } from "@/components/ui/Button";
import type { DisplayPlayer } from "@/types/ui";

const BUDGET = 100.0;

export function SquadEditor({
  initialSquad,
  allPlayers,
  gameweek,
}: {
  initialSquad: DisplayPlayer[];
  allPlayers: DisplayPlayer[];
  gameweek: number;
}) {
  const router = useRouter();
  const [squad, setSquad] = useState(initialSquad);
  const [swappingOut, setSwappingOut] = useState<DisplayPlayer | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const squadIds = useMemo(() => new Set(squad.map((p) => p.id)), [squad]);
  const totalValue = useMemo(() => squad.reduce((sum, p) => sum + p.price, 0), [squad]);

  const searchResults = useMemo(() => {
    if (!swappingOut) return [];
    const q = query.trim().toLowerCase();
    return allPlayers
      .filter((p) => p.position === swappingOut.position)
      .filter((p) => !squadIds.has(p.id))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => (b.points ?? b.form ?? 0) - (a.points ?? a.form ?? 0))
      .slice(0, 25);
  }, [swappingOut, query, allPlayers, squadIds]);

  function swap(incoming: DisplayPlayer) {
    if (!swappingOut) return;
    setSquad((prev) => prev.map((p) => (p.id === swappingOut.id ? incoming : p)));
    setSwappingOut(null);
    setQuery("");
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameweek,
          players: squad,
          bank: Math.max(0, BUDGET - totalValue),
          teamValue: totalValue,
        }),
      });
      router.push("/squad");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="cap text-2xl font-bold">Edit squad</h1>
        <button onClick={() => router.push("/squad")} className="cap text-sm font-semibold text-accent" type="button">
          Cancel
        </button>
      </div>

      <div className="divide-y divide-border-soft rounded-2xl border border-border-soft">
        {squad.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
            <div
              className="cap flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-bold"
              style={{ background: clubColor(p.club), color: clubTextColor(p.club) }}
            >
              {p.club}
            </div>
            <div className="flex-1">
              <div className="cap text-[15px] font-semibold leading-tight">{p.name}</div>
              <div className="text-[11px] text-text-dim">
                {p.position} · £{p.price.toFixed(1)}
              </div>
            </div>
            <button
              onClick={() => setSwappingOut(p)}
              className="cap rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-bold text-accent"
              type="button"
            >
              Swap
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border-soft pt-4">
        <div>
          <div className="text-[11px] text-text-dim">Squad value</div>
          <div className="cap text-lg font-bold">
            £{totalValue.toFixed(1)}m · {squad.length}/15
          </div>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {swappingOut && (
        <>
          <div className="fixed inset-0 z-30 bg-black/65" onClick={() => setSwappingOut(null)} />
          <div className="fixed inset-x-0 bottom-0 z-40 max-h-[75vh] overflow-y-auto rounded-t-3xl border border-border bg-surface-3 p-5 pb-8 shadow-2xl md:inset-x-auto md:left-1/2 md:top-1/2 md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="cap text-xl font-bold">Swap player</div>
              <button onClick={() => setSwappingOut(null)} className="text-text-muted" type="button">
                ✕
              </button>
            </div>
            <div className="mb-3 text-sm text-text-muted">
              Out: <b className="text-text">{swappingOut.name}</b> · {swappingOut.position} · £
              {swappingOut.price.toFixed(1)}
            </div>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${swappingOut.position.toLowerCase()}s…`}
              className="mb-4 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-[15px] outline-none focus:border-accent"
            />
            <div className="flex flex-col divide-y divide-border-soft">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => swap(p)}
                  className="flex items-center gap-3 py-2.5 text-left"
                  type="button"
                >
                  <div
                    className="cap flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-bold"
                    style={{ background: clubColor(p.club), color: clubTextColor(p.club) }}
                  >
                    {p.club}
                  </div>
                  <div className="flex-1">
                    <div className="cap text-[15px] font-semibold leading-tight">{p.name}</div>
                    <div className="text-[11px] text-text-dim">
                      Form {p.form?.toFixed(1) ?? "–"} · {p.ownership?.toFixed(0) ?? 0}% owned
                    </div>
                  </div>
                  <span className="cap mr-1 text-sm font-semibold text-accent">
                    £{p.price.toFixed(1)}
                  </span>
                </button>
              ))}
              {searchResults.length === 0 && (
                <p className="py-4 text-center text-sm text-text-dim">No matches.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
