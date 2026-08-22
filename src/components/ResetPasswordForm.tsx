"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, { error: null, success: false });

  if (state.success) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="mb-6 text-[15px] text-text-muted">Password reset successfully.</p>
        <Link href="/login">
          <Button className="w-full">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-sm">
      <input type="hidden" name="token" value={token} />
      <Field label="New Password">
        <Input type="password" name="password" placeholder="••••••••" required minLength={8} autoFocus />
      </Field>
      {state.error && <p className="mb-4 text-sm text-danger">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
