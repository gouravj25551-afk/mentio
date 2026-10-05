import { z } from "zod";
import { DEV_AUTH_SECRET, productionProblems } from "./env-checks";

const EnvSchema = z.object({
  // Pooled runtime connection (Supabase transaction pooler).
  DATABASE_URL: z.string().url(),
  // Direct connection, used only by `prisma migrate`. Not needed at runtime.
  DIRECT_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(32).optional().default(DEV_AUTH_SECRET),
  AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default("http://localhost:3000"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().optional().default("Mentio <noreply@mentio.app>"),
  RESEND_API_KEY: z.string().optional(),
  CAL_COM_CLIENT_ID: z.string().optional(),
  CAL_COM_CLIENT_SECRET: z.string().optional(),
  CALENDLY_CLIENT_ID: z.string().optional(),
  CALENDLY_CLIENT_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const isProduction = process.env.NODE_ENV === "production";
const parsed = EnvSchema.safeParse(process.env);
const problems = isProduction ? productionProblems(process.env) : [];

if (isProduction && (!parsed.success || problems.length > 0)) {
  // Log variable names and reasons only, never values.
  const invalid = parsed.success ? [] : Object.keys(parsed.error.flatten().fieldErrors).map((k) => `${k}: invalid value`);
  console.error("Invalid environment configuration:\n - " + [...problems, ...invalid].join("\n - "));
  throw new Error("Invalid environment variables");
}

export const env = parsed.success
  ? parsed.data
  : EnvSchema.parse({ ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost:5432/mentio" });

export const isProd = env.NODE_ENV === "production";
export const isGoogleOAuthEnabled = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
export const isCalComEnabled = Boolean(env.CAL_COM_CLIENT_ID && env.CAL_COM_CLIENT_SECRET);
export const isCalendlyEnabled = Boolean(env.CALENDLY_CLIENT_ID && env.CALENDLY_CLIENT_SECRET);
export const isResendEnabled = Boolean(env.RESEND_API_KEY);
