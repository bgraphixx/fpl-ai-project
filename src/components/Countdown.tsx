"use client";

import { useEffect, useState } from "react";

function timeParts(deadlineISO: string) {
  const diff = Math.max(0, new Date(deadlineISO).getTime() - Date.now());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return { days, hours, minutes };
}

// GW deadline countdown — a slim single-line bar rather than a tall hero
// card, so it doesn't push the pitch below the first viewport on mobile.
// Recomputes client-side every minute; the initial render uses the
// server-computed value to avoid a hydration flash of "0d 0h".
export function Countdown({
  deadlineISO,
  gameweek,
  fixtureCount,
  freeTransfers,
}: {
  deadlineISO: string;
  gameweek: number;
  fixtureCount: number;
  freeTransfers: number;
}) {
  const [parts, setParts] = useState(() => timeParts(deadlineISO));

  useEffect(() => {
    const id = setInterval(() => setParts(timeParts(deadlineISO)), 60_000);
    return () => clearInterval(id);
  }, [deadlineISO]);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-success-deep bg-gradient-to-r from-[#14351f] to-[#0c1c13] px-3.5 py-2 text-[13px]">
      <span className="cap font-bold uppercase tracking-wide text-accent">GW{gameweek}</span>
      <span className="cap font-bold text-text">
        {parts.days}
        <span className="text-text-muted">d</span> {parts.hours}
        <span className="text-text-muted">h</span> {parts.minutes}
        <span className="text-text-muted">m</span>
      </span>
      <span className="text-text-dim">·</span>
      <span className="text-[#cdd8d1]">{fixtureCount} fixtures</span>
      <span className="text-text-dim">·</span>
      <span className="text-warning">
        {freeTransfers} free transfer{freeTransfers === 1 ? "" : "s"}
      </span>
    </div>
  );
}
