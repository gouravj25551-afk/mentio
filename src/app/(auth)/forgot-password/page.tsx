"use client";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/features/auth/actions";

export default function ForgotPasswordPage() {
  const [state, action] = useFormState(forgotPasswordAction, null);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Check your email.");
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to set a new one.
        </p>
      </div>
      <form action={action} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <Submit />
        <div className="text-center text-sm">
          <Link href="/sign-in" className="text-muted-foreground underline-offset-4 hover:underline">← Back to sign in</Link>
        </div>
      </form>
    </>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send reset link
    </Button>
  );
}
