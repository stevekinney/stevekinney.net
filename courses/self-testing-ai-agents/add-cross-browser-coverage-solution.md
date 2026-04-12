---
title: 'Add Cross-Browser Coverage: Solution'
description: Walkthrough of the shipped Playwright projects, the named cross-browser command, and the nightly job that runs the expanded matrix without slowing down the fast loop.
modified: 2026-04-12
date: 2026-04-10
---

The goal here is not "run every test on every browser." The goal is "run the _right_ tests on the _right_ browsers without making the default loop unusable." Shelf's setup proves you can have cross-browser coverage and a fast dev loop at the same time—you just can't have them in the same command.

## What the shipped repo shows

### The project definitions in `playwright.config.ts`

Shelf defines five projects. The first three are the daily loop:

```ts
{
  name: 'setup',
  testMatch: /authentication\.setup\.ts/,
},
{
  name: 'public',
  testMatch: /(smoke|visual|playground)\.spec\.ts/,
  use: { ...devices['Desktop Chrome'] },
},
{
  name: 'authenticated',
  testMatch: /(rate-book|accessibility|search|visual-authenticated|performance)\.spec\.ts/,
  use: {
    ...devices['Desktop Chrome'],
    storageState: storageStatePath,
  },
  dependencies: ['setup'],
},
```

These are what `npm run test:e2e` runs. Chromium only. Fast.

In that same `playwright.config.ts` file, the last two are the cross-browser smoke projects:

```ts
// Cross-browser smoke projects. They run only the `smoke.spec.ts` file
// against Firefox and WebKit. Skip them by default — invoke via
// `npm run test:e2e:cross-browser` when you specifically want the
// expanded matrix.
{
  name: 'firefox-smoke',
  testMatch: /smoke\.spec\.ts/,
  use: { ...devices['Desktop Firefox'] },
},
{
  name: 'webkit-smoke',
  testMatch: /smoke\.spec\.ts/,
  use: { ...devices['Desktop Safari'] },
},
```

They only match `smoke.spec.ts`. That's the key constraint. Firefox and WebKit don't run the full suite—they run the smoke subset, which is the smallest set of tests that proves the application works at all.

Notice the `firefox-smoke` and `webkit-smoke` projects have no `dependencies` on `setup`. The smoke spec doesn't need auth. If your smoke subset _does_ need auth, you'd add the dependency—but keeping it auth-free means the cross-browser loop is completely independent of the storage state setup.

### The `package.json` scripts

Two commands, one split:

```json
"test:e2e": "drizzle-kit push --force && playwright test --project=setup --project=public --project=authenticated",
"test:e2e:cross-browser": "drizzle-kit push --force && playwright test --project=firefox-smoke --project=webkit-smoke"
```

`test:e2e` explicitly lists the three Chromium projects. It does _not_ say `playwright test` with no `--project` flag, which would run everything—including Firefox and WebKit. The explicit project list is what keeps the fast loop fast.

`test:e2e:cross-browser` runs only the Firefox and WebKit smoke projects. If you want the full matrix (Chromium plus the alternates), run both commands. But in practice, you almost never want that locally. Chromium is your daily driver. Cross-browser is your nightly check.

### The nightly workflow job

In `.github/workflows/nightly.yml`, the `cross-browser-smoke` job does exactly what the name says:

```yaml
cross-browser-smoke:
  name: Cross-browser smoke
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
    - name: Cache dependencies
      uses: actions/cache@v4
      with:
        path: |
          ~/.npm
          ~/.cache/ms-playwright
        key: ${{ runner.os }}-deps-${{ hashFiles('package-lock.json') }}-playwright-${{ hashFiles('playwright.config.ts') }}
    - name: Install dependencies
      run: npm ci --ignore-scripts
    - name: Install Playwright browsers
      run: npx playwright install --with-deps firefox webkit
    - name: Create .env for preview server
      run: |
        cat > .env <<'EOF'
        DATABASE_URL=file:./tmp/ci.db
        ORIGIN=http://127.0.0.1:4173
        BETTER_AUTH_SECRET=ci-test-secret-ci-test-secret-ci-test-secret-32chars
        ENABLE_TEST_SEED=true
        OPEN_LIBRARY_BASE_URL=https://openlibrary.org
        EOF
        mkdir -p tmp
    - name: Run cross-browser smoke tests
      run: npm run test:e2e:cross-browser
    - name: Upload Playwright report
      if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: cross-browser-smoke-report
        path: playwright-report/
        retention-days: 7
```

