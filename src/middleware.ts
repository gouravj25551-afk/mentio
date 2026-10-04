import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;

  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/api/me") ||
    path.startsWith("/api/bookings") ||
    path.startsWith("/api/reviews") ||
    path.startsWith("/api/notifications") ||
    path.startsWith("/api/admin");

  const isAuthPage = path === "/sign-in" || path === "/sign-up";

  if (!session?.user && isProtected) {
    const url = new URL("/sign-in", nextUrl);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (session?.user && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (session?.user && path.startsWith("/dashboard/admin") && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }
  if (session?.user && path.startsWith("/dashboard/mentor") && session.user.role !== "MENTOR" && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
