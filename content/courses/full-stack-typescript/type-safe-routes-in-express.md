---
modified: 2025-03-15T21:08:35.000Z
title: Type-Safe Route Registration
description: >-
  Discover how to implement type-safe route registration in Express, ensuring
  handlers receive correctly typed requests for enhanced reliability.
---

One limitation of Express is that route paths are just strings, not checked against parameter types. We can build a type-safe router:

```ts
function route<
  P extends Record<string, string> = {},
  ResBody = any,
  ReqBody = any,
  ReqQuery = qs.ParsedQs,
>(path: string, …handlers: Array<RequestHandler<P, ResBody, ReqBody, ReqQuery>>) {
  return { path, handlers };
}
```

```ts
const userRoutes = [
  route<{ id: string }, UserResponse>('/users/:id', (req, res) => {
    const userId = req.params.id;
    // …
  }),
  route<{}, UserResponse[], {}, { query?: string }>('/users', (req, res) => {
    const searchQuery = req.query.query;
    // …
  }),
];
```

```ts
userRoutes.forEach(({ path, handlers }) => {
  app.get(path, …handlers);
});
```

While this doesn't validate that `:id` in the path corresponds to the `id` in your params type, it does ensure that handlers receive correctly typed requests.
