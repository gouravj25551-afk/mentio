// Privacy-safe structured logging. Only an allowlist of non-sensitive fields is
// ever written: ids, codes and counts. Error MESSAGES are dropped on purpose
// because database and mail errors can echo emails, tokens or query values.
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
