import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-95",
  secondary: "bg-surface-2 border border-border text-text hover:border-text-dim",
  ghost: "text-accent hover:text-accent/80",
  danger: "bg-surface-2 border border-border text-danger hover:border-danger",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`cap inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-base font-bold tracking-wide transition disabled:opacity-50 disabled:pointer-events-none ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
