"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Points", icon: "⚽" },
  { href: "/squad", label: "Pick Team", icon: "👕" },
  { href: "/transfers", label: "Transfers", icon: "⇄" },
  { href: "/fixtures", label: "Fixtures", icon: "🗓️" },
  { href: "/leagues", label: "Leagues", icon: "🏆" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="cap flex h-9 w-9 items-center justify-center rounded-[9px] bg-accent text-lg font-bold text-accent-ink">
        XI
      </div>
      <div className="cap text-xl font-bold">FPL Genie</div>
    </div>
  );
}

export function AppShell({
  children,
  userInitials,
}: {
  children: ReactNode;
  userInitials: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border-soft md:bg-surface md:px-5 md:py-6">
        <div className="mb-10 px-1">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`cap flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition ${
                  active
                    ? "bg-surface-2 text-accent"
                    : "text-text-muted hover:bg-surface-2 hover:text-text"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-text-muted hover:bg-surface-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-sm text-text-muted">
            {userInitials}
          </div>
          <span className="cap text-sm font-semibold">Account</span>
        </Link>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border-soft px-5 py-3.5 md:hidden">
          <Logo />
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-sm text-text-muted"
          >
            {userInitials}
          </Link>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6 pb-24 md:px-10 md:py-10 md:pb-10">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border-soft bg-bg/95 py-3.5 backdrop-blur md:hidden">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 text-[11px] ${
                  active ? "text-accent" : "text-text-dim"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
