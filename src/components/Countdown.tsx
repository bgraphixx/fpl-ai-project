"use client";

import { useEffect, useState } from "react";

function timeParts(deadlineISO: string) {
  const diff = Math.max(0, new Date(deadlineISO).getTime() - Date.now());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return { days, hours, minutes };
}

// GW deadline countdown hero (design ref B2). Recomputes client-side every
// minute; the initial render uses the server-computed value to avoid a
// hydration flash of "0d 0h".
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

  const deadline = new Date(deadlineISO);
  const dayLabel = deadline.toLocaleDateString(undefined, { weekday: "short" });
  const timeLabel = deadline.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-success-deep bg-gradient-to-br from-[#14351f] to-[#0c1c13] p-5">
      <div className="cap text-xs font-bold uppercase tracking-widest text-accent">
        GW{gameweek} deadline
      </div>
      <div className="cap mt-1.5 flex items-baseline gap-2">
        <span className="text-4xl font-bold leading-none sm:text-5xl">
          {parts.days}
          <span className="text-xl text-text-muted sm:text-2xl">d</span> {parts.hours}
          <span className="text-xl text-text-muted sm:text-2xl">h</span> {parts.minutes}
          <span className="text-xl text-text-muted sm:text-2xl">m</span>
        </span>
      </div>
      <div className="mt-2 text-sm text-[#cdd8d1]">
        {dayLabel} {timeLabel} · {fixtureCount} fixtures ·{" "}
        <span className="text-warning">
          {freeTransfers} free transfer{freeTransfers === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
