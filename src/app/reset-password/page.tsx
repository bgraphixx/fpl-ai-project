import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { Logo } from "@/components/AppShell";
import Link from "next/link";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mb-10">
        <Logo />
      </div>
      <h1 className="cap mb-1.5 text-4xl font-bold">New password</h1>
      <p className="mb-8 text-[15px] text-text-muted">Choose a new password for your account.</p>
      
      {!token ? (
        <div className="text-center">
          <p className="mb-4 text-danger">Invalid or missing reset token.</p>
          <Link href="/forgot-password" className="font-semibold text-accent">
            Request a new link
          </Link>
        </div>
      ) : (
        <ResetPasswordForm token={token} />
      )}
    </div>
  );
}
