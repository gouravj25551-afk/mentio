import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { hashSignupCode } from "@/lib/signup-code";
import { readWaitlistConfirmation, WAITLIST_CONFIRMATION_COOKIE } from "@/lib/waitlist-confirmation";
import { resetDb, createUser } from "./helpers/factories";
import type { testState as TestState } from "./helpers/state";

const email = "join@example.com";
let state: typeof TestState;
let waitlistActions: Promise<typeof import("@/features/auth/waitlist-actions")> | undefined;
const codeFromEmail = () => {
  const message = state.outbox.at(-1)?.text;
  const code = message?.match(/verification code is (\d{6})/)?.[1];
  if (!code) throw new Error("No verification code was delivered");
  return code;
};

async function actions() {
  if (!waitlistActions) {
    vi.resetModules();
    process.env.WAITLIST_MODE = "true";
    state = (await import("./helpers/state")).testState;
    waitlistActions = import("@/features/auth/waitlist-actions");
  }
  state.outbox.length = 0;
  state.cookies.clear();
  state.emailFails = false;
  return waitlistActions;
}

beforeEach(async () => { await resetDb(); });
afterEach(() => {
  process.env.WAITLIST_MODE = "false";
  vi.restoreAllMocks();
});

describe("prelaunch waitlist email verification", () => {
  it("sends a code, stores only its keyed digest, and confirms a new student once", async () => {
    const { requestWaitlistCode, verifyWaitlistCode } = await actions();
    expect(await requestWaitlistCode(email)).toEqual({ ok: true });
    const code = codeFromEmail();
    const saved = await db.verificationToken.findFirstOrThrow({ where: { identifier: `signup-code:${email}` } });
    expect(saved.token).toBe(hashSignupCode(email, code));
    expect(saved.token).not.toBe(code);
    expect(await verifyWaitlistCode(email, code, "STUDENT")).toEqual({ ok: true });
    expect(await db.user.findUnique({ where: { email }, select: { role: true, emailVerified: true, passwordHash: true } })).toMatchObject({ role: "STUDENT", emailVerified: expect.any(Date), passwordHash: null });
    expect(readWaitlistConfirmation(state.cookies.get(WAITLIST_CONFIRMATION_COOKIE))).toBe(email);
    expect(await verifyWaitlistCode(email, code, "STUDENT")).toMatchObject({ ok: false });
  });

  it("keeps an existing admin's role while verifying their address", async () => {
    const user = await createUser({ email, role: "ADMIN", verified: false });
    const { requestWaitlistCode, verifyWaitlistCode } = await actions();
    expect(await requestWaitlistCode(email)).toEqual({ ok: true });
    expect(await verifyWaitlistCode(email, codeFromEmail(), "MENTOR")).toEqual({ ok: true });
    expect(await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { role: true, emailVerified: true } })).toMatchObject({ role: "ADMIN", emailVerified: expect.any(Date) });
  });

  it("rejects an expired code and an invalid role", async () => {
    const { requestWaitlistCode, verifyWaitlistCode } = await actions();
    expect(await requestWaitlistCode(email)).toEqual({ ok: true });
    const code = codeFromEmail();
    expect(await verifyWaitlistCode(email, code, "ADMIN")).toMatchObject({ ok: false });
    await db.verificationToken.updateMany({ where: { identifier: `signup-code:${email}` }, data: { expires: new Date(Date.now() - 1000) } });
    expect(await verifyWaitlistCode(email, code, "STUDENT")).toMatchObject({ ok: false });
    expect(await db.user.count()).toBe(0);
  });

  it("replaces old codes and reports failed email delivery honestly", async () => {
    const { requestWaitlistCode, verifyWaitlistCode } = await actions();
    expect(await requestWaitlistCode(email)).toEqual({ ok: true });
    const first = codeFromEmail();
    expect(await requestWaitlistCode(email)).toEqual({ ok: true });
    const second = codeFromEmail();
    expect(await verifyWaitlistCode(email, first, "STUDENT")).toMatchObject({ ok: false });
    expect(await verifyWaitlistCode(email, second, "MENTOR")).toEqual({ ok: true });
    state.emailFails = true;
    expect(await requestWaitlistCode("fail@example.com")).toMatchObject({ ok: false, error: expect.stringMatching(/couldn't send/i) });
    expect(await db.verificationToken.count({ where: { identifier: "signup-code:fail@example.com" } })).toBe(0);
  });
});
