import Link from "next/link";
import { ArrowRight, CalendarDays, LockKeyhole, Sparkles, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { auth } from "@/lib/auth";
import { waitlistMode } from "@/lib/waitlist";

export const metadata = {
  title: "Join the waitlist",
  description: "Join the Mentio waitlist. Thoughtful mentorship is coming soon.",
};

export default async function WaitlistPage() {
  if (!waitlistMode) redirect("/sign-up");

  const session = await auth();
  const joined = Boolean(session?.user);
  const firstName = session?.user?.name?.trim().split(/\s+/)[0];

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#09091b] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(111,66,231,0.28),transparent_37%),radial-gradient(circle_at_80%_80%,rgba(27,173,194,0.14),transparent_35%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-20 grid-bg" aria-hidden />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-7 sm:px-10">
        <Logo href="/waitlist" className="text-white" />
        {joined ? (
          <form action={signOutAction}>
            <button type="submit" className="text-sm text-white/65 transition hover:text-white">Sign out</button>
          </form>
        ) : (
          <Link href="/sign-in" className="text-sm text-white/65 transition hover:text-white">Sign in</Link>
        )}
      </header>

      <section className="relative mx-auto flex min-h-[calc(100vh-170px)] max-w-7xl items-center justify-center px-5 pb-20 pt-12 sm:px-10">
        <div className="pointer-events-none absolute inset-x-5 top-12 mx-auto max-w-5xl select-none opacity-45 blur-[7px] sm:inset-x-10" aria-hidden="true" inert>
          <div className="rounded-[2rem] border border-white/15 bg-white/[0.06] p-5 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div className="h-5 w-32 rounded-full bg-white/45" />
              <div className="flex gap-3"><div className="h-4 w-16 rounded-full bg-white/25" /><div className="h-4 w-16 rounded-full bg-white/25" /></div>
            </div>
            <div className="grid gap-6 py-10 md:grid-cols-[1.4fr_1fr]">
              <div className="rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-500/30 to-indigo-700/10 p-8">
                <Sparkles className="h-7 w-7 text-violet-200" />
                <p className="mt-8 font-display text-3xl font-semibold">Find your next mentor.</p>
                <p className="mt-3 max-w-sm text-white/60">Real conversations with people who have been where you want to go.</p>
                <div className="mt-9 h-10 w-32 rounded-xl bg-white/35" />
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-6"><Users className="h-6 w-6 text-cyan-200" /><p className="mt-6 text-lg font-semibold">Vetted mentors</p><p className="mt-2 text-sm text-white/55">People worth learning from.</p></div>
                <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-6"><CalendarDays className="h-6 w-6 text-violet-200" /><p className="mt-6 text-lg font-semibold">Focused 1:1 calls</p><p className="mt-2 text-sm text-white/55">A clearer path, one call at a time.</p></div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {["Open source", "Career growth", "Interview prep"].map((label) => <div key={label} className="h-28 rounded-2xl border border-white/15 bg-white/[0.07] p-5 text-sm text-white/70">{label}</div>)}
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-xl rounded-[2rem] border border-white/20 bg-[#111128]/95 px-7 py-10 text-center shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:px-12 sm:py-14">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-300/25 bg-violet-400/15 text-violet-200"><LockKeyhole className="h-6 w-6" /></div>
          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-violet-200"><span className="h-1.5 w-1.5 rounded-full bg-violet-300" /> Mentio early access</div>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-6xl">{joined ? `${firstName ? `${firstName}, you’re` : "You’re"} on the list.` : "Something good is coming."}</h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-white/65 sm:text-lg">
            {joined
              ? "Mentio is launching soon. Your place is saved, and we’ll share updates as we get closer."
              : "Mentio is almost here. Join the waitlist to be among the first to find mentors, have better conversations, and take your next step."}
          </p>
          {joined ? (
            <div role="status" className="mx-auto mt-8 max-w-sm rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">You’ve joined the waitlist. Keep an eye on your inbox.</div>
          ) : (
            <Button asChild variant="brand" size="xl" className="mt-8 w-full max-w-xs">
              <Link href="/sign-up">Join the waitlist <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          )}
          <p className="mt-6 text-xs text-white/40">The rest of Mentio unlocks at launch.</p>
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-6 text-xs text-white/40 sm:px-10">
        <span>© {new Date().getFullYear()} Mentio</span>
        <div className="flex gap-5"><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/terms" className="hover:text-white">Terms</Link></div>
      </footer>
    </main>
  );
}
