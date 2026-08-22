import { refreshSharedFplCache } from "@/lib/fpl";
import { dispatchDeadlineReminders } from "@/lib/reminders";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

// Module-level guard: Next dev's hot-reload re-evaluates this module on
// every file change, which would otherwise stack up duplicate intervals.
declare global {
  var __fplCacheSchedulerStarted: boolean | undefined;
}

async function runRefresh() {
  const startedAt = Date.now();
  try {
    await refreshSharedFplCache();
    console.log(`FPL cache refresh: ok in ${Date.now() - startedAt}ms`);
  } catch (err) {
    console.error("FPL cache refresh: failed", err instanceof Error ? err.message : err);
  }

  // Piggybacks on this same tick — deliberately after the cache refresh
  // above so it reads freshly-warmed bootstrap data, not stale.
  try {
    await dispatchDeadlineReminders();
  } catch (err) {
    console.error("Deadline reminders: failed", err instanceof Error ? err.message : err);
  }
}

// Warms the cache immediately on server startup, then every 30 minutes —
// keeps bootstrap/fixtures/live-points fresh in Postgres so requests never
// have to wait on a live FPL round-trip for shared (non-team) data.
export function startFplCacheScheduler() {
  if (globalThis.__fplCacheSchedulerStarted) return;
  globalThis.__fplCacheSchedulerStarted = true;

  void runRefresh();
  setInterval(runRefresh, REFRESH_INTERVAL_MS);
}
