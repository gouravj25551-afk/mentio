// Production-only environment rules, kept free of side effects so they can be unit tested.

export const DEV_AUTH_SECRET = "development-only-insecure-secret-change-in-production-32bytes";

const isLocalhost = (value: string) => {
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

/** Problems with variables that must be set explicitly (no dev fallback) when NODE_ENV=production. Never includes values. */
export function productionProblems(raw: Record<string, string | undefined>): string[] {
  const problems: string[] = [];
  const need = (name: string, why: string) => {
    if (!raw[name]) problems.push(`${name}: required in production (${why})`);
  };
  need("DATABASE_URL", "pooled Postgres connection string");
  need("NEXT_PUBLIC_APP_URL", "used for links in emails");
  need("EMAIL_FROM", "sender address for transactional email");
  need("RESEND_API_KEY", "password reset and booking emails are sent through Resend");
  if (!raw.AUTH_SECRET) problems.push("AUTH_SECRET: required in production");
  else if (raw.AUTH_SECRET === DEV_AUTH_SECRET) problems.push("AUTH_SECRET: must not be the development default");
  const appUrl = raw.NEXT_PUBLIC_APP_URL;
  if (appUrl && !appUrl.startsWith("https://") && !isLocalhost(appUrl)) {
    problems.push("NEXT_PUBLIC_APP_URL: must be an https:// URL in production");
  }
  return problems;
}
