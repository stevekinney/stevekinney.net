---
title: Mock Service Worker
description: >-
  A client-agnostic, standards-based way to describe network behavior once and
  reuse it across browser development, Node tests, and debugging—without
  stubbing fetch or patching Axios.
modified: 2026-03-17
date: 2026-03-01
---

Mock Service Worker—usually just MSW—is best understood as a network-behavior layer. You don't stub `fetch`, patch Axios, or teach React Query about a fake backend. You describe how the network should behave, and the application keeps making real requests. MSW intercepts them at the boundary where your app meets the network, not at the call site where one library happened to issue the request.

MSW works in the browser and in Node.js, supports HTTP, GraphQL, and WebSocket mocking, and the [current documentation][1] is centered on the v2 API: `http`, `HttpResponse`, `setupWorker`, and `setupServer`. MSW 2.0 was the major API reset and requires Node 18 or newer.

> [!WARNING]
> A lot of older MSW content still floats around using `rest.get()` and `res(ctx.json())`. If you see that style, you're reading [v1-era material][2]. Current MSW uses `http.*` request handlers and `HttpResponse`. Stale tutorials breed faster than good maintenance habits.

## What MSW Is Actually Doing

In the browser, MSW registers a real Service Worker and intercepts requests on the network level. Because it sits _below_ your request client, the same mocks work whether the app uses native `fetch`, Axios, Apollo, React Query, or something else entirely. The [official docs][3] describe this as client-agnostic—you make zero changes to the application code just to mock the API.

In Node.js, there's no Service Worker, so MSW uses [`setupServer()`][4] from `msw/node` to intercept outgoing traffic inside the current process. Despite the name, it doesn't create an HTTP server. The Node integration works by augmenting native request-issuing modules like `http` and `https`, and it exists so you can reuse the same handlers you wrote for the browser.

That's the core reason MSW feels better than request-client stubbing in larger codebases. The mock becomes a standalone source of truth for network behavior that can be reused in local development, debugging, integration tests, Storybook, and demos—instead of being reimplemented separately in each tool.

## The Mental Model

Request handlers are your mock API contract. `setupWorker()` and `setupServer()` are environment adapters. Runtime overrides are per-test or per-session deviations from the default contract. MSW's [own docs recommend][1] thinking in terms of describing the network once and reusing that description everywhere.

A handler has two parts. The **predicate** decides which requests match. The **resolver** decides what to do with a matched request. The [`http` namespace][6] is the main entry point for REST-style work, and it mirrors HTTP methods—`get`, `post`, `put`, `delete`:

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
  }),

  http.post('https://api.example.com/login', async ({ request }) => {
    const body = (await request.clone().json()) as { email?: string };

    if (!body.email) {
      return new HttpResponse('Missing email', { status: 400 });
    }

    return HttpResponse.json({ ok: true });
  }),
];
```

Handlers read like route definitions. Path parameters are available as `params`. The `request` argument is a regular Fetch `Request`, so you read JSON, text, form data, blobs, and streams the same way you would anywhere else on the web platform. If you plan to pass the request through or replay it, clone it before reading the body so you don't consume the stream twice.

For responses, MSW lets you return a plain Fetch `Response`, but the docs recommend [`HttpResponse`][7] because it's a drop-in replacement with better ergonomics and server-like features—response-cookie handling, for example—that plain `Response` doesn't expose well in mocks.

## Browser Setup

Browser setup has one extra moving part that people forget and then blame on the moon: the worker script itself. If your application uses MSW in the browser, it must host and serve `mockServiceWorker.js`. The [official CLI command][3] copies the worker into your public assets directory:

```bash
npm i -D msw
npx msw init public --save
```

Then create a browser integration point with `setupWorker()` and start it during app bootstrap:

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

```typescript
// src/main.ts
import { worker } from './mocks/browser';

await worker.start();
```

[`worker.start()`][8] is asynchronous because the Service Worker has to be registered and activated. The docs are explicit: `await` it to avoid race conditions between app startup and request interception. By default, it looks for the worker script at `/mockServiceWorker.js`, and the registration path matters because a Service Worker can only control pages at its level and below—which is why registering at the root is usually the right move.

## Node Setup

Node setup is simpler because there's no worker file. Define the same handlers, create a server integration with `setupServer()` from `msw/node`, and enable it in the Node process where your tests run. The [docs recommend][9] doing that as early as possible so all outgoing requests are affected.

```typescript
// src/mocks/node.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```typescript
// vitest.setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './src/mocks/node';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

That lifecycle isn't arbitrary ceremony. The [Node integration docs][9] call out the three critical steps: enable interception before tests, reset runtime overrides between tests, and restore native request behavior after the suite finishes. `server.listen()` is synchronous—unlike `worker.start()`—because there's no browser worker to register.

The same handler list can be shared between browser and Node, but shared doesn't mean magical. If a handler reaches for browser-only APIs like `location` or `localStorage`, those won't exist in Node unless you polyfill them or choose a test environment that provides them. Keep handlers focused on request and response logic instead of environmental side quests.

