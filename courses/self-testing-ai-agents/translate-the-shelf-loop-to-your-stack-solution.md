---
title: 'Translate the Shelf Loop to Your Stack: Solution'
description: Example filled-in translation for a Next.js + Prisma + Jest stack, with guidance on evaluating your own translation.
modified: 2026-04-14
date: 2026-04-10
---

This lab doesn't have shipped code. It has a shipped _process_—you create a `LOOP_TRANSLATION.md` that maps every Shelf feedback loop to the equivalent in your stack. The deliverable is yours.

But "map each loop to your stack" is the kind of instruction that produces either something extremely useful or a table full of hand-waving, depending on whether you've seen a good example. So, here's a filled-in translation for a hypothetical Next.js + Prisma + Jest stack, followed by the judgment criteria for evaluating any translation—including your own.

## Expected experience walkthrough

### The example translation

Imagine you're translating Shelf's loops to a Next.js 16 app with Prisma, Jest for unit tests, Playwright for browser tests, and GitHub Actions for CI. Here's what the filled-in `LOOP_TRANSLATION.md` looks like:

```markdown
# Loop Translation: Next.js + Prisma + Jest

## Agent instructions

- **Shelf:** `CLAUDE.md` in the repo root. Covers route protection, testing rules,
  locator hierarchy, database seeding, and forbidden patterns.
- **This stack:** `CLAUDE.md` in the repo root. Same idea. Covers API route
  authentication (check `getServerSession` in every `/api/*` handler), testing
  rules (Jest unit + Playwright browser), and forbidden patterns (no `any` in
  production code, no `getByTestId` when a role locator exists).
- **Exact path:** `CLAUDE.md`
- **Command:** N/A (read by agent, not executed)

## Unit and integration tests

- **Shelf:** Vitest, test files colocated as `<name>.test.ts`, run with
  `npm run test:unit`.
- **This stack:** Jest, test files colocated as `<name>.test.ts` under `__tests__/`
  directories, run with `npm test`.
- **Exact path:** `jest.config.ts`, `src/**/__tests__/*.test.ts`
- **Command:** `npm test`

## Browser-level verification

- **Shelf:** Playwright, specs in `tests/`, config in
  `playwright.config.ts`, run with `npm run test`.
- **This stack:** Playwright, specs in `e2e/`, config in `playwright.config.ts`,
  run with `npx playwright test`.
- **Exact path:** `playwright.config.ts`, `e2e/*.spec.ts`
- **Command:** `npx playwright test`

## Auth bootstrap

- **Shelf:** `tests/authentication.setup.ts` drives the login form once,
  saves storage state to `playwright/.authentication/user.json`. All authenticated
  specs inherit it via `storageState`.
- **This stack:** `e2e/global-setup.ts` calls the Auth.js `/api/auth/callback`
  endpoint directly to create a session, saves the cookies to
  `e2e/.auth/storage-state.json`. Playwright config references it in
  `use.storageState`.
- **Exact path:** `e2e/global-setup.ts`, `e2e/.auth/storage-state.json`
- **Command:** Runs automatically as part of `npx playwright test`

## Deterministic data reset

- **Shelf:** `resetShelfContent` in `tests/helpers/seed.ts`, built from
  `tests/data/*.json` and small server utilities like `createUser` and
  `createBook`. Resets books and ratings without touching users.
- **This stack:** `prisma/seed.ts` with a `resetTestData` function that truncates
  the `Book`, `Review`, and `Shelf` tables. Called via a test-only API route
  `/api/testing/reset` gated on `NODE_ENV=test`. User table untouched.
- **Exact path:** `prisma/seed.ts`, `src/app/api/testing/reset/route.ts`
- **Command:** `curl -X POST http://localhost:3000/api/testing/reset`

## Runtime probes

- **Shelf:** `tests/performance.spec.ts` checks runtime metrics.
  `scripts/check-performance-budgets.mjs` checks bundle size.
- **This stack:** No runtime probes yet. Lighthouse CI in the CI pipeline checks
  performance scores but there are no Playwright-based runtime assertions.
- **Exact path:** `.lighthouserc.js` (exists), runtime probe spec (missing)
- **Command:** `npx lhci autorun`

## Failure dossier artifacts

- **Completed Shelf loop:** after the dossier lab, `scripts/summarize-failure-dossier.ts`
  reads `playwright-report/report.json` and generates
  `playwright-report/dossier.md` with error, screenshot path, trace path, and
  reproduction command for every failing test.
- **This stack:** No dossier. Playwright HTML report exists but there's no structured
  summary an agent can read without opening a browser.
- **Exact path:** Missing. Proposed: `scripts/dossier.ts`
- **Command:** Missing. Proposed: `npm run dossier`

## Static layer

- **Shelf:** ESLint with custom rules banning `waitForTimeout`, raw `page.locator`,
  `waitForLoadState('networkidle')`, and reading `userId` from the request body.
  TypeScript strict mode. Knip for dead code. Prettier for formatting.
- **This stack:** ESLint with `@next/eslint-plugin-next`. TypeScript strict mode.
  Prettier. No custom lint rules for test patterns. No dead-code detection.
- **Exact path:** `eslint.config.mjs`, `tsconfig.json`
- **Command:** `npm run lint && npx tsc --noEmit`

## CI workflow

- **Shelf:** `.github/workflows/main.yml` runs typecheck, lint, Knip, unit tests,
  and Playwright on every PR.
- **This stack:** `.github/workflows/ci.yml` runs lint, type check, Jest, and
  Playwright. No dead-code check.
- **Exact path:** `.github/workflows/main.yml`
- **Command:** `npm run lint && npx tsc --noEmit && npm test && npx playwright test`

## Post-deploy smoke checks

- **Shelf:** `tests/smoke/post-deploy.spec.ts` with `playwright.smoke.config.ts`.
  Reads `SMOKE_BASE_URL` from env. `docs/post-deploy-playbook.md` documents
  rollback triggers.
- **This stack:** No post-deploy smoke. Vercel preview deployments exist but nothing
  tests them automatically.
- **Exact path:** Missing. Proposed: `e2e/smoke/post-deploy.spec.ts`,
  `playwright.smoke.config.ts`
- **Command:** Missing. Proposed:
  `SMOKE_BASE_URL=https://preview.example.com npx playwright test --config=playwright.smoke.config.ts`

## Review loop

- **Shelf:** `docs/review-loop-playbook.md` defines blocking/judgment/noise
  categories. `.cursor/BUGBOT.md` instructs Bugbot. Rule of three escalation.
- **This stack:** No written review policy. Copilot review is enabled but has no
  repository-specific instructions.
- **Exact path:** Missing. Proposed: `docs/review-loop-playbook.md`,
  `.github/copilot-instructions.md`
- **Command:** N/A (process, not executable)

## Weakest loop

**Failure dossier artifacts.** When a Playwright test fails in CI, the HTML report
uploads but nobody reads it because it requires opening a browser. There's no
structured summary an agent (or a human in a hurry) can scan in plain text. This
means every CI failure requires manual investigation to even understand _what_
failed, let alone _why_.

## First concrete improvement

Add `scripts/dossier.ts` that reads `playwright-report/report.json`, extracts the
failing test name, error message, screenshot path, and trace path, and writes a
`playwright-report/dossier.md`. Add `"dossier": "tsx scripts/dossier.ts"` to
`package.json`. Update the CI workflow to run `npm run dossier` after a failed
Playwright step and upload the dossier as an artifact alongside the HTML report.
```

That's the shape. Every row has four parts: what Shelf does, what the target stack does, the exact path, and the command. Where something is missing, the row says "Missing" and proposes the specific file or command that would fill the gap.

### What makes this example useful

It's not the Next.js specifics—those are just a vehicle. It's the _discipline_ of writing exact paths and commands instead of concepts. "We use Jest" is not a translation. "`npm test` runs `jest.config.ts` which picks up `src/**/__tests__/*.test.ts`" is a translation. The difference is that the second version is something an agent can actually execute.

The weakest-loop identification is the part most people skip, and it's the most valuable part. Naming the weakest loop is naming the first thing to fix. If the translation doesn't make you slightly uncomfortable about one specific gap, you probably glossed over it.

## Judgment criteria

Your translation is good when:

- **Every Shelf loop has a mapped row.** Not "we don't need that one"—every loop gets a row, even if the row says "Missing. Proposed: ..."
- **Exact paths and commands appear in every row.** If a row says "we use ESLint" but doesn't say which config file or which command, it's not a translation—it's a vibe.
- **Missing loops are explicit, not hidden.** "No post-deploy smoke" is useful. Silence on the topic is not.
- **The weakest loop is identified and named.** Not "we could improve several things." One loop. The weakest one. Named.
- **One concrete first improvement is specific enough to execute.** "Add better testing" is not actionable. "Add `scripts/dossier.ts` that reads the Playwright JSON report and produces a plain-text summary" is actionable.
- **At least one command has been run.** Running `npm test` and seeing it pass is proof of life. Running nothing is architecture fiction.

The translation is _not_ good when it's a symmetric table where every cell says "Same." If your stack genuinely does everything Shelf does, you're either lucky or you're not looking closely enough.

## Additional Reading

- [Lab: Translate the Shelf Loop to Your Stack](lab-translate-the-shelf-loop-to-your-stack.md)
- [Porting the Shelf Loop to Another Stack](porting-the-shelf-loop-to-another-stack.md)
