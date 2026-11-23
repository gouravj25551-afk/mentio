import { formatMoney } from "@/lib/utils";

/**
 * "razorpay": mentors set a price and students pay at checkout.
 * Anything else is the free beta: nobody is charged and pages show "Early access".
 * Read at call time from a NEXT_PUBLIC_ variable (inlined into the browser bundle at build).
 */
export const paymentsEnabled = () => process.env.NEXT_PUBLIC_PAYMENTS_MODE === "razorpay";
export const PAYMENTS_ENABLED = paymentsEnabled();

export const DEFAULT_CURRENCY = "INR";
/** Razorpay's minimum is ₹1; below this a session is not worth the fees. */
export const MIN_PRICE_PAISE = 5_000;
export const MAX_PRICE_PAISE = 5_000_000;

export function displayPrice(rateCents: number, currency = DEFAULT_CURRENCY) {
  if (!paymentsEnabled()) return "Early access";
  return rateCents > 0 ? formatMoney(rateCents, currency) : "Free";
}

export const rupeesToPaise = (rupees: number) => Math.round(rupees * 100);
export const paiseToRupees = (paise: number) => paise / 100;
