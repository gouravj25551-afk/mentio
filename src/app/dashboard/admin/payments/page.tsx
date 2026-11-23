import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PAYMENT } from "@/lib/booking-rules";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate, formatMoney, formatTime } from "@/lib/utils";

/**
 * Where the money is. Customers pay into your Razorpay account, so payouts to mentors
 * and refunds are done by you: this page lists who is owed what, and which payments to refund.
 */
export default async function AdminPaymentsPage() {
  await requireRole("ADMIN");
  const rows = await db.booking.findMany({
    where: { amountCents: { gt: 0 }, paymentStatus: { in: [PAYMENT.PAID, PAYMENT.REFUND_DUE, PAYMENT.REFUNDED] } },
    include: { student: { select: { name: true, email: true } }, mentorProfile: { select: { id: true, user: { select: { name: true, email: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const refundDue = rows.filter((r) => r.paymentStatus === PAYMENT.REFUND_DUE);
  const collected = rows.filter((r) => r.paymentStatus === PAYMENT.PAID);
  const total = (list: typeof rows) => list.reduce((n, r) => n + r.amountCents, 0);

  // Sessions that really happened, per mentor: what you owe them (before your own fee).
  const owed = new Map<string, { name: string; email: string; count: number; amount: number }>();
  for (const r of collected) {
    if (r.status !== "COMPLETED") continue;
    const cur = owed.get(r.mentorProfile.id) ?? { name: r.mentorProfile.user.name ?? "Mentor", email: r.mentorProfile.user.email, count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += r.amountCents;
    owed.set(r.mentorProfile.id, cur);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">Students pay into your Razorpay account. Pay mentors and issue refunds from there.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Collected (sessions not cancelled)</div><div className="mt-1 font-display text-2xl font-semibold">{formatMoney(total(collected), "INR") || "₹0"}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Refunds to issue</div><div className="mt-1 font-display text-2xl font-semibold">{refundDue.length ? formatMoney(total(refundDue), "INR") : "₹0"}</div><div className="text-xs text-muted-foreground">{refundDue.length} payment{refundDue.length === 1 ? "" : "s"}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Owed to mentors (completed sessions)</div><div className="mt-1 font-display text-2xl font-semibold">{formatMoney([...owed.values()].reduce((n, o) => n + o.amount, 0), "INR") || "₹0"}</div></Card>
      </div>

      {refundDue.length > 0 ? (
        <section aria-labelledby="refunds" className="space-y-2">
          <h2 id="refunds" className="text-sm font-semibold">Refund these in Razorpay ({refundDue.length})</h2>
          <Card className="divide-y border-dashed">
            {refundDue.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.student.name} · {formatMoney(r.amountCents, r.currency)}</div>
                  <div className="text-xs text-muted-foreground">{r.student.email} · order <span className="font-mono">{r.paymentIntentId}</span></div>
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(r.startsAt)} {formatTime(r.startsAt)}</div>
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      <section aria-labelledby="owed" className="space-y-2">
        <h2 id="owed" className="text-sm font-semibold">Owed to mentors</h2>
        {owed.size === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nothing yet. Completed paid sessions show up here.</Card>
        ) : (
          <Card className="divide-y">
            {[...owed.values()].sort((a, b) => b.amount - a.amount).map((o) => (
              <div key={o.email} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div><div className="font-medium">{o.name}</div><div className="text-xs text-muted-foreground">{o.email} · {o.count} session{o.count === 1 ? "" : "s"}</div></div>
                <div className="font-medium">{formatMoney(o.amount, "INR")}</div>
              </div>
            ))}
          </Card>
        )}
        <p className="text-xs text-muted-foreground">Totals are the full session price. Mentio doesn&apos;t track what you&apos;ve already paid out or any fee you keep.</p>
      </section>

      <section aria-labelledby="all" className="space-y-2">
        <h2 id="all" className="text-sm font-semibold">All payments</h2>
        {rows.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No payments yet.</Card>
        ) : (
          <Card className="divide-y">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-1 gap-2 p-4 text-sm sm:grid-cols-[1.4fr_1.4fr_auto_auto_auto] sm:items-center">
                <div><div className="font-medium">{r.student.name}</div><div className="text-xs text-muted-foreground">{r.student.email}</div></div>
                <div><div className="font-medium">{r.mentorProfile.user.name}</div><div className="text-xs text-muted-foreground">{formatDate(r.startsAt)} {formatTime(r.startsAt)}</div></div>
                <div className="font-medium">{formatMoney(r.amountCents, r.currency)}</div>
                <Badge variant={r.paymentStatus === PAYMENT.PAID ? "success" : "warning"}>{r.paymentStatus}</Badge>
                <div className="font-mono text-[11px] text-muted-foreground">{r.paymentIntentId}</div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
