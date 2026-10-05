import { formatMoney } from "@/lib/utils";

/**
 * Checkout is not implemented yet. Mentors can configure an INR price for later,
 * but nobody is charged, so public pages show "Early access" instead of a price.
 */
export const PAYMENTS_ENABLED = false;

export const DEFAULT_CURRENCY = "INR";

export function displayPrice(rateCents: number, currency = DEFAULT_CURRENCY) {
  return PAYMENTS_ENABLED ? formatMoney(rateCents, currency) : "Early access";
}

export const rupeesToPaise = (rupees: number) => Math.round(rupees * 100);
export const paiseToRupees = (paise: number) => paise / 100;
