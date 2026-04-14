---
title: "Solution: Refactor Shelf's Fixtures"
description: One reasonable walk through the fixtures-refactor lab, commit by commit, with the thinking behind each decision.
modified: 2026-04-14
date: 2026-04-11
---

The course solution below is one reasonable endpoint. Yours may look different — the lab grades on the quality of your decisions, not a byte-for-byte match. What follows is the narrative for how I'd walk from `fixtures.ts` to a cleaner final shape, one commit at a time.

If you already finished the lab and want to compare, scroll to the [final file](#the-final-file) at the bottom.

## Commit 1: Rename everything

First, names. `setupUser` describes what the fixture _does_ (it sets up a user); `seededReader` describes what the fixture _provides_ (the reader who got seeded). `setupEmptyShelf` and `setupShelfWithBooks` were lying to the reader — both of them call `resetShelfContent`, and the seed helper you built earlier _always_ shelves Station Eleven and Piranesi. Neither one provides an empty shelf. Collapse them into a single `seededShelf`.

```ts
// Before:
setupUser: async ({}, use) => {
  await use({ email: 'alice@example.com' });
},

setupEmptyShelf: async ({ request }, use) => {
  await resetShelfContent();
  await use(request);
},

setupShelfWithBooks: async ({ request }, use) => {
  await resetShelfContent();
  await use(request);
},
```

```ts
// After:
seededReader: async ({}, use) => {
  await use({ email: 'alice@example.com', name: 'Alice Reader' });
},

seededShelf: async ({ request }, use) => {
  await resetShelfContent();
  await use(request);
  await resetShelfContent();
},
```

Update the spec's parameter destructures to match: `setupUser` becomes `seededReader`, both `setupEmptyShelf` and `setupShelfWithBooks` become `seededShelf`. Merge the two tests that used different names for the same fixture into one test, or keep them split — your call. I kept them split because the assertions they check are different.

Run the spec. It still passes. Commit.

## Commit 2: Teardown the mutating fixtures

Notice the new `await resetShelfContent()` _after_ `await use(request)` in `seededShelf`. That's the teardown half. The starting state didn't have one. The test passed without it, because the next test in the starting file also called `resetShelfContent`, and the seed utility is idempotent. But the moment you add a new test that _doesn't_ call it, the leak becomes visible.

The rule from the lesson: every mutating fixture has a teardown half, and it's always awaited. Zero exceptions. If the teardown is there but unawaited, Playwright thinks the fixture is done and races the next test's setup.

Commit the teardown.

## Commit 3: Demote the helpers

`authedPage` was a lie. It said "here's an authenticated page" but the `labs-fixtures` project already mounts the reader's storage state on every `page`, so every page is already authenticated. The fixture was navigating to `/shelf` and asserting the URL, which is not a fixture — it's two lines of code. Delete it, and inline the navigation in the spec.

`loggedOutPage` was a different problem. It was a real fixture (it built a fresh browser context), but it was only used in one test, and it was awkward to compose because it fought the project-level storage state. The solution file moves it out as a plain helper function and lets the caller own teardown:

```ts
// In fixtures.ts after the refactor:
export const openLoggedOutPage = async (browser: Browser) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  return { page, context };
};
```

```ts
// In the spec:
test('logged-out page is redirected to login when it asks for /shelf', async ({ browser }) => {
  const { page, context } = await openLoggedOutPage(browser);
  await page.goto('/shelf');
  await expect(page).toHaveURL(/\/login/);
  await context.close();
});
```

Note the tradeoff: the helper hands teardown responsibility back to the caller, because only fixtures can _own_ teardown inside Playwright's lifecycle. If you forget `await context.close()`, Playwright will warn you at the end of the run. That warning is the safety net — it's not as tight as a fixture's teardown, but it's visible.

Run the spec. Still green. Commit.

## Commit 4: Add the scope justification comments

The lesson's rule: every fixture has a one-line comment naming the scope choice and why. Here's what the solution file says:

```ts
// Test-scoped: the reader identity is a small, read-only value used
// across multiple labs. It's a constant right now; the fixture shape
// lets us swap in a different seeded user later without touching
// specs.
seededReader: async ({}, use) => { ... },

// Test-scoped: each test gets a freshly-seeded shelf. The teardown
// resets content on the way out, so any mutation this test made
// cannot leak into the next one via worker state.
seededShelf: async ({ request }, use) => { ... },
```

Neither fixture is worker-scoped. That's the honest answer. Neither one has read-only data that's expensive enough to earn shared scope. The _temptation_ to worker-scope `seededShelf` is real — it would be faster — but then every test in the worker would inherit whatever state the previous test left behind, which is exactly the bug the lesson wants you to prevent.

Writing the justification in a comment is how you make the decision visible to the next person. (Future you, in six months.)

## The final file

The refactored `fixtures.ts` is roughly this:

```ts
import { test as base } from '@playwright/test';
import type { APIRequestContext, Browser } from '@playwright/test';
import { resetShelfContent } from '../../helpers/seed';

type SeededReader = {
  email: string;
  name: string;
};

type GoodFixtures = {
  seededReader: SeededReader;
  seededShelf: APIRequestContext;
};

export const test = base.extend<GoodFixtures>({
  // Test-scoped: see above.
  seededReader: async ({}, use) => {
    await use({ email: 'alice@example.com', name: 'Alice Reader' });
  },

  // Test-scoped: see above.
  seededShelf: async ({ request }, use) => {
    await resetShelfContent();
    await use(request);
    await resetShelfContent();
  },
});

export const openLoggedOutPage = async (browser: Browser) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  return { page, context };
};

export { expect } from '@playwright/test';
```

Five fixtures became two fixtures plus one helper. The file is shorter. The intent is clearer. The teardowns are awaited. The scope choices are documented.

## What you should feel

If your version looks similar in _shape_ but different in _details_ — different fixture names, different decisions about which helper gets demoted — that's exactly right. There is no single correct refactor. There is a set of principles, and either your file honors them or it doesn't.

What you should _not_ feel is the urge to add more fixtures. The lesson and the lab are both about removing fixture complexity, not adding it. If your refactor made the file longer, you went the wrong direction.

## Additional Reading

- [Fixtures: Worker-Scoped, Test-Scoped, and the Trap Between Them](fixtures-worker-scoped-test-scoped.md)
- [APIRequestContext Beyond Storage State](api-request-context-beyond-storage-state.md) — the next lesson, which picks up where the `authenticatedRequest` composition example left off and turns it into a real pattern for mid-test user switching.
