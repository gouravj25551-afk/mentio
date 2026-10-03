import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminCategoriesPage() {
  await requireRole("ADMIN");
  const cats = await db.category.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { mentors: true } } },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">Browsing surfaces mentors by these.</p>
      </div>
      <Card className="divide-y">
        {cats.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">/{c.slug}</div>
            </div>
            <Badge variant="secondary">{c._count.mentors} mentors</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
