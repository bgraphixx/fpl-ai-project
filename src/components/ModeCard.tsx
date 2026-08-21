import Link from "next/link";

export function ModeCard({
  href,
  icon,
  title,
  subtitle,
  featured = false,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3.5 rounded-2xl border p-4 transition hover:border-accent ${
        featured
          ? "border-success-deep bg-gradient-to-br from-[#123021] to-[#0f2418]"
          : "border-border bg-surface-2"
      }`}
    >
      <div className="text-2xl">{icon}</div>
      <div className="flex-1">
        <div className="cap text-lg font-bold">{title}</div>
        <div className="text-[13px] text-text-muted">{subtitle}</div>
      </div>
      <div className={`text-2xl ${featured ? "text-accent" : "text-text-dim"}`}>›</div>
    </Link>
  );
}
