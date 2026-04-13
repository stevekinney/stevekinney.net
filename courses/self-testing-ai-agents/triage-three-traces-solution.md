---
title: 'Solution: Triage Three Traces'
description: One walk through the three lab traces — Trace A, Trace B, and Trace C — with the smoking-gun evidence in each pane and the fix for each failure.
modified: 2026-04-12
date: 2026-04-11
---

One walk through the three traces, with the evidence I'd cite for each. If your diagnoses look different in _details_ — different fix wording, different specific line numbers — that's fine. What should match is the bucket and the pane.

The traces come from three specs in `tests/end-to-end/labs/broken-traces/`. If you haven't generated them yet, run:

```bash
npm run traces:generate
```

Then open each one with `npx playwright show-trace playwright-report/lab-traces/<name>.zip` and read along.

## Trace A: config / auth mismatch

**Spec**: `trace-a-config.spec.ts`, which starts with `test.use({ storageState: { cookies: [], origins: [] } })` to opt out of the default authenticated context, then navigates to `/shelf` and asserts a "Your books" heading is visible.

**Failing step name**: `expect(heading).toBeVisible()` on line 25 (the spec doesn't use `test.step` so we get the test title plus the line).

**Smoking-gun pane**: Network.

**The evidence**: click the `goto('/shelf')` action in the timeline, then open the Network pane. The pane shows two requests:

- `GET /shelf` → `302 Found`, with a `Location: /login` response header.
- `GET /login` → `200 OK`.

The app redirected to `/login` before the shelf page ever rendered. The DOM snapshot at the failure backs this up — the page shows a login form, not a shelf. The Console is empty because this is a server-side redirect, not a client-side error.

**Cause**: config / auth mismatch. The test has no storage state, and `/shelf` is gated server-side on `locals.user` in the Shelf app.

**Proposed fix**: remove the `test.use({ storageState: { cookies: [], origins: [] } })` line at the top of the spec and let the `labs-broken-traces` project's default `storageState: storageStatePath` take over. The default mounts the reader's session cookie, so the redirect won't fire.

If you want to keep the unauthenticated scenario _and_ still reach a shelf-like page, you'd need a different assertion — maybe check for the login form heading instead of "Your books." But that's a different test. The fix here is the wiring.

## Trace B: timing race

**Spec**: `trace-b-race.spec.ts`, which clicks the rate-book star on Station Eleven and immediately asserts the rating text is visible with a `{ timeout: 1 }` grace period, without waiting for the `PATCH /api/shelf/:id` response.

**Failing step name**: `expect(stationEleven.getByText('Rated: 4/5')).toBeVisible({ timeout: 1 })` on line 36.

**Smoking-gun pane**: Network.

**The evidence**: walk the timeline. The action list shows the click on the Save button, then the immediate `expect`, then a `PATCH /api/shelf/:entryId` request that's _still pending_ at the moment the assertion ran. The network row shows the request started at (say) 1.187s and completed at 1.420s. The assertion fired at 1.188s, gave up at 1.189s, and failed.

The DOM snapshot at the failure confirms it: the article for Station Eleven shows no "Rated: 4/5" text. The UI hasn't updated because the server hasn't responded, and the client doesn't optimistically render the rating.

**Cause**: timing race. The test asserted before the network round-trip completed.

**Proposed fix**: wait for the `PATCH` response before asserting the UI state:

```ts
const ratingResponse = page.waitForResponse(
  (response) => /\/api\/shelf\/.+/.test(response.url()) && response.request().method() === 'PATCH',
);
await dialog.getByRole('button', { name: 'Save rating' }).click();
await ratingResponse;

await expect(stationEleven.getByText('Rated: 4/5')).toBeVisible();
```

Notice the fix is _not_ "bump the timeout from 1ms to 5000ms." That would mask the race without solving it — the test would pass most of the time and fail on the one CI run where the server is slower than 5 seconds. The right fix is to wait for the specific thing you're depending on, not to wait longer.

This is the exact failure mode [The Waiting Story](the-waiting-story.md) warned you about.

## Trace C: order-dependent rendering / locator ambiguity

**Spec**: `trace-c-stale-locator.spec.ts`, which navigates to `/shelf` (which already has Station Eleven and Piranesi shelved by the seed endpoint) and calls `page.getByRole('button', { name: 'Rate this book' }).click()` without scoping to a specific article.

**Failing step name**: the click on line 33, `page.getByRole('button', { name: 'Rate this book' }).click()`.

**Smoking-gun pane**: Console / source. The error pane shows Playwright's strict-mode violation message directly:

```
Error: strict mode violation: getByRole('button', { name: 'Rate this book' })
resolved to 2 elements:
  1) <button>…Rate this book</button> aka getByRole('article', { name: /Station Eleven/i }).getByRole('button')
  2) <button>…Rate this book</button> aka getByRole('article', { name: /Piranesi/i }).getByRole('button')
```

Playwright prints the two matching elements _along with a suggested accessibility path for each one_, which is a gift. The DOM snapshot confirms it: the shelf page has two `<article>` elements, each with its own `<button>Rate this book</button>`.

**Cause**: order-dependent rendering / locator ambiguity. The locator matches multiple elements because the page has multiple books.

**Proposed fix**: scope the locator to a specific article first.

```ts
await page
  .getByRole('article', { name: /Station Eleven/ })
  .getByRole('button', { name: 'Rate this book' })
  .click();
```

This is the exact pattern the [Locators lesson](locators-and-the-accessibility-hierarchy.md) calls "region-scoped locators." The fix isn't `.first()`, which would work but would silently break if the shelf order ever changed. The fix is _name the article you want_.

## The meta-lesson

Notice where the smoking gun lived for each trace:

- **Trace A**: Network.
- **Trace B**: Network.
- **Trace C**: Console / source.

Two of the three were in the Network pane, and each one was a _different_ kind of network evidence. Trace A's smoking gun was a 302 status code. Trace B's smoking gun was a pending request. Same pane, completely different signal.

Trace C's smoking gun wasn't in the network pane at all. It was in the error message Playwright printed directly — a level above the panes, which is easy to miss if you jump into the trace viewer and start clicking around.

The discipline the lab is training: _sweep all four panes_ before deciding which one is the smoking gun. Agents default to clicking around the timeline and not opening the error pane because "the error is obvious, it's in the test log." Read the error pane anyway. Sometimes it tells you the whole story and you never have to open a snapshot.

## The other thing

A trace is _data_. The lab's generator script, `scripts/generate-lab-traces.mjs`, parses the `playwright-report/test-results/` directory structure and extracts three specific zip files by matching the project + spec prefix. It's ~120 lines of Node, no dependencies, and it handles the case where Playwright exits nonzero because the lab specs are red by design. The current starter no longer ships that helper, so this solution is the reference for the file you add during the lab.

You could write a similar script to extract evidence from traces programmatically — feed it the trace zip, have it look at the network log for 4xx/5xx responses, have it flag pending requests at the moment of failure. That's not a stretch goal for this lab; it's a pointer at where this stuff leads. Traces are structured; you can script against them; you can build your own diagnostics on top of them. Most people don't. That's an opportunity.

## Additional Reading

- [Reading a Trace](reading-a-trace.md) — the pane-by-pane reference.
- [Flaky-Test Triage: When Retries Are Lying to You](flaky-test-triage.md) — the four-bucket taxonomy.
- [The Waiting Story](the-waiting-story.md) — the lesson Trace B lands right back in the middle of.
- [Locators and the Accessibility Hierarchy](locators-and-the-accessibility-hierarchy.md) — the lesson Trace C lands in.
