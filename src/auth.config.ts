// Edge-safe slice of the Auth.js config. The middleware imports ONLY this file:
// pulling in the Prisma adapter or bcrypt there breaks the Edge runtime.
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface User {
    role?: Role;
  }
}

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const authConfig = {
  pages: { signIn: "/sign-in", error: "/sign-in" },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role ?? "STUDENT") as Role;
      }
      return token;
    },
    session({ session, token }) {
      // The role in the token can be stale (e.g. an admin was demoted). It is
      // only a UI hint: server code re-reads the role from the database via
      // requireUser()/requireApiUser() before authorizing anything.
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
