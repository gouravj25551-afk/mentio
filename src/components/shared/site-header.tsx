import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { UserMenu } from "@/components/shared/user-menu";
import { auth } from "@/lib/auth";

export async function SiteHeader() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass border-b border-border/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
              <Link href="/mentors" className="hover:text-foreground">Browse mentors</Link>
              <Link href="/categories" className="hover:text-foreground">Categories</Link>
              <Link href="/#how-it-works" className="hover:text-foreground">How it works</Link>
              <Link href="/#faq" className="hover:text-foreground">FAQ</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {session?.user ? (
              <UserMenu user={session.user} />
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild variant="brand" size="sm">
                  <Link href="/sign-up">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
