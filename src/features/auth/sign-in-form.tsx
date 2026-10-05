"use client";

import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { resendVerificationAction, signInWithPassword, signInWithGoogle } from "@/features/auth/actions";
import { safeNextPath } from "@/lib/utils";

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action] = useActionState(signInWithPassword, null);
  const [resent, resend] = useActionState(resendVerificationAction, null);
  const emailRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const search = useSearchParams();
  const oauthError = search.get("error");

  useEffect(() => {
    if (state?.ok) {
      toast.success("Welcome back");
      router.replace(safeNextPath(search.get("next")));
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router, search]);

  useEffect(() => {
    if (resent?.ok) toast.success(resent.message ?? "Verification email sent");
    else if (resent && !resent.ok) toast.error(resent.error);
  }, [resent]);

  return (
    <div className="space-y-5">
      {oauthError ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {oauthError === "OAuthAccountNotLinked"
            ? "That email already has a password account. Sign in with your password instead."
            : "Sign-in failed. Please try again."}
        </p>
      ) : null}
      {googleEnabled ? (
        <>
          <form action={signInWithGoogle}>
            <Button type="submit" variant="outline" className="w-full" size="lg">
              <GoogleGlyph /> Continue with Google
            </Button>
          </form>
          <div className="relative">
            <Separator />
            <span className="absolute inset-x-0 top-1/2 mx-auto w-max -translate-y-1/2 bg-background px-2 text-xs uppercase tracking-wider text-muted-foreground">or</span>
          </div>
        </>
      ) : null}

      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input ref={emailRef} id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground underline-offset-4 hover:underline">Forgot password?</Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <Submit label="Sign in" />
      </form>
      {state && !state.ok && state.code === "email_not_verified" ? (
        <form action={resend}>
          <input type="hidden" name="email" value={emailRef.current?.value ?? ""} />
          <Button type="submit" variant="outline" className="w-full">Resend verification email</Button>
        </form>
      ) : null}
    </div>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {label}
    </Button>
  );
}

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.3 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.3 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.7 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.3C40.9 36 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
