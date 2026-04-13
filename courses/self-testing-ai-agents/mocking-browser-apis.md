---
title: Mocking Browser APIs
description: "How to test browser-dependent features without lying to yourself: use Playwright's real knobs when they exist, mock the unsupported bits early, and model the events your app actually listens for."
modified: 2026-04-12
date: 2026-04-12
---

Network mocking gets all the attention because it is loud. Browser API mocking is quieter, and it bites just as hard. Your app reads `matchMedia`, `navigator.clipboard`, `Notification.permission`, `ResizeObserver`, or some shiny experimental API. The test runner lives in a browser that does not quite behave the way your users' browsers behave. Suddenly the test is not about your feature anymore. It is about the gap between "real browser enough" and "the exact browser surface this component assumes."

[Playwright](https://playwright.dev/) has an official [Mock browser APIs guide](https://playwright.dev/docs/mock-browser-apis), and the big idea is dead simple: if Playwright already gives you a first-class knob, use that. If it doesn't, install the mock _before the page loads_ and make the mock behave enough like the real API that your app is not being tested against fiction.

## Use the real knob first

Before you write a mock, check whether Playwright already models the thing directly.

Good examples:

- [`geolocation`](https://playwright.dev/docs/emulation#geolocation) plus [`grantPermissions`](https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions) instead of mocking location APIs by hand
- [`locale`](https://playwright.dev/docs/emulation#locale--timezone), `timezoneId`, `colorScheme`, and viewport options instead of ad-hoc globals
- [`Clock`](https://playwright.dev/docs/clock) instead of overriding `Date.now()` with a brittle one-off patch
- [`storageState`](https://playwright.dev/docs/auth) instead of manually stuffing auth state into `localStorage`

The rule is not "never mock." The rule is "prefer the browser model Playwright already knows how to drive." A first-class API buys you less code, fewer lies, and better cross-browser behavior.

## Install mocks before navigation

The official docs make this point for a reason: if the page calls the API during boot, your mock has to exist _before_ the page starts loading. That means [`page.addInitScript()`](https://playwright.dev/docs/api/class-page#page-add-init-script) or [`browserContext.addInitScript()`](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script), not `page.evaluate()` after `goto`.

This is the minimal pattern:

```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.matchMedia = (query: string) => ({
      media: query,
      matches: query === '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });
  });
});

test('respects reduced motion preference', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByText('Animations reduced')).toBeVisible();
});
```

The timing is the important part. If you move the mock after `goto`, the app already read the real `matchMedia` result and your test is now proving something about your patch timing, not your UI.

> [!WARNING] This mock is intentionally minimal
> If your code subscribes with `addEventListener`, `addListener`, or expects live media-query updates, this snippet is not enough. Use an event-capable version in a shared fixture so the test exercises the same contract your component uses in production.

## Read-only APIs need a different move

Some browser APIs are writable. Some are not. The Playwright docs use `navigator.cookieEnabled` as the example, and it is a good one: assigning to it directly does nothing. If the property is configurable, use [`Object.defineProperty`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty) against the right prototype instead.

```ts
await page.addInitScript(() => {
  Object.defineProperty(Object.getPrototypeOf(navigator), 'cookieEnabled', {
    value: false,
  });
});
```

This is the part that catches people off guard. The test "set" the property. The app still saw the original value. The bug was not in the feature. The bug was in the mock.

## Model events, not just values

This is the biggest browser-API-mocking mistake by a mile.

The first version of the mock returns a value. The app renders correctly on first paint. Everybody feels good. Then the real feature breaks because the app was listening for updates and the mock never emitted them.

If your component subscribes to changes, your mock needs to support changes.

The [Playwright guide's battery example](https://playwright.dev/docs/mock-browser-apis) is worth studying for exactly this reason: it stores listeners, updates internal state, and fires the same events a real implementation would. That is the bar. Not perfect browser fidelity. Just enough behavior that the component is being tested against the same contract it uses in production.

I use this mental model:

- If the app only reads once, a simple return value can be enough.
- If the app subscribes, the mock must support listeners.
- If the app branches on permission state, the permission and the API surface both need to agree.

## Verify the calls when the contract matters

Sometimes the interesting part is not just "the UI changed." Sometimes you want to prove the page asked the browser for the thing it was supposed to ask for. The Playwright docs recommend [`page.exposeFunction()`](https://playwright.dev/docs/api/class-page#page-expose-function) for this, and it is a nice trick.

Expose a logger from the test, have the mock call it, and assert on the call sequence. That turns "I think the app probably queried the API" into a real contract.

This matters a lot for:

- subscription APIs
- permission requests
- clipboard reads and writes
- feature-detection branches like `if ('share' in navigator)`

If you only assert on the final UI, a stale cached value can make the test pass for the wrong reason.

## The common use cases

This is the part I wish more teams wrote down. Browser API mocking is not exotic. It shows up constantly.

### Media and preference APIs

[`matchMedia`](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia) for:

- `prefers-reduced-motion`
- `prefers-color-scheme`
- breakpoint-driven UI branches

If the app changes layout or animation behavior based on browser preferences, a mock is often the simplest deterministic path.

### Clipboard

[`Clipboard API`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) support is a classic example. "Copy invite link" buttons are easy to test once you replace `navigator.clipboard.writeText` with a stub that records the written value.

### Observer APIs

[`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) and [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) show up in lazy loading, sticky headers, virtualization, and responsive components. They are also where incomplete mocks go to die. If your framework expects `observe`, `unobserve`, and callback timing semantics, the mock has to supply them.

### Permissions and browser capabilities

`Notification.permission`, `navigator.share`, and `navigator.permissions.query()` are all places where the app can fork based on browser support or permission state. These tests are usually not about the browser feature itself. They are about your fallback UI, your enablement flow, or your error handling.

### Experimental or not-fully-supported APIs

This is the bucket the official Playwright guide is really aimed at. Battery status. Device memory. Some hardware-adjacent APIs. The feature exists in your product. The automation surface is not first-class everywhere. Mocking is the practical move.

## Where fixtures help

The full helper-versus-fixture decision tree lives in [Where Fixtures Actually Help](where-fixtures-actually-help.md). Here, the one-line rule is simpler: if multiple tests need the same browser contract, make it a fixture.

Good fixture candidates:

- a `reducedMotionPage` used across a whole accessibility-focused spec file
- a `clipboardRecorder` fixture that installs the mock and exposes captured writes
- a `batteryAwarePage` or `offlineCapablePage` used across multiple scenarios
- a shared `context` fixture that blocks service workers and installs boot-time browser shims

This keeps the interesting part of the spec visible:

```ts
test('copies the invite link', async ({ clipboardRecorder, page }) => {
  await page.goto('/settings/team');
  await page.getByRole('button', { name: 'Copy invite link' }).click();
  expect(clipboardRecorder.writes).toEqual(['https://shelf.test/invite/abc123']);
});
```

That reads like behavior, not setup.

## The gotchas

### Mocking too late

If the app boots before the mock exists, you are already wrong.

### Using a mock when Playwright already has real support

If the thing is geolocation, permissions, clock, locale, viewport, or storage state, start with the first-class Playwright feature. A hand-written mock is usually a downgrade there.

### Returning the value without the shape

Framework code often expects methods and event registration points to exist even if the specific test does not care about them. "It returns the right boolean" is not enough if the component also calls `addEventListener`.

### Mocking auth through `localStorage`

If the real app authenticates through browser state, use `storageState` or the app's real login flow. Mocking auth storage by hand is a great way to create a suite that passes while the actual login path is broken.

### Forgetting cross-browser differences

The more custom your mock gets, the easier it is to accidentally hard-code [Chromium](https://www.chromium.org/chromium-projects/) behavior into a test that you think is portable. This is one of those places where a small smoke pass in [Firefox](https://www.mozilla.org/firefox/) or [WebKit](https://webkit.org/) earns its keep.

## The agent rules

```markdown
## Mocking browser APIs

- Use Playwright's first-class emulation and browser options before writing a
  custom browser API mock.
- Install custom browser API mocks with `page.addInitScript()` or
  `browserContext.addInitScript()` before navigation.
- If the app listens for browser API updates, the mock must fire the same
  events the real API would fire.
- Keep one-off mocks in the test. Move shared browser-environment contracts
  into fixtures.
- Do not fake authentication with ad-hoc `localStorage` writes when
  `storageState` or the real login flow exists.
```

## The thing to remember

Browser API mocks are only useful when they preserve the contract your app actually uses. That means early installation, the right object shape, and real event behavior when the component subscribes. Anything less is a fast way to prove your mock works.

## Additional Reading

- [Route-Based Network Interception](route-based-network-interception.md)
- [Storage State Authentication](storage-state-authentication.md)
- [Where Fixtures Actually Help](where-fixtures-actually-help.md)
- [Cross-Browser Validation Without Burning the Dev Loop](cross-browser-validation-without-burning-the-dev-loop.md)
