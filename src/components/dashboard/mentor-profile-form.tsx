"use client";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { Category, Skill } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { paiseToRupees, rupeesToPaise } from "@/lib/pricing";

type State = {
  headline: string;
  bio: string;
  experience: string;
  rateCents: number;
  currency: string;
  sessionLength: number;
  responseTimeHrs: number;
  acceptingBookings: boolean;
  achievements: string[];
  portfolio: string[];
  categoryIds: string[];
  skillIds: string[];
};

export function MentorProfileForm({ categories, skills, initial, approved }: { categories: Category[]; skills: Skill[]; initial: State; approved: boolean }) {
  const [s, setS] = useState<State>(initial);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof State>(k: K, v: State[K]) { setS((p) => ({ ...p, [k]: v })); }
  function toggleFromArr<T>(arr: T[], v: T) { return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]; }

  return (
    <Card className="space-y-5 p-6">
      {approved ? (
        <div className="flex items-center justify-between rounded-md bg-muted p-3">
          <div>
            <div className="text-sm font-medium">Accepting bookings</div>
            <div className="text-xs text-muted-foreground">Pause to temporarily hide your calendar.</div>
          </div>
          <Switch checked={s.acceptingBookings} onCheckedChange={(v) => update("acceptingBookings", v)} />
        </div>
      ) : null}

      <Field label="Headline"><Input value={s.headline} onChange={(e) => update("headline", e.target.value)} /></Field>
      <Field label="Bio"><Textarea rows={4} value={s.bio} onChange={(e) => update("bio", e.target.value)} /></Field>
      <Field label="Experience"><Textarea rows={4} value={s.experience} onChange={(e) => update("experience", e.target.value)} /></Field>

      {approved ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price per session (₹)"><Input type="number" min={0} step={50} value={paiseToRupees(s.rateCents)} onChange={(e) => update("rateCents", rupeesToPaise(Number(e.target.value) || 0))} /></Field>
          <Field label="Session length (min)"><Input type="number" min={15} max={240} value={s.sessionLength} onChange={(e) => update("sessionLength", Number(e.target.value) || 30)} /></Field>
          <Field label="Response time (hrs)"><Input type="number" min={1} max={168} value={s.responseTimeHrs} onChange={(e) => update("responseTimeHrs", Number(e.target.value) || 24)} /></Field>
        </div>
      ) : null}

      <Field label="Categories">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button key={c.id} type="button" onClick={() => update("categoryIds", toggleFromArr(s.categoryIds, c.id))}
              className={cn("rounded-full border px-3 py-1 text-xs transition", s.categoryIds.includes(c.id) ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted")}>
              {c.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Skills">
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 50).map((sk) => (
            <button key={sk.id} type="button" onClick={() => update("skillIds", toggleFromArr(s.skillIds, sk.id))}
              className={cn("rounded-full border px-3 py-1 text-xs transition", s.skillIds.includes(sk.id) ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted")}>
              {sk.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Portfolio links (one per line)">
        <Textarea
          rows={3}
          value={s.portfolio.join("\n")}
          onChange={(e) => update("portfolio", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))}
          placeholder="https://github.com/you"
        />
      </Field>

      <Field label="Achievements (one per line)">
        <Textarea
          rows={3}
          value={s.achievements.join("\n")}
          onChange={(e) => update("achievements", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))}
        />
      </Field>

      <Button
        variant="brand"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await fetch("/api/mentors/me/profile", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(s),
            });
            if (!res.ok) {
              const b = await res.json().catch(() => ({}));
              toast.error(b?.error ?? "Could not save");
              return;
            }
            toast.success("Profile saved");
          })
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save profile
      </Button>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
