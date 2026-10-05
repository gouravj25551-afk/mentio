import type { Prisma } from "@prisma/client";

/**
 * The only User fields that may be sent to a browser or another user.
 * (passwordHash is additionally omitted globally in src/lib/db.ts.)
 */
export const publicUser = { id: true, name: true, image: true } satisfies Prisma.UserSelect;

/** A participant's name and avatar, plus email for the people in the booking itself. */
export const participantUser = { id: true, name: true, image: true, email: true } satisfies Prisma.UserSelect;
