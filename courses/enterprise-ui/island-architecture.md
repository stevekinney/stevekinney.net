---
title: Island Architecture
description: >-
  An HTML-first rendering pattern where most of the page stays static and only
  the interactive regions get JavaScript—how it works, where it shines, and
  where it gets awkward.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

Most pages are not fully interactive applications. A product page, article, docs page, pricing page, or account overview usually contains a lot of static markup and only a handful of dynamic controls. Traditional full-page hydration still ships JavaScript and hydration work for the entire app tree, including regions that never needed client interactivity in the first place.

**Island Architecture** is an HTML-first rendering pattern where most of the page is rendered as static or server-rendered HTML, and only the small interactive regions get JavaScript and hydrate independently. The term traces back to Katie Sylor-Miller and was popularized by [Jason Miller's write-up][3], which framed the page as a mostly static document with a few self-contained "islands" of interactivity. Astro later pushed the pattern into the mainstream, but the idea is broader than any one framework.

Or, in less diplomatic terms: islands stop shipping a whole frontend cathedral so one carousel can rotate.

## A Super Naïve Version

This is more conceptual than practical. Bear with me.

```html
<h1>Mostly HTML</h1>
<p>No JavaScript for any of this.</p>

<button id="counter">Clicks: 0</button>

<script type="module">
  let count = 0;
  const btn = document.querySelector('#counter');
  btn.addEventListener('click', () => {
    count += 1;
    btn.textContent = `Clicks: ${count}`;
  });
</script>
```

### A Super Naïve Version—with React

We could have an HTML page like this.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DIY React Islands</title>
  </head>
  <body>
    <h1>Mostly HTML</h1>
    <p>This content never hydrates. It stays plain HTML.</p>

    <hr />

    <h2>Island A</h2>
    <div id="island-a"></div>

    <h2>Island B</h2>
    <div id="island-b"></div>

    <h2>Island C</h2>
    <div id="island-c"></div>

    <script type="module" src="/client.tsx"></script>
  </body>
</html>
```

And then our ridiculous JavaScript might look like this…

```tsx
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

function Counter({ label }: { label: string }) {
  const [count, setCount] = useState(0);
  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      {label}: {count}
    </button>
  );
}

function mount(id: string, el: React.ReactNode) {
  const node = document.getElementById(id);
  if (!node) return; // page might not include every island
  createRoot(node).render(el);
}

mount('island-a', <Counter label="A clicks" />);
mount('island-b', <Counter label="B clicks" />);
mount('island-c', <Counter label="C clicks" />);
```

None of this is _really_ how it works. I'm just trying to make it simple.

## How It Works

The core mechanism is straightforward:

```text
request
  → server renders page shell to HTML
  → static regions are sent as plain HTML
  → interactive regions are marked as islands
  → browser paints the page immediately
  → each island loads its own JS when needed
  → each island hydrates independently
