---
title: 'Exercise 8: Testing Strategies'
description: >-
  Write Playwright E2E tests for cross-route navigation, mock API responses with
  MSW, record HAR fixtures for deterministic replay, and discuss where contract
  testing fills the gaps.
date: 2026-03-01T00:00:00.000Z
modified: '2026-03-01T00:00:00-07:00'
---

## What You're Doing

You need end-to-end tests that exercise the composed application as a user would experience it — navigating between routes, seeing data load, interacting with UI. You're going to write Playwright E2E tests for cross-route navigation, mock API responses with MSW, record HAR fixtures for deterministic replay, and discuss where contract testing fills the gaps these tests leave.

## Why It Matters

In a monorepo architecture, unit tests verify that individual components work in isolation, but they miss the integration seams: does the route lazy-load correctly? Does the analytics dashboard render real data from the API? Does navigation state survive across page transitions? E2E tests catch these integration-level failures. MSW mocking gives you control over API responses without a real backend. HAR recording gives you deterministic snapshots of real API interactions. Together, these techniques let you test the composed application with confidence.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

You should be continuing from where Exercise 7 left off. If you need to catch up:

```bash
git checkout 07-testing-start
pnpm install
```

Verify Playwright is installed:

```bash
npx playwright install chromium
```

Open `tests/e2e/cross-remote.spec.ts` — it contains TODO stubs.

---

## Step 1: Understand the Test Infrastructure

Before writing tests, look at how the test environment is configured.

1. Open `tests/e2e/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'pnpm --filter @pulse/dashboard dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

> [!NOTE]
> **The `webServer` configuration:** Playwright can start your dev server automatically before running tests and shut it down after. The `command` runs the dashboard's dev server, and `url` is the health check — Playwright polls this URL until it responds before running any tests. `reuseExistingServer: !process.env.CI` means in local development, if you already have the dev server running, Playwright will use it instead of starting a new one. In CI, it always starts a fresh server.

> [!NOTE]
> **Mock Service Worker (MSW) intercepts network requests at the Service Worker level, not by monkey-patching `fetch` or `XMLHttpRequest`.** MSW registers a Service Worker in the browser (or uses a request interception library in Node.js) that sits between your application code and the network. When your component calls `fetch("/api/analytics/summary")`, the request is intercepted by the Service Worker before it ever leaves the browser, and MSW's handlers return a mock response as if a real server had responded. Because interception happens at the network level, your application code is completely unaware that the response is mocked — the `fetch` call, the promise resolution, the response parsing all behave identically to a real network request. This is a fundamental advantage over mocking `fetch` directly: you test the actual network code path your application uses in production, including request headers, response status codes, and error handling, without running a real backend server.

2. Open `mocks/src/handlers.ts` — these MSW handlers run during development and serve as the baseline API behavior during tests. The handlers return deterministic data with fixed delays.

3. Open `tests/e2e/cross-remote.spec.ts` — the stub file where you'll write tests:

```typescript
import { test, expect } from '@playwright/test';

// TODO: Add cross-route navigation tests
// TODO: Add error handling tests
// TODO: Add loading state tests
```

### Checkpoint

Playwright is installed and configured. The dev server starts automatically when you run tests. MSW handlers provide deterministic API responses.

---

## Step 2: Write Cross-Route Navigation Tests

Replace the stub in `tests/e2e/cross-remote.spec.ts` with real tests:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Cross-route navigation', () => {
  test('navigates from analytics to users and back', async ({ page }) => {
    // Start at the analytics page
    await page.goto('/');

    // Wait for the stats bar to render (fastest API response at 200ms)
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('12,847')).toBeVisible();

    // Navigate to users
    await page.getByRole('link', { name: 'Users' }).click();

    // Wait for the user list to render (use Alan Turing to avoid matching the
    // auth bar's "Viewing as: Grace Hopper" which causes a strict mode violation)
    await expect(page.getByText('Alan Turing')).toBeVisible();

    // Navigate back to analytics
    await page.getByRole('link', { name: 'Analytics' }).click();

    // Verify analytics data is still present
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('12,847')).toBeVisible();
  });

  test('users page shows user data with roles', async ({ page }) => {
    await page.goto('/');

    // Navigate to users
    await page.getByRole('link', { name: 'Users' }).click();

    // Wait for user list to load
    await expect(page.getByText('Alan Turing')).toBeVisible();

    // Verify user data is visible in the table (email is unique to the users page)
    await expect(page.getByText('grace@pulse.dev')).toBeVisible();

    // Verify we can navigate back
    await expect(page.getByRole('link', { name: 'Analytics' })).toBeVisible();
  });

  test('settings page loads with organization data', async ({ page }) => {
    await page.goto('/settings');

    // Wait for settings data to load
    await expect(page.getByText('Pulse Inc.')).toBeVisible();
    await expect(page.getByText('pro')).toBeVisible();
  });
});
```

