"use client";
import { useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/features/auth/actions";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [state, action] = useActionState(resetPasswordAction, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Password updated.");
      router.replace("/sign-in");
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Pick a new password</h1>
      <form action={action} className="mt-8 space-y-4">
        <input type="hidden" name="token" value={token} />
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
        </div>
        <Submit />
      </form>
    </>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Reset password
    </Button>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
