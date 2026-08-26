"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SQUAD_SIZE, MAX_SQUAD_VALUE, validateFullSquad, pickBestStartingXI } from "@/lib/fpl-rules";
import { ClubBadge } from "@/components/ClubBadge";
import { FixtureChips } from "@/components/FixtureChips";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { DisplayPlayer, StoredPick } from "@/types/ui";
import type { Position } from "@/types/fpl";

type Slot = { key: string; position: Position; player: DisplayPlayer | null };
type SortKey = "xpts" | "price" | "form" | "points";

const POSITION_ORDER: { key: Position; label: string }[] = [
  { key: "GK", label: "Goalkeepers" },
  { key: "DEF", label: "Defenders" },
  { key: "MID", label: "Midfielders" },
  { key: "FWD", label: "Forwards" },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "xpts", label: "xPts" },
  { key: "price", label: "Price" },
  { key: "form", label: "Form" },
  { key: "points", label: "Pts" },
];

// Rough share of a typical squad's budget each position tends to command —
// used only to spread "Autofill" picks sensibly across positions rather than
// blowing the budget on the first few slots it fills.
const POSITION_WEIGHT: Record<Position, number> = { GK: 0.7, DEF: 1.0, MID: 1.25, FWD: 1.3 };

function sortValue(p: DisplayPlayer, key: SortKey): number {
  switch (key) {
    case "xpts":
      return p.expectedPoints ?? p.points ?? p.form ?? 0;
    case "price":
      return p.price;
    case "form":
      return p.form ?? 0;
    case "points":
      return p.points ?? 0;
  }
}

function initialSlots(): Slot[] {
  const slots: Slot[] = [];
  for (const { key: position } of POSITION_ORDER) {
    for (let i = 0; i < SQUAD_SIZE[position]; i++) {
      slots.push({ key: `${position}-${i}`, position, player: null });
    }
  }
  return slots;
}

