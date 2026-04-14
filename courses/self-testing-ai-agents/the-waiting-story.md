---
title: The Waiting Story
description: Why `page.waitForTimeout` is the second-most-common cause of flaky tests, and what to reach for instead.
modified: 2026-04-14
date: 2026-04-06
---

If locator discipline is the number-one thing an agent will get wrong in a Playwright suite, waiting is a very close second. And where locators are bad because they break across refactors, waiting is bad because it breaks _on the exact same code, intermittently, for reasons nobody can explain_. That's worse. That's the thing that makes your team stop trusting end-to-end tests.

## The sin

```ts
await page.click('button.add-book');
await page.waitForTimeout(2000);
await expect(page.getByText('Added to your shelf')).toBeVisible();
```

Two seconds. Why two? Because one didn't work on the agent's first try and three felt wasteful. This is the most common pattern I see in agent-generated Playwright code, and it's wrong in every possible way.

It's wrong when the machine is fast, because you're sitting there for 1.9 seconds doing nothing. It's wrong when the machine is slow, because 2 seconds wasn't enough and the test flakes. It's wrong in CI, because CI is slow on Tuesdays and fast on Wednesdays and nobody knows why, and your test is now a coin flip. And it's especially wrong because the mechanism you _should_ be using is not only more reliable, it's also faster in the happy case.

```mermaid
flowchart LR
  A["Click button"] --> B["Wait 2 seconds<br>waitForTimeout"]
  B --> C{"Is text<br>visible?"}
  C -->|Yes| D["PASS<br>~2 seconds elapsed"]
  C -->|No| E["FAIL<br>Timeout"]

  F["Click button"] --> G["Auto-retry assertion<br>for 5 seconds"]
  G --> H{"Is text<br>visible?"}
  H -->|Yes| I["PASS<br>~50ms elapsed"]
  H -->|No| J["FAIL<br>Timeout"]

  style B fill:#ffcccc
  style G fill:#ccffcc
  style D fill:#ffcccc
  style I fill:#ccffcc
```

I have a simple rule about this: `page.waitForTimeout` is banned. Not discouraged. Banned. The instructions file bans it. The lint rule bans it. The only time it's acceptable is in a throwaway `test.skip` debugging session, and even then you should feel bad about it.

## The better version, with no magic

