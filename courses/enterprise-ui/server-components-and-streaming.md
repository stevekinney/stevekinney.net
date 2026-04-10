---
title: Server Components and Streaming SSR
description: >-
  How Server Components, the client boundary, renderToPipeableStream, and
  Suspense-driven streaming fit together—and the common mistakes that happen
  when you learn the names but miss the boundaries.
modified: 2026-03-17
date: 2026-03-01
---

The cleanest way to understand this stack is to separate execution from delivery. Server Components decide what code runs ahead of time on the server. `'use client'` marks which modules belong in the browser. SSR decides whether React turns the result into HTML on the server. Streaming SSR decides whether that HTML is sent all at once or progressively, usually around Suspense boundaries. React can combine all of these, but they solve different problems.

A useful mental model for a single request:

```text
request
  → render Server Components, combine with Client Component code
  → server-render the result to HTML
  → stream the shell
  → stream later Suspense chunks as they resolve
  → hydrate interactive client islands in the browser
```

## Server Components Are About Where Code Runs

Server Components render in a separate environment from the client app—and React is [explicit][1] that this environment is separate even from the SSR server. They can run once at build time on CI or per request on a web server. That makes them a good home for route composition, server-side data access, filesystem reads, and expensive libraries you don't want in the browser bundle. They also support `async` components, so you can `await` during render instead of bouncing through client-side effects and extra API hops.

The payoff is smaller client bundles and simpler data loading. The trade is equally clear: Server Components aren't sent to the browser, so they can't use interactive browser APIs like `useState`, event handlers, or most hooks. When you need interactivity, you compose a Server Component _with_ a Client Component instead of trying to make the server piece do browser work it was never meant to do.

One subtle but important detail: there's no directive that marks a file as a Server Component. React's [docs explicitly say][1] that `'use server'` is _not_ for Server Components—it's for Server Functions. Different job, same ecosystem. React 19 stabilizes Server Components themselves, but the bundler and framework APIs used to implement RSC don't follow semver across React 19.x minors yet. In practice, that means most teams should use RSC through a framework instead of hand-rolling the integration.

## The Server/Client Boundary Is a Module Boundary

`'use client'` creates a boundary in the **module dependency tree**, not in the render tree. Once a module is marked `'use client'`, that module and its entire transitive dependency subtree become client-evaluated code. React is [direct about this][2]: code in the client module subtree is sent to and run by the client. That's why putting `'use client'` high in the tree is expensive—it widens the amount of code that ships to the browser.

The boundary also doesn't follow parent-child nesting. A Client Component can still render a Server Component by receiving already-created JSX as props or `children`. React's own example makes the rule blunt: parent-child render relationships don't guarantee the same render environment, because the boundary lives on the import graph, not the component tree.

Two practical consequences:

1. **Keep `'use client'` as low as possible**—ideally on the smallest interactive leaf, not on the page, layout, or route module.
2. **Keep cross-boundary data serializable.** React requires props flowing from Server Components to Client Components to be serializable. Shared helper modules can be evaluated on either side depending on who imports them, so they need to stay environment-agnostic unless you split them deliberately.

Here's what that looks like in practice:

```tsx
// Expandable.tsx
'use client';

import { useState, type ReactNode } from 'react';

export function Expandable({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button onClick={() => setOpen((v) => !v)}>{open ? 'Hide' : 'Show'}</button>
      {open ? children : null}
    </section>
  );
}
```

```tsx
// Page.tsx
import { Expandable } from './Expandable';

export default async function Page() {
  const article = await getArticle();

  return (
    <main>
      <h1>{article.title}</h1>
      <Expandable>
        <ArticleBody article={article} />
      </Expandable>
    </main>
  );
}

async function ArticleBody({ article }: { article: Article }) {
  return <div dangerouslySetInnerHTML={{ __html: article.html }} />;
}
```

`Expandable` is client code because its module is marked `'use client'`. `ArticleBody` is still a Server Component because the server created that JSX before handing it to the client wrapper. Same UI tree, different execution environments. The rule is consistent once you think in modules instead of nesting.

## `renderToPipeableStream` Is the Node Streaming SSR API

If you're doing low-level SSR in Node, [`renderToPipeableStream`][3] is the core server entry point. It renders a React tree to a Node.js stream and returns `pipe` and `abort`.

> [!NOTE]
> This API is Node-specific. React 19.2 added `renderToReadableStream` support in Node, but the React team still recommends the Node Streams APIs in Node because they're faster there and Web Streams don't support compression by default.

At this level, React expects the rendered tree to represent the whole document, so your top-level app usually renders `<html>`, not just a content fragment. `bootstrapScripts` points the browser at the client bundle, and the client uses `hydrateRoot` to attach interactivity to the server-generated HTML.

```tsx
import express from 'express';
import { renderToPipeableStream } from 'react-dom/server';
import { App } from './App';

const app = express();

app.get('*', (req, res) => {
  let didError = false;

  const { pipe, abort } = renderToPipeableStream(<App url={req.url} />, {
    bootstrapScripts: ['/static/client.js'],

    onShellReady() {
      res.statusCode = didError ? 500 : 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      pipe(res);
    },

    onShellError(error) {
      console.error(error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<!doctype html><h1>Something went wrong</h1>');
    },

    onError(error) {
      didError = true;
      console.error(error);
    },
  });

  setTimeout(() => abort(), 10_000);
});
```

The callbacks map to specific stages of the render:

