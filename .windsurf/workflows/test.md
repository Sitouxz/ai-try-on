---
description: Run the ChromaMe test suite (unit + e2e + lint + typecheck)
---

1. From `web/`, run typecheck: `npx tsc --noEmit`.
// turbo
2. Run lint: `npm run lint`.
// turbo
3. Run unit tests: `npx vitest run`.
// turbo
4. Run Playwright e2e (requires dev server or `playwright.config.ts` to start one): `npx playwright test`.
5. Validate Prisma schema: `npx prisma validate`.