[Playwright's auto-retrying assertions](https://playwright.dev/docs/test-assertions) do almost everything you need them to do if you let them. Every assertion is retried for a configurable timeout (default five seconds) until it either passes or times out. That means you don't have to wait yourself—the assertion _is_ the wait.

```ts
await page.getByRole('button', { name: 'Add book' }).click();
await expect(page.getByText('Added to your shelf')).toBeVisible();
```

That's it. No `waitForTimeout`, no `waitForSelector`, no `sleep`. The `toBeVisible()` assertion waits until either the text appears or the timeout fires. On a fast machine it passes in ten milliseconds. On a slow machine it passes in two seconds. On a broken machine it fails with a useful error. All three outcomes are correct.

This works for more than visibility. The whole `expect(locator).*` family auto-retries:

- `toBeVisible()`, `toBeHidden()`, `toBeEnabled()`, `toBeDisabled()`
- `toHaveText(text)`, `toHaveValue(value)`, `toHaveAttribute(name, value)`
- `toHaveCount(n)`—my personal favorite for "wait until the list of books has rendered all three entries"
- `toBeInViewport()`

Anything you want to assert that's eventually true, use an `expect` on a locator. That's your wait.

## Actions already wait for actionability

This is the part a lot of teams fight instead of using. Playwright actions already auto-wait for actionability: visible, stable, receiving events, enabled, the whole thing. Most "pre-click readiness helpers" are just a slower, worse reimplementation of what Playwright is already doing.

If you want to ask "would this control be clickable yet?" without actually clicking it, many locator actions support [`trial: true`](https://playwright.dev/docs/actionability):

```ts
await page.getByRole('button', { name: 'Publish' }).click({ trial: true });
```

That performs the actionability checks and skips the click. It is a neat replacement for bespoke "wait until button is ready" helpers, and it keeps the wait aligned with the real action instead of inventing a second definition of readiness.

## Boolean probes are not waits

The [Locator API](https://playwright.dev/docs/api/class-locator) is explicit about this: methods like `isVisible()` return immediately. They answer "what is true _right now_," not "wait until this becomes true."

So this:

```ts
if (await page.getByText('Saved').isVisible()) {
  // ...
}
```

is fine as a branch after the page is already stable. It is not a synchronization primitive. If the page updates asynchronously, use the retrying assertion:

```ts
await expect(page.getByText('Saved')).toBeVisible();
```

The anti-pattern I keep seeing is `expect(await locator.isVisible()).toBe(true)`. That bypasses the whole retry model and then acts surprised when CI gets there 200 milliseconds later than the laptop did.

## Waiting for network, not for clocks

Sometimes the thing you're waiting on isn't a DOM change—it's a network response. The click fires off a POST, you need the POST to finish before you can interact with the next thing, and there's no DOM state that cleanly tells you the POST finished. This is where [`page.waitForResponse`](https://playwright.dev/docs/api/class-page#page-wait-for-response) earns its place.

```ts
const responsePromise = page.waitForResponse(
  (res) => res.url().endsWith('/api/shelf') && res.request().method() === 'POST',
);
await page.getByRole('button', { name: 'Add book' }).click();
await responsePromise;
```

Two things to notice. First, you set up the waiter _before_ the action, because the response might land faster than the next line of code runs. Second, you match on URL and method, not on a string comparison of the whole URL—query params and IDs will mess you up otherwise.

`page.waitForRequest` exists too, for the "I just want to prove the request went out" case. Both are precise, both beat a timeout every time.

> [!TIP]
> If the UI already exposes the end state you care about, prefer a locator assertion over a network wait. `waitForResponse` is for the cases where the network event _is_ the signal. If the page shows "Saved" or the new row appears in the table, assert on that instead.

## `fill()` first, `pressSequentially()` on purpose

Most text entry should use `locator.fill()`. It sets the value directly and lets Playwright do the boring reliable thing.

[`locator.pressSequentially()`](https://playwright.dev/docs/api/class-locator) exists for the genuinely special cases:

- the component reacts to each keystroke
- autocomplete or mention logic depends on real key events
- the input is masked or formatted while typing
- the bug you are reproducing is specifically about keypress handling

If none of those are true, `fill()` is the right call. The "real typing is more realistic" instinct sounds nice and creates some of the dumbest CI-only input failures you will ever debug.

## Clocks and animations and the Clock API

The ugly class of waits is when the UI has a `setTimeout` somewhere. A toast that auto-dismisses after three seconds. A "just now" timestamp that updates every minute. An animation that takes 250ms. Your test now depends on real wall-clock time, which is an abomination.

Playwright ships a [Clock API](https://playwright.dev/docs/clock) that lets you install a fake clock before the page loads:

```ts
await page.clock.install();
await page.goto('/shelf');
// ... interact ...
await page.clock.fastForward('00:03'); // advance three seconds
await expect(page.getByText('Added to your shelf')).toBeHidden();
```

This is how you test the toast that dismisses after three seconds without actually waiting three seconds. It's how you test "X minutes ago" displays without editing the system clock. It is extremely underused and worth putting in the agent's awareness. If the agent is writing a `waitForTimeout` because it's waiting on a clock-driven UI, the correct answer is almost always `page.clock`.

## `expect.poll()` versus `toPass()`

For eventual consistency, you have two retry hammers. They are not the same hammer.

[`expect.poll()`](https://playwright.dev/docs/test-assertions) retries a value-producing function:

```ts
await expect
  .poll(
    async () => {
      const response = await request.get('/api/shelf');
      const data = await response.json();
      return data.entries.find(
        (entry: { book: { title: string } }) => entry.book.title === 'Station Eleven',
      );
    },
    { message: 'Station Eleven should eventually appear in the persisted shelf state' },
  )
  .toBeTruthy();
```

It defaults to a 5-second timeout, which is usually what people expect.

`expect(async () => { ... }).toPass()` retries an entire assertion block:

```ts
await expect(async () => {
  const response = await request.get('/api/shelf');
  expect(response.ok()).toBe(true);

  const data = await response.json();
  expect(data.entries.some((entry: { rating: number | null }) => entry.rating === 4)).toBe(true);
}).toPass({ timeout: 10_000 });
```

That default timeout is `0` unless you pass one. This trips people constantly. If you reach for `toPass()`, set the timeout on purpose.

Use `poll()` when one value should eventually settle. Use `toPass()` when you genuinely want to rerun a full block of assertions.

## Give `expect` different personalities

[`expect.configure()`](https://playwright.dev/docs/test-assertions) is worth using once the suite is big enough that every assertion should not share the same temperament.

```ts
const slowExpect = expect.configure({ timeout: 15_000 });
const softExpect = expect.configure({ soft: true });

await slowExpect(page.getByRole('status')).toHaveText(/Report complete/);
await softExpect(page.getByText('Summary')).toBeVisible();
await softExpect(page.getByText('Details')).toBeVisible();
```

That keeps the intent local. You do not have to rewrite the global assertion timeout because one eventually consistent screen is slower than the rest of the suite.

When you do use soft assertions, check `test.info().errors` before marching into the next dangerous phase of the test. Failing softly is useful. Failing softly and then pretending the precondition succeeded is just lying with extra steps.

## Waiting for the page to "settle"

A common agent mistake: `await page.waitForLoadState('networkidle')`. Don't. Playwright's own navigation docs mark `networkidle` as discouraged for testing. It means "no network activity for 500ms," which is both slower than what you actually need (why wait for _all_ requests?) and unreliable in pages with long-polling, analytics beacons, or any kind of heartbeat.

Instead, wait for the specific thing you actually care about. If you're waiting for the shelf to render, wait for the shelf content, not for network idle. If you're waiting for an API call to finish, wait for _that_ call, not for all calls to stop. Be specific.

## The `CLAUDE.md` rules

Add these to the instructions file under Playwright:

```markdown
## Waiting in Playwright

- Never use `page.waitForTimeout`. There is always a better option.
- Never use `page.waitForLoadState('networkidle')`.
- To wait for a UI change, use `expect(locator).toBeVisible()` or a
  similar assertion. They auto-retry up to the configured timeout.
- Do not use `locator.isVisible()` or similar boolean probes as waits.
  They answer immediately. Use retrying assertions.
- Prefer `locator.fill()` for text entry. Use `pressSequentially()` only
  when the page genuinely depends on real key events.
- To wait for a network call, set up `page.waitForResponse` with a
  URL+method matcher _before_ triggering the action.
- If you need to wait for actionability without acting, use the real
  action with `trial: true` instead of inventing a custom readiness wait.
- Use `expect.poll()` for eventually consistent values. Use `toPass()`
  only when you need to retry a whole assertion block, and set its
  timeout explicitly.
- To wait for clock-driven UI (toasts, timers, "X minutes ago"),
  install `page.clock` at the top of the test and advance it explicitly.
- If you are tempted to add a wait to "fix flakiness," stop. The flakiness
  is a symptom of an assertion not matching the actual end state. Find
  the real end state and assert on it.
```

The last rule is the important one, and the hardest one for an agent to follow without a human pointing it out. Flakiness is never solved by waiting longer. It's solved by asserting on the correct thing.

## A concrete example from Shelf

Shelf's rate-book workflow is the canonical place this all shows up. The rough version of the test uses `waitForTimeout(1500)` after submitting a rating, because the agent that wrote it first was guessing. That version passes most of the time. It fails about one time in fifteen on my machine, and more often on CI under load—classic "flaky test that blocks releases every few days" territory.

The next lab walks you through rewriting it. The fix has three parts: replace the locator with a `getByRole` chain, replace the `waitForTimeout` with a `waitForResponse` on the POST, and add an `expect(locator).toHaveText(/Thanks/)` assertion on the confirmation toast. That's it. Three edits, zero magic, and the test stops flaking.

## The one thing to remember

Every wait in your test is a statement about what you expect to be true. If you can't write that statement as an assertion, you don't actually know what you're waiting for, and the test is going to flake until you figure it out. `waitForTimeout` is the absence of a statement. Ban it.

## Additional Reading

- [Locators and the Accessibility Hierarchy](locators-and-the-accessibility-hierarchy.md)
- [Assertions](https://playwright.dev/docs/test-assertions)
- [Storage State Authentication](storage-state-authentication.md)
- [Lab: Harden the Flaky Rate-Book Test](lab-harden-the-flaky-rate-book-test.md)
