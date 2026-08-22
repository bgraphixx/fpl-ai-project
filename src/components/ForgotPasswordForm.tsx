"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, { message: null, error: null });

  if (state.message) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="mb-6 text-[15px] text-text-muted">{state.message}</p>
        <Link href="/login" className="font-semibold text-accent">
          Return to login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-sm">
      <Field label="Email">
        <Input type="email" name="email" placeholder="sam@example.com" required autoFocus />
      </Field>
      {state.error && <p className="mb-4 text-sm text-danger">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending link…" : "Send reset link"}
      </Button>
      <p className="mt-5 text-center text-sm text-text-muted">
        Remembered your password?{" "}
        <Link href="/login" className="font-semibold text-accent">
          Sign in
        </Link>
      </p>
    </form>
  );
}
