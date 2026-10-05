import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` throws outside a React Server environment.
      "server-only": path.resolve(__dirname, "tests/helpers/empty.ts"),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // All integration tests share one Postgres database, so run files one at a time.
    fileParallelism: false,
    // next-auth imports "next/server" without an extension, which Node ESM can only resolve once bundled.
    server: { deps: { inline: ["next-auth", "@auth/core", "@auth/prisma-adapter"] } },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
