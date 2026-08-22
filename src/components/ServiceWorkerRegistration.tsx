"use client";

import { useEffect } from "react";

// Registers the static-asset service worker (see public/sw.js) — makes the
// app installable and speeds up repeat loads. No UI, renders nothing.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability/perf nicety, not load-bearing — fail silently.
      });
    }
  }, []);

  return null;
}
