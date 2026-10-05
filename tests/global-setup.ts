import { execSync } from "node:child_process";
import { TEST_DATABASE_URL, assertTestDatabase } from "./test-env";

// Applies the real migration history to an empty test database, so the suite
// also proves the migrations (including the CHECK / EXCLUDE constraints) work.
export default function setup() {
  assertTestDatabase(TEST_DATABASE_URL);
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  execSync("npx prisma migrate reset --force --skip-generate --skip-seed", { env, stdio: "pipe" });
}
