import Link from "next/link";
import { SignInForm } from "@/features/auth/sign-in-form";
import { isGoogleOAuthEnabled } from "@/lib/env";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/sign-up" className="font-medium underline-offset-4 hover:underline">Create one</Link>
        </p>
      </div>
      <div className="mt-8">
        <SignInForm googleEnabled={isGoogleOAuthEnabled} />
      </div>
    </>
  );
}
