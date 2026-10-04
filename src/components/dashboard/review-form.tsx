"use client";
import { useState, useTransition } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ReviewForm({ bookingId, initialRating, initialComment = "" }: { bookingId: string; initialRating?: number; initialComment?: string }) {
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [comment, setComment] = useState(initialComment);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const idx = i + 1;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setRating(idx)}
              className="rounded-md p-1 transition hover:bg-muted"
              aria-label={`Rate ${idx} stars`}
            >
              <Star className={`h-6 w-6 ${idx <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
            </button>
          );
        })}
      </div>
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What stood out? Keep it short and specific." />
      <Button
        variant="brand"
        disabled={pending || rating === 0}
        onClick={() =>
          startTransition(async () => {
            const res = await fetch("/api/reviews", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ bookingId, rating, comment }),
            });
            if (!res.ok) {
              const b = await res.json().catch(() => ({}));
              toast.error(b?.error ?? "Could not submit review");
              return;
            }
            toast.success("Review submitted — thanks for the feedback.");
          })
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {initialRating ? "Update review" : "Leave review"}
      </Button>
    </div>
  );
}
