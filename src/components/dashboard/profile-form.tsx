"use client";
import { cloneElement, isValidElement, useId, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { listTimezones } from "@/lib/time";

type Profile = {
  name: string;
  image?: string;
  headline?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  github?: string;
  website?: string;
};

export function ProfileForm({ initial }: { initial: Profile }) {
  const [state, setState] = useState<Profile>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const timezones = useMemo(() => {
    const all = listTimezones();
    return state.timezone && !all.includes(state.timezone) ? [state.timezone, ...all] : all;
  }, [state.timezone]);

  function update<K extends keyof Profile>(k: K, v: Profile[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  return (
    <form
      className="space-y-5 rounded-xl border bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await fetch("/api/me/profile", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(state),
          });
          if (!res.ok) {
            const b = await res.json().catch(() => ({}));
            setError(b?.error ?? "Could not save. Please try again.");
            return;
          }
          toast.success("Profile saved");
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><Input value={state.name} onChange={(e) => update("name", e.target.value)} required /></Field>
        <Field label="Headline"><Input value={state.headline ?? ""} onChange={(e) => update("headline", e.target.value)} placeholder="CS undergrad · GSoC aspirant" /></Field>
      </div>
      <Field label="Bio"><Textarea rows={4} value={state.bio ?? ""} onChange={(e) => update("bio", e.target.value)} placeholder="A couple of sentences — what you work on and where you want to go." /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location"><Input value={state.location ?? ""} onChange={(e) => update("location", e.target.value)} placeholder="Bangalore, IN" /></Field>
        <Field label="Timezone">
          <select
            value={state.timezone ?? "UTC"}
            onChange={(e) => update("timezone", e.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {timezones.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Twitter handle"><Input value={state.twitter ?? ""} onChange={(e) => update("twitter", e.target.value)} placeholder="your-handle" /></Field>
        <Field label="Instagram handle"><Input value={state.instagram ?? ""} onChange={(e) => update("instagram", e.target.value)} placeholder="your-handle" /></Field>
        <Field label="LinkedIn handle"><Input value={state.linkedin ?? ""} onChange={(e) => update("linkedin", e.target.value)} /></Field>
        <Field label="GitHub handle"><Input value={state.github ?? ""} onChange={(e) => update("github", e.target.value)} /></Field>
        <Field label="Website"><Input value={state.website ?? ""} onChange={(e) => update("website", e.target.value)} placeholder="https://" type="url" /></Field>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        All times in your dashboard and emails are shown in this timezone.{" "}
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={() => update("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone)}
        >
          Use this device&apos;s timezone
        </button>
      </p>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save profile
      </Button>
    </form>
  );
}

/** Ties the label to its control so screen readers and click-to-focus work. */
function Field({ label, children }: { label: string; children: React.ReactElement<{ id?: string }> }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {isValidElement(children) ? cloneElement(children, { id }) : children}
    </div>
  );
}
