---
title: Approaches to HAR Recording
description: Three ways to capture a HAR file—programmatic recording inside a test, the Playwright CLI, and Chrome DevTools—and when each one earns its keep.
modified: 2026-04-10
date: 2026-04-10
---

You know you want a HAR file. The [previous lesson](recording-hars-for-network-isolation.md) made the case, and now you need to actually record one. Three ways to do it, each with a different sweet spot, and the choice comes down to one question: do you already have a test that exercises the network calls you need to capture?

I use all three depending on the situation. Here's when each one earns its keep.

## Programmatic recording inside a test

This is the approach the previous lesson showed—`page.routeFromHAR` with `update: true`:

```ts
test('search for books', async ({ page }) => {
  await page.routeFromHAR('tests/fixtures/open-library-search.har', {
    url: '**/openlibrary.org/**',
    update: true,
  });

  await page.goto('/search');
  await page.getByLabel('Search').fill('Station Eleven');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('Emily St. John Mandel')).toBeVisible();
});
```

Run the test once with `update: true`, and Playwright records every matching request to disk. Flip `update` to `false` (or remove it), and you're in replay mode. Beyond `url` and `update`, [`routeFromHAR`](https://playwright.dev/docs/api/class-page#page-route-from-har) also accepts `updateContent` (controls whether response bodies are saved inline or as separate files) and `updateMode` (`'minimal'` records only what replay needs—the default—while `'full'` preserves broader HAR metadata). The defaults are fine for most cases.

### Toggling record mode with an environment variable

Manually adding and removing `update: true` works, but it's tedious—and it's the kind of thing you forget to undo before committing. Playwright doesn't have a built-in flag for this (the `--update-snapshots` flag only applies to visual comparison snapshots, not HARs), but an environment variable gets you there:

```ts
test('search for books', async ({ page }) => {
  await page.routeFromHAR('tests/fixtures/open-library-search.har', {
    url: '**/openlibrary.org/**',
    update: !!process.env.UPDATE_HARS,
  });

  await page.goto('/search');
  await page.getByLabel('Search').fill('Station Eleven');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('Emily St. John Mandel')).toBeVisible();
});
```

Now the test replays by default and records when you ask it to:

```bash
# Record—hits the real API, writes the HAR
UPDATE_HARS=1 npx playwright test

# Replay—reads from disk, no network
npx playwright test
```

No more editing the test file to toggle modes. The `!!` coerces the env var to a boolean—if it's set to anything, you're recording. If it's absent, you're replaying.

### What happens when you re-record

When you run `UPDATE_HARS=1`, Playwright replaces the existing HAR file entirely—it does not merge new entries into the old file. The old recording is gone; the new one reflects whatever the test did this time. A HAR is a snapshot of a single session, not an accumulation of sessions. If you need entries from multiple scenarios, use separate HAR files.

> [!NOTE]
> This `UPDATE_HARS` workflow is for _deliberate_ re-recording—when the API changed or your test changed and you need a fresh snapshot. It is not for making a failing test pass by blindly re-recording. See the [recording lesson](recording-hars-for-network-isolation.md) for the distinction between approved refresh and ad-hoc re-recording.

> [!TIP]
> Playwright retries re-run the test from scratch. In replay mode, each retry sees the same HAR responses—deterministic by design. In record mode, each retry hits the real API again and overwrites the HAR, so the last retry's recording wins.

This is what I use for Shelf's test suite, and it's the tightest feedback loop of the three approaches. The recording captures _exactly_ the requests the test makes, in the order the test makes them. There's no extra noise—no extension traffic, no preflight requests from a different origin, no favicon fetches. The HAR matches the test because the test _produced_ the HAR.

The downside: you need a working test first. If you're setting up HAR replay for a feature that doesn't have tests yet, you're writing the test _and_ the recording infrastructure in the same sitting. Sometimes that's fine. Sometimes you want the recording first so you can write the test against a stable mock.

**When to reach for this:** You already have a passing test that hits the real API and you want to freeze the network traffic it produces. Write the test, record once, replay forever.

