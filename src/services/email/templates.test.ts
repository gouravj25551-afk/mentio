import { test } from "node:test";
import assert from "node:assert/strict";
import {
  absoluteUrl,
  bookingCancelledEmail,
  bookingConfirmedEmail,
  mentorApprovedEmail,
  mentorRejectedEmail,
  passwordResetEmail,
} from "./templates";

test("absoluteUrl joins without doubling slashes", () => {
  assert.equal(absoluteUrl("https://a.example/", "/reset-password?token=t"), "https://a.example/reset-password?token=t");
  assert.equal(absoluteUrl("https://a.example", "dashboard"), "https://a.example/dashboard");
});

test("password reset email carries the link in text and html", () => {
  const url = "https://a.example/reset-password?token=abc123";
  const mail = passwordResetEmail({ name: "Asha", resetUrl: url });
  assert.match(mail.subject, /reset/i);
  assert.ok(mail.text?.includes(url));
  assert.ok(mail.html?.includes(url));
});

test("user-supplied text is escaped in html", () => {
  const mail = bookingConfirmedEmail({
    recipientName: "<b>Eve</b>",
    otherPartyName: "Sam",
    role: "student",
    startsAt: new Date("2030-01-01T10:00:00Z"),
    topic: "<script>alert(1)</script>",
    bookingUrl: "https://a.example/b/1",
  });
  assert.ok(!mail.html?.includes("<script>"));
  assert.ok(mail.html?.includes("&lt;script&gt;"));
});

test("booking emails show the time in IST", () => {
  const mail = bookingConfirmedEmail({
    role: "mentor",
    startsAt: new Date("2030-01-01T10:00:00Z"), // 15:30 IST
    topic: "Resume review",
    bookingUrl: "https://a.example/b/1",
  });
  assert.ok(mail.text?.includes("3:30"));
  assert.ok(mail.text?.includes("IST"));
});

test("cancellation email includes the reason only when given", () => {
  const base = { startsAt: new Date("2030-01-01T10:00:00Z"), topic: "t", bookingUrl: "https://a.example/b/1" };
  assert.ok(bookingCancelledEmail({ ...base, reason: "Sick" }).text?.includes("Reason: Sick"));
  assert.ok(!bookingCancelledEmail(base).text?.includes("Reason:"));
});

test("mentor decision emails", () => {
  assert.match(mentorApprovedEmail({ name: "Ravi", dashboardUrl: "https://a.example/dashboard/mentor" }).subject, /approved/i);
  assert.ok(!mentorRejectedEmail({ name: "Ravi" }).html?.includes("href"));
});
