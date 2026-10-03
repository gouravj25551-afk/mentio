"use client";
import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
type Weekday = typeof WEEKDAYS[number];

type Slot = { weekday: Weekday; startMinutes: number; endMinutes: number };

function toTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function toMins(s: string) {
  const [h, m] = s.split(":").map((x) => Number(x) || 0);
  return h * 60 + m;
}

export function AvailabilityEditor({ initial }: { initial: Slot[] }) {
  const [slots, setSlots] = useState<Slot[]>(initial.length ? initial : [{ weekday: "MON", startMinutes: 9 * 60, endMinutes: 17 * 60 }]);
  const [pending, startTransition] = useTransition();

  function update(i: number, patch: Partial<Slot>) {
    setSlots((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function add() { setSlots((s) => [...s, { weekday: "MON", startMinutes: 9 * 60, endMinutes: 17 * 60 }]); }
  function remove(i: number) { setSlots((s) => s.filter((_, idx) => idx !== i)); }

  return (
    <Card className="p-6">
      <div className="space-y-3">
        {slots.map((s, i) => (
          <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <Field label="Day">
              <Select value={s.weekday} onValueChange={(v) => update(i, { weekday: v as Weekday })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Start">
              <Input type="time" value={toTime(s.startMinutes)} onChange={(e) => update(i, { startMinutes: toMins(e.target.value) })} />
            </Field>
            <Field label="End">
              <Input type="time" value={toTime(s.endMinutes)} onChange={(e) => update(i, { endMinutes: toMins(e.target.value) })} />
            </Field>
            <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Remove"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={add}><Plus className="h-4 w-4" /> Add window</Button>
        <Button
          variant="brand"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await fetch("/api/mentors/me/availability", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ slots }),
              });
              if (!res.ok) {
                const b = await res.json().catch(() => ({}));
                toast.error(b?.error ?? "Could not save");
                return;
              }
              toast.success("Availability updated");
            })
          }
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save availability
        </Button>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
