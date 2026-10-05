import { beforeEach, describe, expect, it } from "vitest";

import {
  forgotPasswordAction,
  resetPasswordAction,
  signUpAction,
  verifyEmailAction,
} from "@/features/auth/actions";
import { authorizeCredentials, EmailNotVerified, RateLimited } from "@/lib/auth/credentials";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { safeNextPath } from "@/lib/utils";
import { PASSWORD, createUser, resetDb } from "./helpers/factories";
import { lastEmailTo, setClientIp, testState, tokenFromEmail } from "./helpers/state";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

beforeEach(async () => {
  await resetDb();
});

describe("student sign-up, verification and login", () => {
  it("creates an unverified student, emails a link, and blocks login until verified", async () => {
    const res = await signUpAction(null, form({ name: "Sam Student", email: "sam@example.com", password: PASSWORD, role: "STUDENT" }));
    expect(res.ok).toBe(true);

    const user = await db.user.findUniqueOrThrow({ where: { email: "sam@example.com" }, omit: { passwordHash: false } });
    expect(user.role).toBe("STUDENT");
    expect(user.emailVerified).toBeNull();
    // bcrypt, never the plaintext
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(user.passwordHash).not.toContain(PASSWORD);

    await expect(authorizeCredentials({ email: "sam@example.com", password: PASSWORD }, testState.headers)).rejects.toBeInstanceOf(
      EmailNotVerified,
    );

    const token = tokenFromEmail("sam@example.com");
    // Only the hash is stored.
    expect(await db.verificationToken.count({ where: { token } })).toBe(0);
    expect(await db.verificationToken.count({ where: { token: hashToken(token) } })).toBe(1);

    const verified = await verifyEmailAction(null, form({ token }));
    expect(verified.ok).toBe(true);
    const login = await authorizeCredentials({ email: "sam@example.com", password: PASSWORD }, testState.headers);
    expect(login).toMatchObject({ email: "sam@example.com", role: "STUDENT" });
    // The login result must never carry the hash.
    expect(JSON.stringify(login)).not.toContain("passwordHash");
  });

  it("verification links are single-use", async () => {
    await signUpAction(null, form({ name: "Sam Student", email: "sam@example.com", password: PASSWORD }));
    const token = tokenFromEmail("sam@example.com");
    expect((await verifyEmailAction(null, form({ token }))).ok).toBe(true);
    expect((await verifyEmailAction(null, form({ token }))).ok).toBe(false);
  });

  it("rejects wrong passwords and unknown emails identically", async () => {
    const user = await createUser({ email: "real@example.com" });
    const wrong = await authorizeCredentials({ email: user.email, password: "Wrong-pass-1" }, testState.headers);
    const unknown = await authorizeCredentials({ email: "ghost@example.com", password: "Wrong-pass-1" }, testState.headers);
    expect(wrong).toBeNull();
    expect(unknown).toBeNull();
  });

  it("rate-limits password guessing per email, even via a different IP", async () => {
    await createUser({ email: "target@example.com" });
    for (let i = 0; i < 10; i++) {
      setClientIp(`198.51.100.${i}`);
      await authorizeCredentials({ email: "target@example.com", password: "nope-nope-1A" }, testState.headers);
    }
    setClientIp("198.51.100.200");
    await expect(
      authorizeCredentials({ email: "target@example.com", password: PASSWORD }, testState.headers),
    ).rejects.toBeInstanceOf(RateLimited);
  });

  it("rejects weak passwords with a useful message", async () => {
    const res = await signUpAction(null, form({ name: "Sam", email: "sam@example.com", password: "short" }));
    expect(res).toMatchObject({ ok: false });
    expect(await db.user.count()).toBe(0);
  });
});

describe("mentor sign-up", () => {
  it("creates a PENDING mentor profile that is not publicly bookable", async () => {
    await signUpAction(null, form({ name: "Mia Mentor", email: "mia@example.com", password: PASSWORD, role: "MENTOR" }));
    const user = await db.user.findUniqueOrThrow({ where: { email: "mia@example.com" }, include: { mentorProfile: true } });
    expect(user.role).toBe("MENTOR");
    expect(user.mentorProfile?.status).toBe("PENDING");
  });

  it("cannot sign up as ADMIN by tampering with the role field", async () => {
    const res = await signUpAction(null, form({ name: "Evil Admin", email: "evil@example.com", password: PASSWORD, role: "ADMIN" }));
    expect(res.ok).toBe(false);
    expect(await db.user.count({ where: { email: "evil@example.com" } })).toBe(0);
  });
});

