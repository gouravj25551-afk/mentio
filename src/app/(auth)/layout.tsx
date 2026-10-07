import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { AuthVisual } from "@/components/auth/auth-visual";

export const metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      <div className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:w-1/2 flex-col justify-between">
        <AuthVisual />
        <div className="absolute inset-0 opacity-20 grid-bg" aria-hidden />
        <div className="relative z-10"><Logo /></div>
        <div className="relative z-10 max-w-lg">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/75">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Learn from people who have done it.
          </div>
          <p className="font-display text-4xl font-semibold leading-tight tracking-tight">
            One conversation can change your next move.
          </p>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/65">
            Find the right mentor, ask better questions, and leave every call with a clearer path forward.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
            {[['1:1', 'Focused calls'], ['Real', 'Experience'], ['Your', 'Next step']].map(([value, label]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.07] p-3">
                <p className="font-display text-lg font-semibold">{value}</p>
                <p className="mt-1 text-xs text-white/55">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs text-white/45">Mentio · Make your next step count.</p>
      </div>
      <div className="flex w-full flex-1 flex-col px-6 py-10 lg:w-1/2 lg:px-16">
        <div className="flex items-center justify-between lg:hidden">
          <Logo />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Home</Link>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
