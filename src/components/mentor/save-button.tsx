"use client";
import { useTransition, useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SaveMentorButton({ mentorProfileId, initialSaved = false }: { mentorProfileId: string; initialSaved?: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={saved ? "secondary" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await fetch("/api/me/saved", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ mentorProfileId }),
          });
          const body = await res.json();
          if (!res.ok) {
            toast.error(body?.error ?? "Could not save");
            return;
          }
          setSaved(body.saved);
          toast(body.saved ? "Saved to your list" : "Removed from saved");
        })
      }
    >
      <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
