---
title: Where Fixtures Actually Help
description: A field guide to the setup, state, instrumentation, and app boundaries that actually belong in Playwright fixtures.
modified: 2026-04-12
date: 2026-04-12
---

By the time most teams learn [`test.extend`](https://playwright.dev/docs/test-fixtures), they know _how_ to write a fixture and still don't know _where_ to use one. That is how you end up with a fixture file full of glorified one-liners, mystery state, and three different helpers that all navigate to the same page. I've done this. It feels tidy right up until the suite starts lying to you.

The earlier [fixtures lesson](fixtures-worker-scoped-test-scoped.md) was about scope and teardown. This one is about smell. Specifically: what kinds of problems a fixture solves well in a real app, what kinds of problems it solves badly, and how to recognize the difference before your fixtures file turns into a junk drawer.

## The question a fixture should answer

A good fixture answers one of four questions:

- Who is this test acting as?
- What state does the app start in?
- What extra visibility does the test need?
- What environment does the browser need to believe?

If your setup does not answer one of those questions, it is probably not a fixture. It is probably a helper function, a page-object method, a seed script, or just a line of code that should stay in the test.

> [!TIP] A decent smell test
> If the noun keeps showing up in test signatures across multiple files, that noun might deserve to become a fixture. If it only shows up once, keep it local.

## Actor fixtures

This is the most obvious fixture category, and also the one that pays rent the fastest. Tests often need to act as a specific _kind_ of user: an authenticated reader, an administrator API client, an anonymous browser context, a premium customer with feature flags turned on.

That is fixture territory because the thing being shared is not "steps" but _identity_:

```ts
import { test as base } from '@playwright/test';

type ReaderFixtures = {
  authenticatedReaderPage: import('@playwright/test').Page;
};

export const test = base.extend<ReaderFixtures>({
  authenticatedReaderPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'playwright/.authentication/user.json',
    });

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
```

The important part is not that the fixture opens a page. The important part is that the fixture gives the test a _reader-shaped browser_. Once that concept shows up in five or six specs, the fixture is cheaper than duplicating the context setup everywhere.

This is also where [`APIRequestContext`](https://playwright.dev/docs/api/class-apirequestcontext) fixtures shine. If your test needs an administrator actor on the side while the browser stays logged in as a reader, a fixture that hands you an authenticated API client is the cleanest version of the pattern. The [APIRequestContext lesson](api-request-context-beyond-storage-state.md) is basically this idea stretched into a full workflow.

## State fixtures

A state fixture exists to answer: _what world does this test start in?_ Seeded shelf. Empty cart. Account with an expired subscription. Book already rated. Feature flag already enabled.

This is where I see the most under-use. Teams reach for fixtures when they want an authenticated page, but not when they want deterministic state. That is backwards. Auth is a convenience. Deterministic state is survival.

The simplest full version looks like this:

```ts
import { test as base } from '@playwright/test';

type StateFixtures = {
  seededShelf: void;
};

export const test = base.extend<StateFixtures>({
  seededShelf: async ({ request }, use) => {
    await resetShelfContent(request);
    await use();
    await resetShelfContent(request);
  },
});
```

The test that consumes it doesn't care _how_ the shelf got seeded. It cares that the shelf starts from a known place and leaves the next test a clean room behind it. That is a perfect fixture contract.

Where this becomes especially useful in a real application:

- Resetting the database before every test that mutates application state
- Seeding a specific business case, like a reader with overdue books or a team with one failed invoice
- Mounting feature flags or experiment assignments the app reads at boot
- Installing a fixed clock or locale so relative dates stop drifting between runs
- Preloading third-party test doubles, like a fake webhook endpoint or canned analytics handler

The common mistake is making the fixture too specific. `readerWithTwoUnreadBooksAndOneDraftReview` is not a reusable abstraction. `seededReader` and `seededShelf` probably are. Put the domain detail in the seed helper, not in a seven-word fixture name.

## Instrumentation fixtures

Some fixtures exist because the test needs more _visibility_, not more setup. [Shelf](https://github.com/stevekinney/shelf-life)'s overridden `page` fixture is the example I come back to because it is boring in exactly the right way: it forwards browser console errors and failed network requests so the runner, the HTML report, and the failure dossier all see them.

That pattern scales better than people think.

Useful instrumentation fixtures include:

- A wrapped `page` that forwards `console.error` output to stderr
- A wrapped `page` or `context` that records failed requests with method, URL, and error text
- A request fixture that logs key API calls for failure dossiers
- A page fixture that installs test-only observers for performance marks or client-side errors
- A fixture that attaches extra artifacts to `testInfo`, such as serialized app state on failure

This is one of my favorite uses for fixtures because it moves diagnostics out of the test body. The spec keeps talking about behavior. The fixture quietly makes the artifacts better.

## Environment fixtures

Sometimes the test is not trying to change the app's server-side state at all. It is trying to change what the _browser believes_. Different timezone. Different permissions. Clipboard support. Reduced motion. Online versus offline. Experimental APIs that the browser doesn't support directly.

That setup also belongs in fixtures when it is shared and repeatable:

```ts
mobileReaderContext: async ({ browser }, use) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'light',
    timezoneId: 'America/Denver',
  });

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await use(context);
  await context.close();
},
```

The mental model here is simple: if the browser context needs to be shaped a certain way before the app boots, that shape is a good candidate for a fixture.

The new [Mocking Browser APIs](mocking-browser-apis.md) lesson goes deeper on the APIs Playwright doesn't model directly. The short version is that fixtures are a good home for [`browserContext.addInitScript()`](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script) and permission setup because both need to happen _before_ navigation.

## Boundary fixtures

This category sits right at the seam between your app and something outside it: an API, an auth provider, a background worker, a payment gateway, a search index. You don't always want a fixture here. But when the same seam shows up in a lot of tests, a fixture can keep the suite from growing sideways.

Examples:

- An authenticated admin API client that seeds state through HTTP instead of UI clicks
- A route-mocking fixture that blocks analytics or image requests for every test in a file
- A fixture that points the app at a local fake email server or webhook receiver
- A fixture that bootstraps a browser context with a captured auth session

This is where composition starts to feel powerful. One fixture can give you the authenticated browser. Another can give you the seeded backend state. A third can add diagnostics. The test body just asks for the world it needs and then gets on with it.

## Things that should stay out of fixtures

Now for the fun part: the stuff people keep trying to smuggle into `fixtures.ts`.

Don't make a fixture for:

- One-off navigation like `page.goto('/settings')`
- Assertions like "open the page and verify the heading is visible"
- Tiny constants used by one test file
- Pure data builders that do not need Playwright lifecycle or teardown
- Business logic helpers that could run perfectly well outside the test runner
- Page-object methods wearing fake infrastructure costumes

If the code is just steps, keep it as steps. Fixtures are not "shared code." Fixtures are shared code that needs Playwright's dependency graph and teardown lifecycle. That is a much smaller set.

## A practical decision tree

When I am on the fence, this is the sequence I use:

1. Does this setup show up in multiple tests or files?
2. Does it need to run before the test body starts?
3. Does it need teardown after the test body finishes?
4. Does it produce a thing the test will _ask for_ by name?

If the answer is yes all the way down, I probably want a fixture.

If the answer breaks at step 1, it is local helper code.

If the answer breaks at step 3, it might still be a helper function or seed script rather than a fixture.

If the answer breaks at step 4, I am probably trying to hide behavior instead of expose a useful dependency.

## The agent rules

```markdown
## Choosing fixtures

- Use a fixture when the shared concern is actor identity, deterministic
  starting state, browser environment, or diagnostics instrumentation.
- Name fixtures after what they provide (`seededShelf`, `adminRequest`,
  `authenticatedReaderPage`), not after the implementation steps.
- If the setup is used once, keep it in the test or move it to a helper.
- If the setup mutates state, the fixture owns teardown after `await use(...)`.
- Prefer composing two small fixtures over building one giant fixture that
  hides half the test's world behind a vague name.
```

## The thing to remember

Fixtures are not where shared code goes. Fixtures are where shared _test dependencies_ go. Actor, state, environment, diagnostics. Those are the four buckets. Stay inside them and fixtures make the suite smaller, clearer, and more deterministic. Wander outside them and you get a helper graveyard with teardown bugs.

## Additional Reading

- [Fixtures: Worker-Scoped, Test-Scoped, and the Trap Between Them](fixtures-worker-scoped-test-scoped.md)
- [APIRequestContext: Beyond Storage State](api-request-context-beyond-storage-state.md)
- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md)
- [Mocking Browser APIs](mocking-browser-apis.md)
