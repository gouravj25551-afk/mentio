import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  forgotPasswordAction,
  resendVerificationAction,
  resetPasswordAction,
  signUpAction,
  verifyEmailAction,
} from "@/features/auth/actions";
import { becomeMentorAction } from "@/features/mentors/actions";
import { authorizeCredentials, RateLimiterUnavailable } from "@/lib/auth/credentials";
import { db } from "@/lib/db";
import { limiters } from "@/lib/rate-limit";
import { generateToken, hashToken } from "@/lib/tokens";
import { PASSWORD, createUser, resetDb } from "./helpers/factories";
import { signInAs, testState, tokenFromEmail } from "./helpers/state";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};
const signUp = (email = "sam@example.com") => signUpAction(null, form({ name: "Sam Student", email, password: PASSWORD }));

beforeEach(async () => {
  await resetDb();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("email delivery failures are reported honestly", () => {
  it("sign-up does not say 'check your email' when the mail never left, and resend recovers", async () => {
    testState.emailFails = true;
    const res = await signUp();
    expect(res).toMatchObject({ ok: false, code: "email_delivery_failed" });
    expect(testState.outbox).toHaveLength(0);
    // The account exists but is unverified, so the recovery path is resend.
    expect(await db.user.count({ where: { email: "sam@example.com", emailVerified: null } })).toBe(1);

    testState.emailFails = false;
    const resend = await resendVerificationAction(null, form({ email: "sam@example.com" }));
    expect(resend.ok).toBe(true);
    const token = tokenFromEmail("sam@example.com");
    expect((await verifyEmailAction(null, form({ token }))).ok).toBe(true);
  });

  it("an existing address gets the same failure answer as a new one", async () => {
    await createUser({ email: "taken@example.com" });
    testState.emailFails = true;
    const fresh = await signUp("new@example.com");
    const taken = await signUp("taken@example.com");
    expect(taken).toEqual(fresh);
  });

  it("forgot-password and resend never claim a send, and answer the same for known and unknown emails", async () => {
    await createUser({ email: "known@example.com", verified: false });
    testState.emailFails = true;
    for (const action of [forgotPasswordAction, resendVerificationAction]) {
      const known = await action(null, form({ email: "known@example.com" }));
      const unknown = await action(null, form({ email: "nobody@example.com" }));
      expect(known).toEqual(unknown);
      expect(JSON.stringify(known)).not.toMatch(/we've sent|we have sent|has been sent|email sent/i);
    }
  });

  it("the real sender logs failures without the recipient, link or token", async () => {
    const actual = await vi.importActual<typeof import("@/services/email")>("@/services/email");
    vi.spyOn(actual.mailer, "send").mockRejectedValue(new Error("Resend responded with HTTP 503"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const token = generateToken().token;
    const sent = await actual.sendEmailSafely({
      to: "private.person@example.com",
      subject: "Reset your Mentio password",
      text: `http://localhost:3000/reset-password?token=${token}`,
    });
    expect(sent).toBe(false);
    const output = log.mock.calls.flat().join(" ");
    expect(output).toContain("delivery_failed");
    expect(output).not.toContain(token);
    expect(output).not.toContain("private.person");
    expect(output).not.toContain("reset-password");
  });
});

describe("verification and reset tokens", () => {
  it("an expired verification link is rejected and removed, and it never verifies the user", async () => {
    const user = await createUser({ email: "late@example.com", verified: false });
    const { token, hash } = generateToken();
    await db.verificationToken.create({
      data: { identifier: "late@example.com", token: hash, userId: user.id, expires: new Date(Date.now() - 1000) },
    });
    const res = await verifyEmailAction(null, form({ token }));
    expect(res.ok).toBe(false);
    expect(await db.verificationToken.count({ where: { token: hash } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBeNull();
  });

  it("a used verification link, a garbage link and a short link are all rejected", async () => {
    await signUp();
    const token = tokenFromEmail("sam@example.com");
    expect((await verifyEmailAction(null, form({ token }))).ok).toBe(true);
    expect((await verifyEmailAction(null, form({ token }))).ok).toBe(false);
    expect((await verifyEmailAction(null, form({ token: "x".repeat(43) }))).ok).toBe(false);
    expect((await verifyEmailAction(null, form({ token: "short" }))).ok).toBe(false);
  });

  it("requesting a new verification link invalidates the old one", async () => {
    await signUp();
    const first = tokenFromEmail("sam@example.com");
    await resendVerificationAction(null, form({ email: "sam@example.com" }));
    const second = tokenFromEmail("sam@example.com");
    expect(second).not.toBe(first);
    expect((await verifyEmailAction(null, form({ token: first }))).ok).toBe(false);
    expect((await verifyEmailAction(null, form({ token: second }))).ok).toBe(true);
  });

  it("a reset link cannot be reused after a successful reset, and the old password stays dead", async () => {
    await createUser({ email: "r@example.com" });
    await forgotPasswordAction(null, form({ email: "r@example.com" }));
    const token = tokenFromEmail("r@example.com");
    expect((await resetPasswordAction(null, form({ token, password: "NewPassw0rd1" }))).ok).toBe(true);
    const again = await resetPasswordAction(null, form({ token, password: "Another1Pass" }));
    expect(again.ok).toBe(false);
    expect(await authorizeCredentials({ email: "r@example.com", password: "NewPassw0rd1" }, testState.headers)).not.toBeNull();
    expect(await authorizeCredentials({ email: "r@example.com", password: "Another1Pass" }, testState.headers)).toBeNull();
  });

  it("an expired reset link is rejected and leaves the password unchanged", async () => {
    const user = await createUser({ email: "e@example.com" });
    const { token, hash } = generateToken();
    await db.passwordResetToken.create({ data: { token: hash, userId: user.id, expiresAt: new Date(Date.now() - 1000) } });
    expect((await resetPasswordAction(null, form({ token, password: "NewPassw0rd1" }))).ok).toBe(false);
    expect(await authorizeCredentials({ email: "e@example.com", password: PASSWORD }, testState.headers)).not.toBeNull();
    expect(hashToken(token)).toBe(hash);
  });
});

describe("rate-limit failures", () => {
  it("fail closed with an honest message when the limiter itself is down", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    for (const l of [limiters.signUp, limiters.forgot, limiters.forgotIp, limiters.verify, limiters.reset]) {
      vi.spyOn(l, "check").mockRejectedValue(new Error("connection refused"));
    }

    const signUpRes = await signUp();
    expect(signUpRes).toMatchObject({ ok: false });
    expect((signUpRes as { error: string }).error).not.toMatch(/too many/i);
    expect(await db.user.count()).toBe(0);
    expect(testState.outbox).toHaveLength(0);

    await createUser({ email: "k@example.com" });
    expect((await forgotPasswordAction(null, form({ email: "k@example.com" }))).ok).toBe(false);
    expect((await resendVerificationAction(null, form({ email: "k@example.com" }))).ok).toBe(false);
    expect(await db.passwordResetToken.count()).toBe(0);
    expect(testState.outbox).toHaveLength(0);
    expect((await verifyEmailAction(null, form({ token: "x".repeat(43) }))).ok).toBe(false);
  });

  it("password sign-in is refused (not allowed through) when the limiter is down", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await createUser({ email: "in@example.com" });
    vi.spyOn(limiters.signIn, "check").mockRejectedValue(new Error("db down"));
    await expect(authorizeCredentials({ email: "in@example.com", password: PASSWORD }, testState.headers)).rejects.toBeInstanceOf(
      RateLimiterUnavailable,
    );
  });

  it("sign-up is limited per IP after five attempts", async () => {
    for (let i = 0; i < 5; i++) expect((await signUp(`u${i}@example.com`)).ok).toBe(true);
    const sixth = await signUp("u6@example.com");
    expect(sixth).toMatchObject({ ok: false, error: expect.stringMatching(/too many/i) });
    expect(await db.user.count({ where: { email: "u6@example.com" } })).toBe(0);
  });
});

describe("server actions are not a way around authorization", () => {
  it("becoming a mentor needs a session, and an admin cannot be downgraded by it", async () => {
    signInAs(null);
    await expect(becomeMentorAction()).rejects.toThrow("NEXT_REDIRECT:/sign-in");

    const admin = await createUser({ role: "ADMIN" });
    signInAs(admin.id);
    await expect(becomeMentorAction()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect((await db.user.findUniqueOrThrow({ where: { id: admin.id } })).role).toBe("ADMIN");
    expect(await db.mentorProfile.count({ where: { userId: admin.id } })).toBe(0);
  });
});
