---
title: API and UI Hybrid Tests
description: Use the `request` fixture to set up state via API and assert via UI. Faster, clearer, and the pattern most teams haven't found yet.
modified: 2026-04-12
date: 2026-04-06
---

Here's a pattern I didn't know about for the first two years I used Playwright, and I'm still a little annoyed about it.

Playwright tests get a [`request` fixture](https://playwright.dev/docs/api-testing) alongside `page`. It's a full HTTP client with the same base URL and authentication context as the browser, and you can use it to set up or assert on state that would otherwise require clicking through six pages of UI. The combination—set up via API, act and assert via UI—is what I call a hybrid test, and it is the right default for 80% of end-to-end tests once you've seen it.

Let's look at why.

## The test that does too much

A classic end-to-end test for "user can view their shelf stats" often starts this way:

```ts
test('shelf stats show total books read', async ({ page }) => {
  // Add five books through the UI
  for (const title of ['A', 'B', 'C', 'D', 'E']) {
    await page.goto('/search?q=' + title);
    await page.getByRole('button', { name: 'Add to shelf' }).click();
    await page.getByRole('button', { name: 'Mark as finished' }).click();
  }

  // Now check the stats page
  await page.goto('/stats');
  await expect(page.getByText('Books read: 5')).toBeVisible();
});
```

This test is about the stats page, but most of the test is setting up books. Every iteration of the loop is a full browser round-trip. The test is slow, it's covering behavior that's already tested in _other_ tests (adding books, marking as finished), and if any of that UI changes, this test breaks for reasons that have nothing to do with stats.

This is a common anti-pattern: the end-to-end test that accidentally becomes an integration test for every feature it touches during setup.

## The hybrid version

```ts
test('shelf stats show total books read', async ({ page, request }) => {
  // Seed five finished books via the API
  for (const openLibraryId of ['OL1', 'OL2', 'OL3', 'OL4', 'OL5']) {
    await request.post('/api/shelf', {
      data: { openLibraryId, status: 'finished' },
    });
  }

  // Now check the stats page
  await page.goto('/stats');
  await expect(page.getByText('Books read: 5')).toBeVisible();
});
```

The setup is API calls. The assertion is still a real browser navigating a real page. The test is three times faster, half as long, and—critically—it _only_ tests the stats page. If the "add book" UI breaks, this test still passes, because this test isn't about adding books. The test for adding books is the one that breaks, as it should.

The `request` fixture authenticates automatically via whatever storage state the test project is using, so you don't have to attach cookies or tokens. That's the whole point of the fixture versus using raw `fetch`.

In Shelf, the concrete version of this pattern lives in `tests/end-to-end/rate-book.spec.ts`. The authenticated project in `playwright.config.ts` provides the storage state from `tests/end-to-end/authentication.setup.ts`, the seed helpers live in `tests/end-to-end/helpers/seed.ts`, and the rate-book fix in the companion lab depends on waiting on the real network signal with `page.waitForResponse` instead of guessing with a timeout.

## When to use API, when to use UI

The heuristic I use:

- **Setup**: API. You're building a scenario. The browser is overkill.
- **The action under test**: UI. You are literally testing that the button works.
- **Tear-down**: API or none (rely on seeding/isolation from the previous lesson).
- **Side-effect verification**: either. If you need to know that the database actually recorded a write, an API GET is cheaper and more specific than navigating to a page and reading text. If you need to know a real user would see the change, UI.

The trap is reaching for UI when API would do. I've rarely seen the opposite mistake—agents reach for UI by default because that's what Playwright tests "look like" in the examples. Your instructions file has to explicitly tell them there's another option.

## A trickier example: setup the scenario, assert the consequence

Shelf has a feature where finishing a book updates a "currently reading" counter on the home page. Let's test that.

```ts
test('finishing a book updates the currently-reading counter', async ({ page, request }) => {
  // Set up: alice has two books currently reading
  await request.post('/api/shelf', {
    data: { openLibraryId: 'OL1', status: 'reading' },
  });
  await request.post('/api/shelf', {
    data: { openLibraryId: 'OL2', status: 'reading' },
  });

  // Check the counter
  await page.goto('/');
  await expect(page.getByText('Currently reading: 2')).toBeVisible();

  // Finish one via the UI—this is the actual action under test
  await page.goto('/shelf');
  await page
    .getByRole('article', { name: /Station Eleven/ })
    .getByRole('button', { name: 'Mark as finished' })
    .click();

  // Counter should decrement
  await page.goto('/');
  await expect(page.getByText('Currently reading: 1')).toBeVisible();
});
```

The shape is: API setup, UI action, UI assertion. The setup is cheap and deterministic. The action is what we actually care about. The assertion is what the user would see. Nothing is wasted.

Compare this to the all-UI version, where adding two books via the search page, clicking "start reading" on each one, and navigating back to the home page would take another two seconds of wall time and a dozen extra lines of code. For a test that isn't about searching or starting, none of that setup earns its keep.

## Using `request` as a smoke test for the API itself

One nice side effect: you can use the `request` fixture to write fast API-only tests for endpoints that don't have a dedicated unit test. This isn't strictly a hybrid pattern—it's pure API—but it lives in the same file and uses the same authentication context:

```ts
test('POST /api/shelf creates an entry', async ({ request }) => {
  const response = await request.post('/api/shelf', {
    data: { openLibraryId: 'OL1', status: 'reading' },
  });
  expect(response.status()).toBe(201);

  const body = await response.json();
  expect(body.status).toBe('reading');
});
```

No browser, no UI, just an HTTP assertion. These run in the tens of milliseconds and they fill in the coverage gap between unit tests and full end-to-end tests. They also make excellent smoke tests at the top of a test file—if the API contract is broken, fail fast before the rest of the tests try to set up state through it.

## The pitfall: drifting schemas

One risk of API setup is that the test bypasses whatever validation the UI does. If the real form has a "you can only add a book if you're logged in and not over your 500-book limit" check, the API call might skip the 500-book check and put your test in an impossible state. Usually this is a feature—it lets you set up edge cases the UI couldn't reach—but sometimes it hides a real bug.

The safeguard is that the API should have the same validation as the form. That's good server design anyway. If your API lets the test do things the UI doesn't, you've got a bigger problem than your test suite.

## CLAUDE.md rules

```markdown
## Hybrid API+UI tests

- Use the `request` fixture for scenario setup whenever the UI for that
  setup is already tested elsewhere. Don't click through "add book" in
  a test whose subject is the stats page.
- The action under test is always performed through the UI. If the
  test's purpose is "clicking X causes Y," do not short-circuit the
  click with an API call.
- Both `page` and `request` share the same authentication context from
  `storageState`. You do not need to attach tokens manually.
- If you need pure API tests for an endpoint, put them in the same test
  file as the UI tests for that endpoint, using the same `request`
  fixture and no `page`.
```

## The one thing to remember

The fastest test is the one that skips the work it isn't measuring. Use API for setup, UI for the thing you're actually testing, and don't mix those up. Most end-to-end tests in most codebases are slower and flakier than they need to be because the setup is pretending to be the subject.

## Additional Reading

- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md)
- [Lab: Harden the Flaky Rate-Book Test](lab-harden-the-flaky-rate-book-test.md)
