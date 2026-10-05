import { describe, expect, it } from "vitest";
import { productionProblems, type Env } from "@/lib/env";

const good: Env = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://u:p@db.example.com:5432/mentio",
  AUTH_SECRET: "k3Jx9Qm2vN8sTzL4pRw7YbHc1DfGa6Ue0Xo5",
  AUTH_URL: undefined,
  NEXT_PUBLIC_APP_URL: "https://mentio.example.com",
  AUTH_GOOGLE_ID: undefined,
  AUTH_GOOGLE_SECRET: undefined,
  EMAIL_FROM: "Mentio <noreply@mentio.example.com>",
  RESEND_API_KEY: "re_live_123",
  PAYMENTS_MODE: "free_beta",
  CALENDAR_OAUTH_ENABLED: "false",
  CAL_COM_CLIENT_ID: undefined,
  CAL_COM_CLIENT_SECRET: undefined,
  CALENDLY_CLIENT_ID: undefined,
  CALENDLY_CLIENT_SECRET: undefined,
  TOKEN_ENCRYPTION_KEY: undefined,
};

describe("production environment validation", () => {
  it("accepts a safe configuration", () => {
    expect(productionProblems(good)).toEqual([]);
  });

  it("rejects development placeholder secrets", () => {
    expect(productionProblems({ ...good, AUTH_SECRET: "development-only-insecure-secret-change-in-production-32bytes" })).toHaveLength(1);
    expect(productionProblems({ ...good, AUTH_SECRET: "local-dev-secret-local-dev-secret-0123456789" })).toHaveLength(1);
  });

  it("requires https and a mail provider so reset emails are really sent", () => {
    const problems = productionProblems({ ...good, NEXT_PUBLIC_APP_URL: "http://mentio.example.com", RESEND_API_KEY: undefined });
    expect(problems).toHaveLength(2);
  });

  it("requires an encryption key and credentials before calendar OAuth can be enabled", () => {
    const problems = productionProblems({ ...good, CALENDAR_OAUTH_ENABLED: "true" });
    expect(problems.join(" ")).toMatch(/TOKEN_ENCRYPTION_KEY/);
    expect(problems.join(" ")).toMatch(/credentials/);
  });
});
