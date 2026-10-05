import { PrismaClient } from "@prisma/client";

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : process.env.NODE_ENV === "test" ? [] : ["error"],
    // Never select the password hash unless a query opts in with
    // `omit: { passwordHash: false }` (only the credential check does).
    omit: { user: { passwordHash: true } },
  });
}

type Db = ReturnType<typeof createClient>;
const globalForPrisma = globalThis as unknown as { prisma: Db | undefined };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
