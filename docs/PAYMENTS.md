# Payments (Razorpay)

Students pay at booking; the money settles into **your** Razorpay account (the one that owns the API keys). Mentio does not hold funds and does **not** pay mentors automatically: you pay them from your bank, using the list on `/dashboard/admin/payments`.

## Turn it on

1. Razorpay Dashboard > **API keys** > generate keys. Use `rzp_test_` keys first.
2. Dashboard > **Webhooks** > add `https://<your-domain>/api/webhooks/razorpay`, events **`payment.captured`** and **`order.paid`**, and a secret you choose.
3. Set, then **rebuild** (the mode is baked into the browser bundle):
   ```
   NEXT_PUBLIC_PAYMENTS_MODE=razorpay
   RAZORPAY_KEY_ID=rzp_live_...
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=<the secret from step 2>
   ```
4. Keep Razorpay's **auto-capture** on (Settings > Payment capture). With manual capture, payments stay "authorized" and are refunded after 5 days.
5. Mentors set a price (₹50–₹50,000) on their profile; 0 stays free.

## How a booking is paid

1. Student picks a slot -> the slot is **held** as `PENDING` for 15 minutes (no meeting link yet).
2. The server creates a Razorpay order for the mentor's price (never a client-supplied amount) and Razorpay Checkout opens (UPI incl. QR, cards, netbanking, wallets).
3. After paying, the browser sends Razorpay's signature to `POST /api/bookings/:id/payment/verify`. The booking becomes `CONFIRMED` / `PAID` **only** if the HMAC is valid.
4. If the tab closes first, the signed webhook confirms it instead. Both paths run the same idempotent `confirmPayment`.
5. Abandoned holds expire and free the slot. A student who closed checkout can reopen it from the booking page ("Pay") until the hold ends.

## Edge cases handled

- **Paid after the hold expired:** if the slot is still free the booking is confirmed; if someone took it, the payment is marked `REFUND_DUE` and the student is told.
- **Cancelling a paid booking:** marked `REFUND_DUE`. Refunds are **manual**: Razorpay Dashboard > Payments > Refund. `/dashboard/admin/payments` lists them with the order id.
- **Wrong amount in a webhook:** ignored and logged (`payment.amount_mismatch`).
- **Duplicate webhooks / verify + webhook racing:** only the first changes anything.

## Needs your decision before going live

- Refund policy and support email (the Terms page has a default paragraph: review it).
- Whether you keep a platform fee: totals shown are full session prices.
- Razorpay may need your website to show Terms, Privacy, Refund and Contact pages for live-mode activation.