## How Request Matching Works

MSW's [request matching][5] is intentionally route-like. A predicate can be a relative URL, an absolute URL, a regular expression, or a custom predicate function. String predicates support wildcards and named path parameters like `:id`, and matching is powered by `path-to-regexp`—so it feels familiar if you've worked with Express or any other server router.

A few rules matter in practice:

- Relative URLs resolve against the current document in the browser, which is convenient there but tricky in Node because Node has no `location`.
- Query parameters are _not_ part of the route predicate. Don't include them. They're stripped for matching—read them from the request URL inside the resolver instead.
- When you need something more custom, the predicate can be a function that returns a boolean.

That design nudges you toward modeling resources the way servers do, not the way tests often do. You don't match "the fetch call from `users.ts`." You match `GET /users/:id`. That's a healthier contract, and it ages better than binding your mocks to whichever client abstraction the team got attached to that quarter.

## Handling Responses

The most common thing a resolver does is return a mocked response. MSW treats that response as a web-standard object, so your mocks use the same shapes and semantics as real network code. But mocked responses aren't the only option—a request can be [passed through to the real network][11], or a resolver can combine live and mocked data when needed.

`passthrough()` and `bypass()` are the two APIs people mix up. **`passthrough()`** says "let this intercepted request continue to the real network as-is"—it doesn't create an extra request. **`bypass()`** performs an _additional_ request outside MSW's interception algorithm, which makes it useful for response patching when you want to fetch the real response and then modify it before returning a mock-enhanced result.

```typescript
import { http, HttpResponse, passthrough, bypass } from 'msw';

export const handlers = [
  http.get('/feature-flags', ({ request }) => {
    if (request.headers.has('x-use-live-flags')) {
      return passthrough();
    }

    return HttpResponse.json({ checkoutV2: true });
  }),

  http.get('/user', async ({ request }) => {
    const realUser = await fetch(bypass(request)).then((res) => res.json());

    return HttpResponse.json({
      ...realUser,
      role: 'admin',
    });
  }),
];
```

`passthrough()` is for conditional reality. `bypass()` is for "call reality from inside the mock and patch the answer." Humans love giving two related APIs nearly identical names, so here we are.

## Runtime Overrides

The default handler list should describe the happy path. MSW's [best-practices docs][12] recommend a single top-level `handlers` module for that base behavior, and then [runtime overrides][13] for special cases—401s, 500s, empty states, or one-off edge cases in individual tests.

`.use()` prepends new handlers so they take precedence over the initial ones. That's what makes per-test overrides work cleanly. You don't replace the whole mock API—you temporarily shadow one route. MSW also supports one-time overrides via `{ once: true }`, which exhaust themselves after the first match:

```typescript
import { http, HttpResponse } from 'msw';
import { server } from './mocks/node';

server.use(
  http.get('https://api.example.com/users/:id', () => new HttpResponse(null, { status: 500 }), {
    once: true,
  }),
);
```

[`resetHandlers()`][14] removes runtime overrides and takes you back to the initial handler set. If you pass a new handler list into `resetHandlers()`, it replaces the initial set entirely. `restoreHandlers()` re-arms exhausted one-time handlers so they can match again. Those rules are worth remembering because they're the difference between isolated tests and the usual slow-motion contamination disaster.

## Testing Philosophy

MSW has a very opinionated testing philosophy, and it's the right one. The [docs explicitly recommend][15] avoiding request assertions like "did we call this URL," "did we send this body," or "did handler X run." Those are implementation-detail assertions. They test _how_ your code happens to be written instead of _what_ the user-visible behavior is.

The better pattern: validate request correctness inside the handler and let the application react to the resulting response. If a login request is missing an `email` field, the handler returns a 400. Your test asserts that the UI shows an error, disables submit, retries—whatever real behavior matters. That keeps the network contract realistic and makes broken requests fail the same way they'd fail against a real backend.

For unhandled traffic, set `onUnhandledRequest: 'error'` in tests so unknown requests fail loudly instead of quietly drifting to the real network. For edge cases where a request has no visible product effect—analytics, monitoring, fire-and-forget telemetry—use the [life-cycle events API][16] to observe requests and responses directly:

```typescript
server.events.on('request:start', ({ request }) => {
  console.log('Outgoing request:', request.method, request.url);
});
```

That event API is also the first thing the official [debugging runbook][16] recommends when MSW appears not to be working. If `request:start` isn't firing, the problem is setup. If it _is_ firing but the wrong handler matches, the problem is your network description. That alone will save you a lot of pointless swearing.

## Beyond REST

MSW isn't just an HTTP route mocker. The current docs cover first-class [GraphQL support][17] through the `graphql` namespace, which handles queries and mutations directly. (GraphQL subscriptions aren't supported there yet.)

MSW also has first-class [WebSocket support][18] through the `ws` namespace. The WebSocket model is standards-first too—you work with connection and message events according to the WHATWG WebSocket model, and you can intercept both outgoing client events and incoming server events. That makes MSW useful for more than CRUD screens, which is refreshing in a world where every "full-stack guide" secretly means a todo app with branding.