describe("user enumeration", () => {
  it("sign-up gives the same response for a new and an existing email", async () => {
    await createUser({ email: "taken@example.com" });
    const existing = await signUpAction(null, form({ name: "Someone", email: "taken@example.com", password: PASSWORD }));
    const fresh = await signUpAction(null, form({ name: "Someone", email: "fresh@example.com", password: PASSWORD }));
    expect(existing).toEqual(fresh);
    // The real owner is told by email instead.
    expect(lastEmailTo("taken@example.com")?.subject).toMatch(/already have/i);
    expect(await db.user.count({ where: { email: "taken@example.com" } })).toBe(1);
  });

  it("forgot-password gives the same response for known and unknown emails", async () => {
    await createUser({ email: "known@example.com" });
    const known = await forgotPasswordAction(null, form({ email: "known@example.com" }));
    const unknown = await forgotPasswordAction(null, form({ email: "unknown@example.com" }));
    expect(known).toEqual(unknown);
    expect(lastEmailTo("unknown@example.com")).toBeUndefined();
  });
});

describe("password reset", () => {
  it("emails a link, stores only a hash, resets once, and the new password works", async () => {
    const user = await createUser({ email: "forgetful@example.com" });
    await forgotPasswordAction(null, form({ email: user.email }));

    const token = tokenFromEmail(user.email);
    expect(await db.passwordResetToken.count({ where: { token } })).toBe(0);
    expect(await db.passwordResetToken.count({ where: { token: hashToken(token) } })).toBe(1);

    const newPassword = "Brand-New-Pass-9";
    const done = await resetPasswordAction(null, form({ token, password: newPassword }));
    expect(done.ok).toBe(true);

    expect(await authorizeCredentials({ email: user.email, password: newPassword }, testState.headers)).not.toBeNull();
    expect(await authorizeCredentials({ email: user.email, password: PASSWORD }, testState.headers)).toBeNull();

    // Reusing the link fails.
    const again = await resetPasswordAction(null, form({ token, password: "Another-Pass-1" }));
    expect(again.ok).toBe(false);
  });

  it("rejects expired and garbage tokens", async () => {
    const user = await createUser({ email: "late@example.com" });
    await forgotPasswordAction(null, form({ email: user.email }));
    const token = tokenFromEmail(user.email);
    await db.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await resetPasswordAction(null, form({ token, password: "Another-Pass-1" }))).ok).toBe(false);
    expect((await resetPasswordAction(null, form({ token: "x".repeat(40), password: "Another-Pass-1" }))).ok).toBe(false);
  });

  it("only the newest reset link works", async () => {
    const user = await createUser({ email: "twice@example.com" });
    await forgotPasswordAction(null, form({ email: user.email }));
    const first = tokenFromEmail(user.email);
    await forgotPasswordAction(null, form({ email: user.email }));
    const second = tokenFromEmail(user.email);
    expect((await resetPasswordAction(null, form({ token: first, password: "Another-Pass-1" }))).ok).toBe(false);
    expect((await resetPasswordAction(null, form({ token: second, password: "Another-Pass-1" }))).ok).toBe(true);
  });

  it("two simultaneous uses of one link: exactly one wins", async () => {
    const user = await createUser({ email: "race@example.com" });
    await forgotPasswordAction(null, form({ email: user.email }));
    const token = tokenFromEmail(user.email);
    const results = await Promise.all([
      resetPasswordAction(null, form({ token, password: "Racer-Pass-1A" })),
      resetPasswordAction(null, form({ token, password: "Racer-Pass-2B" })),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });
});

describe("safeNextPath (open-redirect guard)", () => {
  it.each([
    ["/dashboard/student", "/dashboard/student"],
    ["//evil.example", "/dashboard"],
    ["https://evil.example", "/dashboard"],
    ["/\\evil.example", "/dashboard"],
    ["javascript:alert(1)", "/dashboard"],
    [null, "/dashboard"],
  ])("%s -> %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
