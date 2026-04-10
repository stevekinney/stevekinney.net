---
title: Configuring Playwright
description: A walkthrough of playwright.config.ts—the settings that matter, the ones you can ignore, and the anti-pattern that trips up everyone.
modified: 2026-04-10
date: 2026-04-10
---

Every Playwright suite starts with a config file, and most of them are wrong in the same three ways: the dev server is running instead of preview, traces are always on (flooding CI with artifacts), and runner options are buried inside `use` where Playwright silently ignores them. Shelf's config is one of the few I've seen that gets the important things right. Let's walk through it.

## `testDir` and `fullyParallel`

```ts
testDir: 'tests/end-to-end',
fullyParallel: true,
```

`testDir` is where your specs live. Nothing surprising. `fullyParallel: true` is the interesting one: it means tests in different files _and_ tests within the same file run concurrently. This is the faster default, and you should leave it on unless you have tests that share mutable state within a single file. (You shouldn't have tests that share mutable state within a single file.)

## `workers`

```ts
workers: 1,
```

This looks like it contradicts `fullyParallel`, and it kind of does. Shelf pins workers to `1` because every test hits the same SQLite database. Two workers running simultaneously means two tests writing to the same table at the same time, which means data races, which means flaky tests that pass locally and fail in CI at 2 a.m.

When you have per-worker database isolation—separate databases, transactions that roll back, Docker containers per worker—raise this number. The common CI pattern is `workers: process.env.CI ? 1 : undefined`, which lets Playwright auto-detect locally but stays serial in CI. Shelf always uses `1` for now because the isolation story isn't there yet.

## `webServer`

```ts
webServer: {
  command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
  port: 4173,
  reuseExistingServer: !process.env.CI,
  env: {
    ...process.env,
    ENABLE_TEST_SEED: 'true',
  },
},
```

This is how Playwright starts your app before any test runs. Shelf builds and previews rather than running the dev server. Why: preview mode is closer to production. No HMR, no Vite transforms at runtime, no dev-only middleware injecting itself into your pages. If a test passes against preview, it's much more likely to pass in production.

`reuseExistingServer: !process.env.CI` is a nice ergonomic split. Locally, if you already have the app running on port 4173, Playwright won't try to start a second instance. In CI, it always starts fresh—no stale builds, no leftover state.

The `env` block passes `ENABLE_TEST_SEED: 'true'` to the server process. Shelf uses this to expose a test seeding endpoint that lets you reset the database to a known state before each run. That endpoint doesn't exist in production because the environment variable isn't set. Simple gate, hard to get wrong.

## The `use` block

```ts
use: {
  baseURL: 'http://127.0.0.1:4173',
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
},
```

Everything in `use` applies to every test's browser context. `baseURL` means you write `page.goto('/shelf')` instead of `page.goto('http://127.0.0.1:4173/shelf')`. Small thing, but it keeps your tests portable.

`trace: 'retain-on-failure'` is the setting that matters most. When a test fails, Playwright captures a trace zip—a full recording of every network request, DOM snapshot, and console message. You open it with `npx playwright show-trace` and step through the failure frame by frame. When a test _passes_, the trace is discarded. This is the right default: you get the forensics when you need them without drowning CI in artifacts when you don't.

`screenshot: 'only-on-failure'` and `video: 'retain-on-failure'` follow the same philosophy. Artifacts only when something breaks.

## `reporter`

```ts
reporter: [
  ['html', { open: 'never', outputFolder: 'playwright-report/html' }],
  ['json', { outputFile: 'playwright-report/report.json' }],
  ['list'],
],
```

Shelf uses three reporters. `list` gives you terminal output during the run—the scrolling list of green checkmarks and red crosses you're used to. `html` generates an interactive report you can open with `npx playwright show-report playwright-report/html`. `json` produces a machine-readable file that CI pipelines can parse for trend data or failure dossiers.

The `open: 'never'` on the HTML reporter stops your browser from auto-opening after every single run. Trust me, you want this.

## `expect` and screenshot options

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

These settings apply whenever you call `expect(page).toHaveScreenshot()`. `animations: 'disabled'` freezes CSS animations mid-frame so your screenshots are deterministic—no flaky diffs because a spinner was at a different rotation. `caret: 'hide'` removes the blinking cursor from input fields. `scale: 'css'` normalizes screenshots across different device pixel ratios.

`maxDiffPixelRatio: 0.01` allows up to 1% pixel difference between the baseline and the current screenshot. Font rendering varies across machines and OS versions. Without some tolerance, you'll spend half your time updating baselines that look identical to the human eye.

## `timeout` and `expect.timeout`

You won't find these in Shelf's config because the defaults—30 seconds for the test timeout, 5 seconds for the assertion timeout—are fine for this app. But you need to know they exist and, more importantly, that they're _separate clocks_.

The test timeout includes everything: fixtures, `beforeEach`, the test body, `afterEach`. The assertion timeout is how long a call like `expect(locator).toBeVisible()` retries before giving up. These are independent.

The common mistake: a test times out at 30 seconds, so someone raises `timeout` to 60 seconds. The real problem was a slow assertion—an element that takes 8 seconds to appear against a 5-second `expect.timeout`. Raising the test timeout just makes the failure take longer. Raise `expect.timeout` instead.

```ts
// If you need to adjust these, they go at the top level:
timeout: 30_000,
expect: {
  timeout: 10_000,
},
```

## Projects

Shelf defines five projects: `setup`, `public`, `authenticated`, `firefox-smoke`, and `webkit-smoke`. The `setup` project runs authentication before the rest. `public` and `authenticated` split tests by whether they need a logged-in user. The cross-browser projects run the smoke suite on Firefox and WebKit.

There's a lot to say about how projects compose, how dependencies work, and how `storageState` threads authentication through the suite. We cover all of that in the [Playwright Projects](playwright-projects.md) lesson. For now, just notice the pattern: projects let you run different subsets of tests with different configurations without duplicating your config file.

## The anti-pattern: runner options in `use`

This is the single most common Playwright config mistake, and Playwright won't save you from it.

`testDir`, `timeout`, `retries`, `workers`—these are **runner options**. They go at the top level of `defineConfig`. `baseURL`, `trace`, `screenshot`, `storageState`—these are **context options**. They go inside `use`.

If you put `timeout` inside `use`, Playwright doesn't error. It doesn't warn. It just ignores it. Your tests still use the default 30-second timeout, and you spend an hour wondering why your config change didn't take effect.

```ts
// Wrong — silently ignored:
use: {
  timeout: 60_000,
},

// Right — actually changes the test timeout:
timeout: 60_000,
```

The mental model: `use` configures the _browser_. Everything else configures the _runner_.

## CI vs. local

Shelf's config doesn't use `forbidOnly` or `retries` yet, but they're worth adding as the suite grows. The standard pattern:

```ts
forbidOnly: !!process.env.CI,
retries: process.env.CI ? 2 : 0,
```

`forbidOnly` prevents `.only` from shipping to CI. Locally, `test.only` is a great way to focus on one test. In CI, it means the rest of your suite silently didn't run, and you won't find out until something breaks in production. `forbidOnly` fails the run if any `.only` is present.

`retries` adds automatic retries in CI but not locally. Locally, you want a failure to fail immediately so you can debug it. In CI, a single retry can absorb the occasional flake without blocking the pipeline. Two retries is a reasonable starting point. If you need three, you have a flaky test—fix the test, don't raise the retry count.

Combined with `reuseExistingServer: !process.env.CI` from the `webServer` block, these three settings give you the split most teams land on: fast and forgiving locally, strict and deterministic in CI.

## The one thing to remember

The config file is the contract between your test suite and your environment. Get `webServer`, `use`, and `workers` right, and everything else is tuning. Most debugging sessions that _look_ like test problems are actually config problems—wrong base URL, dev server instead of preview, traces not captured. When a test fails and the failure doesn't make sense, check the config before you check the test.

## Additional Reading

- [Playwright Projects](playwright-projects.md)
- [Playwright UI Mode](playwright-ui-mode.md)
- [Storage State Authentication](storage-state-authentication.md)
