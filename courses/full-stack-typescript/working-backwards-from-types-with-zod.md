---
title: Working Backwards from Types
description: >-
  Learn how to create Zod schemas that match existing TypeScript types using the
  satisfies operator for perfect type alignment.
modified: 2026-03-17
date: 2025-03-16
---

We know that we can create types out of Zod schemas using `z.infer()`, but sometimes, we find ourselves in the position where we _already_ have the types and we want to create schemas and be 100% positive that those schemas match the types.

Let's say we have the following type:

```ts
type Task = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
};
```

We can use `satisfies` to make sure that our schema matches.

```ts
const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.boolean(),
}) satisfies z.ZodType<Task>;
```

> [!NOTE] Zod v4
>
> In Zod v4, `z.string().uuid()` is preferably `z.uuid()`. The `z.ZodType` generic changed from three parameters to two (the `Def` parameter was removed), but `satisfies z.ZodType<Task>` still works since it only uses the first parameter.

If our schema does _not_ match the type that it's supposed to satisfy, then TypeScript will be the one yelling at us.
