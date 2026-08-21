import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type Tone = "neutral" | "warning" | "danger" | "success";

const ICON_WRAP_CLASSES: Record<Tone, string> = {
  neutral: "bg-surface-2 border border-dashed border-[#2c3a32]",
  warning: "bg-[#241016] border border-[#ffb23d55]",
  danger: "bg-[#241016] border border-[#ff5d5255]",
  success: "bg-surface-3 border border-success-deep",
};

const ACTION_CLASSES =
  "cap inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-accent px-5 py-3.5 text-base font-bold tracking-wide text-accent-ink transition hover:brightness-95";

// Full-bleed illustrated state for empty/error/success screens (design ref
// group I) — icon, headline, message, primary action, optional secondary link.
export function StateScreen({
  icon,
  tone = "neutral",
  title,
  message,
  action,
  onAction,
  actionHref,
  secondary,
}: {
  icon: ReactNode;
  tone?: Tone;
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
  actionHref?: string;
  secondary?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div
        className={`mb-6 flex h-24 w-24 items-center justify-center rounded-3xl text-4xl ${ICON_WRAP_CLASSES[tone]}`}
      >
        {icon}
      </div>
      <h1 className="cap mb-2.5 text-2xl font-bold leading-tight">{title}</h1>
      <p className="mb-7 max-w-sm text-[15px] leading-relaxed text-text-muted">{message}</p>
      {action && actionHref && (
        <Link href={actionHref} className={ACTION_CLASSES}>
          {action}
        </Link>
      )}
      {action && !actionHref && (
        <Button onClick={onAction} className="w-full max-w-xs">
          {action}
        </Button>
      )}
      {secondary && <div className="mt-4 text-sm text-text-dim">{secondary}</div>}
    </div>
  );
}
