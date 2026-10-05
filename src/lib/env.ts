import { z } from "zod";

// Treat empty strings (as in a copied .env.example) as "not set".
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  // No default on purpose: a baked-in secret would be usable in production.
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters (openssl rand -base64 32)"),
  AUTH_URL: optional(z.string().url()),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_GOOGLE_ID: optional(z.string()),
  AUTH_GOOGLE_SECRET: optional(z.string()),
  EMAIL_FROM: z.string().default("Mentio <noreply@mentio.app>"),
  RESEND_API_KEY: optional(z.string()),
  // Payments. "free_beta" (default): every session is free and mentors cannot
  // set a price. No other mode exists until a real provider is implemented.
  PAYMENTS_MODE: z.enum(["free_beta"]).default("free_beta"),
  // Calendar OAuth (Cal.com / Calendly). Off unless explicitly enabled.
  CALENDAR_OAUTH_ENABLED: z.enum(["true", "false"]).default("false"),
  CAL_COM_CLIENT_ID: optional(z.string()),
  CAL_COM_CLIENT_SECRET: optional(z.string()),
  CALENDLY_CLIENT_ID: optional(z.string()),
  CALENDLY_CLIENT_SECRET: optional(z.string()),
  // 32 bytes, base64. Encrypts stored calendar OAuth tokens.
  TOKEN_ENCRYPTION_KEY: optional(z.string()),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Extra rules that only apply to a running production server. Returned as a
 * list of human-readable problems so every one is reported at once.
 */
export function productionProblems(e: Env): string[] {
  const problems: string[] = [];
  if (/development-only|change-me|changeme|local-dev/i.test(e.AUTH_SECRET)) {
    problems.push("AUTH_SECRET looks like a development placeholder");
  }
  if (!e.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
    problems.push("NEXT_PUBLIC_APP_URL must be an https:// URL");
  }
  if (!e.RESEND_API_KEY) {
    problems.push("RESEND_API_KEY is required so password-reset and verification emails are delivered");
  }
  if (e.CALENDAR_OAUTH_ENABLED === "true") {
    if (!e.TOKEN_ENCRYPTION_KEY) problems.push("TOKEN_ENCRYPTION_KEY is required when CALENDAR_OAUTH_ENABLED=true");
    if (!((e.CAL_COM_CLIENT_ID && e.CAL_COM_CLIENT_SECRET) || (e.CALENDLY_CLIENT_ID && e.CALENDLY_CLIENT_SECRET))) {
      problems.push("CALENDAR_OAUTH_ENABLED=true but no Cal.com or Calendly credentials are set");
    }
  }
  return problems;
}

function load(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  // `next build` collects page data without runtime secrets; validate for real at boot.
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  const isProd = process.env.NODE_ENV === "production" && !isBuild;

  if (!parsed.success) {
    if (isBuild) {
      // Placeholders let the build proceed. They are never used at runtime
      // because the same module re-validates (and throws) when the server boots.
      return EnvSchema.parse({
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://build:build@localhost:5432/build",
        AUTH_SECRET: process.env.AUTH_SECRET ?? "x".repeat(32),
      });
    }
    const fields = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment variables: ${JSON.stringify(fields)}`);
  }

  if (isProd) {
    const problems = productionProblems(parsed.data);
    if (problems.length) {
      throw new Error(`Unsafe production configuration:\n - ${problems.join("\n - ")}`);
    }
  }
  return parsed.data;
}

export const env = load();

export const isGoogleOAuthEnabled = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
export const isResendEnabled = Boolean(env.RESEND_API_KEY);
export const isCalendarOAuthEnabled = env.CALENDAR_OAUTH_ENABLED === "true";
export const isCalComEnabled = isCalendarOAuthEnabled && Boolean(env.CAL_COM_CLIENT_ID && env.CAL_COM_CLIENT_SECRET);
export const isCalendlyEnabled = isCalendarOAuthEnabled && Boolean(env.CALENDLY_CLIENT_ID && env.CALENDLY_CLIENT_SECRET);
/** True while payments are not implemented: all sessions must be free. */
export const isFreeBeta = env.PAYMENTS_MODE === "free_beta";
