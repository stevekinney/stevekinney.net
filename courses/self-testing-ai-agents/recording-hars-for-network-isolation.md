---
title: Recording HARs for Network Isolation
description: How to record a real HTTP session once and replay it deterministically in every test, so your suite stops depending on someone else's server.
modified: 2026-04-10
date: 2026-04-06
---

Shelf talks to the [Open Library API](https://openlibrary.org/developers/api) to look up books. It's a lovely free service—and also not something I want my end-to-end test suite to depend on.

Here's the problem. Your CI runs a test that searches for "Station Eleven" against the real Open Library API. Most days it works. Some days they're slow, or they change the response shape, or they rate-limit you. Your `main` branch turns red and your team spends twenty minutes figuring out that it's not your code—it's somebody else's server.

The solution is to stop hitting the real server in tests and replay a recording instead. Playwright has a built-in tool for this—HAR recording—and it is one of the most underused features in the whole framework.

## What a HAR file is

HAR stands for HTTP Archive. It's a JSON format—standardized, though every tool adds its own flavor (Chrome embeds page timings, Playwright stores decoded response bodies)—that records an entire HTTP session. The core structure is the same everywhere: `log.entries[]`, where each entry holds one request/response pair with URL, method, headers, body, and timing. Chrome DevTools can export one. Playwright can both record and replay them.

A recorded HAR is a snapshot of what the network _actually did_ during a single browser session. When you replay it, Playwright intercepts outgoing requests and serves the matching recorded response instead of letting the request hit the real network. The browser can't tell the difference.

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

The `url` option takes a [glob pattern](https://playwright.dev/docs/network#glob-url-patterns) (`*` matches anything except `/`, `**` matches anything including `/`, and the glob must match the full URL). Playwright also accepts a `RegExp` here. The `update` option is a boolean that defaults to `false` (replay mode).

Run this once, with `update: true`, pointed at the real API. Playwright records every matching request and writes a HAR file to `tests/fixtures/open-library-search.har`. Open it in your editor—it's JSON, it's enormous, and you should resist editing it by hand.

> [!WARNING]
> HARs are machine-generated fixtures with nested request/response data and optional attached body files. Casual hand-edits are brittle—it's easy to break a response body or invalidate a match without realizing. Automate changes with a script and always verify replay afterward.

Commit the HAR file to the repository. This is not optional—the whole point is that the next time this test runs, it reads the HAR from disk and doesn't touch the real network.

> [!TIP]
> HARs are test fixtures and belong in version control, but review them before committing. Credentials, session cookies, and PII can hide in response bodies and headers. See [Approaches to HAR Recording](approaches-to-har-recording.md) for scrubbing guidance, and use a dedicated test user (see [Storage State Authentication](storage-state-authentication.md)) to minimize what needs scrubbing.

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

This is determinism as a file—not determinism from mocking logic you maintain in code, but from a recorded artifact on disk. That's the whole magic trick.

## The matching rules, and why they bite

The part that trips people up is how Playwright decides which recorded response to serve. HAR replay matches on URL and HTTP method strictly. For `POST` requests it also matches the payload. If multiple entries match, Playwright picks the one with the most matching headers. This tiebreaker rarely matters for API calls—URL + method usually produce a single match—but it comes up for browser-initiated requests where entries share a URL but differ by `Accept` or `Referer`.

If your test makes a request to `https://openlibrary.org/search.json?q=Station+Eleven` and the HAR only has `...q=Station%20Eleven&limit=10`, that is a different request as far as the replay layer is concerned. This isn't Playwright-specific—HTTP treats `?a=1&b=2` and `?b=2&a=1` as different URLs.

This is both a feature and a footgun.

- It's a feature because the replay is exact—two tests recording different search queries produce HAR entries that never collide.
- It's a footgun because your application's HTTP client might send requests that look superficially the same but differ in some header or query param, and the HAR doesn't match.

A few ways to make it less sharp:

**Make the request shape deterministic.** If your fetch wrapper serializes query params in a different order on different runs, your replay will miss. Fix the request generation first—the HAR is not the place to paper over nondeterministic callers.

**Keep `notFound: 'abort'` as the default.** `'abort'` (the default) kills unmatched requests immediately—the browser sees a network error, and your test fails loudly. `'fallback'` lets unmatched requests pass through to other route handlers and eventually to the real network. Use `'fallback'` only when you want _some_ requests to be live while replaying only the API traffic.

**Record one scenario at a time.** One HAR per test file, scoped to one scenario, is easier to regenerate and debug when it breaks.

**When you see "request not found in HAR."** Playwright throws this when a request matches the `url` glob but no HAR entry matches the full URL + method + payload. Common causes: a query parameter changed order, a new header appeared, or the request body is slightly different. **Inspect the diff first**—compare what the test is sending against what the HAR has. Run with `DEBUG=pw:api` to see the exact request Playwright tried to match. Only re-record after you understand _why_ the request changed.

When your app fires concurrent requests to the same endpoint (e.g., three parallel fetches to `/api/books/:id`), Playwright serves them in the order the entries appear in the HAR's `entries` array—each request consumes the next unmatched entry with a matching URL and method.

> [!NOTE]
> If your app chains API calls—using a URL from response A to make request B—the second URL may differ between recordings. Signed URLs, nonce-bearing redirects, and pagination cursors won't match on replay. For these cases, [`page.route`](https://playwright.dev/docs/mock) with a custom handler is a better tool than HAR replay.

> [!NOTE]
> HAR replay is stateless—each request gets the same recorded response regardless of what happened earlier in the test. If your test expects a response to _change_ based on a prior action (add a book, then list books expecting the new one), the HAR won't reflect that progression. For state-dependent flows, seed the expected state before the test and record the HAR against that known seed.

> [!WARNING]
> Service Workers intercept network requests _before_ Playwright's route handler sees them. If your app registers a Service Worker (common in PWAs or when a library installs one for caching), those requests bypass `routeFromHAR` entirely—they're served from the Service Worker's cache, not from the HAR. Set `serviceWorkers: 'block'` in your Playwright config when you rely on HAR replay.

## Refreshing HARs

HARs go stale. The Open Library team adds a field to the search response, or deprecates a field your app was reading, and your stale HAR doesn't know. The test passes against the recording but the real app is broken.

My rule: **regenerate on a schedule, in CI, on a nightly job.** Not on every run—that defeats the determinism. The nightly job targets only HAR-backed tests, re-records with retries disabled and a dedicated test user, diffs the results, and opens a PR if anything changed. A human reviews the diff. The typical signal: a new or removed field in a response body.

This is _scheduled_ regeneration to catch upstream drift—not on-demand re-recording to silence a failing test. When a test fails because the HAR doesn't match, the first question is _why_ the request shape changed. If your code changed the request, fix the code or re-record deliberately. If the upstream API changed, that's what the nightly job is for. Blind re-recording hides both bugs and drift.

The [nightly verification lesson](nightly-verification-loops.md) shows the CI workflow for this, including the placeholder `har-refresh` job.

## What the agent should and shouldn't do

HAR recording is not a tool I want agents reaching for unprompted. Recording involves real network calls, and HARs can contain credentials in several places: `Authorization` and `Cookie` request headers, `Set-Cookie` response headers, and request or response bodies (OAuth exchanges, API key parameters). You have to scrub them.

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
- Approved HAR refresh (the nightly CI job or a human-initiated
  re-recording workflow) is different from ad-hoc re-recording to
  silence a failing test. The refresh workflow is expected to change
  HARs; an agent fixing a red test is not.
```

That "do not re-record to fix a failing test" rule is the one you'll thank me for. Agents love to make failing tests pass by re-recording. Usually it's masking a real bug.

## The alternative: mocking at the request layer

If your test only needs to mock one endpoint with a hand-written response, use [`page.route`](https://playwright.dev/docs/mock) directly:

```ts
await page.route('**/openlibrary.org/search.json*', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ docs: [{ title: 'Station Eleven' }] }),
  });
});
```

This is fine—more explicit, version-controlled as code. Use it when the mock is small. Reach for HARs when the mock is _large_—a dozen requests, or hundreds of KB of response data you don't want to hand-type.

`page.route` and `page.routeFromHAR` can coexist. Playwright runs routes in reverse registration order—the _last_ registered route gets first crack. If it calls [`route.fallback()`](https://playwright.dev/docs/api/class-route#route-fallback), control passes to the next (earlier) handler; the request only hits the network if nothing handles it. Register `routeFromHAR` first for bulk API traffic, then `page.route` for an endpoint that needs a custom response—the later route runs first.

If your app's HTTP client changes its request shape, the HAR stops matching and the test fails. That failure is intentional—re-record once you've verified the new shape is correct.

HARs are not the right tool for mocking authentication flows. Use [storage state](storage-state-authentication.md) for login, and HARs for the API traffic that happens _after_ login.

## The one thing to remember

Your end-to-end suite should not depend on any server you don't control. HARs let you record reality once and replay it forever, which is how you get tests that pass on an airplane. The cost is a weekly refresh job and a rule that recording is not how you fix failing tests. Both are cheap.

For organization, keep one HAR per test file in `tests/fixtures/`, named after the test file it serves. If a HAR grows past a few hundred KB, split the test file so each HAR covers a narrower scenario. Large HARs (images, paginated data) can grow to megabytes—they compress well in git, but that's a sign to narrow the `url` glob.

## Additional Reading

- [Approaches to HAR Recording](approaches-to-har-recording.md)
- [Route-Based Network Interception](route-based-network-interception.md)
- [Storage State Authentication](storage-state-authentication.md)
- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md)