Run the tests:

```bash
npx playwright test tests/e2e/cross-remote.spec.ts --config tests/e2e/playwright.config.ts
```

> [!NOTE]
> **Why we test navigation, not component rendering:** Unit tests with Vitest and Testing Library verify that individual components render correctly given specific props. E2E tests verify the _integration_ — that the router loads the correct lazy-loaded route, that MSW intercepts the API call, that the component correctly fetches and displays the data, and that navigating away and back doesn't break state. These are the seams between packages, and they're exactly the seams that break in a monorepo when someone changes a shared type or refactors a package's public API.

### Checkpoint

At least three E2E tests pass. They cover navigation between analytics, users, and settings, verifying that data loads correctly across route transitions.

---

## Step 3: Write Tests with MSW Data Verification

The dashboard uses MSW's `setupWorker` which registers a Service Worker in the browser. The Suspense resources from Exercise 2 fire their fetch calls at module import time — before Playwright's `page.route()` can intercept them. This means per-test API overrides via `page.route()` won't work for the initial data load. Instead, write tests that verify the MSW mock data renders correctly and that interactive features work.

> [!NOTE]
> **Why `page.route()` doesn't work here:** The `createSuspenseResource` calls in `stats-bar.tsx`, `chart.tsx`, and `big-table.tsx` create their fetch promises at module scope — the moment the module is imported, the fetch fires. MSW's Service Worker intercepts these fetches before they reach the network layer. By the time you could set up `page.route()` overrides, the data has already been fetched and cached. This is a trade-off of module-level Suspense resources: they're fast (no waterfall) but not easily mockable per-test. HAR replay (Step 4) works because `routeFromHAR` is set up before navigation.

Create a new test file `tests/e2e/analytics.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Analytics with mocked API', () => {
  test('renders analytics data from MSW handlers', async ({ page }) => {
    await page.goto('/');

    // Verify the MSW mock data renders
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('12,847')).toBeVisible();
    await expect(page.getByText('3,291')).toBeVisible();
    await expect(page.getByText('$284,100')).toBeVisible();
    await expect(page.getByText('3.2%')).toBeVisible();
  });

  test('chart time range toggles work', async ({ page }) => {
    await page.goto('/');

    // Wait for chart to load
    await expect(page.getByRole('img', { name: 'Analytics activity chart' })).toBeVisible();

    // Click 7d toggle
    await page.getByRole('button', { name: '7d' }).click();

    // Chart should still be visible after toggle
    await expect(page.getByRole('img', { name: 'Analytics activity chart' })).toBeVisible();
  });
});
```

Run the new tests:

```bash
npx playwright test tests/e2e/analytics.spec.ts --config tests/e2e/playwright.config.ts
```

### Checkpoint

The analytics tests pass. They verify that MSW mock data renders correctly and that interactive chart controls work.

---

## Step 4: Record and Replay HAR Fixtures

HAR (HTTP Archive) files capture real network interactions as JSON. Playwright can record these during a test run and replay them later for deterministic results.

