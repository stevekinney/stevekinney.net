---
title: Server Rendering Across Frameworks
description: >-
  How Vue/Nuxt, SvelteKit, Astro, Qwik, and Angular each solve the same
  problems React Server Components address—server/client code boundaries, data
  loading, streaming, and mutations—with different tradeoffs and different
  opinions.
modified: 2026-03-17
date: 2026-03-01
---

The [previous lecture](/courses/enterprise-ui/server-components-and-streaming) covered React's answer to a set of questions that every server-rendered framework has to answer. Where does the server/client boundary sit? How does data get from the server to the component that needs it? How does HTML reach the browser? How do mutations flow back? React's answers—RSC module boundaries, async Server Components, `renderToPipeableStream` with Suspense, Server Functions—are one coherent set of tradeoffs. They are not the only set.

Every serious framework has its own opinions on these questions, and the differences aren't cosmetic. They reflect genuinely different beliefs about where complexity should live, how explicit the server/client split should be, and how much the framework should do for you versus how much it should stay out of your way. If you're working in an enterprise architecture where different teams might be using different stacks—or where you're evaluating which stack to standardize on—understanding how each framework solves these problems is more useful than memorizing one framework's API.

## The Shared Problem Set

Four questions keep showing up, regardless of framework:

- **Where does the server/client boundary sit?** Which code runs on the server, which runs in the browser, and how does the framework enforce that split?
- **How does data load?** How does the component that needs data get it from the server without an extra client-side round trip?
- **How does HTML arrive?** Does the server send the entire page at once, or does it stream chunks progressively as data becomes available?
- **How do mutations work?** When the user submits a form or triggers a write operation, how does that request get to the server, and how does the UI update afterward?

React's answers from the previous lecture are the reference point. Now: how everyone else handles them.

## Nuxt and Vue

Vue's reactivity system—`ref`, `computed`, `watch`—works identically on server and client. That's the foundation Nuxt builds on. Where React invented a new module-boundary model for server code, Nuxt takes Vue's existing reactivity and wraps it in conventions that determine _when_ code runs on the server versus the client.

### Data Loading

