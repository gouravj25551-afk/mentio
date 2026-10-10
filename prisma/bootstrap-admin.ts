// Creates or updates exactly one account (ADMIN_EMAIL) as an ADMIN.
// Run with: npm run admin:bootstrap
// There is deliberately no browser-based admin registration.
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

try {
  // Loads .env for local runs; a no-op if the file is missing or the runtime lacks it.
  process.loadEnvFile?.();
} catch {
  /* env is expected to come from the shell instead */
}

const InputSchema = z.object({
  ADMIN_EMAIL: z.string().email().transform((v) => v.trim().toLowerCase()),
  ADMIN_PASSWORD: z
    .string()
    .min(12, "ADMIN_PASSWORD must be at least 12 characters")
    .max(100)
    .regex(/[A-Z]/, "ADMIN_PASSWORD must include an uppercase letter")
    .regex(/[a-z]/, "ADMIN_PASSWORD must include a lowercase letter")
    .regex(/[0-9]/, "ADMIN_PASSWORD must include a number"),
});

async function main() {
  const parsed = InputSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Cannot bootstrap admin:");
    for (const issue of parsed.error.issues) console.error(` - ${issue.message}`);
    process.exit(1);
  }
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = parsed.data;

  const db = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.upsert({
      where: { email },
      update: { role: Role.ADMIN, passwordHash, emailVerified: new Date() },
      create: {
        email,
        name: "Mentio Admin",
        role: Role.ADMIN,
        passwordHash,
        emailVerified: new Date(),
        profile: { create: {} },
      },
    });
    await db.profile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    console.log(`Admin account ready for ${email}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("Admin bootstrap failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
