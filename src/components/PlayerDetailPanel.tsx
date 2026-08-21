"use client";

import { clubColor, clubTextColor } from "@/lib/club-colors";

export type PlayerDetail = {
  id: number;
  name: string;
  club: string;
  position: string;
  price: number;
  badge?: string;
  stats: { label: string; value: string; tone?: "accent" | "success" | "warning" }[];
  reasoning: string;
};

const TONE_CLASSES = {
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning-deep",
};

// Reasoning detail for a single pick (design ref group H). Renders as a
// slide-up bottom sheet on mobile and a persistent side panel on desktop —
// same content, repositioned by breakpoint rather than two components.
export function PlayerDetailPanel({
  detail,
  onClose,
}: {
  detail: PlayerDetail | null;
  onClose: () => void;
}) {
  if (!detail) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/65 md:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border border-border bg-surface-3 p-5 pb-8 shadow-2xl md:static md:z-auto md:w-80 md:shrink-0 md:rounded-2xl md:border md:p-5 md:pb-5 md:shadow-none"
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded-full bg-[#2c3a32] md:hidden" />
        <div className="mb-3 flex items-start gap-3">
          <div
            className="cap flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold"
            style={{ background: clubColor(detail.club), color: clubTextColor(detail.club) }}
          >
            {detail.club}
          </div>
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
              {detail.position} · £{detail.price.toFixed(1)}
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted" type="button" aria-label="Close">
            ✕
          </button>
        </div>

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

        <p className="text-sm leading-relaxed text-[#cdd8d1]">{detail.reasoning}</p>
      </div>
    </>
  );
}
