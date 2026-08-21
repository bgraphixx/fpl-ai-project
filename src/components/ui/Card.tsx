import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface-2 p-4 ${className}`}
      {...props}
    />
  );
}

export function HighlightCard({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-success-deep bg-surface-2 p-4 ${className}`}
      {...props}
    />
  );
}
