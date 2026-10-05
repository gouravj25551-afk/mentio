// Mutable state the module mocks in tests/setup.ts read from.
export const testState = {
  /** Who `auth()` reports as signed in. */
  userId: null as string | null,
  /** Request headers returned by next/headers. */
  headers: new Headers({ "x-forwarded-for": "203.0.113.10" }),
  /** Every email the app tried to send. */
  outbox: [] as { to: string; subject: string; text: string }[],
};

export function signInAs(userId: string | null) {
  testState.userId = userId;
}

export function setClientIp(ip: string) {
  testState.headers = new Headers({ "x-forwarded-for": ip });
}

/** Extracts the first URL token query value from the latest email to `to`. */
export function lastEmailTo(to: string) {
  return [...testState.outbox].reverse().find((m) => m.to === to);
}

export function tokenFromEmail(to: string, param = "token") {
  const mail = lastEmailTo(to);
  const match = mail?.text.match(new RegExp(`${param}=([A-Za-z0-9_-]+)`));
  if (!match) throw new Error(`No ${param} link in an email to ${to}`);
  return match[1];
}
