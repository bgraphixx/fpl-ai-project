"use client";

import { useActionState } from "react";
import Link from "next/link";
import { linkTeamAction } from "@/lib/onboarding-actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export function LinkTeamForm() {
  const [state, formAction, pending] = useActionState(linkTeamAction, { error: null });

  return (
    <form action={formAction} className="w-full max-w-sm">
      <Field label="FPL Team ID">
        <Input
          type="text"
          inputMode="numeric"
          name="fplTeamId"
          placeholder="4819275"
          required
          autoFocus
        />
      </Field>
      {state.error && <p className="mb-4 text-sm text-danger">{state.error}</p>}

      <Card className="mb-6">
        <div className="cap mb-2 text-base font-bold text-accent">Where do I find this?</div>
        <p className="text-[13.5px] leading-relaxed text-text-muted">
          On the official site, open <b className="text-text">Pick Team → Points</b>. Your ID is
          the number in the address bar:
        </p>
        <div className="mt-2.5 overflow-hidden whitespace-nowrap rounded-lg bg-surface px-2.5 py-2 font-mono text-xs text-text-dim">
          …/entry/<span className="text-accent">4819275</span>/event/3
        </div>
      </Card>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Linking…" : "Link team & continue"}
      </Button>
      <p className="mt-4 text-center text-sm text-text-muted">
        <Link href="/" className="font-semibold text-accent">
          Skip for now
        </Link>
      </p>
    </form>
  );
}
