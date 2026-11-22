import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { AuthVisual } from "@/components/auth/auth-visual";

export const metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-white/10 bg-black p-10 lg:flex lg:w-1/2">
        <AuthVisual />
        <div className="relative z-10"><Logo /></div>
        <div className="relative z-10 max-w-md">
          <p className="font-display text-3xl font-semibold leading-tight tracking-tight">One conversation can change your next move.</p>
          <p className="mt-4 max-w-sm text-[13px] leading-6 text-muted-foreground">Find the right mentor, ask better questions, and leave every call with a clearer path forward.</p>
        </div>
        <p className="relative z-10 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Mentio · Make your next step count</p>
      </aside>
      <div className="flex w-full flex-1 flex-col px-6 py-10 lg:w-1/2 lg:px-16">
        <header className="flex items-center justify-between lg:hidden">
          <Logo />
          <Link href="/" className="inline-flex min-h-9 items-center rounded-md px-2 text-[13px] text-muted-foreground hover:text-foreground">← Home</Link>
        </header>
        <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8 outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
