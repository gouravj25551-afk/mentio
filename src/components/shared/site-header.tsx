import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { UserMenu } from "@/components/shared/user-menu";
import { optionalUser } from "@/lib/auth/guards";

export async function SiteHeader() {
  const user = await optionalUser();
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass border-b border-border/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo />
            <nav aria-label="Main" className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
              <Link href="/mentors" className="rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">Browse mentors</Link>
              <Link href="/categories" className="rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">Categories</Link>
              <Link href="/#how-it-works" className="rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">How it works</Link>
              <Link href="/#faq" className="rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-foreground">FAQ</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm" className="md:hidden">
                  <Link href="/mentors">Mentors</Link>
                </Button>
                <UserMenu user={user} />
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="md:hidden">
                  <Link href="/mentors">Mentors</Link>
                </Button>
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
