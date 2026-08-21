"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, { error: null });

  return (
    <form action={formAction} className="w-full max-w-sm">
      <Field label="Email">
        <Input type="email" name="email" placeholder="sam@example.com" required autoFocus />
      </Field>
      <Field label="Password">
        <Input type="password" name="password" placeholder="••••••••" required minLength={8} />
      </Field>
      {state.error && <p className="mb-4 text-sm text-danger">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="mt-5 text-center text-sm text-text-muted">
        New here?{" "}
        <Link href="/register" className="font-semibold text-accent">
          Create an account
        </Link>
      </p>
    </form>
  );
}
