"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Check, Loader2, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeWaitlistSignup, requestWaitlistCode, verifyWaitlistCode } from "@/features/auth/waitlist-actions";

export function WaitlistSignupFlow({ defaultRole }: { defaultRole: "STUDENT" | "MENTOR" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"email" | "code" | "password" | "done">("email");
  const [email, setEmail] = useState("");
  const [grant, setGrant] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const run = (task: () => Promise<void>) => startTransition(async () => { await task(); });

  return (
    <div className="space-y-7">
      <ol aria-label="Signup progress" className="flex items-center gap-2">
        {(["email", "code", "password"] as const).map((item, index) => {
          const current = ["email", "code", "password", "done"].indexOf(step);
          return <li key={item} className={`flex flex-1 items-center gap-2 rounded-full border px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide ${index <= current ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-200 text-slate-400"}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${index < current ? "bg-violet-600 text-white" : "bg-white"}`}>{index < current ? <Check className="h-3 w-3" /> : index + 1}</span>
            {item === "password" ? "Account" : item}
          </li>;
        })}
      </ol>
      {step === "email" ? (
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault(); setError("");
          run(async () => { const result = await requestWaitlistCode(email); if (result.ok) { setStep("code"); setNotice(`We sent a six-digit code to ${email}.`); } else setError(result.error); });
        }}>
          <div className="space-y-2"><Label htmlFor="waitlist-email">Your email</Label><Input id="waitlist-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" /></div>
          <p className="text-xs leading-5 text-muted-foreground">We’ll email a verification code. You’ll enter it right here—no new page needed.</p>
          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Send verification code</Button>
        </form>
      ) : null}
      {step === "code" ? (
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault(); setError("");
          const code = String(new FormData(event.currentTarget).get("code") ?? "");
          run(async () => { const result = await verifyWaitlistCode(email, code); if (result.ok && result.grant) { setGrant(result.grant); setStep("password"); setNotice("Email verified. Now finish your account."); } else if (!result.ok) setError(result.error); });
        }}>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm"><p className="font-medium text-violet-900">Check your inbox</p><p className="mt-1 text-violet-700">Enter the code we sent to {email}. It expires in 10 minutes.</p></div>
          <div className="space-y-2"><Label htmlFor="waitlist-code">Six-digit code</Label><Input id="waitlist-code" name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="000000" className="text-center font-mono text-xl tracking-[0.4em]" /></div>
          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Verify email</Button>
          <div className="flex items-center justify-between text-xs"><button type="button" className="text-muted-foreground underline" onClick={() => { setStep("email"); setError(""); }}>Change email</button><button type="button" disabled={pending} className="font-medium text-violet-700 underline disabled:opacity-50" onClick={() => run(async () => { const result = await requestWaitlistCode(email); setNotice(result.ok ? "A new code is on its way." : ""); setError(result.ok ? "" : result.error); })}>Resend code</button></div>
        </form>
      ) : null}
      {step === "password" ? (
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault(); setError("");
          const data = new FormData(event.currentTarget);
          run(async () => {
            const result = await completeWaitlistSignup({ email, grant, role, name: String(data.get("name") ?? ""), password: String(data.get("password") ?? "") });
            if (!result.ok) { setError(result.error); return; }
            if (result.signedIn) { router.replace("/waitlist"); router.refresh(); }
            else setStep("done");
          });
        }}>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><Check className="mr-2 inline h-4 w-4" />{email} verified</div>
          <div className="grid grid-cols-2 gap-2">{(["STUDENT", "MENTOR"] as const).map((value) => <button key={value} type="button" aria-pressed={role === value} onClick={() => setRole(value)} className={`rounded-xl border p-3 text-left text-sm ${role === value ? "border-violet-500 bg-violet-50 text-violet-900" : "border-slate-200"}`}>{value === "STUDENT" ? "I’m learning" : "I’m mentoring"}</button>)}</div>
          <div className="space-y-2"><Label htmlFor="waitlist-name">Full name</Label><Input id="waitlist-name" name="name" autoComplete="name" required minLength={2} maxLength={80} /></div>
          <div className="space-y-2"><Label htmlFor="waitlist-password">Create a password</Label><Input id="waitlist-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /><p className="text-xs text-muted-foreground">At least 8 characters, including upper and lowercase letters and a number.</p></div>
          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}Join the waitlist</Button>
        </form>
      ) : null}
      {step === "done" ? <div role="status" className="rounded-xl border border-violet-200 bg-violet-50 p-5"><h2 className="font-display text-xl font-semibold">You’re on the list!</h2><p className="mt-2 text-sm text-muted-foreground">Your email is verified and your account is ready. Sign in to see your launch page.</p><Link href="/sign-in" className="mt-4 inline-block font-semibold text-violet-700 underline">Sign in</Link></div> : null}
      {notice && step !== "done" ? <p role="status" className="text-sm text-emerald-700">{notice}</p> : null}
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
