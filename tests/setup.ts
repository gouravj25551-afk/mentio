import { afterAll, beforeEach, vi } from "vitest";
import { TEST_DATABASE_URL, assertTestDatabase } from "./test-env";

assertTestDatabase(TEST_DATABASE_URL);
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: TEST_DATABASE_URL,
  AUTH_SECRET: "test-secret-test-secret-test-secret-123456",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
});

vi.mock("next/headers", async () => {
  const { testState } = await import("./helpers/state");
  return { headers: async () => testState.headers, cookies: async () => new Map() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/lib/auth", async () => {
  const { testState } = await import("./helpers/state");
  return {
    auth: async () => (testState.userId ? { user: { id: testState.userId } } : null),
    signIn: vi.fn(),
    signOut: vi.fn(),
    handlers: {},
  };
});
vi.mock("@/services/email", async () => {
  const { testState } = await import("./helpers/state");
  const send = async (msg: { to: string; subject: string; text: string }) => {
    testState.outbox.push(msg);
    return { id: "test" };
  };
  return {
    mailer: { send },
    sendEmailSafely: async (msg: { to: string; subject: string; text: string }) => {
      if (testState.emailFails) return false;
      await send(msg);
      return true;
    },
    appUrl: (path: string) => `http://localhost:3000${path}`,
  };
});

beforeEach(async () => {
  const { testState } = await import("./helpers/state");
  testState.userId = null;
  testState.outbox.length = 0;
  testState.emailFails = false;
  testState.headers = new Headers({ "x-forwarded-for": "203.0.113.10" });
});

afterAll(async () => {
  const { db } = await import("@/lib/db");
  await db.$disconnect();
});
