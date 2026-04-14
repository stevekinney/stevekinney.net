---
title: 'Fixtures: Worker-Scoped, Test-Scoped, and the Trap Between Them'
description: How to use Playwright's `test.extend` without turning your fixture file into a place where state goes to hide.
modified: 2026-04-14
date: 2026-04-11
---

The first `test.extend` you write feels like magic. Five tests collapse into one clean `beforeEach`-free signature, the spec file gets shorter, and you feel like a wizard. The fifth one feels like a cage. Agents love fixtures because they collapse setup, and they _also_ love them because a fixture is a great place to hide state. Hidden state is how test suites get slow, flaky, and impossible to reason about.

So, let's talk about what fixtures actually are, when to reach for them, and the two specific mistakes that agents will make if you don't put rails around this.

Shelf's lab for this lesson is intentionally concrete: the starting point lives at `tests/labs/fixtures/fixtures.ts`, the reference folder is `tests/labs/fixtures/`, and the exercising spec is `fixtures-lab.spec.ts`. The Shelf starter doesn't ship a dedicated lab config or script for this slice, so the lab asks you to isolate it yourself with a temporary config or an equivalent narrow command. In practice that usually means cloning the root `playwright.config.ts` into a throwaway `playwright.lab.local.config.ts` and removing only the `tests/labs/fixtures/**` ignore. Keep those file names in your head as you read the rest of the lesson, because the lab asks you to refactor the real thing instead of inventing a toy example.

## What a fixture actually is

Every Playwright test you've ever written already uses fixtures. `page`, `context`, `browser`, `request` — those aren't globals the framework hands you. They're _fixtures_. Playwright inspects the arguments your test function destructures, looks up the matching fixture definitions, runs them (in dependency order, with teardown), and hands the results to your test. `test.extend` is how you add your own fixtures to that system.

```ts
import { test as base } from '@playwright/test';

export const test = base.extend<{ seededReader: { email: string } }>({
  seededReader: async ({}, use) => {
    await use({ email: 'alice@example.com' });
  },
});
```

That's the shape. The fixture function receives the _other_ fixtures it depends on (this one depends on nothing, hence the empty destructure) and a `use` callback. Whatever you pass to `use` is what your test gets when it asks for `seededReader`. Anything after the `await use(...)` is teardown.

> [!NOTE] The empty destructure
> ESLint's `no-empty-pattern` rule will yell about `async ({}, use) =>`. Either disable it inline or structure the fixture to depend on at least `request` or `browser`. The empty-object shape is the idiomatic Playwright syntax — don't invent a workaround that hides the fact that it's a fixture.

## Teardown is the whole point

Here is where I watch agents get this consistently wrong. They see fixture setup, they skip fixture teardown, and they end up with state that leaks into the next test. The `use` call _is_ the split between setup and teardown. Everything before `use` runs before the test. Everything after `use` runs after.

```ts
seededShelf: async ({ request }, use) => {
  await resetShelfContent();
  await use(request);
  await resetShelfContent(); // teardown: leaves the server clean
};
```

That second `resetShelfContent` is what the agent will forget. And here's the failure mode that costs you a day: the next test inherits whatever state this test left behind. The symptom looks like flakiness. The cause is a missing teardown half. The fix is four characters: the word `await` on a line that didn't exist.

The "missing await" version is even worse. If the teardown is there but unawaited, Playwright thinks the fixture is done and moves on. The teardown then races against the next test's setup, and you get state corruption that only shows up under load. Always `await` your teardown. Always.

## Fixture composition is where the mental model clicks

A fixture can depend on another fixture. That's it. That's the feature. It sounds small, and it's the single most useful thing about the whole system:

```ts
authenticatedRequest: async ({ playwright }, use) => {
  const context = await playwright.request.newContext({
    storageState: 'playwright/.authentication/user.json',
  });
  await use(context);
  await context.dispose();
};
```

Now any test that asks for `authenticatedRequest` gets an `APIRequestContext` that's already carrying the reader's session cookie. You didn't have to re-login. You didn't have to read the storage state file yourself. You just composed one fixture on top of another, and the caller got something higher-level than what Playwright hands you out of the box.

This is the moment the fixture mental model clicks: _your_ fixtures and Playwright's built-in fixtures are the same shape. You can build on top of them, and — as the next section shows — you can even replace them.

## Overriding built-in fixtures

Playwright's `page`, `context`, and `browser` are themselves fixtures defined in the base `test`. You can override them with `test.extend`, and suddenly everything that was true of your custom fixtures is true of the framework's.

The completed failure-dossier version of Shelf does exactly this. After the failure-dossier lab, your `tests/fixtures.ts` will override `page` to forward browser console errors and failed network requests to stderr, so they show up in the `list` reporter, the HTML report, and the failure dossier JSON:

