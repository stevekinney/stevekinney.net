---
title: Validating Request Parameters
modified: 2025-03-19T19:11:37.000Z
description: >-
  Learn how to validate and coerce request parameters into the correct types
  using Zod schemas, ensuring your path and query parameters are properly parsed
  as numbers or booleans.
---

Search parameters and path parameters are technically strings. But, I know they should be numbers. It's fine. Let's just make sure that they coerce into numbers.

```ts
const TaskSchema = z.object({
  id: z.coerce.number().int(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.coerce.boolean(),
});

const TaskParamsSchema = TaskSchema.pick({ id: true });
```

We can use it like this.

```ts
const { id } = TaskParamsSchema.parse(req.params);
```

## Search Parameters

The same basic idea works for search parameters.

```ts
const TaskQuerySchema = z.object({
  completed: z.coerce.boolean().optional(),
});
```

Or, I might do something like this:

```ts
const TaskQuerySchema = TaskSchema.pick({ completed: true }).partial();
```

And now we can make sure our queries make sense.

**Next**: [Using Middleware to Validate Schema](validating-schema-with-middleware.md)
