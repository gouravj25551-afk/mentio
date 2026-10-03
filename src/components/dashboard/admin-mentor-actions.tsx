"use client";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AdminMentorActions({ mentorProfileId, featured, status }: { mentorProfileId: string; featured: boolean; status: string }) {
  const [pending, startTransition] = useTransition();
  const call = (action: string) =>
    startTransition(async () => {
      const res = await fetch(`/api/admin/mentors/${mentorProfileId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        toast.error(b?.error ?? "Failed");
        return;
      }
      toast.success("Updated");
      window.location.reload();
    });
  return (
    <div className="flex items-center gap-2">
      {status !== "APPROVED" ? <Button size="sm" variant="brand" disabled={pending} onClick={() => call("APPROVE")}>Approve</Button> : null}
      {status !== "REJECTED" ? <Button size="sm" variant="outline" disabled={pending} onClick={() => call("REJECT")}>Reject</Button> : null}
      {status !== "SUSPENDED" ? <Button size="sm" variant="outline" disabled={pending} onClick={() => call("SUSPEND")}>Suspend</Button> : null}
      {status === "APPROVED" ? (
        <Button size="sm" variant={featured ? "secondary" : "outline"} disabled={pending} onClick={() => call(featured ? "UNFEATURE" : "FEATURE")}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {featured ? "Unfeature" : "Feature"}
        </Button>
      ) : null}
    </div>
  );
}
