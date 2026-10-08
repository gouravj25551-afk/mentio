import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AdminMentorActions } from "@/components/dashboard/admin-mentor-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EMPTY_COPY = {
  PENDING: "No applications waiting for review.",
  APPROVED: "No approved mentors yet. Approve an application to get started.",
  REJECTED: "No rejected applications.",
  SUSPENDED: "No suspended mentors.",
} as const;

async function Section({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" }) {
  const rows = await db.mentorProfile.findMany({
    where: { status },
    include: { user: { select: { id: true, name: true, image: true } }, categories: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  if (!rows.length) return <p className="p-6 text-sm text-muted-foreground">{EMPTY_COPY[status]}</p>;
  return (
    <Card className="divide-y">
      {rows.map((m) => (
        <div key={m.id} className="flex flex-wrap items-center gap-4 p-4">
          <Avatar className="h-10 w-10"><AvatarImage src={m.user.image ?? undefined} /><AvatarFallback>{initials(m.user.name)}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium"><Link href={`/mentors/${m.slug}`} className="underline-offset-4 hover:underline">{m.user.name}</Link></div>
            <div className="truncate text-xs text-muted-foreground">{m.headline}</div>
            <a href={m.verificationUrl ?? undefined} target="_blank" rel="noreferrer noopener" className="mt-1 block truncate text-xs text-indigo-600 underline">{m.verificationUrl ? `Verify public profile: ${m.verificationUrl}` : "Public profile not submitted"}</a>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {m.categories.map((c) => <Badge key={c.categoryId} variant="secondary" className="text-[10px]">{c.category.name}</Badge>)}
            </div>
          </div>
          <Badge variant={status === "APPROVED" ? "success" : status === "PENDING" ? "warning" : "destructive"}>{status}</Badge>
          <AdminMentorActions mentorProfileId={m.id} featured={m.featured} status={status} />
        </div>
      ))}
    </Card>
  );
}

export default async function AdminMentorsPage() {
  await requireRole("ADMIN");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Mentors</h1>
        <p className="text-sm text-muted-foreground">Approve, reject, suspend, or feature.</p>
      </div>
      <Tabs defaultValue="PENDING">
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          <TabsTrigger value="SUSPENDED">Suspended</TabsTrigger>
        </TabsList>
        <TabsContent value="PENDING"><Section status="PENDING" /></TabsContent>
        <TabsContent value="APPROVED"><Section status="APPROVED" /></TabsContent>
        <TabsContent value="REJECTED"><Section status="REJECTED" /></TabsContent>
        <TabsContent value="SUSPENDED"><Section status="SUSPENDED" /></TabsContent>
      </Tabs>
    </div>
  );
}
