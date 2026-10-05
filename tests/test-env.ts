// Shared by global setup and the per-file setup. Tests truncate tables, so the
// database MUST be a dedicated test database: refuse anything else.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://mentio@127.0.0.1:54329/mentio_test?schema=public";

export function assertTestDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(name)) {
    throw new Error(`Refusing to run tests against database "${name}": its name must contain "test".`);
  }
}
