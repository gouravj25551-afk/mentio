"use client";
import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { isSoundEnabled, onSoundChange, setSoundEnabled } from "@/lib/sound";
import { cn } from "@/lib/utils";

/** Small speaker button that turns interface sounds on or off. */
export function SoundToggle({ className }: { className?: string }) {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    setOn(isSoundEnabled());
    const off = onSoundChange(setOn);
    return () => {
      off();
    };
  }, []);
  return (
    <button
      type="button"
      data-sound="off"
      onClick={() => setSoundEnabled(!on)}
      aria-pressed={Boolean(on)}
      aria-label={on ? "Turn interface sounds off" : "Turn interface sounds on"}
      title={on ? "Sounds on" : "Sounds off"}
      className={cn("flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground", className)}
    >
      {on === false ? <VolumeX className="h-3.5 w-3.5" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
}
