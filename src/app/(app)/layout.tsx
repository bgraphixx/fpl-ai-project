import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initials = (session.user.email ?? "??")
    .slice(0, 2)
    .toUpperCase();

  return <AppShell userInitials={initials}>{children}</AppShell>;
}
