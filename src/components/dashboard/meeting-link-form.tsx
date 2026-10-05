"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MeetingLinkForm({ initial, hosts }: { initial: string; hosts: string[] }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(next: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/mentors/me/meeting-link", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ meetingLink: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not save");
        return;
      }
      setValue(body.meetingLink ?? "");
      toast.success(body.meetingLink ? "Meeting link saved" : "Using Mentio video rooms");
      router.refresh();
    } catch {
      setError("Network problem. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save(value);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="meetingLink">Your meeting link</Label>
        <Input
          id="meetingLink"
          type="url"
          inputMode="url"
          placeholder="https://meet.google.com/abc-defg-hij"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby="meetingLink-hint"
        />
        <p id="meetingLink-hint" className="text-xs text-muted-foreground">
          Allowed: {hosts.join(", ")}.
        </p>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="brand" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save link
        </Button>
        {initial ? (
          <Button type="button" variant="outline" disabled={saving} onClick={() => void save("")}>Use Mentio rooms</Button>
        ) : null}
      </div>
    </form>
  );
}
