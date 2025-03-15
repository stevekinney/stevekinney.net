---
title: Working Backwards from Types
modified: 2025-03-20T13:31:13-06:00
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

If our schema does _not_ match the type that it's supposed to satisfy, then TypeScript will be the one yelling at us.
