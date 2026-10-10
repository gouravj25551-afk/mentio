# Dependency advisories

`npm audit --omit=dev` on 2026-10-10 (after removing unused packages): 9 findings, 0 critical, 6 high, 3 moderate.

| Advisory chain | Path | Fix | Status |
| --- | --- | --- | --- |
| `postcss` (XSS in stringify, sourcemap file read) | `next` bundles its own `postcss` | `next@16` (major) | Separate upgrade PR |
| `braces` → `micromatch` → `fast-glob`, `chokidar` (ReDoS / stack exhaustion on crafted glob patterns) | `tailwindcss@3` | `tailwindcss@4` (major) | Separate upgrade PR |
| `postcss-selector-parser` (quadratic parsing) | `tailwindcss@3` → `postcss-nested` | `tailwindcss@4` (major) | Separate upgrade PR |

All remaining findings sit in build-time CSS tooling: they parse our own source files and CSS at build time, not user input at runtime.
The `postcss` path via Next is also build-time. Do not run `npm audit fix --force`; it jumps two majors at once.

Already resolved: critical `seroval` / `solid-js` (arrived only through the unused `@tanstack/react-query-devtools`, now removed).

CI runs `npm audit --omit=dev --audit-level=critical`, so a new critical advisory fails the build.
