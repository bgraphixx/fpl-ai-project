"use client";

import { useState } from "react";
import Link from "next/link";
import { FplClassicStandingsResponse, FplH2HStandingsResponse } from "@/types/fpl";
import { loadMoreClassicStandings, loadMoreH2HStandings } from "@/app/(app)/leagues/actions";

type SortColumnClassic = "rank" | "gw" | "total";
type SortDirection = "asc" | "desc";

export function ClassicStandingsTable({
  initialData,
  fplTeamId,
  leagueId,
}: {
  initialData: FplClassicStandingsResponse;
  fplTeamId: number;
  leagueId: number;
}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [sortCol, setSortCol] = useState<SortColumnClassic>("rank");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const handleSort = (col: SortColumnClassic) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sortedResults = [...data.standings.results].sort((a, b) => {
    let comparison = 0;
    if (sortCol === "rank") comparison = a.rank - b.rank;
    if (sortCol === "gw") comparison = a.event_total - b.event_total;
    if (sortCol === "total") comparison = a.total - b.total;
    return sortDir === "asc" ? comparison : -comparison;
  });

  const handleLoadMore = async () => {
    setLoading(true);
    try {
      const nextPage = data.standings.page + 1;
      const nextData = await loadMoreClassicStandings(leagueId, nextPage);
      if (nextData) {
        setData({
          ...data,
          standings: {
            ...nextData.standings,
            results: [...data.standings.results, ...nextData.standings.results],
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-surface-2">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-text-muted">
            <tr>
              <th
                className="cursor-pointer px-4 py-3 font-medium hover:text-text"
                onClick={() => handleSort("rank")}
              >
                Rank {sortCol === "rank" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3 font-medium">Team & Manager</th>
              <th
                className="cursor-pointer px-4 py-3 text-right font-medium hover:text-text"
                onClick={() => handleSort("gw")}
              >
                GW {sortCol === "gw" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right font-medium hover:text-text"
                onClick={() => handleSort("total")}
              >
                Total {sortCol === "total" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {sortedResults.map((entry) => {
              const isCurrentUser = entry.entry === fplTeamId;
              const movement = entry.last_rank - entry.rank;
              const isUp = movement > 0;
              const isDown = movement < 0;

              return (
                <tr key={entry.entry} className={isCurrentUser ? "bg-surface-3" : "transition-colors hover:bg-surface-3/50"}>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-text">{entry.rank}</span>
                      {entry.last_rank === 0 ? (
                        <span className="text-[10px] text-text-muted">New</span>
                      ) : movement !== 0 ? (
                        <span className={`text-[10px] font-medium ${isUp ? "text-green-500" : "text-red-500"}`}>
                          {isUp ? "▲" : "▼"} {Math.abs(movement)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-text-muted">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/squad/${entry.entry}`} className="block">
                      <div className="font-medium text-text hover:underline">{entry.entry_name}</div>
                      <div className="text-xs text-text-muted">{entry.player_name}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted">{entry.event_total}</td>
                  <td className="px-4 py-3 text-right font-semibold text-text">{entry.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.standings.has_next && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="rounded-lg bg-surface-2 px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-3 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}

type SortColumnH2H = "rank" | "pts";

export function H2HStandingsTable({
  initialData,
  fplTeamId,
  leagueId,
}: {
  initialData: FplH2HStandingsResponse;
  fplTeamId: number;
  leagueId: number;
}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [sortCol, setSortCol] = useState<SortColumnH2H>("rank");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const handleSort = (col: SortColumnH2H) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sortedResults = [...data.standings.results].sort((a, b) => {
    let comparison = 0;
    if (sortCol === "rank") comparison = a.rank - b.rank;
    if (sortCol === "pts") comparison = a.total - b.total;
    return sortDir === "asc" ? comparison : -comparison;
  });

  const handleLoadMore = async () => {
    setLoading(true);
    try {
      const nextPage = data.standings.page + 1;
      const nextData = await loadMoreH2HStandings(leagueId, nextPage);
      if (nextData) {
        setData({
          ...data,
          standings: {
            ...nextData.standings,
            results: [...data.standings.results, ...nextData.standings.results],
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-surface-2">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-text-muted">
            <tr>
              <th
                className="cursor-pointer px-4 py-3 font-medium hover:text-text"
                onClick={() => handleSort("rank")}
              >
                Rank {sortCol === "rank" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3 font-medium">Team & Manager</th>
              <th className="px-4 py-3 text-center font-medium">W-D-L</th>
              <th
                className="cursor-pointer px-4 py-3 text-right font-medium hover:text-text"
                onClick={() => handleSort("pts")}
              >
                Pts {sortCol === "pts" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {sortedResults.map((entry) => {
              const isCurrentUser = entry.entry === fplTeamId;
              const movement = entry.last_rank - entry.rank;
              const isUp = movement > 0;
              const isDown = movement < 0;

              return (
                <tr key={entry.entry} className={isCurrentUser ? "bg-surface-3" : "transition-colors hover:bg-surface-3/50"}>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-text">{entry.rank}</span>
                      {entry.last_rank === 0 ? (
                        <span className="text-[10px] text-text-muted">New</span>
                      ) : movement !== 0 ? (
                        <span className={`text-[10px] font-medium ${isUp ? "text-green-500" : "text-red-500"}`}>
                          {isUp ? "▲" : "▼"} {Math.abs(movement)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-text-muted">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/squad/${entry.entry}`} className="block">
                      <div className="font-medium text-text hover:underline">{entry.entry_name}</div>
                      <div className="text-xs text-text-muted">{entry.player_name}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center text-text-muted">
                    {entry.matches_won}-{entry.matches_drawn}-{entry.matches_lost}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-text">{entry.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.standings.has_next && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="rounded-lg bg-surface-2 px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-3 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