- **`onShellReady`** fires when the shell has rendered—the normal point to set headers and start streaming.
- **`onAllReady`** waits until the _full_ render is complete. Use this when you want final HTML instead of progressive chunks (crawlers, static generation).
- **`onShellError`** fires for failures before any bytes are emitted—you can still send a fallback document and a 500.
- **`onError`** sees both recoverable and non-recoverable server errors.
- **`abort()`** stops waiting, flushes loading fallbacks, and lets the client finish the rest.

The biggest operational catch is status codes. Once you start streaming, you can't change the response status. React's guidance: think in terms of the shell versus everything inside Suspense boundaries. If the shell fails, `onShellError` can still send a 500. If something _inside_ a Suspense boundary fails, React can often recover on the client, and you may still choose to stream the shell and return 200.

## Streaming SSR Is Suspense-Aware HTML Delivery

Streaming SSR isn't just "send bytes sooner." In React, it's coordinated by Suspense. The **shell** is the part of the page outside any Suspense boundary. When a slower region sits inside `<Suspense>`, React streams the shell first, emits the fallback for that region, and later streams the finished HTML along with an inline script that replaces the fallback with the real content. Nested Suspense boundaries let you reveal the page in stages instead of waiting for the slowest part.

React [warns against][3] the lazy version of this pattern where you wrap the whole app in one root Suspense boundary. If you do that, your shell is just a spinner. The better target is a shell that feels minimal but complete—real layout, page chrome, enough context that the user can orient immediately while slower regions fill in.

Streaming also doesn't need to wait for React itself to load in the browser before the initial HTML becomes visible. But only Suspense-enabled data sources participate. React currently calls out framework-managed Suspense data fetching, `lazy`, and `use` on a Promise. It [explicitly says][3] Suspense does _not_ detect data fetched inside an Effect or event handler. So, if your data model is still "render, then `useEffect`, then fetch," you're not really taking advantage of streaming SSR at all.

```tsx
import { Suspense } from 'react';
import { SearchBox } from './SearchBox'; // 'use client'

export default async function Page() {
  const hero = await getHero();

  return (
    <main>
      <Hero data={hero} />
      <SearchBox />
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations />
      </Suspense>
    </main>
  );
}

async function Recommendations() {
  const items = await getRecommendations();
  return <RecommendationsList items={items} />;
}
```

The hero and layout are part of the shell. `SearchBox` hydrates on the client because it's a Client Component. `Recommendations` streams later behind a fallback. That's the basic composition React keeps steering people toward: Server Components for data-rich composition, Client Components for interaction, Suspense for progressive reveal.

## Where Server Functions Fit

Server Functions are the mutation half of this model. A function marked with [`'use server'`][4] is callable from client code—React serializes the arguments, sends a network request to the server, runs the function there, and serializes the result back. React is very explicit that these functions must be async, and that you should treat their arguments as untrusted input and authorize any mutations.

When a Server Function is passed to [`<form action>`][5] from a Server Component, the form is progressively enhanced. The form can submit even without JavaScript or before the client code has loaded—a much nicer baseline than the usual "click button, nothing happens until the bundle finishes downloading" experience.

```tsx
// actions.ts
'use server';

export async function saveSearch(formData: FormData) {
  const query = String(formData.get('query') ?? '');
  await persistSearch(query);
}
```

```tsx
// SearchForm.tsx
'use client';

import { saveSearch } from './actions';

export function SearchForm() {
  return (
    <form action={saveSearch}>
      <input name="query" />
      <button type="submit">Save</button>
    </form>
  );
}
```

## A Practical Architecture

A sane default: keep pages, layouts, route composition, and server-side data reads in Server Components. Put widgets that need state, effects, browser APIs, or event handlers in Client Components. Put mutations in Server Functions. Place Suspense boundaries around slower or lower-priority regions so the shell can stream as early as possible.

That split lines up with React's documented advantages and limits for Server Components and with how `renderToPipeableStream` defines the shell. Unless you're building framework tooling, let a framework own the RSC transport and bundler integration—React still describes those low-level APIs as unstable across 19.x minors.

## Common Mistakes

The fastest way to get lost here is to learn the names and miss the boundaries.

- **Thinking `'use server'` marks a Server Component.** It doesn't. There's no directive for Server Components. `'use server'` marks Server Functions.
- **Thinking the boundary follows component nesting.** It doesn't. The boundary is in the module dependency tree, not the render tree.
- **Marking a page or layout `'use client'`.** The client subtree includes transitive dependencies, so bundle size can expand far beyond what you intended.
- **Expecting Suspense to work with `useEffect` data fetching.** Suspense doesn't detect data fetched in effects or event handlers. Only Suspense-enabled data sources (framework data fetching, `lazy`, `use` on a Promise) participate.
- **Forgetting that the status code is fixed once streaming starts.** Streaming gives earlier paint, but it changes your error-handling model.
- **Hand-rolling RSC infrastructure.** The framework and bundler integration APIs don't follow semver across React 19.x minors. Let a framework handle it.

## The Short Version

Server Components for server-only reads and route composition. Client Components for interaction. Server Functions for mutations. Suspense to decide what belongs in the shell and what can reveal later. `renderToPipeableStream` at the Node entry point when you want streaming SSR. Once those responsibilities are separated, the model stops feeling mystical and starts feeling like a pretty sensible pipeline—which is irritating, because it means React was right this time.

[1]: https://react.dev/reference/rsc/server-components 'Server Components – React'
[2]: https://react.dev/reference/rsc/use-client "'use client' directive – React"
[3]: https://react.dev/reference/react-dom/server/renderToPipeableStream 'renderToPipeableStream – React'
[4]: https://react.dev/reference/rsc/use-server "'use server' directive – React"
[5]: https://react.dev/reference/react-dom/components/form '<form> – React'
