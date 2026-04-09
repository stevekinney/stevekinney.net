---
title: Recording HARs for Network Isolation
description: How to record a real HTTP session once and replay it deterministically in every test, so your suite stops depending on someone else's server.
modified: 2026-04-09
date: 2026-04-06
---

Shelf talks to the [Open Library API](https://openlibrary.org/developers/api) to look up books. It's a lovely free service—and also not something I want my end-to-end test suite to depend on.

Here's the problem in one paragraph. Your CI runs a test that searches for "Station Eleven" against the real Open Library API. Most days it works. Some days Open Library is slow, and the test times out. Some days they change the response shape slightly, and your test starts asserting on fields that have moved. One day they rate-limit you, because of course they do, and every test that touches book search fails at once. Your `main` branch turns red and your team spends twenty minutes figuring out that it's not your code—it's somebody else's server having a bad afternoon.

The solution is not to "make the test more resilient." The solution is to stop hitting the real server in tests and replay a recording instead. Playwright has a built-in tool for this, called HAR recording, and it is one of the most underused features in the whole framework.

## What a HAR file is

HAR stands for HTTP Archive. It's a JSON format—standardized, though every tool adds its own flavor—that records an entire HTTP session: every request, every response, every header, every body, every timing. Chrome DevTools' Network tab can export one. `curl` can sort of export one. Playwright can both record and replay them.

A recorded HAR is a snapshot of what the network _actually did_ during a single browser session. When you replay it, Playwright intercepts outgoing requests from the browser and serves the matching recorded response instead of letting the request go to the real network. Same URL, same method, same headers—serve the recorded response. The browser can't tell the difference.

## Recording

You record a HAR by running a test (or a script) in recording mode. Playwright's preferred API is [`page.routeFromHAR`](https://playwright.dev/docs/mock#mocking-with-har-files) with `update: true`:

```ts
test('search for books', async ({ page }) => {
  await page.routeFromHAR('tests/fixtures/open-library-search.har', {
    url: '**/openlibrary.org/**',
    update: true, // <-- record mode
  });

  await page.goto('/search');
  await page.getByLabel('Search').fill('Station Eleven');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('Emily St. John Mandel')).toBeVisible();
});
```

Run this once, with `update: true`, pointed at the real API. Playwright records every matching request and writes a HAR file to `tests/fixtures/open-library-search.har`. Open it in your editor—it's JSON, it's enormous, and you should not be tempted to hand-edit it. Treat it as a binary artifact that happens to be JSON-shaped. (See the `.gitignore` section below for handling sensitive data in HARs.)

Commit the HAR file to the repo. This is not optional. The whole point is that the next time this test runs, it reads the HAR from disk and doesn't touch the real network.

## Replaying

Now delete the `update: true` line (or set it to `false`):

```ts
test('search for books', async ({ page }) => {
  await page.routeFromHAR('tests/fixtures/open-library-search.har', {
    url: '**/openlibrary.org/**',
    // update omitted—replay mode
  });

  await page.goto('/search');
  await page.getByLabel('Search').fill('Station Eleven');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('Emily St. John Mandel')).toBeVisible();
});
```

Run the test. It runs in milliseconds instead of seconds. It works on a plane. It works when Open Library is down. It works identically on every run, because the response is literally a file on disk.

This is determinism as a file. That's the whole magic trick.

## The matching rules, and why they bite

The part that trips people up is how Playwright decides which recorded response to serve. Per the current Playwright docs, HAR replay matches on URL and HTTP method strictly. For `POST` requests it also matches the request payload strictly, and if multiple entries match a request, Playwright picks the one with the most matching headers. If your test makes a request to `https://openlibrary.org/search.json?q=Station+Eleven` and the HAR only has `...q=Station%20Eleven&limit=10`, that is a different request as far as the replay layer is concerned.

This is both a feature and a footgun.

- It's a feature because it means the replay is exact. You're not fuzzing.
- It's a footgun because your application's HTTP client might send requests that look superficially the same but differ in some header or query param, and the HAR doesn't match, and you get a "request not found in HAR" error that is actively unhelpful.

A few ways to make it less sharp:

**Make the request shape deterministic.** If your fetch wrapper serializes query params in a different order on different runs, or if one code path adds optional params and another does not, your replay will miss. Fix the request generation first. The HAR is not the place to paper over nondeterministic callers.

**Keep `notFound: 'abort'` as the default until you have a reason not to.** `notFound: 'fallback'` is useful when you intentionally want unmatched requests to hit the network, but it's the wrong default for deterministic tests because it hides drift. I want a loud failure when the app starts making a request I didn't record.

**Record one scenario at a time.** Don't try to record a HAR that covers the entire test suite at once. One HAR per test file, scoped to one scenario, is easier to regenerate and easier to debug when it breaks.

> [!WARNING]
> Playwright does not serve HAR responses for requests intercepted by a Service Worker. If requests seem to vanish from the replay layer, check whether the app or your test tooling is registering one. The current Playwright recommendation is to set `serviceWorkers: 'block'` when you rely on request interception or HAR replay.

## Refreshing HARs

HARs go stale. The Open Library team adds a field to the search response, or deprecates a field your app was reading, and your stale HAR doesn't know. The test passes against the recording but the real app is broken.

My rule: **regenerate the HAR files once a week, in CI, on a nightly job.** Not on every run—that defeats the determinism. But on a schedule. When the regeneration fails or the diff looks suspicious, the nightly job opens a PR against the HAR files. Someone reviews that PR, notices that Open Library changed something, and updates the app code accordingly. It's early warning for upstream drift.

We'll wire this nightly job in Module 9 as part of the CI lesson. For now, just know that it exists as a pattern.

## What the agent should and shouldn't do

HAR recording is not a tool I want agents reaching for unprompted. Recording involves real network calls, real API keys sometimes, and the agent making the recording has no way to verify that the recorded data is safe to commit. (HARs can contain auth tokens. They often do. You have to scrub them.)

My instruction file rule for HARs:

```markdown
## HAR recording

- HAR files live in `tests/fixtures/` and are replayed via
  `page.routeFromHAR`.
- Never commit a new HAR file without a human reviewing it. HARs can
  contain credentials, session tokens, and private data from third-party
  APIs. Review in the Git diff before committing.
- Do not re-record a HAR to "fix" a failing test. If the HAR no longer
  matches the application's requests, the application changed in a way
  that deserves investigation, not a blind rerecording.
- When a HAR must be regenerated (e.g., because the upstream API
  legitimately changed), regenerate it in a standalone commit so the
  diff is clear.
```

That "do not re-record to fix a failing test" rule is the one you'll thank me for. Agents love to make failing tests pass by re-recording the HAR. Sometimes that's correct. Usually it's masking a real bug. Make it a rule that requires a human in the loop.

## The alternative: mocking at the request layer

I want to be honest about when HARs are the wrong tool. If your test only needs to mock one endpoint with a hand-written response ("return this exact JSON for this exact URL"), use [`page.route`](https://playwright.dev/docs/mock) directly:

```ts
await page.route('**/openlibrary.org/search.json*', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ docs: [{ title: 'Station Eleven' }] }),
  });
});
```

This is fine. It's more explicit. It's version-controlled as code, not as an opaque JSON blob. Use it when the mock is small and the test cares about a specific response shape. Reach for HARs when the mock is _large_—when you're serving a dozen requests, or when the real response is hundreds of KB of data you don't want to hand-type.

## The one thing to remember

Your end-to-end suite should not depend on any server you don't control. HARs let you record reality once and replay it forever, which is how you get tests that pass on an airplane. The cost is a weekly refresh job and a rule that recording is not how you fix failing tests. Both are cheap.

## Additional Reading

- [Storage State Authentication](storage-state-authentication.md)
- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md)
