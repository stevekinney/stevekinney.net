---
title: 'What is tRPC?'
description: 'Discover tRPC, a TypeScript-first API framework that enables end-to-end type safety with zero codegen or schema definitions.'
modified: 2025-03-15T16:39:02-06:00
---

tRPC (TypeScript Remote Procedure Call) gives you:

- **Type inference across client and server.** You change a field name on the server, the client breaks at compile time. It's a developer's dream (or a lazy dev's dream, depending on your vantage).
- **No code generation.** You don't have to write a separate REST or GraphQL schema, then generate client types. It's all in code, courtesy of TypeScript and tRPC's power.
- **Less boilerplate** (compared to typical “API schema + server + client” combos).

Overall, tRPC transforms that painful “Oops, the server changed that field from `name` to `fullName` and we forgot to update the client” scenario into an immediate compile-time error. It's like having a friendly, hyper-vigilant coworker who never sleeps.

## Project Structure

A typical approach is a “monorepo” style with:

```ts
root/
 ┣ server/
 ┗ client/
```

We'll put our Express-based tRPC backend in `server/`, and any client code in `client/`. They'll share types so we get that sweet end-to-end type safety.
