import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { env, isGoogleOAuthEnabled } from "@/lib/env";
import { authorizeCredentials } from "@/lib/auth/credentials";
import { waitlistMode } from "@/lib/waitlist";
import type { PrismaClient } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // The adapter only needs the standard model API; it never reads passwordHash.
  adapter: PrismaAdapter(db as unknown as PrismaClient),
  secret: env.AUTH_SECRET,
  providers: [
    ...(isGoogleOAuthEnabled
      ? [
          Google({
            clientId: env.AUTH_GOOGLE_ID!,
            clientSecret: env.AUTH_GOOGLE_SECRET!,
            // Deliberately NOT allowing automatic linking by email: with it, anyone
            // could pre-register a victim's email with their own password and then
            // inherit the victim's Google login.
          }),
        ]
      : []),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials, request) => authorizeCredentials(credentials, request.headers),
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      const base = authConfig.callbacks.jwt({ token, user } as Parameters<typeof authConfig.callbacks.jwt>[0]);
      const t = base ?? token;
      if (trigger === "update" && t.id) {
        const fresh = await db.user.findUnique({ where: { id: t.id as string }, select: { role: true } });
        if (fresh) t.role = fresh.role;
      }
      return t;
    },
    // Runs BEFORE the user row exists on a first-time OAuth login, so it may only
    // accept or reject. Database writes belong in `events.signIn` below.
    signIn({ account, profile }) {
      // Only accept Google identities whose email Google itself has verified.
      if (account?.provider === "google" && !profile?.email_verified) return false;
      return true;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user.id) return;
      if (!waitlistMode) {
        await db.profile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
      }
      if (account?.provider === "google") {
        await db.user.updateMany({ where: { id: user.id, emailVerified: null }, data: { emailVerified: new Date() } });
      }
    },
  },
});
