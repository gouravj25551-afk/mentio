import { requireRole } from "@/lib/auth/guards";

// Every admin page re-checks this against the database, in addition to its own guard.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("ADMIN");
  return children;
}
