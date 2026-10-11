"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Check, Loader2, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestWaitlistCode, verifyWaitlistCode } from "@/features/auth/waitlist-actions";

export function WaitlistSignupFlow({ defaultRole }: { defaultRole: "STUDENT" | "MENTOR" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [codeSent, setCodeSent] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const run = (task: () => Promise<void>) => startTransition(async () => { await task(); });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2" aria-label="How you want to join">{(["STUDENT", "MENTOR"] as const).map((value) => <button key={value} type="button" aria-pressed={role === value} disabled={pending} onClick={() => setRole(value)} className={`rounded-xl border p-3 text-left text-sm transition ${role === value ? "border-violet-500 bg-violet-50 text-violet-900" : "border-slate-200 hover:border-violet-300"}`}>{value === "STUDENT" ? "I want to learn" : "I want to mentor"}</button>)}</div>
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault(); setError("");
        run(async () => { const result = await requestWaitlistCode(email); if (result.ok) { setCodeSent(true); setNotice(`We sent a six-digit code to ${email}.`); } else setError(result.error); });
      }}>
        <div className="space-y-2"><Label htmlFor="waitlist-email">Email address</Label><Input id="waitlist-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setCodeSent(false); }} required placeholder="you@example.com" /></div>
        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}{codeSent ? "Send a new code" : "Verify your email"}</Button>
      </form>
      {codeSent ? <form className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-5" onSubmit={(event) => {
        event.preventDefault(); setError("");
        const code = String(new FormData(event.currentTarget).get("code") ?? "");
        run(async () => { const result = await verifyWaitlistCode(email, code, role); if (result.ok) { router.replace("/waitlist"); router.refresh(); } else setError(result.error); });
      }}>
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-900"><ShieldCheck className="h-4 w-4" /> Enter your verification code</div>
        <p className="text-xs leading-5 text-violet-800">Check {email}. The code expires in 10 minutes. You’ll stay on this page until it’s verified.</p>
        <div className="space-y-2"><Label htmlFor="waitlist-code">Six-digit code</Label><Input id="waitlist-code" name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="000000" className="bg-white text-center font-mono text-xl tracking-[0.4em]" /></div>
        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}Join the Mentio waitlist</Button>
      </form> : <p className="text-xs leading-5 text-muted-foreground">No password needed. Verify your email here, then you’ll go straight to the launch page.</p>}
      {notice ? <p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" />{notice}</p> : null}
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
