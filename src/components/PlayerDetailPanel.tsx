"use client";

import { useEffect, useState } from "react";
import { ClubBadge } from "@/components/ClubBadge";
import { FixtureChips } from "@/components/FixtureChips";
import type { UpcomingFixture } from "@/types/ui";

export type PlayerDetail = {
  id: number;
  name: string;
  club: string;
  position: string;
  price?: number;
  badge?: string;
  stats: { label: string; value: string; tone?: "accent" | "success" | "warning" }[];
  reasoning?: string;
  // Profile mode (Pick Team / Transfers): shows a fixtures row and, if
  // fetchHistory is set, lazy-loads season total + last-3-GW points from
  // /api/fpl/player/[id]/history (itself reading the cached FplCache entry,
  // not a live call, unless that player hasn't been looked up in 40 min).
  fixtures?: UpcomingFixture[];
  fetchHistory?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

type History = { seasonTotal: number; last3: { round: number; totalPoints: number }[] };

const TONE_CLASSES = {
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning-deep",
};

// Detail panel for a single pick: renders as a slide-up bottom sheet on
// mobile and a persistent side panel on desktop — same content, repositioned
// by breakpoint rather than two components.
export function PlayerDetailPanel({
  detail,
  onClose,
}: {
  detail: PlayerDetail | null;
  onClose: () => void;
}) {
  // Keyed by player id, and only ever set once the fetch settles — so a
  // stale in-flight request for the previously-open player can't clobber
  // state for whichever one is open now, and "loading" is simply "we don't
  // have a result for this id yet" rather than a separately-tracked flag.
  const [historyFor, setHistoryFor] = useState<{ id: number; data: History | null } | null>(null);

  useEffect(() => {
    if (!detail?.fetchHistory) return;
    fetch(`/api/fpl/player/${detail.id}/history`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHistoryFor({ id: detail.id, data }))
      .catch(() => setHistoryFor({ id: detail.id, data: null }));
  }, [detail?.id, detail?.fetchHistory]);

  if (!detail) return null;

  const loadingHistory = Boolean(detail.fetchHistory) && historyFor?.id !== detail.id;
  const history = historyFor?.id === detail.id ? historyFor.data : null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/65 md:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-border bg-surface-3 p-5 pb-8 shadow-2xl md:static md:z-auto md:max-h-none md:w-80 md:shrink-0 md:overflow-visible md:rounded-2xl md:border md:p-5 md:pb-5 md:shadow-none"
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded-full bg-[#2c3a32] md:hidden" />
        <div className="mb-3 flex items-start gap-3">
          <ClubBadge club={detail.club} size={44} />
          <div className="flex-1">
            <div className="cap flex items-center gap-2 text-xl font-bold leading-tight">
              {detail.name}
              {detail.badge && (
                <span className="cap rounded-md bg-captain px-2 py-0.5 text-xs font-bold text-white">
                  {detail.badge}
                </span>
              )}
            </div>
            <div className="text-sm text-text-muted">
              {detail.position}
              {detail.price !== undefined && ` · £${detail.price.toFixed(1)}`}
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted" type="button" aria-label="Close">
            ✕
          </button>
        </div>

        {detail.stats.length > 0 && (
          <div className="mb-3.5 flex gap-2">
            {detail.stats.map((stat) => (
              <div
                key={stat.label}
                className="flex-1 rounded-[10px] border border-border-soft bg-surface p-2.5 text-center"
              >
                <div className="text-[11px] text-text-dim">{stat.label}</div>
                <div className={`cap text-lg font-bold ${stat.tone ? TONE_CLASSES[stat.tone] : ""}`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {detail.fixtures && (
          <div className="mb-3.5">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-text-dim">
              Upcoming fixtures
            </div>
            <FixtureChips fixtures={detail.fixtures} />
          </div>
        )}

        {detail.fetchHistory && (
          <div className="mb-3.5">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-text-dim">
              This season
            </div>
            {loadingHistory ? (
              <p className="text-sm text-text-dim">Loading…</p>
            ) : history ? (
              <div className="flex gap-2">
                <div className="flex-1 rounded-[10px] border border-border-soft bg-surface p-2.5 text-center">
                  <div className="text-[11px] text-text-dim">Season total</div>
                  <div className="cap text-lg font-bold text-accent">{history.seasonTotal}</div>
                </div>
                {history.last3.map((gw) => (
                  <div
                    key={gw.round}
                    className="flex-1 rounded-[10px] border border-border-soft bg-surface p-2.5 text-center"
                  >
                    <div className="text-[11px] text-text-dim">GW{gw.round}</div>
                    <div className="cap text-lg font-bold">{gw.totalPoints}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-dim">Couldn&apos;t load history.</p>
            )}
          </div>
        )}

        {detail.reasoning && (
          <p className="text-sm leading-relaxed text-[#cdd8d1]">{detail.reasoning}</p>
        )}

        {detail.actionLabel && detail.onAction && (
          <button
            onClick={detail.onAction}
            type="button"
            className="cap mt-4 w-full rounded-xl bg-accent py-3 text-[15px] font-bold text-accent-ink"
          >
            {detail.actionLabel}
          </button>
        )}
      </div>
    </>
  );
}