```ts
export const test = base.extend({
  page: async ({ page }, use) => {
    page.on('console', (message) => {
      if (message.type() === 'error') {
        console.error(`[browser error] ${message.text()}`);
      }
    });
    await use(page);
  },
});
```

Notice the shape. `page: async ({ page }, use)` — the fixture is _named_ `page` and _depends on_ `page`. That second `page` is the built-in one. The fixture wraps the built-in and hands a decorated version to the test. Every spec that imports `test` from this file gets the console-error forwarding for free. No wrapper function. No `beforeEach`. No explanation in the PR description.

The reframe I want you to internalize: when you find yourself writing a helper function that wraps `page`, stop. You don't need a wrapper. You need an override.

## Report ergonomics are part of the fixture design

Fixtures do not just shape the test environment. They also shape the report the agent reads later.

The [fixtures docs](https://playwright.dev/docs/test-fixtures) give you a few knobs that are more useful than they look:

- `box: true` hides noisy helper fixtures from the report
- `box: 'self'` hides the wrapper fixture while still showing its internal steps
- `title` gives the fixture a useful human name in errors and reports

That means a low-signal plumbing fixture can stay out of the way while a high-signal fixture can identify itself clearly instead of showing up as anonymous setup mush.

## Test-scoped versus worker-scoped

> [!TIP] One-liner rule
> Worker-scope a fixture only when the data is both _read-only_ and _expensive_. Otherwise, test-scope.

Fixtures default to test scope: they run fresh for every test and tear down after it. Playwright also lets you worker-scope a fixture, which means it runs once per worker and is shared across every test that worker executes. The syntax is a tuple:

```ts
constantsFromEnv: [
  async ({}, use) => {
    const data = await loadExpensiveReadOnlyThing();
    await use(data);
  },
  { scope: 'worker' },
];
```

The trap: anything mutable becomes a state leak when you promote it to worker scope. A "seeded shelf" fixture that modifies the database is the worst possible candidate because every test in that worker sees the same mutated state. The first test passes, the second test fails because the first one added a book, and you spend an hour trying to figure out why `test.describe.configure({ mode: 'serial' })` doesn't fix it. (It won't. The fixture scope is the problem.)

Agents will reach for worker scope to make the suite faster. Don't let them do it without a one-line justification: is the data read-only, and is it expensive enough to earn the shared scope? If either answer is no, it's test-scoped.

## When NOT to fixturize

If a helper is only used in one test, it's a helper function, not a fixture. Fixtures earn their complexity by being shared across tests and by owning teardown. A one-liner that constructs a constant is not a fixture. A function you import in one spec is not a fixture. The `test.extend` ceremony exists for the cases where _that_ ceremony is cheaper than the alternative.

The specific anti-pattern I see most: an agent writes a "fixture" that just calls `page.goto('/shelf')` and asserts a heading. That's not a fixture. That's a line of code. Delete it, inline the navigation, and your fixture file shrinks by a third.

## The agent rules

```markdown
## Playwright fixtures

- Name fixtures after what they _provide_, not what they _do_ (`seededReader`, not `setupUser`).
- Every fixture that mutates state has a teardown half after `await use(...)`, and the teardown is awaited.
- Worker-scope a fixture only when the data is read-only AND expensive enough to justify sharing it. Add a one-line comment justifying the choice.
- If a "fixture" is used in exactly one test, it's a helper function. Move it out of the fixtures file.
- Override Playwright's built-in `page`/`context`/`browser` with `test.extend` when the wrapper would otherwise be a helper. Don't reinvent a wrapper when an override already exists.
- Use fixture report ergonomics on purpose: hide noisy fixtures with
  `box`, use `box: 'self'` when only the wrapper is noise, and give
  important fixtures a human `title`.
```

## The thing to remember

A fixture is an object-with-teardown. The shape is easy; the discipline is hard. If you write one fixture and forget the teardown half, the cost is a flaky test six hours from now. If you write one fixture and leave it worker-scoped on mutable state, the cost is the entire next afternoon. The rails above exist because I've paid both of those bills.

## Additional Reading

- [The Waiting Story](the-waiting-story.md) — where this lesson's teardown discipline pays off, because a seeded-then-reset fixture is the _correct_ version of "wait for the app to be ready."
- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md) — the lesson that introduced `resetShelfContent` and `seedFreshDatabase`, which are the helpers most of these fixtures compose on top of.
- [API and UI Hybrid Tests](api-and-ui-hybrid-tests.md) — the lesson where the `request` fixture first shows up as "a thing you can call in a test," before this lesson asks you to compose it.
