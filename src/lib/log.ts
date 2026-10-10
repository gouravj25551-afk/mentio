// Privacy-safe structured logging, shared by auth/email/rate-limit (logEvent) and booking/API (logError, logWarn).
// Never pass passwords, tokens or message bodies. Both helpers drop or mask anything sensitive.

// ---- auth / email / rate-limit ----

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

type EventFields = Record<string, string | number | boolean | null | undefined | Error>;

export function logEvent(scope: "auth" | "email" | "rate-limit", event: string, fields: EventFields = {}) {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (SENSITIVE_KEY.test(key)) continue;
    safe[key] = typeof value === "string" || value instanceof Error ? redact(value) : value;
  }
  console.error(JSON.stringify({ level: "error", scope, event, ...safe }));
}

// ---- booking / API ----
// logError/logWarn write only an allowlist of ids, codes and counts. Error MESSAGES are
// dropped on purpose because database and mail errors can echo emails, tokens or query values.
const SAFE_FIELDS = new Set([
  "bookingId", "mentorProfileId", "userId", "actorId", "status", "code", "count", "route", "action", "reason",
]);

type Fields = Record<string, string | number | boolean | null | undefined>;

/** Reduces any thrown value to a name and a code, never its message or stack. */
export function describeError(err: unknown): { errorName: string; errorCode?: string } {
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code;
    return { errorName: err.name, ...(typeof code === "string" ? { errorCode: code } : {}) };
  }
  return { errorName: typeof err };
}

export function logError(event: string, err: unknown, fields: Fields = {}) {
  write("error", event, { ...pick(fields), ...describeError(err) });
}

export function logWarn(event: string, fields: Fields = {}) {
  write("warn", event, pick(fields));
}

function pick(fields: Fields): Fields {
  return Object.fromEntries(Object.entries(fields).filter(([k]) => SAFE_FIELDS.has(k)));
}

function write(level: "error" | "warn", event: string, fields: Fields) {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else console.warn(line);
}
