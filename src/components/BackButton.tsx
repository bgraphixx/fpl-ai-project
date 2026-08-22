"use client";

import { useRouter } from "next/navigation";

// Real browser back navigation instead of a hardcoded href — so "back" from
// a rival squad returns to whichever league table (or search, or wherever)
// the user actually came from, not always the same fixed destination.
// `fallbackHref` covers the rare case of a direct link/bookmark with no
// history to go back to.
export function BackButton({ fallbackHref, className }: { fallbackHref: string; className?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      type="button"
      aria-label="Back"
      className={className}
    >
      ←
    </button>
  );
}
