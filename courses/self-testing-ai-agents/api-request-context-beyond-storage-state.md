---
title: APIRequestContext Beyond Storage State
description: Storage state is a photograph of a logged-in browser. When you need to log in as a second user, hit an authenticated API without driving the UI, or survive a token refresh, you need the real HTTP client.
modified: 2026-04-14
date: 2026-04-11
---

Storage state is a photograph of a logged-in browser. Photographs don't refresh, they don't log in as a second user mid-test, and they don't get you an authenticated API request without spinning up a full Playwright context first. The [Storage State Authentication lesson](storage-state-authentication.md) covered the 90% case. This lesson is about the 10% that trips agents every time.

The thing I want you to leave this lesson understanding is that the `request` fixture you've been calling on the side of your tests is actually a full HTTP client. It's called `APIRequestContext`, it has its own cookie jar, and you can build more than one of them in a single test.

The [API testing docs](https://playwright.dev/docs/api-testing) make two other useful facts explicit:

- the built-in `request` fixture already inherits config like `baseURL` and default headers
- `browserContext.request` shares cookies with that browser context

Those two details are why this is more than "slightly nicer `fetch`."

## What storage state actually is

Shelf's setup project logs in once, writes `playwright/.authentication/user.json`, and every authenticated test inherits that file by way of the `storageState` project option. The file itself is a JSON blob — cookies and `localStorage` entries — that Playwright mounts into a new browser context before your test starts. That's the whole mechanism.

This is brilliant for the common case and completely useless in three others:

1. You need to log in as a _second_ user mid-test (admin + reader, two teams, a handoff flow).
2. You want to hit an authenticated API endpoint without spinning up a browser at all — because you're seeding state, or checking persistence, or just going faster than a UI can.
3. The session expires during the test, and you need to refresh and retry.

All three of these live outside what storage state can do for you. All three of them are `APIRequestContext` territory.

## The `request` fixture is a full HTTP client

You've already seen this in the [API and UI Hybrid Tests lesson](api-and-ui-hybrid-tests.md). The rate-book test ends with a `request.get('/api/shelf')` call to verify persistence after the UI finished writing. That `request` is the per-test `APIRequestContext` fixture, and it's already authenticated because the `authenticated` project mounted the reader's storage state on the context.

Here's the thing the lesson didn't tell you: `request` is not a convenience wrapper. It's a full HTTP client. It has its own cookie jar, it can set extra headers, and — _and this is the part agents get wrong constantly_ — you can construct _more_ than one of them in a single test:

```ts
import { request as playwrightRequest } from '@playwright/test';

test('two actors', async ({ page }) => {
  const adminApi = await playwrightRequest.newContext({
    storageState: 'playwright/.authentication/admin.json',
  });

  // ... use adminApi.get(...) alongside the test's authenticated `page`
  await adminApi.dispose();
});
```

Note the shape. `playwrightRequest.newContext(...)` — the top-level `request` export from `@playwright/test`, _not_ the per-test `request` fixture's method. Agents type `request.newContext(...)` in a test and get a type error, then they type `this.request.newContext(...)` and get a different error, then they give up and drive the second user through the UI. You don't need any of that. You need the top-level import.

If you do **not** need a second actor, do not create one. The built-in fixture is already carrying the project's `baseURL`, headers, and auth state. A surprising amount of hand-built API client code in test suites is just a slower way to recreate what the fixture already knows.

## Pattern: authenticated setup without a browser

You've already seen the rate-book hybrid test use `request.get('/api/shelf')` to verify persistence. Here's the principled version of what you were already doing.

Instead of calling the endpoint on the side of a UI test, you can _compose_ a fixture that hands every test an `APIRequestContext` pre-configured with admin credentials. The fixture-composition example from the [fixtures lesson](fixtures-worker-scoped-test-scoped.md) is the shape; here it is with Shelf's real paths:

```ts
export const test = base.extend<{ adminRequest: APIRequestContext }>({
  adminRequest: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      storageState: 'playwright/.authentication/admin.json',
    });
    await use(context);
    await context.dispose();
  },
});
```

Any test that asks for `adminRequest` now gets an HTTP client that's carrying the admin session cookie. No browser. No login flow. The Shelf starter doesn't ship the admin storage-state setup file, so you create it as part of this workflow and write `playwright/.authentication/admin.json` yourself:

```ts
// tests/labs/admin.setup.ts
import path from 'node:path';
import { expect, test as setup } from '@playwright/test';
import { resetShelfContent, seeded } from '../helpers/seed';

const adminStorageStatePath = path.resolve('playwright/.authentication/admin.json');

setup('authenticate the seeded admin', async ({ page }) => {
  await resetShelfContent();

  await page.goto('/login');
  await page.getByLabel('Email').fill(seeded.admin.email);
  await page.getByLabel('Password').fill(seeded.admin.password);
  await page.getByLabel('Display name').fill(seeded.admin.name);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/shelf/);
  await page.context().storageState({ path: adminStorageStatePath });
});
```

The Shelf starter doesn't ship that file. You create it during the lab, then run it with the labs enabled:

```bash
PLAYWRIGHT_INCLUDE_LABS=1 npx playwright test tests/labs/admin.setup.ts
```

That one run writes `playwright/.authentication/admin.json`, and the `adminRequest` fixture can reuse it after that.

With the fixture in place, a test that needs to create a book as the admin and verify it as the reader can stay this small:

```ts
test('admin curates, reader sees', async ({ page, adminRequest }) => {
  await adminRequest.post('/api/admin/featured-books', {
    data: { openLibraryId: 'OL1W' },
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /featured/i })).toBeVisible();
});
```

Two actors, one test, no extra UI login. This is the part of the API fixture that makes tests ten times faster than the equivalent browser flow, because you're skipping all the rendering.

## Pattern: a second user mid-test

When the thing you're testing _is_ the two-actor interaction — admin promotes a book, reader sees it show up — you need both clients side by side. The fixture handles the admin side; the test's `page` handles the reader side:

```ts
test('promoted book appears on the reader home page', async ({ page, adminRequest }) => {
  const response = await adminRequest.post('/api/admin/featured-books', {
    data: { openLibraryId: 'OL1W' },
  });
  expect(response.ok()).toBe(true);

  await page.goto('/');
  await expect(page.getByRole('article', { name: /Station Eleven/ })).toBeVisible();
});
```

One test, two authenticated identities, zero shared state. This is the pattern where the `APIRequestContext` earns its keep.

> [!TIP] One actor per test by default
> Multi-actor tests are powerful and they will bite you. Default to one actor per test. Reach for two when the behavior under test _is_ the handoff between them. Three actors in a single test is almost always a smell.

## Pattern: same actor, shared cookies

Sometimes you do not need a second actor at all. You need the browser and the API client to be the same actor with one shared session. That is [`browserContext.request`](https://playwright.dev/docs/api-testing).

Log in through the page, call an endpoint through `browserContext.request`, and the cookie jar stays in sync. That is cleaner than copying `Cookie` headers around and more honest than pretending the API read and the browser are unrelated users.

## Pattern: surviving a token refresh

Shelf's [Better Auth](https://www.better-auth.com/) session is long-lived enough that you won't see this in practice, but it's a common agent trap, so it's worth showing. If your app's session expires mid-test (think: 15-minute tokens with refresh), the fixture-composition pattern gives you one clean place to handle re-auth:

```ts
refreshableAdmin: async ({ playwright }, use) => {
  let context = await playwright.request.newContext({
    storageState: 'playwright/.authentication/admin.json',
  });

  const withRetry: APIRequestContext = new Proxy(context, {
    get(target, prop) {
      const original = Reflect.get(target, prop);
      if (typeof original !== 'function') return original;
      return async (...args: unknown[]) => {
        const result = await original.apply(target, args);
        if (result?.status?.() === 401) {
          await context.dispose();
          context = await playwright.request.newContext({
            storageState: 'playwright/.authentication/admin.json',
          });
          return (Reflect.get(context, prop) as Function).apply(context, args);
        }
        return result;
      };
    },
  });

  await use(withRetry);
  await context.dispose();
};
```

This is longer than you'd expect, and that's the point. Session refresh is one of those things that looks like a one-liner and turns into a full afternoon when you get it wrong. Put it in a fixture, get it right once, and every test in the suite inherits the fix.

If you don't need token refresh — and you probably don't, today — don't write this. But the shape is worth recognizing for when you do.

## When NOT to use `APIRequestContext`

The test I want you to write _is_ a UI test. The thing you're verifying _is_ the UI. Don't skip the UI because the API is faster — you'd be testing the wrong thing. `APIRequestContext` is for _setup_ and _verification_, not for replacing the behavior you're actually testing.

Specifically:

- Verifying the login flow itself: use the browser. That's what's under test.
- Verifying UI validation, error states, loading spinners, keyboard focus: use the browser.
- Verifying that a server action actually persisted: use `request.get(...)` on the side. This is the hybrid pattern from the [API and UI Hybrid Tests lesson](api-and-ui-hybrid-tests.md).
- Verifying that the API rejects bad input: write a pure API test. The browser is ceremony.

The rule I apply: if my test has a `page.getByRole(...)` assertion that I could rewrite as a `request.get(...)` assertion _without losing anything_, then I've been UI-testing an API and I should split the test in two.

## The agent rules

```markdown
## APIRequestContext

- Prefer API setup for state (`resetShelfContent`, `seedFreshDatabase`, direct POSTs). Reserve the UI for the behavior actually under test.
- One test, one actor by default. Add a second actor only when the behavior under test _is_ the handoff.
- For multi-actor tests, build a fixture that exposes an authenticated `APIRequestContext` via `playwright.request.newContext({ storageState })`. Do not type `request.newContext(...)`—that is not a method on the per-test fixture.
- Use `browserContext.request` when the browser page and the API call are
  the same actor and should share cookies automatically.
- Worker-scope the fixture when the session is read-only (verifying, listing). Test-scope it when the actor mutates state.
- Dispose every `APIRequestContext` you construct yourself. The test's per-test `request` fixture disposes itself; hand-built ones don't.
```

## The thing to remember

Storage state is a photograph. `APIRequestContext` is a camera. The photograph is perfect for the one person you log in as at setup time. The camera is what you reach for when the test needs a second person, a second session, or a second chance at authentication. Most tests are fine with the photograph. The ones that aren't are the ones this lesson is about.

## Additional Reading

- [Storage State Authentication](storage-state-authentication.md) — the prerequisite. This lesson assumes you already know how storage state gets written and mounted.
- [API and UI Hybrid Tests](api-and-ui-hybrid-tests.md) — the lesson where the `request` fixture first showed up, and the source of the hybrid-verification pattern this lesson generalizes.
- [Fixtures: Worker-Scoped, Test-Scoped, and the Trap Between Them](fixtures-worker-scoped-test-scoped.md) — for the composition example that makes the second-actor pattern possible without copy-pasting a `newContext` call into every spec.
