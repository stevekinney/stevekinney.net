---
title: 'Harden the Flaky Rate-Book Test: Solution'
description: Walkthrough of every fix applied to the deliberately broken rate-book test, from storage state auth through hybrid API assertions.
modified: 2026-04-14
date: 2026-04-10
---

The starting test had eight problems and zero good habits. The finished version has zero problems and—if you squint—reads like a spec. Here's how we get from one to the other, one pattern at a time.

If you want to skip the walkthrough and just see the shipped file, jump to [the final code](#the-shipped-file). But the interesting part isn't the destination—it's the sequence of commits that got us there, because each one isolates exactly one category of fix.

## Fix 1: Storage state authentication

The original test starts with a full UI login:

```ts
await page.goto('/login');
await page.fill('[name=email]', 'alice@example.com');
await page.fill('[name=password]', 'password123');
await page.click('button[type=submit]');
await page.waitForTimeout(1000);
```

Five lines, one `waitForTimeout`, and every test in the suite pays the cost of filling a form and waiting for a redirect. Worse: if the login page changes its markup, every test file that logs in this way breaks.

Storage state fixes all of this. The login happens once in `tests/end-to-end/authentication.setup.ts`, the resulting cookies are saved to disk, and every subsequent test reuses them. The test file doesn't mention `/login` at all.

After this commit, the test starts at `page.goto('/shelf')`. The five login lines are gone. The first `waitForTimeout` is gone with them.

> [!NOTE]
> Shelf's auth stack enforces CSRF-style semantics, so the setup file drives the real login form through a browser rather than POSTing directly to the sign-in endpoint. That's intentional—it also doubles as an implicit smoke test on the login page.

## Fix 2: Deterministic seeding

The original test has no seeding. It assumes "whatever is on the shelf" includes a book with a `.rate` button. On a fresh database, it might. After another test deletes a book, it might not. That's the definition of flaky.

The fix is `resetShelfContent` in a `beforeEach`. This calls the seed helper you build in `tests/helpers/seed.ts`, which resets the shelf to a known state: a specific set of books, no ratings, every time.

```ts
test.beforeEach(async () => {
  await resetShelfContent();
});
```

One line. Now the test knows exactly what's in the database before it starts. The second and third `waitForTimeout` calls were partially compensating for stale or missing data—once the seed is deterministic, half the timing issues disappear on their own.

Notice we use `resetShelfContent`, not `seedFreshDatabase`. The difference matters: `resetShelfContent` resets books and ratings without touching users. If we blew away users, we'd invalidate the storage state we just set up in Fix 1. That's the kind of interaction that burns an hour if you don't know to look for it.

## Fix 3: Semantic locators

The original test uses raw CSS selectors everywhere:

```ts
await page.locator('.book-card button.rate').first().click();
await page.locator('.rating-modal .star[data-value="4"]').click();
await page.locator('.rating-modal button.submit').click();
const toast = await page.locator('.toast').textContent();
```

Every one of these breaks when class names change. The `.first()` call is particularly bad—it grabs whichever book happens to be first in the DOM, which means the test doesn't actually verify a specific book.

The fix uses `getByRole` with scoped chaining:

```ts
const stationEleven = page.getByRole('article', { name: /Station Eleven/ });
await stationEleven.getByRole('button', { name: 'Rate this book' }).click();
```

Now we're targeting a specific book by its accessible name, then scoping inside that article to find the rate button. If someone reorders the shelf, the test still finds Station Eleven. If someone renames the CSS class from `.rate` to `.rating-trigger`, the test doesn't care.

Inside the dialog, same pattern:

```ts
const dialog = page.getByRole('dialog', { name: /Rate Station Eleven/ });
await dialog.getByRole('radio', { name: '4 stars' }).check();
await dialog.getByRole('button', { name: 'Save rating' }).click();
```

The dialog is scoped by role and name. The radio button is found by its label. The submit button is found by its visible text. No CSS. No `data-value` attributes. No compound selectors.

The toast assertion also changes. The original read `textContent()` into a variable and asserted with `.toContain`—which bypasses Playwright's auto-retry entirely. If the toast takes 200ms to appear, the test fails. The fix:

```ts
await expect(page.getByRole('status')).toHaveText(/Thanks/);
```

`toHaveText` auto-retries until the element's text matches or the timeout expires. The `role="status"` locator is more stable than `.toast`, and it's also an accessibility check—if someone removes the ARIA role from the toast, this test fails _and_ the toast is broken for screen reader users.

## Fix 4: Replace waits with real signals

The original has three `waitForTimeout` calls: 1000ms after login, 2000ms after navigating to the shelf, and 1500ms after submitting the rating. Together that's 4.5 seconds of dead time—on a good day.

Fix 1 already eliminated the first one. The second was compensating for the shelf page loading—but we don't need a timeout for that. The `await expect(stationEleven).toBeVisible()` assertion auto-retries until the book card appears. That's the wait. No magic number needed.

The third is the most interesting. The original waits 1500ms after clicking "submit" and hopes the rating has been saved. The fix uses `waitForResponse`:

```ts
const ratingResponse = page.waitForResponse(
  (response) => /\/api\/shelf\/.+/.test(response.url()) && response.request().method() === 'PATCH',
);
await dialog.getByRole('button', { name: 'Save rating' }).click();
const savedResponse = await ratingResponse;
expect(savedResponse.ok()).toBe(true);
```

Note the order: you set up the response listener _before_ the click, then await it _after_. If you do it the other way around, you have a race condition—the response might arrive before you start listening. This is the pattern. Memorize it.

Now the test waits for exactly the right signal: the PATCH request to the shelf API returned a 200. Not "1500ms have passed and I hope things worked out." The actual network response.

## The shipped file

Here's the final test after all four fixes. The inline comments are teaching annotations layered on top of the shipped shape in `tests/end-to-end/rate-book.spec.ts`.

```ts
import { expect, test } from './fixtures'; // Custom fixtures, not bare @playwright/test
import { resetShelfContent } from './helpers/seed';

test.describe('rate a book on your shelf', () => {
  // Fix 2: deterministic seeding — every run starts from the same state
  test.beforeEach(async () => {
    await resetShelfContent();
  });

  // Fix 1: no login block — storage state authentication handles it
  test('user can rate Station Eleven', async ({ page, request }) => {
    await page.goto('/shelf');

    // Fix 3: semantic locator scoped to a specific book
    const stationEleven = page.getByRole('article', { name: /Station Eleven/ });
    await expect(stationEleven).toBeVisible(); // Fix 4: this IS the wait

    // Fix 3: scoped button inside the article
    await stationEleven.getByRole('button', { name: 'Rate this book' }).click();

    // Fix 3: dialog by role and name
    const dialog = page.getByRole('dialog', { name: /Rate Station Eleven/ });
    await expect(dialog).toBeVisible();

    // Fix 3: radio by label instead of .star[data-value="4"]
    await dialog.getByRole('radio', { name: '4 stars' }).check();

    // Fix 4: listen for the response BEFORE clicking
    const ratingResponse = page.waitForResponse(
      (response) =>
        /\/api\/shelf\/.+/.test(response.url()) && response.request().method() === 'PATCH',
    );

    // Fix 3: button by name instead of .submit
    await dialog.getByRole('button', { name: 'Save rating' }).click();

    // Fix 4: await the actual network response
    const savedResponse = await ratingResponse;
    expect(savedResponse.ok()).toBe(true);

    // Fix 3 + 4: auto-retrying assertion on a role-based locator
    await expect(page.getByRole('status')).toHaveText(/Thanks/);

    // Fix 3: verify the rating is visible in the UI
    await expect(stationEleven.getByText('Rated: 4/5')).toBeVisible();

    // Hybrid API assertion — verify the rating actually persisted in the database
    const shelfResponse = await request.get('/api/shelf');
    expect(shelfResponse.ok()).toBe(true);

    const body = (await shelfResponse.json()) as {
      entries: Array<{ book: { title: string }; rating: number | null }>;
    };
    const stationElevenEntry = body.entries.find((entry) => entry.book.title === 'Station Eleven');
    expect(stationElevenEntry?.rating).toBe(4);
  });
});
```

Zero `waitForTimeout`. Zero `page.locator()`. Zero `page.goto('/login')`. Zero `page.fill('[name=')`. Every locator is semantic. Every wait is a real signal.

## What you still need to run

The acceptance criteria require 10 consecutive passes. Here's the loop:

```bash
for i in {1..10}; do npx playwright test --project=chromium tests/end-to-end/rate-book.spec.ts || break; done
```

If any iteration exits non-zero, the test is still flaky. The most common culprit at this point is a seeding issue—`resetShelfContent` didn't fully reset, or the book title doesn't match the regex. Check the seed helper first.

For the wall-time check:

```bash
time npx playwright test --project=chromium tests/end-to-end/rate-book.spec.ts
```

The original test with its 4.5 seconds of `waitForTimeout` calls usually clocks in around 8-10 seconds. The hardened version typically finishes under 5 seconds, sometimes under 3. The exact numbers depend on your machine, but the delta should be obvious.

## The commit sequence

Your git history should show at least four commits, each one addressing a single pattern:

1. **Storage state auth** — delete the login block, wire up `authentication.setup.ts`, verify the test still reaches `/shelf`.
2. **Deterministic seeding** — add `resetShelfContent` in `beforeEach`, verify the book exists before interacting with it.
3. **Semantic locators** — replace every CSS selector with `getByRole`/`getByLabel`/`getByText`, scope by book title.
4. **Real waits** — replace every `waitForTimeout` with `toBeVisible()` or `waitForResponse`, swap `textContent` + `toContain` for auto-retrying assertions.

Each commit should leave the test passing. If a commit breaks the test, you've got the order wrong—probably tried to remove a `waitForTimeout` before the locator it was compensating for was fixed. Work top-down.

## Patterns to take away

- **Authentication is infrastructure, not test code.** Storage state runs once, the whole suite benefits.
- **Seeding is the contract between your test and your database.** If you don't seed, you're testing "whatever happened to be there," which is another way of saying "nothing in particular."
- **Semantic locators are more stable than CSS selectors _and_ they're accessibility assertions for free.** If `getByRole('button', { name: 'Rate this book' })` stops working, either the button lost its accessible name or the accessible name changed. Both of those are bugs worth catching.
- **The assertion is the wait.** `toBeVisible()`, `toHaveText()`, and `waitForResponse` all have built-in retry logic. Adding a `waitForTimeout` on top of them is paying for the same thing twice—except the timeout version is slower _and_ less reliable.

## Additional Reading

- [Lab: Harden the Flaky Rate-Book Test](lab-harden-the-flaky-rate-book-test.md)
- [The Waiting Story](the-waiting-story.md)
- [Storage State Authentication](storage-state-authentication.md)
- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md)
- [API and UI Hybrid Tests](api-and-ui-hybrid-tests.md)
