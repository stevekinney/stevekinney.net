---
title: Testing Third-Party Authentication
description: How to test apps that sign in through Google OAuth, Okta, SAML, or another provider you do not control, without making every test depend on that provider's UI.
modified: 2026-04-14
date: 2026-04-12
---

The hardest authentication bug to explain to a team is this one: _"No, we are not going to make every pull request wait on Google's login screen."_ If your app signs in through Google OAuth, Okta, Auth0, Microsoft, or some enterprise SAML flow you barely understand, it is tempting to treat the provider's UI as part of your regression suite.

That is the wrong boundary.

You do not own Google's DOM. You do not control its rate limits, its bot detection, its occasional extra challenge screen, or the person in IT who rotated the test account's recovery phone number. If you make that UI part of every end-to-end run, you are renting your test suite from somebody else's incident calendar.

## The boundary you actually own

For third-party authentication, there are really three separate questions:

- Can the user _start_ the sign-in flow from your app?
- Can your app create the right session after a successful callback?
- Does your app behave correctly once the user is signed in?

Those questions do not all deserve the same kind of test.

The first one is a narrow integration check. The second one is an application-authentication concern. The third one is what most of your end-to-end suite is actually about. If you collapse them into one giant "log into Google for real" test, you pay the highest possible cost for the least useful signal.

## The normal pattern: bootstrap your app's session

If OAuth eventually produces a normal session cookie in _your_ app, the cleanest pattern is:

1. Add a test-only helper or endpoint in the application that creates that same session for a known test user in test or staging.
2. Call that helper from the Playwright setup project.
3. Save the resulting storage state and let the rest of the suite reuse it.

```ts
import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const authenticationFile = path.resolve('playwright/.authentication/user.json');

setup('authenticate test user for OAuth-backed app', async ({ request }) => {
  const response = await request.post('/test-authentication/session', {
    data: {
      email: 'alice@example.com',
      provider: 'google',
    },
  });

  expect(response.ok()).toBeTruthy();

  await request.storageState({ path: authenticationFile });
});
```

This is not cheating. It is choosing the correct seam.

Your real OAuth callback receives identity from Google and turns it into an application session. The helper should do that same _app-owned_ part directly. What you are bypassing is the provider's UI, not your own authorization model.

The official docs use `playwright/.auth/` as the conventional storage-state folder. Shelf uses `playwright/.authentication/` in the workshop material. Either works. Pick one, keep it out of git, and do not let both conventions drift into the same repository.

Two rules matter here:

- The helper must exist only in test or staging environments, never production.
- The helper must mint the same kind of session the real callback mints. Do not create a fake `"loggedIn": true` toggle that skips roles, claims, or permission checks.

If that second rule sounds picky, good. A fake auth shortcut that bypasses your real session shape is how you get a green test suite that does not resemble production.

## When the final state lives in browser storage

Some stacks do not finish with a plain server cookie. They land the final tokens in `localStorage` or `IndexedDB` through a browser-side SDK. In that case, you still use the same overall idea, but the bootstrap must finish inside a browser context so Playwright can capture the real browser state.

```ts
import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const authenticationFile = path.resolve('playwright/.authentication/user.json');

setup('authenticate browser-backed OAuth session', async ({ page }) => {
  await page.goto('/test-authentication/google?email=alice@example.com');
  await expect(page).toHaveURL('/shelf');

  await page.context().storageState({
    path: authenticationFile,
    indexedDB: true,
  });
});
```

That `indexedDB: true` is the part people miss. If the provider SDK stores tokens there, a cookies-only snapshot is incomplete and your tests will "mysteriously" redirect back to login.

This is still the same storage-state pattern from the earlier lesson. The difference is only that your setup route is building browser-backed auth state instead of a plain server session.

## Keep one tiny real-flow smoke test

You still want one test that proves the integration starts correctly. Clicking `Continue with Google` should redirect to your OAuth start route or to the provider domain. That is a valid thing to test.

```ts
import { test, expect } from '@playwright/test';

test('google sign-in starts the OAuth redirect', async ({ page }) => {
  await page.goto('/login');

  await Promise.all([
    page.waitForURL(/\/auth\/google|accounts\.google\.com/),
    page.getByRole('button', { name: 'Continue with Google' }).click(),
  ]);

  await expect(page).toHaveURL(/\/auth\/google|accounts\.google\.com/);
});
```

That is enough to prove that your sign-in button, route, and redirect wiring are alive. It is not enough to prove every edge case of Google's login flow, and it does not need to. This is a smoke test, not a full outsourced regression suite.

If your app opens a popup instead of redirecting the current page, the same rule applies: assert that the popup or navigation _starts_. Do not turn the provider's full UI into the thing every developer waits on.

## Put the real provider flow in its own lane

Sometimes you really do need one full end-to-end provider test. Maybe your compliance team requires it. Maybe a customer-specific SAML configuration breaks often enough that you want one real monitor.

Fine. Just isolate it.

- Run it against dedicated test accounts with the smallest permissions possible.
- Keep it out of the main pull-request gate if the provider can rate-limit, challenge, or randomly slow down.
- Run it on a schedule or as a manually-invoked environment check, not as the thing that decides whether every unrelated feature branch can merge.
- If the provider offers a sandbox or test tenant, use it.

The key distinction is this: a real-provider flow can be a useful smoke test, but it is a terrible default for the everyday developer loop.

## The failure mode to avoid

When a team first hits Google OAuth in Playwright, the usual instinct is one of these:

- Automate the whole provider UI in every test.
- Add `page.waitForTimeout(5000)` until the redirect eventually settles.
- Save one long-lived authenticated profile and hope it never expires.

All three are unstable.

The stable version is boring:

- one small redirect smoke test
- one app-owned bootstrap path for normal authenticated tests
- one storage-state file per role
- one isolated real-provider smoke lane, only if you truly need it

If you ever do need to swap a single browser context from one auth state to another inside a narrow smoke flow, newer Playwright versions add `browserContext.setStorageState()`. That is an advanced edge, not the default path. The default is still "fresh context, known state, no heroics."

That structure is what keeps "auth is external" from turning into "the whole suite is external."

## The agent rules

```markdown
## Third-party authentication

- For Google OAuth, Okta, Auth0, Microsoft, SAML, or any other
  third-party provider, do not drive the provider UI in every test.
- Keep one narrow smoke test for "the sign-in flow starts."
- For the normal authenticated suite, bootstrap the application's own
  session in test or staging and save Playwright storage state from
  there.
- If the auth state lives in browser storage, capture it with
  `browserContext.storageState({ indexedDB: true })`.
- If you deliberately switch auth state mid-flow, prefer
  `browserContext.setStorageState()` over hand-mutating cookies and
  localStorage.
- Any full real-provider flow belongs in a dedicated smoke lane, not the
  normal pull-request gate.
```

## The one thing to remember

Do not regression-test Google's login page. Regression-test _your app's relationship to authentication_. Start the redirect once, prove you can create the right session, save it to storage state, and spend the rest of your test budget on behavior you actually own.

## Additional Reading

- [Storage State Authentication](storage-state-authentication.md)
- [Playwright Projects](playwright-projects.md)
- [APIRequestContext: Beyond Storage State](api-request-context-beyond-storage-state.md)
