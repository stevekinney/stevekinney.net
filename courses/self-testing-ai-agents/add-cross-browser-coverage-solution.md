---
title: 'Add Cross-Browser Coverage: Solution'
description: Walkthrough of the Playwright projects, tagged smoke subset, and nightly hook-up you add in the lab so Firefox and WebKit get coverage without hijacking the fast loop.
modified: 2026-04-14
date: 2026-04-10
---

The goal here is not "run everything everywhere." The goal is "run the right tests on the right browsers without making the default loop miserable." Shelf's current starter is small enough that this stays simple if you keep the split honest.

## What to add

### The project definitions in `playwright.config.ts`

The minimal target shape is three projects:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-smoke',
      grep: /@cross-browser/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-smoke',
      grep: /@cross-browser/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

Chromium is the default daily driver. Firefox and WebKit are opt-in smoke projects that only run tests tagged `@cross-browser`.

That project-level `grep` is the whole trick. It keeps the alternate browsers honest without turning every local test run into a three-browser event. If you later add `setup` or `authenticated` projects from the auth labs, keep those in the Chromium loop unless you have a specific reason to widen them.

### The smoke subset

Tag the small set of tests that earn cross-browser coverage. The starter `tests/smoke.spec.ts` is the obvious first target:

```ts
import { expect, test } from '@playwright/test';

test('home page renders', { tag: '@cross-browser' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('login page renders', { tag: '@cross-browser' }, async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
```

Keep this set small. A smoke subset is supposed to prove the app basically works in the alternate browsers, not replay the whole suite because someone got ambitious on a Friday.

### The `package.json` scripts

The split in scripts matters as much as the split in projects:

```json
{
  "scripts": {
    "test": "playwright test --project=chromium",
    "test:cross-browser": "playwright test --grep @cross-browser --project=chromium --project=firefox-smoke --project=webkit-smoke"
  }
}
```

`npm run test` stays fast and boring. `npm run test:cross-browser` is the deliberate wider loop. Do not collapse these into one command unless you enjoy waiting around for Firefox and WebKit every time you change a button label.

Before you can run the wider loop locally, install the extra browsers:

```sh
npx playwright install --with-deps firefox webkit
```

Playwright's default install is Chromium. That is why the browser-install step is visible in CI too. What works on your laptop because you ran it once six months ago does not help a fresh runner.

### The nightly workflow hook-up

Once the command exists and the nightly workflow lab lands, the nightly job is small. Here is the shape to aim for:

```yaml
cross-browser-smoke:
  name: Cross-browser smoke
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: '24'
    - name: Install dependencies
      run: npm ci --ignore-scripts
    - name: Install Playwright browsers
      run: npx playwright install --with-deps firefox webkit
    - name: Create .env for preview server
      run: |
        cat > .env <<'EOF'
        DATABASE_URL=file:./ci.db
        OPEN_LIBRARY_BASE_URL=https://openlibrary.org
        EOF
    - name: Run cross-browser smoke tests
      run: npm run test:cross-browser
    - name: Upload Playwright report
      if: failure()
      uses: actions/upload-artifact@v7
      with:
        name: cross-browser-smoke-report
        path: playwright-report/
        retention-days: 7
```

Two details are load-bearing.

First: `DATABASE_URL=file:./ci.db` keeps the preview bootstrap to a single file inside the working directory — no extra directory ceremony just to boot the preview server.

Second: the report artifact name is specific. When a nightly check fails, you want the failure to read like "cross-browser smoke failed," not "some artifact exists somewhere, good luck."

## What you still need to run

Install the extra browsers once:

```sh
npx playwright install --with-deps firefox webkit
```

Run the fast loop:

```sh
npm run test
```

Run the wider smoke loop:

```sh
npm run test:cross-browser
```

Then break something on purpose in one tagged smoke test and rerun `npm run test:cross-browser`. The output should clearly tell you which project failed: `chromium`, `firefox-smoke`, or `webkit-smoke`. If the failure is not browser-specific in the output, your project names or reporting are too vague.

## Local vs. hosted

**Local:** the config, tags, and scripts are all fully verifiable now. You can prove Chromium stays fast and the wider smoke command fans out across three projects.

**Hosted:** the scheduled nightly run still needs GitHub Actions on a real repository. Until then, `workflow_dispatch` is the easiest way to prove the workflow shape without waiting for tomorrow morning.

## Patterns to take away

- Explicit project names protect the fast loop. `chromium` for daily work, `firefox-smoke` and `webkit-smoke` for the wider check.
- Tags beat path tricks here. The same smoke spec can stay in `tests/` and opt into wider coverage with `@cross-browser`.
- Browser install is an explicit step. Chromium working locally does not mean Firefox and WebKit exist anywhere else.
- Artifact and project names are part of the debugging UX. A red nightly job should already tell you which browser is unhappy.

## Additional Reading

- [Lab: Add Cross-Browser Coverage](lab-add-cross-browser-coverage.md)
- [Cross-Browser Validation Without Burning the Dev Loop](cross-browser-validation-without-burning-the-dev-loop.md)
