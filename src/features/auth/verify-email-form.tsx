"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { verifyEmailAction } from "@/features/auth/actions";

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, action] = useActionState(verifyEmailAction, null);

  if (state?.ok) {
    return (
      <div role="status" className="mt-6 space-y-4">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Button asChild variant="brand" size="lg" className="w-full"><Link href="/sign-in">Sign in</Link></Button>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      {state && !state.ok ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm email
    </Button>
  );
}