> [!NOTE]
> **HAR (HTTP Archive) is an industry-standard JSON format for recording HTTP interactions.** A HAR file captures every detail of a network request-response cycle: the request URL, method, headers, and body; the response status code, headers, and body; and timing information including DNS lookup, connection, TLS handshake, and time-to-first-byte. The format was originally designed for browser developer tools (you can export HAR files from Chrome DevTools' Network tab) and is supported by virtually every HTTP debugging tool. Playwright's `routeFromHAR` method reads these files and replays the recorded responses when matching requests are detected, making your tests completely independent of any running server. The key advantage over hand-written mocks is fidelity: a HAR file captures the exact response shape, headers, and status codes that a real server produced, so you are testing against realistic data without maintaining mock definitions by hand.

1. Record a HAR file by adding a recording test:

```typescript
test('record HAR fixture', async ({ page }) => {
  // Start recording all API calls
  await page.routeFromHAR('tests/fixtures/analytics-summary.har', {
    update: true,
    url: '**/api/analytics/**',
  });

  await page.goto('/');

  // Wait for all analytics data to load
  await expect(page.getByText('Total Users')).toBeVisible();
  await expect(page.getByText('12,847')).toBeVisible();

  // Close the page to flush the HAR file
  await page.close();
});
```

2. Run this test to create the HAR file:

```bash
npx playwright test tests/e2e/analytics.spec.ts -g "record HAR" --config tests/e2e/playwright.config.ts
```

3. Check that the file was created:

```bash
ls tests/fixtures/analytics-summary.har
```

The HAR file contains the full request/response cycle for every API call that matched the URL pattern. Open it — it's JSON with request headers, response headers, response body, and timing information.

4. Now write a test that replays the HAR instead of hitting the live API:

```typescript
test('renders analytics from HAR fixture', async ({ page }) => {
  // Replay recorded responses instead of hitting the live API
  await page.routeFromHAR('tests/fixtures/analytics-summary.har', {
    update: false,
    url: '**/api/analytics/**',
  });

  await page.goto('/');

  // These values come from the recorded HAR, not the live MSW handlers
  await expect(page.getByText('Total Users')).toBeVisible();
  await expect(page.getByText('12,847')).toBeVisible();
});
```

5. Remove the recording test (or skip it) — you only need it when regenerating fixtures:

```typescript
test.skip('record HAR fixture', async ({ page }) => {
  // ...
});
```

> [!NOTE]
> **When to use HAR replay vs. `page.route()` mocking:** HAR replay is useful when you want to capture the exact shape of real API responses — including headers, status codes, and response timing — without manually constructing mock data. It's especially valuable for complex APIs with deeply nested response bodies. The downside is that HAR files go stale when the API changes. `page.route()` mocking is better when you need precise control over specific scenarios (error states, edge cases, custom data). Use HAR for "golden path" tests and `page.route()` for edge case tests.

### Checkpoint

A HAR file exists in `tests/fixtures/`. A test replays the HAR for deterministic results without hitting the live MSW handlers. The test passes with the same assertions.

---

## Step 5: Discussion — Contract Testing

Run all the tests one more time:

```bash
npx playwright test --config tests/e2e/playwright.config.ts
```

All tests should pass. But consider this scenario: the backend team changes the `/api/analytics/summary` response from `{ totalUsers: number }` to `{ total_users: number }`. Your HAR files still have the old format. Your `page.route()` mocks still return the old format. Your MSW handlers still return the old format. Every test passes. The production app breaks.

> [!IMPORTANT]
> **The gap that contract testing fills:** E2E tests with mocked APIs verify that your frontend renders correctly given a specific API response shape. They don't verify that the API actually returns that shape. Contract testing tools like Pact fill this gap: the frontend declares "I expect `GET /api/analytics/summary` to return `{ totalUsers: number }`" and the backend verifies that it satisfies that contract. When the backend changes `totalUsers` to `total_users`, the contract test fails on the backend side — before the change ships. This catches API drift without requiring the frontend and backend to deploy and test together.

This is a discussion point, not a hands-on exercise. Think about where in your CI pipeline contract testing would run and what it would catch that your current tests miss.

### Checkpoint

All Playwright tests pass. You can articulate the testing pyramid for a monorepo: unit tests (Vitest) for component logic, E2E tests (Playwright) for integration behavior, and contract tests (Pact) for API compatibility.

---

## Stretch Goals

- **Visual regression testing:** Add `expect(page).toHaveScreenshot()` to capture a screenshot of the analytics dashboard and compare it against a baseline. Run the test twice — the second run compares against the first. Change a CSS class and watch the test fail.
- **Accessibility testing:** Install `@axe-core/playwright` and add an accessibility audit to your test. Assert that the analytics dashboard has no critical accessibility violations.
- **Parallel test execution:** Configure Playwright to run tests with `workers: 4` and verify they still pass. Check for shared state issues — tests that pass in isolation but fail when run in parallel are usually reading/writing shared state.

---

## Solution

If you need to catch up, the completed state for this exercise is available on the `08-migration-start` branch:

```bash
git checkout 08-migration-start
pnpm install
```

---

## What's Next

You have a tested, linted, type-checked, CI-enforced monorepo. But what happens when a legacy application needs to coexist with your modern architecture? In the next exercise, you'll set up a strangler fig pattern for incremental migration — routing some paths to the legacy app and others to the modern app — and write jscodeshift codemods to automate the tedious import rewrites.