The `npx playwright install --with-deps firefox webkit` line matters. Playwright doesn't install all browsers by default—it installs Chromium. On a fresh CI runner (or a fresh local machine), Firefox and WebKit aren't there until you ask for them. This is one of those things that works on your machine because you ran it once six months ago and then fails mysteriously on CI because nobody remembered the install step.

The artifact upload on failure gives you the Playwright HTML report with traces and screenshots. The `retention-days: 7` keeps the storage bounded—nightly artifacts pile up fast if you don't cap them.

The temporary `.env` creation step is the other easy one to forget. Shelf's preview server expects the same small cluster of environment variables the local test loop uses; without them, the CI job fails before Firefox or WebKit ever launches.

## What you still need to run

First, install the browsers if you haven't already:

```bash
npx playwright install --with-deps firefox webkit
```

Then run the cross-browser smoke:

```bash
npm run test:e2e:cross-browser
```

This should pass. The smoke spec tests basic page rendering—if it fails on Firefox or WebKit, you've found a real browser compatibility issue, which is the whole point.

Verify the default loop is unaffected:

```bash
npm run test:e2e
```

This should still run only Chromium. If you see Firefox or WebKit in the output, the `--project` flags in the script are wrong.

For the deliberate failure check, temporarily break something in the smoke spec—change the expected heading level, or assert on a link that doesn't exist—and run `npm run test:e2e:cross-browser`. The failure output should clearly show _which browser_ failed. The project name (`firefox-smoke` or `webkit-smoke`) appears in the test output, so you know immediately whether this is a Firefox problem, a WebKit problem, or a test problem.

## Shipped vs. gap

**Local:** the config and scripts exist, the cross-browser command works, and the default Chromium command is unaffected. You can prove all of this right now.

**Hosted:** the nightly workflow in `.github/workflows/nightly.yml` needs GitHub Actions to actually run on a schedule. Locally, you can validate that the YAML parses and that `npm run test:e2e:cross-browser` exits clean. But the scheduled nightly execution requires the workflow to be on the default branch of a repository with Actions enabled. Until then, `workflow_dispatch` lets you trigger it manually from the Actions tab.

## Patterns to take away

- **Explicit project lists protect the fast loop.** `--project=setup --project=public --project=authenticated` is more typing than no flag at all, but it's the difference between a 30-second Chromium run and a 3-minute three-browser run. The typing pays for itself on the first PR.
- **Cross-browser coverage is a subset, not a multiplier.** Running the smoke spec on three browsers is cheap. Running the full end-to-end suite on three browsers is expensive and rarely finds bugs that Chromium missed. Start with the subset. Expand only when you have evidence that a specific test catches browser-specific issues.
- **Browser install is an explicit step.** Playwright's default is Chromium only. If your CI job runs Firefox or WebKit without `npx playwright install --with-deps firefox webkit`, it fails with a confusing "browser not found" error. Make the install step visible.
- **Artifact names include the browser.** `cross-browser-smoke-report` tells you what failed without opening the report. When you have multiple nightly jobs uploading artifacts, the names are the first-pass triage.

## Additional Reading

- [Lab: Add Cross-Browser Coverage](lab-add-cross-browser-coverage.md)
- [Cross-Browser Validation Without Burning the Dev Loop](cross-browser-validation-without-burning-the-dev-loop.md)
