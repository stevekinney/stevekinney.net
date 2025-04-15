---
title: Middleware for Auth & Logging in tRPC
description: Learn how to implement authentication and logging middleware in tRPC for secure and well-monitored API endpoints.
modified: 2025-03-16T12:00:00-06:00
---

### Middleware for Auth & Logging

You can create custom middlewares:

```ts
// server/src/trpc.ts
import { TRPCError } from '@trpc/server';

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { user: ctx.user } }); // now user is non-null
});

export const protectedProcedure = t.procedure.use(isAuthed);
```

Use `protectedProcedure` when you want routes behind auth checks. For logging, similarly:

```ts
const logMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const ms = Date.now() - start;
  console.log(`${type} call to ${path} took ${ms}ms`);
  return result;
});
export const loggedProcedure = t.procedure.use(logMiddleware);
```
