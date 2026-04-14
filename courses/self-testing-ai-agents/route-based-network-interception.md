---
title: Route-Based Network Interception
description: When HAR replay is overkill, `page.route` lets you intercept, mock, modify, or block individual requests with a few lines of code.
modified: 2026-04-14
date: 2026-04-10
---

The [HAR lessons](recording-hars-for-network-isolation.md) covered the "record everything, replay forever" approach to network isolation. That's the right tool when you're mocking a large API surface—dozens of endpoints, nested responses, pagination tokens. But sometimes you don't need a full recording. You need to mock _one_ endpoint, or block images, or simulate a 500 from the server, or strip a header before it reaches your app. That's where [`page.route`](https://playwright.dev/docs/mock) earns its keep.

Route-based interception is Playwright's API for intercepting individual network requests and deciding what to do with them: serve a fake response, modify the real one, or kill the request entirely. It's more explicit than HAR replay, more flexible, and—for small mocks—much less ceremony.

## The basics: intercepting a request

[`page.route`](https://playwright.dev/docs/api/class-page#page-route) takes a URL pattern and a handler function. Every request matching the pattern goes through your handler instead of the real network:

```ts
await page.route('**/api/shelf', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ books: [{ title: 'Station Eleven' }] }),
  });
});
```

That's it. Any request to a URL ending in `/api/shelf` gets your canned response instead of hitting the server. The test is deterministic, it's fast, and you can read the mock right there in the test file.

You can also scope the interception to an entire browser context with [`context.route`](https://playwright.dev/docs/api/class-browsercontext#browser-context-route), which applies to every page in the context—including popups and opened links:

```ts
test.beforeEach(async ({ context }) => {
  await context.route('**/api/analytics/**', (route) => route.abort());
});
```

The difference matters. `page.route` only intercepts requests from that specific page. `context.route` intercepts requests from every page the context opens. For most test scenarios, `page.route` is what you want. Reach for `context.route` when you need to block something globally—analytics, tracking pixels, third-party scripts—across all pages in the test.

The fast rule is:

- use `page.route()` when the mock belongs to one page and one scenario
- use `browserContext.route()` when the mock is part of the environment for the whole test

Concrete examples:

- **Use `page.route()`** for "this shelf page should see a 500 from `/api/shelf`" or "this one checkout flow should get a fake tax response." The route is local to the page under test, and when the page goes away, the mock's useful life is over too.
- **Use `browserContext.route()`** for blocking analytics on every page, intercepting popup traffic from the first request, or setting one fake backend response that both the main page and a popup will hit during the same test.
- **Use `browserContext.route()`** whenever you do not have the target page object yet. The first request of a popup is the classic case. By the time you get a `Page` handle for the popup, that request already happened.
- **Prefer `page.route()`** when the broader scope would make the mock too invisible. A context-wide route is effectively ambient test infrastructure; that is good when it truly is infrastructure and bad when it quietly changes unrelated pages.

The precedence rule from the docs is also worth remembering: if both match, `page.route()` wins over `browserContext.route()` for requests coming from that page. That lets you keep a broad context-level default and override one endpoint surgically on the page that needs a different behavior.

One more detail from the [Page API](https://playwright.dev/docs/api/class-page) docs that is easy to miss: enabling routing disables the browser HTTP cache for that page or context. That is usually what you want in tests. It also means "my app got slower after I added routes" is not your imagination.

## Restoring routes

Adding the route is only half the job. If you install a route in the middle of a long test, or inside a reusable helper that runs more than once, you also need to know how to get rid of it.

In plain Playwright Test, the cheapest cleanup is often the test boundary itself: each test gets a fresh browser context, so routes you add in one test do not leak into the next one. But inside a single test or helper, route cleanup is your responsibility.

There are three patterns worth knowing.

### 1. Make the route self-expire

If the mock should only apply once, use the route `times` option and let Playwright remove it after that many matches:

```ts
await page.route(
  '**/api/shelf',
  async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ books: [] }),
    });
  },
  { times: 1 },
);
```

This is the cleanest option when you are intercepting one bootstrap request and then want the page to go back to the real network.

### 2. Remove one specific route

Use [`page.unroute()`](https://playwright.dev/docs/api/class-page#page-unroute) or [`browserContext.unroute()`](https://playwright.dev/docs/api/class-browsercontext#browser-context-unroute) when you want to remove a specific handler:

```ts
const mockShelf = async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ books: [{ title: 'Station Eleven' }] }),
  });
};

await page.route('**/api/shelf', mockShelf);

try {
  await page.goto('/shelf');
  await expect(page.getByText('Station Eleven')).toBeVisible();
} finally {
  await page.unroute('**/api/shelf', mockShelf);
}
```

Passing the handler matters when you have more than one route on the same URL pattern. If you omit it, Playwright removes **all** routes for that URL on that page or context.

`try` / `finally` is the right shape in helpers. Tests fail. Cleanup still has to happen.

### 3. Wipe everything

If a helper installs several routes, or mixes manual routes with HAR replay, use [`page.unrouteAll()`](https://playwright.dev/docs/api/class-page#page-unroute-all) or [`browserContext.unrouteAll()`](https://playwright.dev/docs/api/class-browsercontext#browser-context-unroute-all). These remove both the routes you registered with `route()` and the HAR handlers you registered with `routeFromHAR()`:

```ts
await page.route('**/api/shelf', async (route) => {
  await route.fulfill({ status: 500, body: 'boom' });
});

await page.routeFromHAR('tests/fixtures/open-library.har', {
  notFound: 'fallback',
});

// ... run the scenario ...

await page.unrouteAll({ behavior: 'wait' });
```

The `behavior` option is not decoration.

- `'wait'` waits for currently running handlers to finish before removing them.
- `'ignoreErrors'` removes immediately and swallows later handler errors.
- `'default'` removes immediately and can still surface unhandled errors from a handler that was already running.

Use `'wait'` unless you have a specific reason not to. It is the teardown version that behaves like an adult.

## Routing is middleware, not magic

Playwright's routing chain has real middleware semantics.

- Routes run in **reverse registration order**. The most recently registered matching route gets the first shot.
- A `page.route(...)` handler beats a matching `browserContext.route(...)` handler for requests from that page.
- [`route.fallback()`](https://playwright.dev/docs/api/class-route#route-fallback) passes the request along to the next matching handler, optionally with request overrides.
- [`route.continue()`](https://playwright.dev/docs/api/class-route#route-continue) sends the request straight to the network and stops the chain.

That distinction matters a lot once you have more than one handler:

```ts
await page.route('**/*', async (route, request) => {
  if (request.method() !== 'POST') return route.fallback();

  return route.fallback({
    headers: {
      ...request.headers(),
      'x-test-mode': '1',
    },
  });
});

await page.route('**/api/**', async (route) => {
  const response = await route.fetch({ maxRetries: 2 });
  const json = await response.json();
  json.debug = true;
  await route.fulfill({ response, json });
});
```

Registered in that order, the `**/api/**` handler runs first, and the broad `**/*` handler runs later only if the first one falls back. If you use `continue()` in the broad handler, the narrower one never gets a turn.

## Three things you can do with a route

Every route handler ends by calling one of three methods on the `route` object. Each one answers a different question.

### Fulfill: serve a fake response

[`route.fulfill`](https://playwright.dev/docs/api/class-route#route-fulfill) replaces the real response entirely. The request never leaves the browser:

```ts
await page.route('**/api/shelf', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ books: [] }),
  });
});
```

This is the one you'll reach for most often in tests. Mock the endpoint, control the response, assert on the UI that renders it. No network, no flakiness, no dependency on somebody else's server.

You can fulfill with more than just a body. The full set of options includes `status`, `headers`, `contentType`, `body`, and `path` (serve a file from disk). For example, serving a static JSON fixture:

```ts
await route.fulfill({
  status: 200,
  path: 'tests/fixtures/shelf-response.json',
});
```

### Abort: kill the request

[`route.abort`](https://playwright.dev/docs/api/class-route#route-abort) stops the request cold. The browser gets a network error, as if the server was unreachable:

```ts
// Block all image requests.
await page.route('**/*.{png,jpg,jpeg,webp}', (route) => route.abort());
```

This is useful for two things. First, speeding up tests that don't care about images, fonts, or third-party scripts—blocking them shaves time off every page load. Second, testing how your app handles network failures. If you want to verify that the shelf page shows an error state when the API is down, abort the API route and assert on the error UI:

```ts
await page.route('**/api/shelf', (route) => route.abort());
await page.goto('/shelf');
await expect(page.getByText('Unable to load your shelf')).toBeVisible();
```

You can also abort selectively by resource type instead of URL:

```ts
await page.route('**/*', (route) => {
  return route.request().resourceType() === 'image' ? route.abort() : route.continue();
});
```

### Continue: let it through, maybe modified

[`route.continue`](https://playwright.dev/docs/api/class-route#route-continue) sends the request to the real server, but lets you modify it on the way out. You can change the method, the URL, the headers, or the post data:

```ts
// Strip a custom header before the request reaches the server.
await page.route('**/*', async (route) => {
  const headers = route.request().headers();
  delete headers['X-Debug-Token'];
  await route.continue({ headers });
});
```

This is the least common of the three in test code, but it shows up when you need to simulate a specific client environment (changing the `User-Agent`, for example) or when you need to strip headers that your test infrastructure adds but that the server doesn't expect.

There is one nasty caveat from the [Route API](https://playwright.dev/docs/api/class-route): you cannot override the `Cookie` header this way. The browser fills cookies from its cookie jar, not from your handcrafted header override. If cookie state matters, use `browserContext.addCookies()` or `storageState` instead of trying to smuggle it through `continue()`.

## Modifying responses

Sometimes you want the _real_ response from the server, but with one thing changed—a field added, a field removed, a status code swapped. The pattern is: fetch the original response through the route, modify it, then fulfill with the modified version.

```ts
await page.route('**/api/shelf', async (route) => {
  // Fetch the real response.
  const response = await route.fetch();
  const json = await response.json();

  // Add a field the test needs.
  json.books.forEach((book) => {
    book.testId = `book-${book.id}`;
  });

  await route.fulfill({
    response,
    body: JSON.stringify(json),
    headers: {
      ...response.headers(),
      'content-type': 'application/json',
    },
  });
});
```

[`route.fetch`](https://playwright.dev/docs/api/class-route#route-fetch) sends the request to the real server and gives you the response object. You modify whatever you need, then call `route.fulfill` with the modified version. The browser sees the modified response as if it came from the server directly.

`route.fetch()` also takes a few useful knobs of its own. The two that matter most in test code are `maxRedirects` and `maxRetries`. Redirect-heavy auth flows or the occasional transient reset on a backend call are much easier to model there than in handwritten retry wrappers around your route handler.

This is powerful for testing edge cases without building a separate test server. Want to test what happens when the API returns 500? Fetch the real response, ignore it, and fulfill with a 500. Want to test what happens when one field is missing? Fetch the real response, delete the field, fulfill. The real server provides the baseline; you provide the variation.

> [!TIP]
> If you find yourself modifying responses for more than two or three routes in the same test, you've probably outgrown route-based interception. Switch to HAR replay with a pre-edited HAR file, or build a proper fixture system. Route handlers are great for surgical mocks; they get unwieldy when you're mocking an entire API surface.

## Glob URL patterns

Playwright uses its own simplified glob syntax for URL matching in `page.route`, `page.waitForResponse`, and everywhere else that accepts a URL pattern. A few rules worth internalizing:

- A single `*` matches any characters _except_ `/`. So `https://example.com/*.js` matches `https://example.com/app.js` but not `https://example.com/scripts/app.js`.
- A double `**` matches any characters _including_ `/`. So `**/*.js` matches both of those.
- `?` matches a literal question mark, not "any single character." This is different from shell globs. If you want to match any character, use `*`.
- Curly braces `{}` match a comma-separated list of alternatives: `**/*.{png,jpg,jpeg}` matches all three image types.
- The glob must match the _entire_ URL, not just a substring. `*.js` won't match anything because URLs start with `https://`.

When globs aren't expressive enough, pass a regular expression instead:

```ts
await page.route(/openlibrary\.org\/search\.json/, async (route) => {
  // ...
});
```

Regex patterns match against the full URL string, so you don't need to match the protocol and domain if you don't care about them—a partial match is fine.

## Monitoring network events

Sometimes you don't want to intercept requests—you want to observe them. Playwright exposes `request` and `response` events on both the page and the context:

```ts
page.on('request', (request) => console.log('>>', request.method(), request.url()));
page.on('response', (response) => console.log('<<', response.status(), response.url()));
```

These fire for _every_ request, including ones you've routed. They're useful for debugging—if a route isn't matching, the `request` event shows you exactly what URL the browser is requesting so you can fix your glob.

In test code, you'll rarely need raw event listeners. `page.waitForResponse` (covered in [The Waiting Story](the-waiting-story.md)) is the right tool for "wait until this request finishes, then assert." Event listeners are for when you need to collect _all_ traffic for a test report or a failure dossier.

## The service worker gotcha

If your app registers a [service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API), that worker sits between the browser and the network—and it intercepts requests _before_ Playwright's route handlers see them. This means your `page.route` calls might not fire at all, because the service worker is serving cached responses instead of letting the requests through to the network layer.

The fix is straightforward:

```ts
const context = await browser.newContext({
  serviceWorkers: 'block',
});
```

Or in `playwright.config.ts`:

```ts
export default defineConfig({
  use: {
    serviceWorkers: 'block',
  },
});
```

This disables service workers entirely for the test context. Your routes work as expected, and you don't lose anything—service worker caching is a production concern, not a test concern.

> [!WARNING]
> If you're using [Mock Service Worker (MSW)](https://mswjs.io/) for API mocking in your app, it registers its own service worker. That worker will intercept requests before Playwright's route handlers, making your routes invisible. If you want Playwright-level route interception, either disable MSW in the test environment or use Playwright's built-in routing instead of MSW.

## Popups and WebSockets have their own edge cases

Two route gotchas are worth writing down because they look like "Playwright is broken" right up until you know the rule.

First: `page.route()` does **not** catch the first request of a popup page. That request happens before you have a handle on the popup page object. If you need to intercept popup traffic from the start, register the handler on the browser context with `browserContext.route()`.

Second: socket-heavy apps now have [`browserContext.routeWebSocket()`](https://playwright.dev/docs/api/class-browsercontext) when you need to observe or modify WebSocket traffic. The timing rule is strict: only sockets created **after** routing is registered get intercepted. Set it up before the page creates the connection or do not bother pretending the route will see it.

## When to use routes vs. HARs

The decision is usually obvious once you state the question clearly:

- **One or two endpoints with known responses:** Use `page.route` with `route.fulfill`. The mock lives in the test, it's readable, it's explicit.
- **Simulating errors or edge cases:** Use `page.route` with `route.abort` or a custom `route.fulfill` with a non-200 status. HARs record _successful_ sessions—they're not built for error simulation.
- **A large API surface with many endpoints:** Use HAR replay. Recording ten endpoints is easier than writing ten route handlers.
- **Response modification:** Use `route.fetch` + `route.fulfill` when you want the real response with one thing changed. Use a modified HAR when you need that across many tests.

Both tools coexist. You can replay a HAR for most endpoints and add a `page.route` on top for the one endpoint you need to simulate failing. The route handler takes priority over the HAR replay for matching requests.

## The agent rules

```markdown
## Route-based network mocking

- Use `page.route` with `route.fulfill` for mocking one or two endpoints
  with known responses. Use HAR replay for larger API surfaces.
- Treat routing as middleware. Use `route.fallback()` when later handlers
  still need to run; use `route.continue()` only when the chain should end.
- Use `route.abort` to simulate network failures and to block non-essential
  resources (images, fonts, analytics) that slow down tests.
- Never use `route.continue` to silently modify request headers without
  documenting why in a comment. Header manipulation is invisible in the
  test output and easy to forget about.
- Do not try to override cookies through `route.continue()`. Use
  `addCookies()` or storage state for cookie setup.
- If routes aren't intercepting as expected, check for service workers.
  Set `serviceWorkers: 'block'` in the test context when using route-based
  interception or HAR replay.
- If popup traffic or WebSockets are involved, move the interception to
  the browser context layer before debugging anything else.
- If a helper installs temporary routes, clean them up with `times`,
  `unroute()`, or `unrouteAll({ behavior: 'wait' })` before returning.
```

## The one thing to remember

`page.route` is the surgical tool. HAR replay is the sledgehammer. Use `route.fulfill` when you know exactly what response you want, `route.abort` when you want to simulate failure, and `route.continue` when you want the real response with a tweak. When the mocks get big enough that route handlers are cluttering the test file, switch to HAR.

## Additional Reading

- [Recording HARs for Network Isolation](recording-hars-for-network-isolation.md)
- [Approaches to HAR Recording](approaches-to-har-recording.md)
- [The Waiting Story](the-waiting-story.md)
- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md)
