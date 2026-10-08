"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "INTERNAL" | "CAL_COM" | "CALENDLY";
export function SchedulingModeForm({ initialMode, initialUrl, connected }: { initialMode: Mode; initialUrl: string; connected: Record<"CAL_COM" | "CALENDLY", boolean> }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/mentors/me/scheduling", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, bookingUrl: mode === "INTERNAL" ? undefined : url }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not update booking method.");
      toast.success(mode === "INTERNAL" ? "Mentio scheduling is active" : "External booking page is active");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update booking method."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <div className="grid gap-2 sm:grid-cols-3">
      {(["INTERNAL", "CAL_COM", "CALENDLY"] as Mode[]).map((value) => <Button key={value} type="button" variant={mode === value ? "brand" : "outline"} disabled={busy || (value !== "INTERNAL" && !connected[value])} onClick={() => setMode(value)}>{value === "INTERNAL" ? "Mentio" : value === "CAL_COM" ? "Cal.com" : "Calendly"}</Button>)}
    </div>
    {mode !== "INTERNAL" ? <div className="space-y-2"><Label htmlFor="bookingUrl">{mode === "CAL_COM" ? "Cal.com" : "Calendly"} booking page</Label><Input id="bookingUrl" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={mode === "CAL_COM" ? "https://cal.com/your-name/30min" : "https://calendly.com/your-name/30min"} /></div> : <p className="text-sm text-muted-foreground">Students choose from the availability you set in Mentio. A confirmed slot disappears for everyone else.</p>}
    <Button type="button" variant="brand" disabled={busy || (mode !== "INTERNAL" && !url)} onClick={() => void save()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save booking method</Button>
  </div>;
}
