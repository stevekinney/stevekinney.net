---
title: Configuring Playwright
description: A walkthrough of playwright.config.ts—the settings that matter, the ones you can ignore for now, and a few patterns you can add later.
modified: 2026-04-14
date: 2026-04-10
---

Every Playwright suite starts with a config file, and most of them are wrong in the same three ways: the dev server is running instead of preview, runner options are buried inside `use` where Playwright silently ignores them, or the config is trying to teach every advanced trick on day one. Shelf's current starter deliberately does the opposite: it keeps the config tiny.

That's good. Students should be able to look at `playwright.config.ts` and understand it in one pass.

We'll walk through what the starter actually ships first, then look at a few realistic ways you might extend it once the suite grows.

## `testDir` and `testIgnore`

```ts
testDir: 'tests',
testIgnore: ['**/labs/fixtures/**', '**/labs/broken-traces/**'],
```

`testDir` is where Playwright looks for specs. In Shelf's starter, that's just `tests`.

`testIgnore` is doing something slightly more interesting: it keeps the intentionally broken lab exercises out of the default green run. Those files still live in the repo, but they don't sabotage the starter experience before you've taught the relevant lesson.

This is a good use of `testIgnore`: excluding known teaching fixtures or generated files. It is a bad use of `testIgnore` to hide flaky real tests. If a normal spec is unstable, fix the spec.

## `webServer`

```ts
webServer: {
  command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
  url: 'http://127.0.0.1:4173',
  reuseExistingServer: true,
},
```

This is how Playwright starts your app before any test runs.

Shelf builds and previews rather than running the dev server. Why: preview mode is closer to production. No HMR, no Vite transforms at runtime, no dev-only middleware changing behavior in ways production never will. If a test passes against preview, it's much more likely to pass in CI and production.

`reuseExistingServer: true` keeps the starter smooth locally. If you already have the app running on port `4173`, Playwright reuses it instead of trying to boot a second copy.

Later, a common CI-friendly variant is:

```ts
reuseExistingServer: !process.env.CI,
```

That split is useful once you care about CI determinism. Locally, reuse the running server. In CI, always boot a fresh one.

If you ever need environment overrides for tests, `webServer` is also the right place for them:

```ts
webServer: {
  command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
  url: 'http://127.0.0.1:4173',
  env: {
    NODE_ENV: 'test',
    ANALYTICS_DISABLED: '1',
  },
},
```

## The `use` block

```ts
use: {
  baseURL: 'http://127.0.0.1:4173',
},
```

Everything in `use` applies to every test's browser context.

`baseURL` is the one thing the starter absolutely wants. It means you write `page.goto('/playground')` instead of `page.goto('http://127.0.0.1:4173/playground')`. Small thing, but it keeps tests portable and keeps hostnames from leaking all over the suite.

What the starter does **not** ship yet is traces, screenshots, and videos. Those are useful, but they are not day-one concepts. When you are ready for them, the setup looks like this:

```ts
use: {
  baseURL: 'http://127.0.0.1:4173',
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
},
```

That combination follows the right philosophy: keep failure forensics, discard success noise.

## Runner options you might add later

Shelf's starter intentionally leaves a lot of top-level runner options alone. That keeps the default config small and lets Playwright's defaults do their job.

Once your suite gets bigger, the first runner options most teams add are:

```ts
fullyParallel: true,
workers: process.env.CI ? 1 : undefined,
forbidOnly: !!process.env.CI,
retries: process.env.CI ? 2 : 0,
```

Here's what each one does:

- `fullyParallel` allows tests in the same file to run concurrently.
- `workers` controls how many worker processes Playwright can use.
- `forbidOnly` fails CI if someone accidentally committed `test.only`.
- `retries` gives CI a little resilience against one-off flakes.

Notice that these are **runner options**, not browser-context options. They belong at the top level of `defineConfig`, not inside `use`.

## Optional reporters

The starter relies on Playwright's default terminal reporter. That's enough for a tiny suite.

When you want richer output, a common next step is:

```ts
reporter: [
  ['html', { open: 'never', outputFolder: 'playwright-report/html' }],
  ['json', { outputFile: 'playwright-report/report.json' }],
  ['list'],
],
```

- `list` gives you the terminal output you expect.
- `html` gives you a browsable report with failures, screenshots, traces, and steps.
- `json` gives CI and automation something machine-readable to parse.

