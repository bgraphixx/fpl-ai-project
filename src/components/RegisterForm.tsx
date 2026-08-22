"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, { error: null });

  return (
    <form action={formAction} className="w-full max-w-sm">
      <Field label="Email">
        <Input type="email" name="email" placeholder="you@example.com" required autoFocus />
      </Field>
      <Field label="Password">
        <Input type="password" name="password" placeholder="8+ characters" required minLength={8} />
      </Field>
      {state.error && <p className="mb-4 text-sm text-danger">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="mt-3.5 text-center text-xs leading-relaxed text-text-dim">
        By continuing you agree to the terms.
      </p>
      <p className="mt-5 text-center text-sm text-text-muted">
        Already have one?{" "}
        <Link href="/login" className="font-semibold text-accent">
          Sign in
        </Link>
      </p>
    </form>
  );
}
