import Link from "next/link";
import { SignUpForm } from "@/features/auth/sign-up-form";
import { isGoogleOAuthEnabled } from "@/lib/env";

export const metadata = { title: "Create an account" };

export default function SignUpPage({ searchParams }: { searchParams: { role?: string } }) {
  const defaultRole = searchParams.role === "MENTOR" ? "MENTOR" : "STUDENT";
  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Already have one?{" "}
          <Link href="/sign-in" className="font-medium underline-offset-4 hover:underline">Sign in</Link>
        </p>
      </div>
      <div className="mt-8">
        <SignUpForm defaultRole={defaultRole} googleEnabled={isGoogleOAuthEnabled} />
      </div>
    </>
  );
}
