import { describe, expect, it, vi } from "vitest";
import { logEvent, maskEmail, redact } from "./log";

describe("privacy-safe logging", () => {
  it("masks email addresses", () => {
    expect(maskEmail("jane.doe@example.com")).toBe("j***@e***.com");
    expect(redact("failed for jane@example.com")).not.toContain("jane@");
  });

  it("scrubs token query params and long opaque strings", () => {
    const token = "abcDEF123_-abcDEF123_-abcDEF123_-abcDEF123_-xyz";
    const out = redact(`GET /verify-email?token=${token}&x=1 and ${token}`);
    expect(out).not.toContain(token);
  });

  it("drops sensitive keys entirely and never prints them", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logEvent("email", "delivery_failed", {
      status: 502,
      password: "hunter2hunter2",
      token: "t".repeat(40),
      text: "reset link http://x/reset-password?token=abc",
      to: "jane@example.com",
      error: new Error("Resend responded with HTTP 502"),
    });
    const line = spy.mock.calls[0][0] as string;
    spy.mockRestore();
    expect(line).not.toMatch(/hunter2|reset-password|jane@/);
    expect(JSON.parse(line)).toMatchObject({ scope: "email", event: "delivery_failed", status: 502, to: "j***@e***.com" });
  });
});