Nuxt's primary data-loading primitives are [`useAsyncData`][1] and `useFetch`. Both run on the server during SSR, serialize the result into a payload object, and transfer it to the client so the browser doesn't re-fetch the same data during hydration. The serialization uses [devalue](https://github.com/Rich-Harris/devalue), which handles Dates, Maps, Sets, and Vue refs—not just the JSON-safe subset.

```typescript
// In a page or component setup
const { data: posts } = await useFetch('/api/posts');
```

`useFetch` is a convenience wrapper around `$fetch` (Nuxt's HTTP utility) that automatically generates a cache key from the URL. `useAsyncData` is the more flexible version—you provide your own handler function and cache key, which is useful when data comes from a CMS client, a database query, or anything that isn't a straightforward HTTP call.

```typescript
const { data: product } = await useAsyncData(`product-${id}`, () =>
  db.products.findUnique({ where: { id } }),
);
```

The payload mechanism is the important detail. Nuxt's [docs][1] are explicit: if an API call is made on the server, the data is forwarded to the client in the payload, avoiding both a duplicate request and a hydration mismatch. The client receives the already-fetched data and doesn't re-execute the composable until the next navigation.

### The Server/Client Boundary

Nuxt's server code lives in a separate `server/` directory powered by [Nitro][2], a standalone server engine. Files in `server/api/` and `server/routes/` define server endpoints—they never touch the client bundle. This is a _directory-level_ boundary, not a directive-level one like React's `'use client'`.

For components, Nuxt has [experimental support][3] for server-only rendering via the `.server.vue` suffix. A component named `MyWidget.server.vue` renders on the server and is not hydrated on the client—conceptually similar to React Server Components, but using Vue's reactivity system instead of React's module graph. The feature is still maturing and doesn't have the ecosystem depth that RSC has in Next.js.

### Streaming

Vue 3 provides streaming APIs ([`renderToNodeStream` and `renderToWebStream`][16]) at the library level, but Nuxt's integration of streaming SSR is still maturing. The default behavior in Nuxt 3 and 4 is to buffer the entire page on the server via `renderToString` before sending the response. Streaming—where the server starts sending HTML chunks before all data has resolved—is planned for full support in Nuxt 5 with Nitro v3. That means Nuxt currently waits for all `useAsyncData` and `useFetch` calls to finish before any HTML reaches the browser, unlike React's Suspense-driven streaming or SvelteKit's promise-based streaming covered below.

### Mutations

Nuxt doesn't have a built-in form-action or server-function primitive baked into the component model. Mutations typically go through `$fetch` calls to server API routes, or through `useAsyncData` with a `refresh()` call after a mutation. There's a community module (`@hebilicious/form-actions-nuxt`) that adds SvelteKit-style form actions, but it's not part of the core framework. If you want something like React's Server Functions, you're writing API routes and calling them from the client.

## SvelteKit

SvelteKit takes the most convention-driven approach to the server/client boundary. Where React uses a directive (`'use client'`) and Nuxt uses a directory (`server/`), SvelteKit uses _file suffixes_ within the routing tree. The boundary is baked into the filesystem, which makes it hard to get wrong and easy to reason about.

### Data Loading

SvelteKit's data-loading mechanism is the [`load` function][4]. Every route can have two files that provide data:

- `+page.server.ts` runs _exclusively_ on the server. It can access databases, read environment secrets, and do anything server-only. Its return value must be serializable.
- `+page.ts` runs on _both_ server and client. On the first request, it runs on the server during SSR. On subsequent navigations, it runs in the browser.

```typescript
// +page.server.ts — server only
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const post = await db.posts.find(params.slug);
  return { post };
};
```

The component receives the data through a `data` prop, and the types flow automatically from the `load` function's return type. No `useEffect`, no `useAsyncData`, no composable—data is available when the component renders because the framework ran the loader first.

The key difference from React: there's no `'use client'` directive needed because the routing convention handles the split. A `.server.ts` file never reaches the client bundle. A `.ts` file without the `.server` suffix is universal code. The boundary is the filename, and the bundler enforces it.

### Streaming

SvelteKit streams by returning unawaited promises from server `load` functions. The page renders with whatever data is already available, and later chunks fill in as the promises resolve.

```typescript
// +page.server.ts
export const load: PageServerLoad = async ({ params }) => {
  return {
    post: await getPost(params.slug), // awaited — blocks the shell
    comments: getComments(params.slug), // not awaited — streams later
  };
};
```

The component uses Svelte's `{#await}` block to handle the streamed promise:

```svelte
<article>{data.post.content}</article>

{#await data.comments}
  <p>Loading comments…</p>
{:then comments}
  <CommentList {comments} />
{/await}
```

This is conceptually similar to React's Suspense-driven streaming, but the mechanism is different. In React, the component tree _suspends_ when it hits an unresolved promise, and the framework streams the fallback and later the resolved content. In SvelteKit, the `load` function explicitly controls what's awaited (and therefore blocks the shell) versus what's a promise (and therefore streams). The control lives in the data layer, not the component tree.

SvelteKit's [docs][4] note two caveats: streaming requires JavaScript on the client, and response headers and status codes cannot change after streaming begins.

### Mutations

SvelteKit has [form actions][5]—server-side functions that handle form submissions with progressive enhancement built in.

```typescript
// +page.server.ts
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const title = data.get('title');
    await db.posts.create({ title });
    return { success: true };
  },
};
```

```svelte
<form method="POST">
  <input name="title" />
  <button>Create</button>
</form>
```

That form works without JavaScript. The browser submits a standard POST, the server runs the action, and the page reloads with the result. With SvelteKit's `use:enhance` directive, the same form submits via fetch instead, updates the page without a full reload, and handles redirects and errors—all without changing the server-side code.

Form actions are scoped to the route—they live in `+page.server.ts` alongside the `load` function. That's different from React's Server Functions, which are importable from any client module. SvelteKit's model is more constrained but also more predictable: every action belongs to a route, and every route's data and mutations live in the same file.

### Page Options

SvelteKit provides [per-route rendering control][6] through exported constants: `ssr` (whether to server-render), `csr` (whether to hydrate), and `prerender` (whether to generate static HTML at build time). Setting `csr = false` removes all JavaScript from a page—useful for purely static content. These options cascade through layouts, so you can set defaults at the layout level and override per page.

## Astro

The [island architecture lecture](/courses/enterprise-ui/island-architecture) already covers Astro's hydration model—how `.astro` components are server-only by default, how `client:` directives opt specific components into client-side interactivity, and how server islands defer personalized content. This section focuses on the parts that lecture didn't cover: how Astro handles data loading, mutations, and its server rendering pipeline.

### The Boundary

Astro's server/client boundary is the simplest of any framework here. A `.astro` component is _always_ server-only. It renders to HTML on the server, ships no JavaScript, and is never hydrated. A React, Vue, or Svelte component embedded in an Astro page with a `client:*` directive is _always_ client-hydrated. There's no mixed-execution component and no directive to mark server code—`.astro` files _are_ server code.

That bluntness is the point. You don't need to think about module graphs or serialization boundaries because the file type tells you everything. If you're writing `.astro`, you're on the server. If you're embedding a framework component, you choose its hydration strategy explicitly.

### Data Loading

Astro components load data directly in their frontmatter block. For content-driven sites, Astro's content collections provide [`getCollection()`][7] and `getEntry()` for type-safe access to structured content:

```astro
---
import { getCollection } from 'astro:content';
const posts = await getCollection('blog', ({ data }) => !data.draft);
---

<ul>
  {posts.map(post => <li><a href={`/blog/${post.id}`}>{post.data.title}</a></li>)}
</ul>
```

For non-content data, you `fetch` or query a database directly in the frontmatter. There's no `load` function abstraction—the frontmatter _is_ the server code.

### Mutations

Astro Actions, [stable since Astro 4.15][8], are type-safe server functions that you define in `src/actions/index.ts`:

```typescript
import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
  addComment: defineAction({
    accept: 'form',
    input: z.object({
      postId: z.string(),
      body: z.string().min(1),
    }),
    handler: async (input) => {
      await db.comments.create(input);
      return { success: true };
    },
  }),
};
```

Actions use Zod for input validation, return typed results, and work with both JSON calls and HTML form submissions. From a client component, you call `actions.addComment({ postId, body })` and get back a typed `{ data, error }` result. From a form, you pass the action as the form's `action` attribute and get progressive enhancement for free.

Actions are closer to React's Server Functions than anything else in this list. The main difference is that they're defined in a central file rather than inline in components, and they use Zod schemas rather than relying on TypeScript alone for input safety.

### Server Islands

[Server islands][9] extend the model by deferring slow or personalized server-rendered fragments out of the main page render. A component marked with `server:defer` renders separately from the page, with fallback content shown until the deferred fragment arrives. The page can be cached aggressively while personalized fragments load independently.

## Qwik

Qwik approaches the server rendering problem from a fundamentally different angle than every other framework here. The [island architecture lecture](/courses/enterprise-ui/island-architecture) introduced its core idea—**resumability**—where the application [serializes enough state into the HTML][10] that the browser can resume where the server left off without replaying component initialization. This section covers how Qwik City (Qwik's meta-framework) handles data loading and mutations.

### The Boundary

Qwik doesn't draw a server/client boundary the way React or SvelteKit does. Instead, it uses the `$` suffix to mark **serialization boundaries**—points where the framework can split code into lazy-loadable chunks.

```typescript
import { component$ } from '@builder.io/qwik';

export default component$(() => {
  return <button onClick$={() => console.log('clicked')}>Click me</button>;
});
```

`component$` and `onClick$` tell Qwik's optimizer to extract those functions into separate importable chunks. The framework doesn't download event handler code until the user actually interacts with the element. That's not "server code versus client code"—it's "code that runs now versus code that can wait." The boundary isn't about _where_ code runs but _when_ it loads.

### Data Loading

Qwik City uses [`routeLoader$`][11] as its data-loading primitive. A `routeLoader$` runs on the server, serializes its result into the HTML, and makes it available to the component without a client-side fetch:

```typescript
import { routeLoader$ } from '@builder.io/qwik-city';

export const useProduct = routeLoader$(async ({ params }) => {
  return await db.products.find(params.id);
});

export default component$(() => {
  const product = useProduct();
  return <h1>{product.value.name}</h1>;
});
```

The data is embedded in the HTML as serialized state, so the component has it immediately on resume—no hydration fetch, no loading spinner for data the server already had.

### Mutations

[`routeAction$`][12] handles mutations—server-side functions triggered by form submission, with Zod validation built in:

```typescript
import { routeAction$, zod$, z } from '@builder.io/qwik-city';

export const useAddToCart = routeAction$(
  async (data) => {
    await db.cart.add(data.productId, data.quantity);
    return { success: true };
  },
  zod$({
    productId: z.string(),
    quantity: z.number().min(1),
  }),
);
```

Actions integrate with HTML forms for progressive enhancement. The pattern is similar to SvelteKit's form actions and Astro's Actions—define a server function, validate input, return a typed result.

### Streaming

Qwik uses `renderToStream` to stream HTML to the browser. The server can start sending content immediately, and because Qwik serializes application state into the HTML rather than relying on client-side hydration to reconstruct it, the streamed content is interactive as soon as the relevant code chunks load—which might be never, if the user doesn't interact with that part of the page.

## Angular

Angular's relationship with server rendering has historically been more bolt-on than built-in. Angular Universal (now [`@angular/ssr`][13]) added SSR capability, but Angular was designed as a client-side framework first. Recent versions have narrowed that gap considerably.

### Hydration

Angular 17 introduced [non-destructive hydration][14]—the client reuses the server-rendered DOM instead of re-rendering it from scratch. Before v17, Angular's SSR would render HTML on the server, send it to the browser, and then _destroy and recreate_ the entire DOM during hydration. Non-destructive hydration was a significant improvement that brought Angular in line with what React, Vue, and Svelte had been doing.

You enable it in the application bootstrap:

```typescript
import { provideClientHydration } from '@angular/platform-browser';

bootstrapApplication(App, {
  providers: [provideClientHydration()],
});
```

### Incremental Hydration

Angular's most interesting recent addition is [incremental hydration][15] via `@defer` blocks. A `@defer` block tells the framework to keep part of the page in its server-rendered, dehydrated state until a trigger fires:

```html
@defer (hydrate on viewport) {
<app-comments [postId]="post.id" />
} @placeholder {
<p>Loading comments…</p>
}
```

The available triggers—`idle`, `viewport`, `interaction`, `hover`, `immediate`, `timer`—are similar in spirit to Astro's `client:` directives but integrated into Angular's template syntax. The deferred content is server-rendered and visible immediately; only the JavaScript and hydration work wait for the trigger. User interactions before hydration are captured via event replay and replayed after hydration completes.

Incremental hydration shipped in developer preview in Angular 19 and graduated to stable in Angular 20.

### Data Loading

Angular doesn't have a framework-provided `load` function like SvelteKit or `routeLoader$` like Qwik. Data loading happens through services and route resolvers—standard Angular dependency injection patterns. The framework does provide a `TransferState` mechanism to avoid duplicate requests during hydration: `HttpClient` automatically caches GET and HEAD responses made during SSR and reuses them on the client, so the browser doesn't re-fetch data the server already retrieved. The [hydration docs][14] describe this as the HTTP transfer cache—it's enabled by default when you use `provideClientHydration()`.

### Mutations

Angular has no built-in form-action or server-function primitive. Mutations go through services that call HTTP endpoints—the same pattern Angular has used since the beginning. That's honest but means less automatic optimization and no progressive enhancement by default. If you want a form to work without JavaScript, you're building that yourself.

### The Tradeoff

Angular's approach is less opinionated about server/client code boundaries than any other framework on this list. There's no `.server.ts` convention, no `'use client'` directive, no `$` serialization marker. The server/client split is implicit—whatever you put in a service runs wherever Angular runs, and SSR is a deployment configuration rather than an architectural decision. That's a reasonable position for a framework with Angular's history, but it means you don't get the automatic bundle-splitting or dead-code elimination that more opinionated boundaries provide.

## How the Answers Compare

Every framework answers the same four questions. The answers reveal different priorities.

| Question                | React/Next               | SvelteKit                    | Nuxt/Vue                       | Astro                    | Qwik/Qwik City                      | Angular                                |
| ----------------------- | ------------------------ | ---------------------------- | ------------------------------ | ------------------------ | ----------------------------------- | -------------------------------------- |
| Server/client boundary  | `'use client'` directive | `.server.ts` file suffix     | `server/` directory            | `.astro` = always server | `$` serialization markers           | Implicit (deployment concern)          |
| Data loading            | Async Server Components  | `load` functions             | `useAsyncData` / `useFetch`    | Frontmatter              | `routeLoader$`                      | Services + resolvers + `TransferState` |
| Streaming               | Suspense boundaries      | Unawaited promises in `load` | Buffered (streaming in Nuxt 5) | On-demand rendering mode | `renderToStream` + serialized state | Streaming SSR (v20+)                   |
| Mutations               | Server Functions         | Form actions                 | API routes + `$fetch`          | Actions (`defineAction`) | `routeAction$`                      | Services + HTTP endpoints              |
| Progressive enhancement | Yes                      | Yes (`use:enhance`)          | Manual                         | Yes                      | Yes                                 | Manual                                 |

The trend across all of them: move data loading as close to the component as possible, make the server-fetched result available without a client-side re-fetch, and send the important parts of the page first.

## What This Means for Enterprise Architecture

Framework choice shapes your server rendering strategy, which shapes your infrastructure, caching model, and deployment pipeline. A few things worth noting for teams making these decisions:

Mixed-framework architectures—microfrontends with different stacks per remote—may have different server rendering models in different parts of the application. That's fine as long as the composition layer (host shell, edge proxy, or backend-for-frontend) can handle the different response shapes. A React remote using RSC and a Vue remote using Nuxt's SSR can coexist behind a shared shell, but the shell needs to know it's assembling responses from fundamentally different rendering pipelines.

The trend across every framework is converging: move data loading closer to the component, make server/client boundaries explicit, stream HTML progressively, and treat mutations as first-class server operations. The syntax is different. The direction is the same. If you understand one framework's answers to these four questions, you can read any other framework's answers and know exactly what to look for.

[1]: https://nuxt.com/docs/getting-started/data-fetching 'Data Fetching | Nuxt'
[2]: https://nuxt.com/docs/getting-started/server 'Server | Nuxt'
[3]: https://nuxt.com/docs/guide/directory-structure/components 'Components | Nuxt'
[4]: https://svelte.dev/docs/kit/load 'Loading data | SvelteKit'
[5]: https://svelte.dev/docs/kit/form-actions 'Form actions | SvelteKit'
[6]: https://svelte.dev/docs/kit/page-options 'Page options | SvelteKit'
[7]: https://docs.astro.build/en/guides/content-collections/ 'Content Collections | Astro'
[8]: https://docs.astro.build/en/guides/actions/ 'Actions | Astro'
[9]: https://docs.astro.build/en/guides/server-islands/ 'Server islands | Astro'
[10]: https://qwik.dev/docs/concepts/resumable/ 'Resumable | Qwik'
[11]: https://qwik.dev/docs/route-loader/ 'routeLoader$ | Qwik City'
[12]: https://qwik.dev/docs/action/ 'routeAction$ | Qwik City'
[13]: https://angular.dev/guide/ssr 'Server-side and hybrid-rendering | Angular'
[14]: https://angular.dev/guide/hydration 'Hydration | Angular'
[15]: https://angular.dev/guide/incremental-hydration 'Incremental Hydration | Angular'
[16]: https://vuejs.org/guide/scaling-up/ssr.html 'Server-Side Rendering (SSR) | Vue.js'
