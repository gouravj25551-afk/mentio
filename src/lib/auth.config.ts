import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
import { env } from "@/lib/env";

// Edge-safe slice of the auth config. Middleware imports this instead of `@/lib/auth`,
// so Prisma and bcrypt stay out of the Edge bundle. It only reads the session JWT.
export const authConfig = {
  session: { strategy: "jwt" },
  secret: env.AUTH_SECRET,
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
