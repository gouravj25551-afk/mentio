"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { play } from "@/lib/sound";
import { openCheckout, verifyPayment, type CheckoutParams } from "@/lib/razorpay-checkout";

/** Reopens Razorpay checkout for a held, unpaid booking. */
export function PayNow({ bookingId, amountCents, currency }: { bookingId: string; amountCents: number; currency: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/payment`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Couldn't start the payment. Please try again.");
      const result = await openCheckout(body as CheckoutParams);
      if (result.status === "paid") {
        await verifyPayment(bookingId, result);
        play("success");
        toast.success("Payment received. Booking confirmed");
      } else if (result.status === "failed") {
        toast.error(result.message);
      }
      router.refresh();
    } catch (e) {
      play("error");
      toast.error((e as Error).message);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="brand" size="sm" disabled={busy} onClick={pay}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
      Pay {formatMoney(amountCents, currency)}
    </Button>
  );
}