```

That independence is the real point. In a classic hydrated app, the page behaves like one large client-side program. In an islands system, the page is closer to a static document with a few embedded apps. [Deno's Fresh docs][4] phrase it bluntly: normal JS frameworks hydrate a _page_, while island frameworks hydrate _components_.

Each island has its own hydration script and executes independently, so one slow component is less likely to drag the rest of the page down with it.

## What Counts as an Island

In common usage, a **client island** is an interactive UI component that hydrates separately from the rest of the page. [Astro describes][1] an island as an enhanced UI component on an otherwise static page of HTML, and specifically distinguishes client islands from **server islands**: client islands are hydrated interactive widgets, while server islands are dynamic server-rendered fragments that render separately from the main page response.

That distinction matters. A page might have a static article body, a client island for a comments composer, and a server island for a personalized "Your account" box. Both are "islands" in the sense that they're isolated from the main page render, but one isolates client hydration work and the other isolates server rendering work. Astro's server islands move slow or personalized server logic out of the critical render path so the rest of the page can be cached more aggressively.

## Why It Can Feel So Fast

The obvious benefit is lower JavaScript volume. [Astro's docs][1] are direct: most of the page becomes fast static HTML, and JavaScript is loaded only for the components that need it. Since JavaScript is expensive per byte, every byte you don't ship matters.

The second benefit is **scheduling**. In Astro, interactivity is configured per component, so different islands can hydrate at different priorities. A header search can load immediately, while an image carousel lower on the page can hydrate only when visible or when the browser is idle. Astro's client directives include `client:load`, `client:idle`, `client:visible`, `client:media`, and `client:only`. A low-priority island doesn't block a high-priority one, and if an island never enters the viewport, it never loads.

The third benefit is **blast radius**. [Patterns.dev notes][2] that progressive hydration is typically page-controlled and top-down, whereas islands execute asynchronously and independently. A slower island shouldn't delay the rest of the page. This doesn't make performance problems disappear—humans remain inventive—but it localizes them.

## The Terms People Blur Together

People use "islands," "partial hydration," and "selective hydration" loosely, which is how frontend vocabulary turns into swamp gas.

| Concept                 | What it reduces          | Granularity           | When JS ships                   | Framework examples         |
| ----------------------- | ------------------------ | --------------------- | ------------------------------- | -------------------------- |
| Full hydration          | Nothing (baseline)       | Entire app            | Always, for everything          | React SPA, Vue SPA         |
| Partial hydration       | Amount of hydration work | Varies                | Only for interactive regions    | Gatsby (Partial Hydration) |
| Islands                 | Amount of hydration work | Per component/region  | Per island, independently       | Astro, Fresh, Bridgetown   |
| Streaming SSR           | Time to first byte       | Per Suspense boundary | Progressively as data resolves  | React 18, Qwik             |
| React Server Components | Client bundle size       | Per module boundary   | Only for `'use client'` modules | Next.js App Router         |
| Resumability            | Hydration replay cost    | Sub-component         | On interaction (lazy)           | Qwik, Marko                |

Astro describes Islands Architecture as building on a technique also known as partial or selective hydration. [Gatsby][5], however, is explicit that its own Partial Hydration is not the same implementation as Astro's islands, even if the results look similar.

The useful way to think about it: **partial hydration** names the broad family of techniques that avoid hydrating the whole page. **Islands** names one concrete architecture for doing that by isolating interactive regions as separate units.

## How It Relates to SSR

SSR and islands are not the same thing. SSR only answers _where_ the initial HTML comes from. A traditionally server-rendered React app can still hydrate the whole page on the client afterward. Islands keep the SSR benefits but change the hydration architecture so only selected regions become client programs.

[Gatsby's docs][5] spell this out: full hydration still sends JavaScript for static parts and rebuilds client-side state for the whole page, while partial hydration limits that work to the interactive regions.

That's why "SSR app" and "islands app" aren't competing labels. An islands app is usually still server-rendered or statically generated. The argument is about what happens _after_ the HTML arrives, not whether the HTML exists.

## How It Relates to Streaming SSR

Streaming SSR is a different axis. Streaming changes _when_ HTML is delivered. Islands change _what_ hydrates. React's [`renderToPipeableStream`][6] streams the shell first and later content as Suspense boundaries resolve. That's a delivery strategy. Islands are a hydration and composition strategy. They can absolutely be combined—a page can stream its HTML shell and still hydrate only a handful of client islands.

So, when someone treats streaming as "the same thing as islands," they're mixing transport with execution. One decides when bytes arrive. The other decides which parts of the page become JavaScript applications at all.

## How It Relates to React Server Components

[React Server Components][7] are about where component code runs and where the server/client boundary sits in the module graph. Server Components render ahead of time in an environment separate from the client app or SSR server, and `'use client'` introduces a boundary in the module dependency tree.

That's fundamentally different from the islands mental model, which starts from a mostly static HTML page and layers interactive component regions on top. RSC is a code-placement model inside a React architecture. Islands is a page architecture that can exist with or without React. You can have islands with Astro, Fresh, or even web-component-based systems. Different knobs, different pain.

## How It Relates to Resumability

Islands reduce the _amount_ of hydration. Resumability tries to avoid hydration replay altogether.

[Qwik's docs][8] define hydration as rebuilding listeners, the component tree, and application state on the client after SSR, and argue that this replay is expensive because the framework must download component code and execute templates again. Qwik's answer is to serialize enough information into the HTML so the app _resumes_ instead of hydrating.

[Marko][9] goes in a different direction—its compiler does analysis to bundle only the truly interactive JavaScript at the sub-template level, not at the component level.

A useful contrast: islands draw boundaries around _components_, resumability avoids replaying the _app_, and fine-grained bundling ships only the exact interactive _grains_ rather than whole component islands.

## How It Relates to Module Federation and Monorepo Composition

Module Federation and build-time composition (workspace monorepos) both answer the same question: how do you split a JavaScript application across independently-developed pieces? The page is assumed to be a full client-side application. The only debate is where the code comes from and when it gets resolved.

Island Architecture answers a different question: should the page be a JavaScript application at all?

|                      | Module Federation       | Build-Time (Monorepo) | Islands                    |
| -------------------- | ----------------------- | --------------------- | -------------------------- |
| Unit of composition  | Deployed remote app     | Workspace package     | Individual component       |
| Default rendering    | Client JavaScript       | Client JavaScript     | Static HTML                |
| JavaScript budget    | Full app per remote     | Full app, one bundle  | Only interactive regions   |
| Cross-boundary state | Needs nanostores        | React Context works   | Needs cross-island signals |
| Primary goal         | Independent deployments | Code organization     | Minimize JavaScript        |

The axes are orthogonal. Module Federation solves an organizational problem (teams that need independent deploy cadences). Build-time composition solves a developer experience problem (type safety, hot reload, single dev server). Islands solve a performance problem (most content pages shouldn't be full JavaScript applications).

They can also compose. An Astro page could contain a client island that loads a Module Federation remote. A monorepo could produce both an SPA dashboard (build-time composition between packages) and a marketing site (islands). The patterns operate at different levels of the stack and don't compete with each other.

The antipattern is reaching for the wrong one. Module Federation on a page that's 90% static content is paying for deployment independence nobody asked for. Islands on a dense, stateful dashboard is fighting the architecture at every turn. If the page is mostly interactive, you're in application-composition territory (federation or monorepo). If the page is mostly content with a few interactive controls, islands is the right frame.

## What Real Implementations Look Like

**Astro** is the most visible mainstream implementation. Its `.astro` components render to static HTML with no client-side runtime. You opt specific framework components into client behavior with directives:

```astro
---
import SearchBox from '../components/SearchBox.jsx';
import Carousel from '../components/Carousel.jsx';
import Avatar from '../components/Avatar.astro';
import GenericAvatar from '../components/GenericAvatar.astro';
---

