import { redirect } from "next/navigation";

// Early-access applications use the existing role-aware sign-up flow. Keeping
// this stable URL lets launch posts work before a standalone waitlist is needed.
export default function WaitlistPage() {
  redirect("/sign-up");
}
