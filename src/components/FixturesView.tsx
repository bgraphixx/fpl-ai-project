"use client";

import { useState } from "react";
import { fdrColor } from "@/lib/club-colors";
import { ClubBadge } from "@/components/ClubBadge";

type BootstrapEvent = { id: number; deadline_time: string };
type BootstrapTeam = { id: number; name: string; short_name: string };

type Fixture = {
  id: number;
  kickoff_time: string;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  finished: boolean;
  started: boolean;
  team_h_difficulty: number;
  team_a_difficulty: number;
};

function TeamBadge({ team }: { team: BootstrapTeam }) {
  return (
    <div className="flex flex-1 min-w-0 items-center gap-2.5">
      <ClubBadge club={team.short_name} size={32} />
      <span className="cap truncate text-[15px] font-semibold">{team.name}</span>
    </div>
  );
}

function FdrChip({ difficulty }: { difficulty: number }) {
  const { bg, fg } = fdrColor(difficulty);
  return (
    <span
      className="cap rounded-md px-2 py-0.5 text-xs font-bold"
      style={{ background: bg, color: fg }}
    >
      {difficulty}
    </span>
  );
}

export function FixturesView({
  events,
  teams,
  initialGameweek,
  initialFixtures,
}: {
  events: BootstrapEvent[];
  teams: BootstrapTeam[];
  initialGameweek: number;
  initialFixtures: Fixture[];
}) {
  const [gameweek, setGameweek] = useState(initialGameweek);
  const [fixtures, setFixtures] = useState(initialFixtures);
  const [loading, setLoading] = useState(false);

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const minGw = Math.min(...events.map((e) => e.id));
  const maxGw = Math.max(...events.map((e) => e.id));

  async function goTo(gw: number) {
    if (gw < minGw || gw > maxGw) return;
    setGameweek(gw);
    setLoading(true);
    try {
      const res = await fetch(`/api/fpl/fixtures?event=${gw}`);
      if (res.ok) setFixtures(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => goTo(gameweek - 1)}
          disabled={gameweek <= minGw}
          className="cap flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-accent disabled:opacity-30"
          type="button"
        >
          ‹
        </button>
        <h1 className="cap text-2xl font-bold">Gameweek {gameweek}</h1>
        <button
          onClick={() => goTo(gameweek + 1)}
          disabled={gameweek >= maxGw}
          className="cap flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-accent disabled:opacity-30"
          type="button"
        >
          ›
        </button>
      </div>

      <div className={`flex flex-col gap-2.5 ${loading ? "opacity-50" : ""}`}>
        {fixtures.map((f) => {
          const home = teamById.get(f.team_h);
          const away = teamById.get(f.team_a);
          if (!home || !away) return null;
          const kickoff = new Date(f.kickoff_time);

          return (
            <div
              key={f.id}
              className="rounded-2xl border border-border-soft bg-surface-2 p-3.5"
            >
              <div className="mb-2 flex items-center gap-2">
                <TeamBadge team={home} />
                <div className="cap px-2 text-center text-sm font-bold text-text-muted">
                  {f.finished || f.started
                    ? `${f.team_h_score ?? 0} - ${f.team_a_score ?? 0}`
                    : kickoff.toLocaleString(undefined, {
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                </div>
                <TeamBadge team={away} />
              </div>
              <div className="flex items-center justify-between border-t border-border-soft pt-2 text-xs text-text-dim">
                <span>Difficulty</span>
                <div className="flex gap-2">
                  <FdrChip difficulty={f.team_h_difficulty} />
                  <FdrChip difficulty={f.team_a_difficulty} />
                </div>
              </div>
            </div>
          );
        })}
        {fixtures.length === 0 && (
          <p className="py-8 text-center text-sm text-text-dim">No fixtures this gameweek.</p>
        )}
      </div>
    </div>
  );
}