<ProductDetails />

<SearchBox client:load />
<Carousel client:visible />

<Avatar server:defer>
  <GenericAvatar slot="fallback" />
</Avatar>
```

That one snippet shows most of the model. `ProductDetails` stays plain HTML. `SearchBox` hydrates immediately because it's important. `Carousel` waits until visible, because shipping JS for something the user never reaches is a silly hobby. `Avatar` is a server island: the page renders now, the personalized fragment is fetched separately, and the fallback fills the gap until it arrives.

Astro also lets you [mix frameworks][12] on the same page, sending a framework runtime only once per framework used. Handy for incremental migrations or teams with mixed frontend stacks.

**[Fresh][10]** takes a similar HTML-first stance from a different ecosystem. Applications ship pure HTML by default, and only specific widgets get re-hydrated. Islands live in an `islands/` folder, are rendered on both server and client, and can receive server-rendered JSX as props. Fresh documents several ways to share state between islands, including shared signals.

**[Bridgetown][13]** shows that this pattern isn't married to React-like component systems at all. Its islands support is built around independent component trees and the tiny `<is-land>` web component, which can lazy-load an island when it becomes visible or is interacted with. A good reminder that Island Architecture is an architectural pattern first and a framework feature second.

## Client Islands and Server Islands

Most people hear "islands" and think only of client-side hydration islands. [Astro's server islands][14] extend the idea to slow or personalized server-rendered fragments by deferring them out of the main page render and fetching them independently, with fallback content shown in the meantime. Each deferred island becomes its own route behind the scenes, and the page can become visible before those slower fragments finish.

That's a meaningful extension because it lets you separate two different kinds of cost. Client islands isolate browser work. Server islands isolate slow server work. In a real storefront, the product description and reviews shell might be static and heavily cached, the cart drawer might be a client island, and the personalized account avatar might be a server island. Same page, different isolation strategies.

## Operational Concerns

### State and composition

Once you stop thinking of the page as one client app, shared state becomes an explicit architecture choice. [Astro recommends][11] lightweight, framework-agnostic stores like Nano Stores for cross-island communication. Fresh shows shared signals used across separate islands. If your UI depends on deep provider trees and app-wide context for everything, islands will feel less elegant and more like customs paperwork.

### Hydration timing

[Astro explicitly warns][12] that accessibility-related JavaScript needs to load at the appropriate time. A menu button, dialog trigger, or keyboard-critical control should not be deferred so aggressively that the visible UI arrives long before its behavior. `client:visible` is great for below-the-fold extras. It's a terrible choice for the only navigation control in the header.

### Caching and personalization

Astro's [server islands][14] use `GET` requests and can be cached with normal `Cache-Control` directives, which makes them a nice fit for personalized fragments on otherwise cacheable pages. But server islands run in an isolated context outside the page request, so assumptions about page URL or request context need to be handled carefully—especially for prerendered pages.

## Common Mistakes

**Using islands for a page that's effectively an application shell.** If most of the surface is interactive and tightly coordinated, you're fighting the grain of the architecture. The pattern was designed for pages with isolated pockets of interaction, not for pretending a trading terminal is secretly a blog post.

**Assuming islands eliminate JavaScript entirely.** They don't. They eliminate _unnecessary_ JavaScript for non-interactive regions and isolate the rest. Interactive islands still need code, still hydrate, and still impose bundle and execution cost.

**Letting every tiny affordance become its own island.** The architecture invites decomposition, which is good, but decomposition isn't free. Each island adds decisions about load timing, shared state, fallbacks, and error handling. Islands are at their best when they map to meaningful interactive regions, not when every checkbox develops an independent political identity.

## When to Choose It

Choose islands when the page is mostly static or server-rendered content, the important interactions are localized, you care about initial load and HTML-first behavior, and you want explicit control over when client code wakes up. It's especially strong for marketing sites, content sites, e-commerce pages, docs, and mixed pages with just enough interactivity to matter but not enough to justify a full always-hydrated app.

Avoid reaching for it as a reflex when your product is really a dense, stateful application where most regions are live and deeply coordinated. In that world, the isolation that makes islands elegant on content-heavy pages can turn into friction. Use the architecture where it matches the UI shape, not because the phrase sounds modern and leafy.

## The Short Version

Render the page as HTML first. Opt only the truly interactive regions into independent client hydration. Sometimes opt slow or personalized server fragments into separate deferred rendering as well. Pay for interactivity only where the user actually needs it.

That's a much saner default than treating every page like a giant JavaScript app waiting for permission to become a document.

[1]: https://docs.astro.build/en/concepts/islands/ 'Islands architecture | Astro Docs'
[2]: https://www.patterns.dev/vanilla/islands-architecture/ 'Islands Architecture'
[3]: https://jasonformat.com/islands-architecture/ 'Islands Architecture - JASON Format'
[4]: https://deno.com/blog/intro-to-islands 'A Gentle Introduction to Islands | Deno'
[5]: https://www.gatsbyjs.com/docs/conceptual/partial-hydration/ 'Partial Hydration | Gatsby'
[6]: https://react.dev/reference/react-dom/server/renderToPipeableStream 'renderToPipeableStream – React'
[7]: https://react.dev/reference/rsc/server-components 'Server Components – React'
[8]: https://qwik.dev/docs/concepts/resumable/ 'Resumable | Qwik Documentation'
[9]: https://markojs.com/docs/explanation/fine-grained-bundling 'Fine-Grained Bundling | Marko'
[10]: https://fresh.deno.dev/docs/1.x/concepts/architecture 'Architecture | Fresh docs'
[11]: https://docs.astro.build/en/recipes/sharing-state-islands/ 'Share state between islands | Astro Docs'
[12]: https://docs.astro.build/it/guides/framework-components/ 'Front-end frameworks | Astro Docs'
[13]: https://www.bridgetownrb.com/docs/islands 'Islands Architecture | Bridgetown'
[14]: https://docs.astro.build/en/guides/server-islands/ 'Server islands | Astro Docs'
