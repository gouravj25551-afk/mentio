import { test } from "node:test";
import assert from "node:assert/strict";
import { DEV_AUTH_SECRET, productionProblems } from "./env-checks";

const good = {
  DATABASE_URL: "postgresql://u:p@host:6543/db",
  AUTH_SECRET: "x".repeat(40),
  NEXT_PUBLIC_APP_URL: "https://mentio.example",
  EMAIL_FROM: "Mentio <hello@mentio.example>",
  RESEND_API_KEY: "re_test",
};

test("a complete production env has no problems", () => {
  assert.deepEqual(productionProblems(good), []);
});

test("missing required variables are reported by name", () => {
  const problems = productionProblems({});
  for (const name of ["DATABASE_URL", "AUTH_SECRET", "NEXT_PUBLIC_APP_URL", "EMAIL_FROM", "RESEND_API_KEY"]) {
    assert.ok(problems.some((p) => p.startsWith(name)), `${name} should be reported`);
  }
});

test("the development AUTH_SECRET is rejected", () => {
  assert.ok(productionProblems({ ...good, AUTH_SECRET: DEV_AUTH_SECRET }).some((p) => p.startsWith("AUTH_SECRET")));
});

test("the app URL must be https unless it is localhost", () => {
  assert.ok(productionProblems({ ...good, NEXT_PUBLIC_APP_URL: "http://mentio.example" }).length > 0);
  assert.deepEqual(productionProblems({ ...good, NEXT_PUBLIC_APP_URL: "http://localhost:3000" }), []);
});

test("problem messages never contain secret values", () => {
  const out = productionProblems({ ...good, AUTH_SECRET: DEV_AUTH_SECRET, NEXT_PUBLIC_APP_URL: "http://secret-host.example" }).join("\n");
  assert.ok(!out.includes(DEV_AUTH_SECRET));
  assert.ok(!out.includes("secret-host.example"));
});
