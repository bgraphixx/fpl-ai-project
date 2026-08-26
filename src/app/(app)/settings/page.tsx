import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/lib/auth-actions";
import { NotificationSettings } from "@/components/NotificationSettings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const initials = (user?.email ?? "??").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="cap text-2xl font-bold">Settings</h1>

      <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface-2 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-sm text-text-muted">
          {initials}
        </div>
        <div className="cap text-base font-bold">{user?.email}</div>
      </div>

      <div>
        <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-text-dim">
          FPL team
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
          <Link
            href="/onboarding"
            className="flex items-center justify-between border-b border-border-soft px-4 py-3.5"
          >
            <div>
              <div className="cap text-[15px] font-semibold">
                {user?.fplTeamName ?? "Team ID"}
              </div>
              <div className="text-[13px] text-text-dim">
                {user?.fplTeamId ? `#${user.fplTeamId}` : "Not linked"}
              </div>
            </div>
            <span className="cap text-sm font-semibold text-accent">Change</span>
          </Link>
          <Link href="/squad" className="flex items-center justify-between border-b border-border-soft px-4 py-3.5">
            <div className="cap text-[15px] font-semibold">Re-sync squad now</div>
            <span className="text-text-muted">↻</span>
          </Link>
          <Link href="/build" className="flex items-center justify-between px-4 py-3.5">
            <div>
              <div className="cap text-[15px] font-semibold">Build squad from scratch</div>
              <div className="text-[13px] text-text-dim">New team, wildcard, or free hit</div>
            </div>
            <span className="text-text-dim">›</span>
          </Link>
        </div>
      </div>

      <NotificationSettings
        initialEmailEnabled={user?.emailRemindersEnabled ?? true}
        initialPushEnabled={user?.pushRemindersEnabled ?? true}
      />

      <div>
        <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-text-dim">
          Account
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
          <div className="flex items-center justify-between border-b border-border-soft px-4 py-3.5">
            <div className="cap text-[15px] font-semibold">Email</div>
            <div className="text-[13px] text-text-dim">{user?.email}</div>
          </div>
          <Link href="/settings/password" className="flex items-center justify-between border-b border-border-soft px-4 py-3.5">
            <div className="cap text-[15px] font-semibold">Change Password</div>
            <span className="text-text-dim">›</span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-between px-4 py-3.5 text-left"
            >
              <span className="cap text-[15px] font-semibold text-danger">Sign out</span>
              <span className="text-text-dim">›</span>
            </button>
          </form>
        </div>
      </div>

      <p className="text-center text-xs text-text-dim">
        Smart Gaffer v1.0 · Built by Ibeh Ebubechukwu · not affiliated with the official game
      </p>
    </div>
  );
}