## The Playwright CLI

Playwright ships `--save-har` as a flag on both the `open` and `codegen` commands. You don't need a test at all—you get a browser, you interact with it, and when you close it, Playwright writes the HAR.

The simplest version:

```bash
npx playwright open --save-har=tests/fixtures/session.har https://your-app.localhost:5173
```

This launches a Chromium instance pointed at your app. Click around, search for a book, add it to your shelf. When you close the browser, Playwright writes every network request to `tests/fixtures/session.har`.

That's _every_ request, though—HTML, CSS, JavaScript, images, API calls. If you only care about the Open Library traffic, narrow it with `--save-har-glob`:

```bash
npx playwright open \
	--save-har=tests/fixtures/open-library-search.har \
	--save-har-glob='**/openlibrary.org/**' \
	https://your-app.localhost:5173
```

Now the HAR only contains requests matching that glob. The syntax follows the same [glob rules](https://playwright.dev/docs/network#glob-url-patterns) as `routeFromHAR`: `*` matches anything except `/`, `**` matches anything including `/`, matched against the full request URL.

The `codegen` variant is the same thing, but Playwright _also_ generates test code as you interact with the page:

```bash
npx playwright codegen \
	--save-har=tests/fixtures/open-library-search.har \
	--save-har-glob='**/openlibrary.org/**' \
	https://your-app.localhost:5173
```

You get a HAR file _and_ a rough first draft of the test that would replay it. I've used this exactly once in anger—when onboarding onto someone else's project and trying to understand what their app actually sends over the wire. It's a decent exploration tool. I wouldn't use the generated test code verbatim—it uses CSS selectors where you'd want `getByRole`, and it doesn't know about your fixtures or page objects—but it saves time when the alternative is "stare at the app and guess which endpoints it calls."

**When to reach for this:** You don't have a test yet, or you want to record a HAR for a workflow you haven't automated. The decision tree is simple: have a test → programmatic recording. No test, want to explore → CLI. Debugging a live session → Chrome.

## Chrome DevTools

You don't need Playwright at all for this one. Open DevTools (F12 or Cmd+Opt+I), select the Network tab, and make sure recording is active (the red circle). Interact with the page, then right-click anywhere in the request list and choose **Save all as HAR with content**. The "with content" part is important—without it, you get request/response metadata but no bodies, and Playwright can't replay the responses.

Chrome writes a standard [HAR file](http://www.softwareishard.com/blog/har-12-spec/)—same format, same JSON structure. [Playwright's `page.routeFromHAR`](https://playwright.dev/docs/mock#mocking-with-har-files) can replay it, because HAR is a standardized format regardless of who recorded it.

This is the approach I reach for when I'm debugging a production issue and want to capture the _exact_ network session I'm looking at. I'm already in DevTools. The Network tab is already open. Right-click, save, done. No CLI flags, no test scaffolding.

But, there's a meaningful gap between "Chrome recorded a HAR" and "Playwright can replay this HAR cleanly in a test." A few things to watch for:

**Extra traffic.** Chrome records _everything_—extension requests, service worker fetches, preflight CORS `OPTIONS` requests, favicons, analytics pings. Playwright ignores HAR entries that no test request matches, so extra entries are harmless. The real problem is the _opposite_ direction: your test makes a request that _isn't_ in the Chrome-recorded HAR (because the test environment sends different headers or serializes query params in a different order). That's a missing entry, and the test fails with "request not found in HAR."

**Headers and cookies.** A Chrome-recorded HAR includes your real session cookies, your real auth tokens, whatever headers your browser sent. If you commit the HAR to the repository without scrubbing it first, you've committed credentials to version control. The programmatic approach has this problem too, but it's worse with Chrome because a manual browser session typically has _more_ ambient state—browser extensions injecting headers, first-party analytics cookies, things you don't even realize are being sent.

**Request ordering.** Chrome records requests in the order they actually fired. If your app makes three concurrent API calls, Chrome might record them in a different order than Playwright replays them, depending on timing. [Playwright matches on URL and method](https://playwright.dev/docs/mock#mocking-with-har-files), not on sequence, so this usually isn't a problem—but if your app makes the same request twice with different payloads, the ordering can matter.

**When to reach for this:** You're already in Chrome debugging something and want to capture the session as-is. Or you need a HAR from a production environment where you can't run Playwright. Plan to review the file before committing—scrub credentials, and expect some cleanup if the test environment differs from Chrome's.

> [!WARNING]
> A HAR recorded against one origin (e.g., `api.example.com`) won't replay in a test environment that makes requests to a different origin (e.g., `localhost:5173`). The `url` glob only gates which requests are eligible for HAR handling—it doesn't rewrite URLs or relax matching. Production-recorded HARs work for external APIs that the test hits at the same URL, but not for requests that go to a different host. For domain-mismatch scenarios, `page.route` with a custom handler is the right tool.

## A comparison

|                                          | Programmatic (`routeFromHAR`) | Playwright CLI (`--save-har`) | Chrome DevTools        |
| ---------------------------------------- | ----------------------------- | ----------------------------- | ---------------------- |
| **Needs a test first**                   | Yes                           | No                            | No                     |
| **Captures exactly what the test needs** | Yes                           | With `--save-har-glob`        | No—captures everything |
| **Credential risk**                      | Moderate                      | Moderate                      | High                   |
| **Extra noise in the HAR**               | Minimal                       | Depends on glob               | High                   |
| **Good for exploration**                 | No                            | Yes                           | Yes                    |
| **Good for production debugging**        | No                            | No                            | Yes                    |

## Scrubbing credentials

Every recording approach captures credentials. Programmatic and CLI recordings capture whatever your test user sends. Chrome captures your _real_ session. Before committing any HAR, search the JSON for `authorization`, `cookie`, `set-cookie`, `token`, `session`, `api-key`, and `secret`. Credentials hide in three places inside a HAR entry: request headers, response headers (`Set-Cookie`), and request or response bodies (OAuth token exchanges, API keys as query parameters).

The safest workflow is to use a dedicated test user with throwaway credentials—the same account your [storage state setup](storage-state-authentication.md) creates (e.g., `alice@example.com`). If the HAR contains only that test user's session, there's nothing real to scrub.

When you do need to scrub, use a script that parses the HAR as JSON—not `sed` or regex, which are brittle against nested JSON. Walk `entries[].request.headers` and `entries[].response.headers`, replace sensitive values with `"REDACTED"`, and **always re-run the test in replay mode after scrubbing** to verify the HAR still works.

> [!WARNING]
> The [secret scanning lesson](secret-scanning-with-gitleaks.md) excludes `tests/fixtures/` from gitleaks by default. That means the scanner will _not_ catch credentials in committed HARs. Manual review before committing is the only gate.

## My default workflow

For Shelf's test suite, I use programmatic recording for everything. The workflow looks like this:

Write the test with the `UPDATE_HARS` env var check. Run it once with `UPDATE_HARS=1` against the real API. Commit the HAR. Run it again without the env var to verify replay works. That's it.

I reach for the CLI approach when I'm writing tests for a new feature and I want to understand the request/response shape before I write the assertions. Record a manual session, open the HAR in my editor, see exactly what the API returns, _then_ write the test.

And I reach for Chrome DevTools when I'm investigating a bug in production and I want to grab the network session while I can still reproduce it. That HAR isn't going directly into the test suite—it's evidence. I might use it as a reference to write a proper programmatic recording later, or I might just keep it as documentation of what the bug looked like.

> [!TIP]
> Whatever approach you use, review the HAR before committing. See the scrubbing section above for what to search for and where credentials hide.

## Additional Reading

- [Recording HARs for Network Isolation](recording-hars-for-network-isolation.md)
- [Route-Based Network Interception](route-based-network-interception.md)
- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md)
- [Storage State Authentication](storage-state-authentication.md)
- [Nightly Verification Loops](nightly-verification-loops.md)
