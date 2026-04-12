---
title: 'Add Post-Deploy Smoke Checks to Shelf: Solution'
description: Walkthrough of the shipped smoke test, dedicated config, playbook, and the gap between local preview and a real hosted target.
modified: 2026-04-12
date: 2026-04-10
---

The smoke test is the smallest test in the repository. That's the point. Everything else in the suite proves the application _works_. This one proves the application _shipped_.

## What the shipped repo shows

Three files land in Shelf. Let's walk each one.

### `tests/smoke/post-deploy.spec.ts`

```ts
import { expect, test } from '@playwright/test';

const smokeBaseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';

test.use({ baseURL: smokeBaseUrl });

test('home page renders and exposes sign in', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Sign in' })).toBeVisible();
});
```

Two assertions. That's the whole test. The heading proves the page rendered. The sign-in link proves the unauthenticated layout loaded—which means the server started, the route matched, and the template compiled. If any of those three things broke during deploy, this test catches it.

The `SMOKE_BASE_URL` fallback to `127.0.0.1:4173` means you can run it locally against `npm run preview` without setting anything. In a deploy workflow, the workflow injects the real URL.

### `playwright.smoke.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/smoke',
  testMatch: /post-deploy\.spec\.ts/,
  fullyParallel: true,
  workers: 1,
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report/smoke-html' }], ['list']],
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

This is a _dedicated_ config, separate from the main `playwright.config.ts`. That matters. The main config spins up a web server with `npm run build && npm run preview`. The smoke config has no `webServer` block at all—it expects the target to already be running, because in the real workflow, the target is a deployed URL that Playwright didn't start.

Trace on failure and screenshot on failure are the evidence trail. If the smoke test goes red after a deploy, the Playwright report tells you exactly what the page looked like when it failed. No guessing, no "can you reproduce it locally?"

### `docs/post-deploy-playbook.md`

The playbook covers five things:

- **Target URL:** `SMOKE_BASE_URL` from the environment, defaulting to local preview.
- **Named command:** `npm run test:smoke`, which runs `playwright test --config=playwright.smoke.config.ts`.
- **What the test proves:** the page loads, the heading is visible, the sign-in link is present. That's the tripwire. Deeper coverage is the end-to-end suite's job.
- **Stop-ship failures:** the smoke test fails, `/login` returns 5xx, runtime logs show uncaught exceptions, or the post-deploy error rate exceeds the pre-deploy baseline for more than five minutes.
- **Who rolls back:** in the workshop, push a revert commit to `main`. In a real deploy, replace this with the specific CLI command or workflow that rolls back.

The playbook also documents a five-minute health window after every deploy and explicitly calls out the hosted gap—Shelf doesn't have a real deploy target yet, so the playbook says so instead of pretending.

### `package.json` script

```json
"test:smoke": "playwright test --config=playwright.smoke.config.ts"
```

One line. Uses the dedicated config. No `webServer`, no build step. The workflow (or you, locally) is responsible for making sure something is running at the target URL first.

## What you still need to run

Locally, the proof-of-life loop is simple: make sure a preview server is already running at `http://127.0.0.1:4173`, then run `npm run test:smoke`. The test should pass. If it doesn't, check that the preview server is actually reachable and that the home page renders an `<h1>` and a "Sign in" link in the main content area.

```bash
SMOKE_BASE_URL=http://127.0.0.1:4173 npm run test:smoke
```

For the deliberate failure check, temporarily change the assertion to look for a heading that doesn't exist:

```ts
await expect(page.getByRole('heading', { name: 'This heading does not exist' })).toBeVisible();
```

Run the smoke test again. Confirm it fails, produces a screenshot and trace in `playwright-report/smoke-html/`, and gives you enough evidence to say "the deploy is broken" with confidence. Then revert.

## Shipped vs. gap

**Local:** everything works end-to-end. The smoke test runs against `npm run preview`, the playbook documents the rollback path, the named command exists. You can prove the full loop right now.

**Hosted:** the deploy workflow (`.github/workflows/deploy.yml`) needs a real deploy target. Without one, the workflow's `deploy` job is a placeholder and the `smoke` job has no URL to hit. The playbook calls this out explicitly in its "Hosted gap" section. When a hosted target lands, you wire `SMOKE_BASE_URL` into the workflow as the deploy job's output and delete the gap section from the playbook. Until then, the local preview version is honest about what it proves.

## Patterns to take away

- **Smoke tests are tripwires, not regression suites.** Two assertions is not lazy—it's disciplined. The smoke test answers one question: "did the deploy break the most basic thing?" If you need more coverage, that's what the full end-to-end suite is for.
- **A dedicated config keeps the smoke test independent.** No `webServer` means no accidental coupling to the build step. The smoke test doesn't care _how_ the target got there—only that it's running.
- **The playbook makes the stop-ship decision explicit.** When the smoke test fails at 2 AM, the playbook tells the agent (or the human) exactly what to do. "Roll back" is a better answer than "investigate."
- **Document the gap instead of hiding it.** Writing "we don't have a hosted target yet" in the playbook is more useful than pretending the local preview is a real deploy. Honest documentation is the precondition for honest automation.

## Additional Reading

- [Lab: Add Post-Deploy Smoke Checks to Shelf](lab-add-post-deploy-smoke-checks-to-shelf.md)
- [Post-Merge and Post-Deploy Validation](post-merge-and-post-deploy-validation.md)