## Where People Get Into Trouble

**Browser**: the most common problems are boring setup errors. The worker file is missing, served from the wrong place, or registered under a scope that doesn't cover the page making requests. Not awaiting `worker.start()` creates race conditions where early requests escape before mocking is active.

**Node**: shared handlers that rely on browser globals fail, relative URL assumptions don't translate because Node has no document location, and the [limitations page][4] warns that requests made through direct `net.connect()` or `net.createConnection()` paths—including some Undici-based clients—aren't visible to MSW. "Client-agnostic" is true in the normal case, but Node still has sharp edges where some lower-level clients slip past interception.

**Jest**: the [official FAQ][19] says that errors like `Request is not defined`, `Response is not defined`, or `TextEncoder is not defined` often come from `jest-environment-jsdom` replacing Node built-ins with polyfills that break compatibility. The docs recommend `jest-fixed-jsdom` instead.

## Structuring an MSW Setup

Keep it boring on purpose:

```text
src/
  mocks/
    handlers/
      user.ts
      auth.ts
      checkout.ts
      index.ts
    browser.ts
    node.ts
```

Handler files grouped by domain, with `index.ts` composing them into one `handlers` export. That matches MSW's [guidance][12] to keep a base happy-path network description and group handlers by product area instead of dumping everything into one giant file. `browser.ts` and `node.ts` stay thin environment adapters. Tests use runtime overrides instead of forking the main handler set.

Once it's arranged that way, MSW stops feeling like test glue and starts feeling like infrastructure—the kind that's actually pleasant to maintain, which is admittedly suspicious.

[1]: https://mswjs.io/docs/ 'Introduction - Mock Service Worker'
[2]: https://v1.mswjs.io/docs/api/rest 'rest - MSW v1 Docs'
[3]: https://mswjs.io/docs/integrations/browser/ 'Browser integration - Mock Service Worker'
[4]: https://mswjs.io/docs/api/setup-server/ 'setupServer - Mock Service Worker'
[5]: https://mswjs.io/docs/http/intercepting-requests/ 'Intercepting requests - Mock Service Worker'
[6]: https://mswjs.io/docs/api/http/ 'http - Mock Service Worker'
[7]: https://mswjs.io/docs/api/http-response/ 'HttpResponse - Mock Service Worker'
[8]: https://mswjs.io/docs/api/setup-worker/start/ 'start() - Mock Service Worker'
[9]: https://mswjs.io/docs/integrations/node/ 'Node.js integration - Mock Service Worker'
[10]: https://mswjs.io/docs/http/mocking-responses/ 'Mocking responses - Mock Service Worker'
[11]: https://mswjs.io/docs/api/passthrough/ 'passthrough - Mock Service Worker'
[12]: https://mswjs.io/docs/best-practices/structuring-handlers/ 'Structuring handlers - Mock Service Worker'
[13]: https://mswjs.io/docs/best-practices/network-behavior-overrides/ 'Network behavior overrides - Mock Service Worker'
[14]: https://mswjs.io/docs/api/setup-server/reset-handlers/ 'resetHandlers() - Mock Service Worker'
[15]: https://mswjs.io/docs/best-practices/avoid-request-assertions/ 'Avoid request assertions - Mock Service Worker'
[16]: https://mswjs.io/docs/runbook/ 'Debugging runbook - Mock Service Worker'
[17]: https://mswjs.io/docs/api/graphql/ 'graphql - Mock Service Worker'
[18]: https://mswjs.io/docs/websocket/ 'Mocking WebSocket - Mock Service Worker'
[19]: https://mswjs.io/docs/faq/ 'FAQ - Mock Service Worker'

---

## TL;DR

### Network-Level Interception

> MSW intercepts at the network boundary, not at the call site.

- Works with `fetch`, Axios, Apollo, React Query—anything that makes HTTP requests.
- **Browser:** Service Worker intercepts outgoing requests. Requires `mockServiceWorker.js` in your public assets.
- **Node:** Native module interception. No worker file, no polyfills.
- Same handlers work in both environments. Write once, use in tests, Storybook, and local development.

---

### Handler Anatomy

> Two parts: a predicate (which requests match) and a resolver (what to return).

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'Ada Lovelace' });
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body, { status: 201 });
  }),
];
```

- Route-style matching with path params, regex, and wildcard support.
- Resolvers receive the full `request` object—read headers, body, cookies.

---

### Runtime Overrides

> Base handlers define the happy path. Per-test overrides handle the exceptions.

```typescript
it('shows an error when the API fails', async () => {
  server.use(
    http.get('/api/users/:id', () => {
      return new HttpResponse(null, { status: 500 });
    }),
  );
  // ...assert the error UI appears
});
```

- `server.use()` prepends handlers for the duration of the test.
- `server.resetHandlers()` in `afterEach` restores the base handlers.
- Add `{ once: true }` for one-shot overrides that auto-remove.
- Avoid asserting _that_ a request was made. Assert the _user-visible behavior_ that results from it.
