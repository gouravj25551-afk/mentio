// Privacy-safe structured logging for auth, email and rate-limit failures.
//
// Never pass passwords, tokens or message bodies here. As a backstop, values
// under sensitive keys are dropped, email addresses are masked, and anything
// that looks like a one-time token or a link carrying one is scrubbed.

const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|cookie|text|html|body|subject|link|url/i;
const EMAIL = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9])[A-Za-z0-9.-]*(\.[A-Za-z]{2,})/g;
const TOKEN_PARAM = /([?&](?:token|code)=)[^&\s"']+/gi;
const LONG_SECRET = /\b[A-Za-z0-9_-]{32,}\b/g;

/** `jane.doe@example.com` -> `j***@e***.com` */
export function maskEmail(value: string): string {
  return value.replace(EMAIL, "$1***@$2***$3");
}

export function redact(value: unknown): string {
  const raw = value instanceof Error ? value.message : typeof value === "string" ? value : String(value);
  return maskEmail(raw).replace(TOKEN_PARAM, "$1[redacted]").replace(LONG_SECRET, "[redacted]").slice(0, 300);
}

type Fields = Record<string, string | number | boolean | null | undefined | Error>;

export function logEvent(scope: "auth" | "email" | "rate-limit", event: string, fields: Fields = {}) {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (SENSITIVE_KEY.test(key)) continue;
    safe[key] = typeof value === "string" || value instanceof Error ? redact(value) : value;
  }
  console.error(JSON.stringify({ level: "error", scope, event, ...safe }));
}
