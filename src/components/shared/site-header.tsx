import { HeaderBar } from "@/components/shared/header-bar";
import { optionalUser } from "@/lib/auth/guards";

export async function SiteHeader() {
  const user = await optionalUser();
  return <HeaderBar user={user ? { name: user.name, email: user.email, image: user.image, role: user.role } : null} />;
}
