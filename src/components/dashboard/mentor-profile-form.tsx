"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Category, MentorStatus, Skill } from "@prisma/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listTimezones } from "@/lib/time";
import { cn } from "@/lib/utils";

type State = {
  headline: string;
  bio: string;
  experience: string;
  sessionLength: number;
  responseTimeHrs: number;
  timezone: string;
  acceptingBookings: boolean;
  achievements: string[];
  portfolio: string[];
  verificationUrl: string;
  categoryIds: string[];
  skillIds: string[];
  twitter: string;
  instagram: string;
  linkedin: string;
  github: string;
};

const STATUS_NOTE: Record<MentorStatus, { text: string; tone: string } | null> = {
  PENDING: { text: "Under review. You'll be visible to students once an admin approves your profile.", tone: "bg-muted" },
  REJECTED: { text: "Not approved. Update your profile and save to send it for review again.", tone: "bg-destructive/10 text-destructive" },
  SUSPENDED: { text: "Your profile is suspended and can't receive bookings. Contact support.", tone: "bg-destructive/10 text-destructive" },
  APPROVED: null,
};

export function MentorProfileForm({
  categories,
  skills,
  initial,
  status,
}: {
  categories: Category[];
  skills: Skill[];
  initial: State;
  status: MentorStatus;
}) {
  const router = useRouter();
  const [s, setS] = useState<State>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timezones = useMemo(() => {
    const all = listTimezones();
    return all.includes(initial.timezone) ? all : [initial.timezone, ...all];
  }, [initial.timezone]);

  function update<K extends keyof State>(k: K, v: State[K]) {
    setS((p) => ({ ...p, [k]: v }));
  }
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);
  const note = STATUS_NOTE[status];

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/mentors/me/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...s, rateCents: 0 }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setError(b?.error ?? "Could not save. Please try again.");
        return;
      }
      toast.success("Profile saved");
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {note ? <p role="status" className={cn("rounded-md p-3 text-sm", note.tone)}>{note.text}</p> : null}

      <div className="flex items-center justify-between rounded-md bg-muted p-3">
        <div>
          <Label htmlFor="accepting" className="text-sm font-medium">Accepting bookings</Label>
          <div className="text-xs text-muted-foreground">Pause to stop new bookings.</div>
        </div>
        <Switch id="accepting" checked={s.acceptingBookings} onCheckedChange={(v) => update("acceptingBookings", v)} />
      </div>

      <Field id="headline" label="Headline" hint="10-140 characters">
        <Input id="headline" required minLength={10} maxLength={140} value={s.headline} onChange={(e) => update("headline", e.target.value)} />
      </Field>
      <Field id="bio" label="Bio" hint="At least 40 characters">
        <Textarea id="bio" required minLength={40} maxLength={4000} rows={4} value={s.bio} onChange={(e) => update("bio", e.target.value)} />
      </Field>
      <Field id="experience" label="Experience" hint="At least 20 characters">
        <Textarea id="experience" required minLength={20} maxLength={4000} rows={4} value={s.experience} onChange={(e) => update("experience", e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="sessionLength" label="Session length (min)">
          <Input id="sessionLength" type="number" min={15} max={240} step={15} value={s.sessionLength} onChange={(e) => update("sessionLength", Number(e.target.value) || 30)} />
        </Field>
        <Field id="responseTimeHrs" label="Response time (hrs)">
          <Input id="responseTimeHrs" type="number" min={1} max={168} value={s.responseTimeHrs} onChange={(e) => update("responseTimeHrs", Number(e.target.value) || 24)} />
        </Field>
        <Field id="timezone" label="Your timezone">
          <select
            id="timezone"
            value={s.timezone}
            onChange={(e) => update("timezone", e.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {timezones.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">Sessions are free during the beta. Your availability hours use this timezone.</p>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Categories <span className="font-normal text-muted-foreground">(pick up to 5)</span></legend>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <Chip key={c.id} on={s.categoryIds.includes(c.id)} onClick={() => update("categoryIds", toggle(s.categoryIds, c.id))}>{c.name}</Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Skills</legend>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((sk) => (
            <Chip key={sk.id} on={s.skillIds.includes(sk.id)} onClick={() => update("skillIds", toggle(s.skillIds, sk.id))}>{sk.name}</Chip>
          ))}
        </div>
      </fieldset>

      <Field id="portfolio" label="Portfolio links" hint="One https:// link per line">
        <Textarea id="portfolio" rows={3} defaultValue={s.portfolio.join("\n")} onChange={(e) => update("portfolio", lines(e.target.value))} placeholder="https://github.com/you" />
      </Field>
      <Field id="verificationUrl" label="Public profile for verification" hint="Required — one public X, Instagram, LinkedIn, GitHub, or other profile URL">
        <Input id="verificationUrl" type="url" required value={s.verificationUrl} onChange={(e) => update("verificationUrl", e.target.value)} placeholder="https://www.linkedin.com/in/you" />
      </Field>
      <Field id="achievements" label="Achievements" hint="One per line">
        <Textarea id="achievements" rows={3} defaultValue={s.achievements.join("\n")} onChange={(e) => update("achievements", lines(e.target.value))} />
      </Field>

      <fieldset className="space-y-3 rounded-xl border bg-muted/30 p-4">
        <legend className="px-1 text-sm font-medium">Social proof <span className="font-normal text-muted-foreground">(optional)</span></legend>
        <p className="text-xs text-muted-foreground">Add handles where students can see your work and achievements. Enter handles only, not full links.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="twitter" label="X / Twitter"><Input id="twitter" value={s.twitter} onChange={(e) => update("twitter", e.target.value)} placeholder="your-handle" /></Field>
          <Field id="instagram" label="Instagram"><Input id="instagram" value={s.instagram} onChange={(e) => update("instagram", e.target.value)} placeholder="your-handle" /></Field>
          <Field id="linkedin" label="LinkedIn"><Input id="linkedin" value={s.linkedin} onChange={(e) => update("linkedin", e.target.value)} placeholder="your-handle" /></Field>
          <Field id="github" label="GitHub"><Input id="github" value={s.github} onChange={(e) => update("github", e.target.value)} placeholder="your-handle" /></Field>
        </div>
      </fieldset>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save profile
      </Button>
    </form>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}{hint ? <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span> : null}</Label>
      {children}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        on ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
