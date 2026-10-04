"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { signInWithGoogle, signUpAction } from "@/features/auth/actions";

export function SignUpForm({ defaultRole = "STUDENT", googleEnabled }: { defaultRole?: "STUDENT" | "MENTOR"; googleEnabled: boolean }) {
  const [state, action] = useFormState(signUpAction, null);
  const [role, setRole] = useState<"STUDENT" | "MENTOR">(defaultRole);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast.success("Account created — welcome to Mentio");
      router.replace(role === "MENTOR" ? "/onboarding/mentor" : "/dashboard/student");
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, role, router]);

  return (
    <div className="space-y-5">
      {googleEnabled ? (
        <>
          <form action={signInWithGoogle}>
            <Button type="submit" variant="outline" className="w-full" size="lg">
              Continue with Google
            </Button>
          </form>
          <div className="relative">
            <Separator />
            <span className="absolute inset-x-0 top-1/2 mx-auto w-max -translate-y-1/2 bg-background px-2 text-xs uppercase tracking-wider text-muted-foreground">or sign up with email</span>
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {(["STUDENT", "MENTOR"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              "rounded-md border px-3 py-3 text-left text-sm transition",
              role === r ? "border-foreground bg-background shadow-soft" : "border-border bg-muted/30 hover:bg-background"
            )}
          >
            <div className="font-medium">{r === "STUDENT" ? "I'm learning" : "I'm mentoring"}</div>
            <div className="text-xs text-muted-foreground">
              {r === "STUDENT" ? "Book calls, grow fast" : "Share your journey, get discovered"}
            </div>
          </button>
        ))}
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="role" value={role} />
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
          <p className="text-xs text-muted-foreground">8+ chars, with an uppercase letter and a number.</p>
        </div>
        <Submit />
      </form>
    </div>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create account
    </Button>
  );
}
