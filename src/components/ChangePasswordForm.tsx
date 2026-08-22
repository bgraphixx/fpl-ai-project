"use client";

import { useActionState } from "react";
import Link from "next/link";
import { changePasswordAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, { error: null, success: false });

  if (state.success) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 p-4 text-center">
        <p className="mb-4 text-[15px] font-semibold text-success">Password updated successfully.</p>
        <Link href="/settings">
          <Button variant="secondary" className="w-full">Back to settings</Button>
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-2 p-4">
      <Field label="Current Password">
        <Input type="password" name="currentPassword" required autoFocus />
      </Field>
      <Field label="New Password">
        <Input type="password" name="newPassword" required minLength={8} />
      </Field>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
