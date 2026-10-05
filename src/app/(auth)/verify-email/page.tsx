import Link from "next/link";
import { VerifyEmailForm } from "@/features/auth/verify-email-form";

export const metadata = { title: "Verify your email", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Verify your email</h1>
      {token ? (
        // A button (not a bare GET) so mail scanners that prefetch links can't consume the token.
        <VerifyEmailForm token={token} />
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          This link is missing its token. <Link href="/sign-in" className="underline underline-offset-4">Back to sign in</Link>
        </p>
      )}
    </>
  );
}
