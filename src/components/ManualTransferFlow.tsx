"use client";

import { useMemo, useState } from "react";
import { computeTransferCost, validateFullSquad } from "@/lib/fpl-rules";
import { PitchFormation } from "@/components/PitchFormation";
import { ClubBadge } from "@/components/ClubBadge";
import { FixtureChips } from "@/components/FixtureChips";
import { FixturesToggle, type FixturesToggleValue } from "@/components/FixturesToggle";
import { PlayerDetailPanel, type PlayerDetail } from "@/components/PlayerDetailPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { CurrentSquad } from "@/lib/squad";
import type { DisplayPlayer, StoredPick } from "@/types/ui";
import type { Position } from "@/types/fpl";

type Slot = { originalId: number; player: DisplayPlayer };
type SortKey = "xpts" | "price" | "form" | "points";
type PositionFilter = Position | "ALL";

const POSITION_FILTERS: { key: PositionFilter; label: string }[] = [
  { key: "GK", label: "GK" },
  { key: "DEF", label: "DEF" },
  { key: "MID", label: "MID" },
  { key: "FWD", label: "FWD" },
  { key: "ALL", label: "All" },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "xpts", label: "xPts" },
  { key: "price", label: "Price" },
  { key: "form", label: "Form" },
  { key: "points", label: "Pts" },
];

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

