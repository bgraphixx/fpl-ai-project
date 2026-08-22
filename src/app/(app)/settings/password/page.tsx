import Link from "next/link";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-text-muted hover:text-f3f7f4">
          ← Back
        </Link>
        <h1 className="cap text-2xl font-bold">Change Password</h1>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
