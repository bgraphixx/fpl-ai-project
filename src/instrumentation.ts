// Next.js calls register() once when the server process starts. Used to
// boot the background FPL-cache refresh job (see lib/cache-refresh.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startFplCacheScheduler } = await import("@/lib/cache-refresh");
    startFplCacheScheduler();
  }
}
