import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-muted/30 p-10">
        <Logo />
        <div className="relative">
          <p className="max-w-md font-display text-2xl font-semibold tracking-tight">
            Learn from vetted mentors.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">Mentio is in early access.</p>
        </div>
        <div className="absolute inset-0 -z-10 grid-bg [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
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