This is useful later in the course. It does not need to be part of the starter app.

## Optional screenshot defaults

If you add visual regression tests, it is worth setting screenshot defaults globally:

```ts
expect: {
  toHaveScreenshot: {
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
    maxDiffPixelRatio: 0.01,
  },
},
```

- `animations: 'disabled'` freezes motion for deterministic screenshots.
- `caret: 'hide'` removes blinking cursor noise.
- `scale: 'css'` helps normalize screenshots across different display densities.
- `maxDiffPixelRatio: 0.01` gives you a little tolerance for tiny rendering differences.

Again: useful later, not necessary in a starter config.

## Projects

Shelf's current starter does **not** define custom Playwright projects. That is intentional.

One default project keeps the beginner loop obvious:

- one config file
- one default run
- one place to look when something breaks

Projects are still a great tool. They are just something you add when you have a concrete reason, not because the config file looks more impressive with a giant `projects` array.

### Example 1: Authentication setup plus the real app suite

This is the classic pattern when you want a setup spec to log in once and save storage state for other tests.

```ts
projects: [
  {
    name: 'setup',
    testMatch: /authentication\.setup\.ts/,
  },
  {
    name: 'app',
    testIgnore: /authentication\.setup\.ts/,
    use: {
      storageState: 'playwright/.authentication/reader.json',
    },
    dependencies: ['setup'],
  },
],
```

The important idea is `dependencies`: Playwright runs `setup` first, then the dependent project can reuse the saved session.

### Example 2: Public vs. authenticated specs

This is useful when part of your suite should stay anonymous and part of it assumes a signed-in user.

```ts
projects: [
  {
    name: 'setup',
    testMatch: /authentication\.setup\.ts/,
  },
  {
    name: 'public',
    testMatch: /(smoke|playground)\.spec\.ts/,
  },
  {
    name: 'authenticated',
    testMatch: /(search|rate-book|goals)\.spec\.ts/,
    use: {
      storageState: 'playwright/.authentication/reader.json',
    },
    dependencies: ['setup'],
  },
],
```

This keeps the public tests simple while letting the authenticated tests share login setup.

### Example 3: Cross-browser smoke only

Full cross-browser coverage is expensive. Smoke-only cross-browser coverage is often the better tradeoff.

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox-smoke',
      testMatch: /smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit-smoke',
      testMatch: /smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],
});
```

This pattern gives you fast confidence in your core user flow without tripling the runtime of the whole suite.

### Example 4: A visual-regression-only project

If you decide to add screenshot tests, isolating them into their own project can keep expectations and artifacts tidy.

```ts
projects: [
  {
    name: 'functional',
    testIgnore: /visual\.spec\.ts/,
  },
  {
    name: 'visual',
    testMatch: /visual\.spec\.ts/,
    use: {
      viewport: { width: 1440, height: 900 },
      colorScheme: 'light',
    },
  },
],
```

That lets you keep visual assumptions separate from functional assumptions.

The main rule: add projects when they reduce confusion, not when they create it.

## The anti-pattern: runner options in `use`

This is still the most common Playwright config mistake, and Playwright won't save you from it.

`testDir`, `timeout`, `retries`, `workers`, and `projects` are **runner options**. They go at the top level of `defineConfig`.

`baseURL`, `trace`, `screenshot`, `storageState`, and `viewport` are **context options**. They go inside `use`.

If you put `timeout` inside `use`, Playwright does not error. It does not warn. It just ignores it.

```ts
// Wrong — silently ignored:
use: {
  timeout: 60_000,
},

// Right — actually changes the test timeout:
timeout: 60_000,
```

The mental model is simple:

- `use` configures the browser context
- everything else configures the runner

## The one thing to remember

The config file is the contract between your suite and your environment. The starter should keep that contract easy to read. Add the next layer of configuration when you have earned it:

- first `webServer`
- then `baseURL`
- then maybe traces and screenshots
- then maybe projects

If a config file is trying to teach authentication setup, cross-browser coverage, visual regression, CI retries, and failure reporting all at once, it is probably doing too much for a beginner repo.

## Additional Reading

- [Playwright Projects](playwright-projects.md)
- [Playwright UI Mode](playwright-ui-mode.md)
- [Storage State Authentication](storage-state-authentication.md)
