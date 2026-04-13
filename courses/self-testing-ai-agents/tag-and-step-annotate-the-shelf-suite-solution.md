---
title: 'Solution: Tag and Step-Annotate the Shelf Suite'
description: One walk through the steps-and-tags lab, with the exact diff each commit introduces and why.
modified: 2026-04-11
date: 2026-04-11
---

One reasonable walk from the starting state of `rate-book.spec.ts` and `search.spec.ts` to a hardened version. As with the other solutions in this course, yours may make different calls — different step labels, different tag choices, different places to drop an annotation. The principles you're grading against are in the lesson; this is the narrative.

## Commit 1: Steps in the rate-book test

Four natural phases in the flow: land on the shelf, open the dialog, submit the rating, verify persistence. Each becomes a `test.step`.

```ts
import { expect, test } from './fixtures';
import { resetShelfContent } from './helpers/seed';

test.describe('rate a book on your shelf', () => {
  test.beforeEach(async ({ request }) => {
    await resetShelfContent(request);
  });

  test('user can rate Station Eleven', { tag: ['@critical'] }, async ({ page, request }) => {
    await test.step('open the shelf page', async () => {
      await page.goto('/shelf');
    });

    const stationEleven = page.getByRole('article', { name: /Station Eleven/ });

    await test.step('open the rate-book dialog for Station Eleven', async () => {
      await expect(stationEleven).toBeVisible();
      await stationEleven.getByRole('button', { name: 'Rate this book' }).click();
    });

    await test.step('submit 4 stars', async () => {
      const dialog = page.getByRole('dialog', { name: /Rate Station Eleven/ });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('radio', { name: '4 stars' }).check();

      const ratingResponse = page.waitForResponse(
        (response) =>
          /\/api\/shelf\/.+/.test(response.url()) && response.request().method() === 'PATCH',
      );
      await dialog.getByRole('button', { name: 'Save rating' }).click();
      const savedResponse = await ratingResponse;
      expect(savedResponse.ok()).toBe(true);
    });

    await test.step('verify the rating persists on the shelf and via API', async () => {
      await expect(page.getByRole('status')).toHaveText(/Thanks/);
      await expect(stationEleven.getByText('Rated: 4/5')).toBeVisible();

      const shelfResponse = await request.get('/api/shelf');
      expect(shelfResponse.ok()).toBe(true);
      const body = (await shelfResponse.json()) as {
        entries: Array<{ book: { title: string }; rating: number | null }>;
      };
      const entry = body.entries.find((e) => e.book.title === 'Station Eleven');
      expect(entry?.rating).toBe(4);
    });
  });
});
```

Notice what I didn't change: every assertion still checks the same thing in the same order. The only thing the steps add is a label around the groups. Run `npm run test:e2e`, confirm green, commit.

## Commit 2: Tag and step the search tests

The first search test is the smoke check for the entire search feature. It's `@critical`. The second test is also `@critical` — it exercises the full add-to-shelf flow. Both get tagged.

```ts
test(
  'search returns Open Library results from the replayed HAR',
  { tag: ['@critical'] },
  async ({ page }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'https://github.com/stevekinney/shelf-life/issues/TBD',
    });

    await test.step('replay the Open Library HAR', async () => {
      await page.routeFromHAR(STATION_ELEVEN_HAR, {
        url: '**/openlibrary.org/**',
        notFound: 'abort',
      });
    });

    await test.step('run the search and wait for results', async () => {
      await page.goto('/search?query=station+eleven');
    });

    await test.step('verify the Station Eleven result is fully rendered', async () => {
      const stationEleven = page.getByRole('article', { name: /Station Eleven/ }).first();
      await expect.soft(stationEleven).toBeVisible();
      await expect.soft(stationEleven.getByText(/Emily St\. John Mandel/)).toBeVisible();
    });
  },
);
```

Three things happened here:

1. The test is now `@critical` — one line on the signature.
2. The test has an `issue` annotation. The URL is a placeholder, the shape is real.
3. The final visibility checks are `expect.soft`. If the article is missing _and_ the author is missing, both failures land in the report instead of just the first.

The second search test follows the same pattern — steps wrapping the HAR replay, the navigation, the "first delete the pre-seeded entry" block, and the "click add and verify the toast" block. I won't paste the whole thing here; the structure is mechanical once you've seen the rate-book one.

Run the full suite. Green. Commit.

## Commit 3: Verify the tag filter works

```bash
npx playwright test --grep @critical
```

Should show three tests (the rate-book one, plus both search tests). If anything you didn't tag shows up, you have a regex leak. If something you _did_ tag doesn't show up, the tag array is wrong.

## What a failure now looks like

Break the rate-book test deliberately — change `4` to `5` in the assertion — and run it. The failure report now reads:

```
1) [authenticated] › rate-book.spec.ts:10 › user can rate Station Eleven
   Error in step: verify the rating persists on the shelf and via API
   expected 5 but received 4
```

Compare that to the before, which said:

```
1) [authenticated] › rate-book.spec.ts:42
   expected 5 but received 4
```

Same mismatch, dramatically different story. The agent reading the dossier knows the failure is in the "verify the rating persists" phase, which means the PATCH went through (otherwise an earlier step would have blown up), which means the issue is either in the response parsing or in whatever the server returned. That's three possible causes out of an initial space of "any of the twelve things this test does."

Un-break the test. Run the full suite. Commit the diff.

## Stretch: the step-only reporter

The custom reporter in the lab is ~30 lines. Drop it in `tests/reporters/step-reporter.ts`, add it to a temporary lab-only Playwright config or your main config while you experiment, and the next failing lab run prints exactly the step names and durations for the failing tests — nothing else. That output is the cleanest possible input for the [failure dossier summarizer](failure-dossiers-what-agents-actually-need-from-a-red-build.md), which currently has to parse the full JSON reporter output to extract the same information.

You probably won't ship the step-only reporter to production. You'll use it locally when you're debugging a long chain.

## Additional Reading

- [test.step, Tags, and Annotations](test-step-tags-annotations.md) — the lesson this solution walks through.
- [Failure Dossiers: What Agents Actually Need From a Red Build](failure-dossiers-what-agents-actually-need-from-a-red-build.md) — the dossier that now reads better because every step has a label.
- [Lab: Refactor Shelf's Fixtures](lab-refactor-shelf-fixtures.md) — a different kind of refactor, same spirit.
