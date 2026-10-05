import { test } from "node:test";
import assert from "node:assert/strict";
import { PAYMENTS_ENABLED, displayPrice, paiseToRupees, rupeesToPaise } from "./pricing";
import { mentorProfileSchema, signUpSchema } from "./validators";

test("payments are off, so public pages never show a price", () => {
  assert.equal(PAYMENTS_ENABLED, false);
  assert.equal(displayPrice(50000, "INR"), "Early access");
});

test("rupees and paise convert both ways", () => {
  assert.equal(rupeesToPaise(499.5), 49950);
  assert.equal(paiseToRupees(49950), 499.5);
});

const profile = {
  headline: "Senior engineer at a startup",
  bio: "b".repeat(50),
  experience: "e".repeat(30),
  rateCents: 50000,
  categoryIds: ["c1"],
};

test("mentor pricing is always INR", () => {
  assert.equal(mentorProfileSchema.parse(profile).currency, "INR");
  assert.equal(mentorProfileSchema.safeParse({ ...profile, currency: "USD" }).success, false);
});

test("sign-up cannot request the ADMIN role", () => {
  const base = { name: "Asha Rao", email: "asha@example.com", password: "Passw0rdOK" };
  assert.equal(signUpSchema.safeParse({ ...base, role: "ADMIN" }).success, false);
  assert.equal(signUpSchema.parse({ ...base, role: "MENTOR" }).role, "MENTOR");
  assert.equal(signUpSchema.parse(base).role, "STUDENT");
});
