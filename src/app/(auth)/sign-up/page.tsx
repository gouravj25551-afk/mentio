import Link from "next/link";
import { SignUpForm } from "@/features/auth/sign-up-form";
import { isGoogleOAuthEnabled } from "@/lib/env";

export const metadata = { title: "Join the waitlist" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  const defaultRole = role === "MENTOR" ? "MENTOR" : "STUDENT";
  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Join the Mentio waitlist</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create your account now. We’ll open the rest of Mentio at launch.</p>
        <p className="mt-3 text-sm text-muted-foreground">
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