export function ManualBuildFlow({ gameweek, allPlayers }: { gameweek: number; allPlayers: DisplayPlayer[] }) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [searchingSlotKey, setSearchingSlotKey] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("xpts");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filled = slots.filter((s) => s.player);
  const spent = filled.reduce((sum, s) => sum + (s.player?.price ?? 0), 0);
  const remaining = MAX_SQUAD_VALUE - spent;
  const clubCounts: Record<string, number> = {};
  for (const s of filled) {
    if (s.player) clubCounts[s.player.club] = (clubCounts[s.player.club] ?? 0) + 1;
  }

  const searchingSlot = slots.find((s) => s.key === searchingSlotKey) ?? null;
  const pickedIds = new Set(filled.map((s) => s.player!.id));

  const searchResults = searchingSlot
    ? allPlayers
        .filter((p) => p.position === searchingSlot.position)
        .filter((p) => !pickedIds.has(p.id))
        .filter((p) => !query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => sortValue(b, sortKey) - sortValue(a, sortKey))
        .slice(0, 30)
    : [];

  function openSlot(slot: Slot) {
    setSearchingSlotKey(slot.key);
    setSortKey("xpts");
    setQuery("");
  }

  function pick(player: DisplayPlayer) {
    if (!searchingSlot) return;
    if (player.price > remaining + 1e-6) return;
    if ((clubCounts[player.club] ?? 0) >= 3) return;
    setSlots((prev) => prev.map((s) => (s.key === searchingSlot.key ? { ...s, player } : s)));
    setSearchingSlotKey(null);
    setQuery("");
  }

  function removeSlot(slot: Slot) {
    setSlots((prev) => prev.map((s) => (s.key === slot.key ? { ...s, player: null } : s)));
  }

  function autofillRemaining() {
    setSlots((prev) => {
      const next = prev.map((s) => ({ ...s }));
      const picked = new Set(next.filter((s) => s.player).map((s) => s.player!.id));
      const clubs: Record<string, number> = {};
      next.forEach((s) => {
        if (s.player) clubs[s.player.club] = (clubs[s.player.club] ?? 0) + 1;
      });
      let budgetLeft = MAX_SQUAD_VALUE - next.reduce((sum, s) => sum + (s.player?.price ?? 0), 0);
      const empties = next.filter((s) => !s.player);
      const totalWeight = empties.reduce((sum, s) => sum + POSITION_WEIGHT[s.position], 0);

      for (const slot of empties) {
        const share = totalWeight > 0 ? (POSITION_WEIGHT[slot.position] / totalWeight) * budgetLeft : budgetLeft;
        const cap = Math.max(4.0, share);
        const pool = allPlayers
          .filter((p) => p.position === slot.position)
          .filter((p) => !picked.has(p.id))
          .filter((p) => (clubs[p.club] ?? 0) < 3)
          .filter((p) => p.price <= budgetLeft + 1e-6)
          .sort((a, b) => (b.expectedPoints ?? 0) - (a.expectedPoints ?? 0));
        const choice = pool.find((p) => p.price <= cap + 1e-6) ?? pool[0];
        if (!choice) continue;

        const idx = next.findIndex((s) => s.key === slot.key);
        next[idx] = { ...next[idx], player: choice };
        picked.add(choice.id);
        clubs[choice.club] = (clubs[choice.club] ?? 0) + 1;
        budgetLeft -= choice.price;
      }
      return next;
    });
  }

  async function confirmSquad() {
    const squadPlayers = filled.map((s) => s.player!);
    const validation = validateFullSquad(
      squadPlayers.map((p) => ({ id: p.id, position: p.position, club: p.club, price: p.price })),
    );
    if (!validation.valid) {
      setErrorMsg(validation.errors[0]);
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const { startingIds, benchIds, captainId, viceCaptainId } = pickBestStartingXI(squadPlayers);
      const players: StoredPick[] = [
        ...startingIds.map((id) => ({ id, isCaptain: id === captainId, isViceCaptain: id === viceCaptainId, isBench: false })),
        ...benchIds.map((id) => ({ id, isCaptain: false, isViceCaptain: false, isBench: true })),
      ];
      await fetch("/api/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameweek, players, bank: remaining, teamValue: spent }),
      });
      router.push("/squad");
      router.refresh();
    } catch {
      setErrorMsg("Failed to save squad.");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-relaxed text-text-muted">
        Pick your own 15 — same rules as the real thing: £100m budget, max 3 per club, 2 GK / 5 DEF / 5 MID / 3 FWD.
        We&apos;ll set your starting XI and captain by xPts once it&apos;s full — tweak it after on Pick Team.
      </p>

      <div className="flex gap-3">
        <Card className="flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-dim">Squad</div>
          <div className="cap mt-1 text-2xl font-bold">{filled.length}/15</div>
        </Card>
        <Card className="flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-dim">Budget left</div>
          <div className={`cap mt-1 text-2xl font-bold ${remaining < 0 ? "text-danger" : ""}`}>
            £{remaining.toFixed(1)}m
          </div>
        </Card>
        <Card className="flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-dim">Spent</div>
          <div className="cap mt-1 text-2xl font-bold">£{spent.toFixed(1)}m</div>
        </Card>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between rounded-xl bg-[#241016] border border-danger/50 px-4 py-2.5 text-[14px] font-bold text-danger shadow-md">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-xl leading-none" type="button">
            ×
          </button>
        </div>
      )}

      <div className="flex flex-col divide-y-0 rounded-2xl border border-border-soft">
        {POSITION_ORDER.map(({ key: position, label }) => (
          <div key={position}>
            <div className="border-b border-border-soft/60 bg-surface-2/50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-text-dim">
              {label}
            </div>
            {slots
              .filter((s) => s.position === position)
              .map((slot) =>
                slot.player ? (
                  <div
                    key={slot.key}
                    className="flex items-center gap-3 border-b border-border-soft/60 px-3 py-2.5 last:border-b-0"
                  >
                    <ClubBadge club={slot.player.club} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="cap text-[15px] font-semibold leading-tight">{slot.player.name}</div>
                      <div className="text-[11px] text-text-dim">
                        {slot.player.position} · £{slot.player.price.toFixed(1)}
                        {slot.player.expectedPoints !== undefined && (
                          <> · <span className="font-semibold text-accent">{slot.player.expectedPoints.toFixed(1)} xPts</span></>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeSlot(slot)}
                      className="cap shrink-0 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-bold text-danger"
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    key={slot.key}
                    onClick={() => openSlot(slot)}
                    className="flex w-full items-center gap-3 border-b border-border-soft/60 px-3 py-2.5 text-left last:border-b-0 hover:bg-surface-2"
                    type="button"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-text-dim">
                      +
                    </div>
                    <div className="cap text-[15px] font-semibold text-text-dim">Add {position}</div>
                  </button>
                ),
              )}
          </div>
        ))}
      </div>

      <div className="flex gap-2.5">
        <Button variant="secondary" className="flex-1" onClick={autofillRemaining} disabled={filled.length === 15}>
          Autofill rest (best xPts)
        </Button>
        <Button className="flex-[1.3]" onClick={confirmSquad} disabled={filled.length !== 15 || saving}>
          {saving ? "Saving…" : "Confirm squad"}
        </Button>
      </div>

      {searchingSlot && (
        <>
          <div className="fixed inset-0 z-30 bg-black/65" onClick={() => setSearchingSlotKey(null)} />
          <div className="fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto rounded-t-3xl border border-border bg-surface-3 p-5 pb-8 shadow-2xl md:inset-x-auto md:left-1/2 md:top-1/2 md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="cap text-xl font-bold">Add {searchingSlot.position}</div>
              <button onClick={() => setSearchingSlotKey(null)} className="text-text-muted" type="button">
                ✕
              </button>
            </div>
            <div className="mb-4 text-sm text-text-muted">Budget left £{remaining.toFixed(1)}m</div>

            <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
              <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSortKey(opt.key)}
                    className={`cap rounded-lg px-2.5 py-1 text-xs font-bold ${
                      sortKey === opt.key ? "bg-accent text-accent-ink" : "text-text-muted"
                    }`}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players…"
              className="mb-4 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-[15px] outline-none focus:border-accent"
            />
            <div className="flex flex-col divide-y divide-border-soft md:grid md:grid-cols-2 md:gap-2 md:divide-y-0">
              {searchResults.map((p) => {
                const clubFull = (clubCounts[p.club] ?? 0) >= 3;
                const affordable = p.price <= remaining + 1e-6;
                const disabled = clubFull || !affordable;
                return (
                  <button
                    key={p.id}
                    onClick={() => pick(p)}
                    disabled={disabled}
                    className={`flex items-center gap-3 py-2.5 text-left md:rounded-xl md:border md:border-border-soft md:px-2.5 ${
                      disabled ? "opacity-45" : ""
                    }`}
                    type="button"
                  >
                    <ClubBadge club={p.club} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="cap text-[15px] font-semibold leading-tight">{p.name}</div>
                      <div className="text-[11px] text-text-dim">
                        {p.expectedPoints !== undefined && (
                          <span className="font-semibold text-accent">{p.expectedPoints.toFixed(1)} xPts</span>
                        )}
                        {p.expectedPoints !== undefined && " · "}
                        Form {p.form?.toFixed(1) ?? "–"} · {p.ownership?.toFixed(0) ?? 0}% owned
                        {clubFull && <span className="text-danger"> · 3 already from {p.club}</span>}
                      </div>
                      <div className="mt-1">
                        <FixtureChips fixtures={p.upcomingFixtures} />
                      </div>
                    </div>
                    <span className={`cap ml-1 shrink-0 text-sm font-semibold ${affordable ? "text-accent" : "text-text-dim"}`}>
                      £{p.price.toFixed(1)}
                    </span>
                  </button>
                );
              })}
              {searchResults.length === 0 && (
                <p className="py-4 text-center text-sm text-text-dim md:col-span-2">No matches.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