export function ManualTransferFlow({
  squad,
  allPlayers,
}: {
  squad: CurrentSquad;
  allPlayers: DisplayPlayer[];
}) {
  const originalSquad = useMemo(() => [...squad.starting, ...squad.bench], [squad]);
  const originalValue = useMemo(() => originalSquad.reduce((sum, p) => sum + p.price, 0), [originalSquad]);
  const playerById = useMemo(() => new Map(allPlayers.map((p) => [p.id, p])), [allPlayers]);

  const [slots, setSlots] = useState<Slot[]>(() =>
    originalSquad.map((p) => ({ originalId: p.id, player: playerById.get(p.id) ?? p })),
  );
  const [swappingSlot, setSwappingSlot] = useState<Slot | null>(null);
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("GK");
  const [sortKey, setSortKey] = useState<SortKey>("xpts");
  const [query, setQuery] = useState("");
  const [freeTransfers, setFreeTransfers] = useState(1);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [view, setView] = useState<"pitch" | "table">("pitch");
  const [fixturesCount, setFixturesCount] = useState<FixturesToggleValue>(1);
  const [detail, setDetail] = useState<PlayerDetail | null>(null);

  const changedSlots = slots.filter((s) => s.player.id !== s.originalId);
  const transfersMade = changedSlots.length;
  const hitCost = computeTransferCost(transfersMade, freeTransfers);

  const currentSquadIds = new Set(slots.map((s) => s.player.id));
  const totalValue = slots.reduce((sum, s) => sum + s.player.price, 0);
  const availableFunds = originalValue + squad.bank;
  const currentBank = availableFunds - totalValue;

  const validation = validateFullSquad(
    slots.map((s) => ({ id: s.player.id, position: s.player.position, club: s.player.club, price: s.player.price })),
    availableFunds,
  );

  const searchResults = useMemo(() => {
    if (!swappingSlot) return [];
    const q = query.trim().toLowerCase();
    return allPlayers
      .filter((p) => positionFilter === "ALL" || p.position === positionFilter)
      .filter((p) => !currentSquadIds.has(p.id))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => sortValue(b, sortKey) - sortValue(a, sortKey))
      .slice(0, 25);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swappingSlot, query, allPlayers, positionFilter, sortKey]);

  // Opens the swap picker for a slot, defaulting the position filter to that
  // slot's current position (today's behavior) while still letting the user
  // switch to browse other positions — validateFullSquad (above) is the real
  // gate against an invalid final formation/budget, so this is safe to allow.
  function startSwap(slot: Slot) {
    setSwappingSlot(slot);
    setPositionFilter(slot.player.position);
    setSortKey("xpts");
    setQuery("");
  }

  function applySwap(slot: Slot, incoming: DisplayPlayer) {
    setSlots((prev) => prev.map((s) => (s.originalId === slot.originalId ? { ...s, player: incoming } : s)));
  }

  function swap(incoming: DisplayPlayer) {
    if (!swappingSlot) return;
    applySwap(swappingSlot, incoming);
    setSwappingSlot(null);
    setQuery("");
  }

  function revert(slot: Slot) {
    const original = originalSquad.find((p) => p.id === slot.originalId);
    if (!original) return;
    setSlots((prev) =>
      prev.map((s) => (s.originalId === slot.originalId ? { ...s, player: original } : s)),
    );
  }

  function openDetail(slot: Slot) {
    const player = playerById.get(slot.player.id) ?? slot.player;

    // Deterministic "who should replace this player" shortlist: same
    // position, affordable under the current single-swap budget, ranked by
    // xPts — same ranking the swap picker itself sorts by.
    const suggestions = allPlayers
      .filter((p) => p.position === player.position)
      .filter((p) => !currentSquadIds.has(p.id))
      .filter((p) => currentBank + player.price >= p.price)
      .sort((a, b) => (b.expectedPoints ?? 0) - (a.expectedPoints ?? 0))
      .slice(0, 3)
      .map((p) => ({ id: p.id, name: p.name, club: p.club, price: p.price, expectedPoints: p.expectedPoints }));

    setDetail({
      id: player.id,
      name: player.name,
      club: player.club,
      position: player.position,
      price: player.price,
      badge: player.isCaptain ? "CAPTAIN" : player.isViceCaptain ? "VICE" : undefined,
      stats: [
        { label: "Form", value: player.form?.toFixed(1) ?? "–" },
        { label: "Owned", value: player.ownership ? `${player.ownership.toFixed(0)}%` : "–" },
      ],
      fixtures: player.upcomingFixtures,
      fetchHistory: true,
      actionLabel: "Transfer this player",
      onAction: () => {
        setDetail(null);
        startSwap(slot);
      },
      suggestions,
      onPickSuggestion: (id) => {
        const incoming = playerById.get(id);
        if (!incoming) return;
        applySwap(slot, incoming);
        setDetail(null);
      },
      swapContext:
        suggestions.length > 0
          ? {
              outPlayerId: player.id,
              squadPlayerIds: slots.map((s) => s.player.id),
              bank: currentBank,
              gameweek: squad.gameweek,
            }
          : undefined,
    });
  }

  async function confirmTransfers() {
    setSaving(true);
    try {
      // slots preserves the starting(11) + bench(4) order the squad was
      // loaded with, so index >= 11 identifies bench slots.
      const players: StoredPick[] = slots.map((s, i) => ({
        id: s.player.id,
        isCaptain: s.player.isCaptain ?? false,
        isViceCaptain: s.player.isViceCaptain ?? false,
        isBench: i >= 11,
      }));
      await fetch("/api/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameweek: squad.gameweek,
          players,
          bank: Math.max(0, availableFunds - totalValue),
          teamValue: totalValue,
        }),
      });
      setConfirmed(true);
    } finally {
      setSaving(false);
    }
  }

  if (confirmed) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-success-deep bg-surface-3 text-3xl text-success">
          ✓
        </div>
        <div className="cap text-xl font-bold">Transfers saved</div>
        <p className="max-w-sm text-sm text-text-muted">
          Saved here for your records and future recommendations. You&apos;ll still need to make
          these transfers on the official FPL site — we can&apos;t submit them for you.
        </p>
        <Button variant="secondary" onClick={() => setConfirmed(false)}>
          Make more changes
        </Button>
      </Card>
    );
  }

  const POSITION_ORDER: { key: Position; label: string }[] = [
    { key: "GK", label: "Goalkeepers" },
    { key: "DEF", label: "Defenders" },
    { key: "MID", label: "Midfielders" },
    { key: "FWD", label: "Forwards" },
  ];

  const positionGroups = POSITION_ORDER.map(({ key, label }) => ({
    key,
    label,
    slots: slots.filter((s) => s.player.position === key),
  })).filter((g) => g.slots.length > 0);

  // Build DisplayPlayer array for the pitch view
  const pitchPlayers: DisplayPlayer[] = slots.map((s) => s.player);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
      <div className="flex flex-1 flex-col gap-4">
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
              className="cap mt-1 w-full bg-transparent text-2xl font-bold outline-none"
            />
          </Card>
          <Card className="flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-dim">
              Transfers made
            </div>
            <div className="cap mt-1 text-2xl font-bold">{transfersMade}</div>
          </Card>
          <Card className="flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-dim">
              {hitCost > 0 ? "Hit cost" : "Budget left"}
            </div>
            <div className={`cap mt-1 text-2xl font-bold ${hitCost > 0 ? "text-captain" : ""}`}>
              {hitCost > 0 ? `−${hitCost}` : `£${(availableFunds - totalValue).toFixed(1)}m`}
            </div>
          </Card>
        </div>

        {!validation.valid && (
          <div className="rounded-xl border border-danger/50 bg-[#241016] p-3.5 text-sm text-danger">
            {validation.errors.join(" · ")}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
            <button
              onClick={() => setView("pitch")}
              className={`cap rounded-lg px-4 py-2 text-[15px] font-bold ${
                view === "pitch" ? "bg-accent text-accent-ink" : "text-text-muted"
              }`}
              type="button"
            >
              ◈ Pitch
            </button>
            <button
              onClick={() => setView("table")}
              className={`cap rounded-lg px-4 py-2 text-[15px] font-bold ${
                view === "table" ? "bg-accent text-accent-ink" : "text-text-muted"
              }`}
              type="button"
            >
              ▦ Table
            </button>
          </div>
          <FixturesToggle value={fixturesCount} onChange={setFixturesCount} />
        </div>

        {view === "pitch" ? (
          <PitchFormation
            players={pitchPlayers}
            showPrice
            fixturesCount={fixturesCount}
            onSelectPlayer={(p) => {
              const slot = slots.find((s) => s.player.id === p.id);
              if (slot) openDetail(slot);
            }}
          />
        ) : (
          <div className="flex flex-col divide-y-0 rounded-2xl border border-border-soft">
            {positionGroups.map((group) => (
              <div key={group.key}>
                <div className="border-b border-border-soft/60 bg-surface-2/50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-text-dim">
                  {group.label}
                </div>
                {group.slots.map((slot) => {
                  const changed = slot.player.id !== slot.originalId;
                  return (
                    <div
                      key={slot.originalId}
                      onClick={() => openDetail(slot)}
                      className="flex cursor-pointer items-center gap-3 border-b border-border-soft/60 px-3 py-2.5 last:border-b-0 hover:bg-surface-2"
                    >
                      <ClubBadge club={slot.player.club} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="cap flex items-center gap-1.5 text-[15px] font-semibold leading-tight">
                          {slot.player.name}
                          {changed && (
                            <span className="cap rounded bg-success px-1.5 py-0.5 text-[10px] font-bold text-accent-ink">
                              IN
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-text-dim">
                          {slot.player.position} · £{slot.player.price.toFixed(1)}
                        </div>
                        <div className="mt-1">
                          <FixtureChips fixtures={playerById.get(slot.player.id)?.upcomingFixtures} />
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startSwap(slot);
                          }}
                          className="cap rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-bold text-accent"
                          type="button"
                        >
                          Transfer
                        </button>
                        {changed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              revert(slot);
                            }}
                            className="text-[11px] text-text-dim underline"
                            type="button"
                          >
                            Undo
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={confirmTransfers}
          disabled={transfersMade === 0 || !validation.valid || saving}
          className="w-full"
        >
          {saving ? "Saving…" : transfersMade === 0 ? "No changes yet" : `Confirm ${transfersMade} transfer${transfersMade === 1 ? "" : "s"}`}
        </Button>

        {swappingSlot && (
          <>
            <div className="fixed inset-0 z-30 bg-black/65" onClick={() => setSwappingSlot(null)} />
            <div className="fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto rounded-t-3xl border border-border bg-surface-3 p-5 pb-8 shadow-2xl md:inset-x-auto md:left-1/2 md:top-1/2 md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="cap text-xl font-bold">Transfer player</div>
                <button onClick={() => setSwappingSlot(null)} className="text-text-muted" type="button">
                  ✕
                </button>
              </div>
              <div className="mb-2 text-sm text-text-muted">
                Out: <b className="text-text">{swappingSlot.player.name}</b> · {swappingSlot.player.position} ·
                £{swappingSlot.player.price.toFixed(1)} · Bank £{currentBank.toFixed(1)}m
              </div>
              <div className="mb-4">
                <FixtureChips fixtures={playerById.get(swappingSlot.player.id)?.upcomingFixtures} />
              </div>

              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
                  {POSITION_FILTERS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setPositionFilter(opt.key)}
                      className={`cap rounded-lg px-2.5 py-1 text-xs font-bold ${
                        positionFilter === opt.key ? "bg-accent text-accent-ink" : "text-text-muted"
                      }`}
                      type="button"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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
                  const affordable = currentBank + swappingSlot.player.price >= p.price;
                  return (
                    <button
                      key={p.id}
                      onClick={() => swap(p)}
                      className={`flex items-center gap-3 py-2.5 text-left md:rounded-xl md:border md:border-border-soft md:px-2.5 ${
                        affordable ? "" : "opacity-45"
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
                        </div>
                        <div className="mt-1">
                          <FixtureChips fixtures={p.upcomingFixtures} />
                        </div>
                      </div>
                      <span
                        className={`cap ml-1 shrink-0 text-sm font-semibold ${affordable ? "text-accent" : "text-text-dim"}`}
                      >
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

      <PlayerDetailPanel detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
