import Link from "next/link";
import { SignUpForm } from "@/features/auth/sign-up-form";
import { WaitlistSignupFlow } from "@/features/auth/waitlist-signup-flow";
import { isGoogleOAuthEnabled } from "@/lib/env";
import { waitlistMode } from "@/lib/waitlist";

export const metadata = { title: "Join the waitlist" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  const defaultRole = role === "MENTOR" ? "MENTOR" : "STUDENT";
  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Join the Mentio waitlist</h1>
        <p className="mt-2 text-sm text-muted-foreground">{waitlistMode ? "Add your email, verify the code right here, and you’re on the list." : "Create your Mentio account."}</p>
        {!waitlistMode ? <p className="mt-3 text-sm text-muted-foreground">Already have an account?{" "}<Link href="/sign-in" className="font-medium underline-offset-4 hover:underline">Sign in</Link></p> : null}
      </div>
      <div className="mt-8">
        {waitlistMode ? <WaitlistSignupFlow defaultRole={defaultRole} /> : <SignUpForm defaultRole={defaultRole} googleEnabled={isGoogleOAuthEnabled} />}
      </div>
    </>
  );
}
