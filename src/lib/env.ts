import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32).optional().default("development-only-insecure-secret-change-in-production-32bytes"),
  AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default("http://localhost:3000"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  UPLOADTHING_TOKEN: z.string().optional(),
  EMAIL_FROM: z.string().optional().default("Mentio <noreply@mentio.app>"),
  RESEND_API_KEY: z.string().optional(),
  CAL_COM_CLIENT_ID: z.string().optional(),
  CAL_COM_CLIENT_SECRET: z.string().optional(),
  CALENDLY_CLIENT_ID: z.string().optional(),
  CALENDLY_CLIENT_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV === "production") {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.success
  ? parsed.data
  : (EnvSchema.parse({ ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost:5432/mentio" }));

export const isGoogleOAuthEnabled = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
export const isCalComEnabled = Boolean(env.CAL_COM_CLIENT_ID && env.CAL_COM_CLIENT_SECRET);
export const isCalendlyEnabled = Boolean(env.CALENDLY_CLIENT_ID && env.CALENDLY_CLIENT_SECRET);
export const isResendEnabled = Boolean(env.RESEND_API_KEY);
