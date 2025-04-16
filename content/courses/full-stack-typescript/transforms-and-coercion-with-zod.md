---
title: Transforms and Coercion with Zod
description: 'Master Zod transformations and data coercion to convert, refine, and prepare your data in type-safe ways.'
modified: 2025-03-15T16:00:00-06:00
---

## Leveraging Transform to Create Specialized Types

Sometimes you want a transform: say you accept a `string` but store it as a `Date`. Zod’s `.transform()` method has your back. You still validate the input first, then morph it into whatever form you need:

```ts
const dateSchema = z
  .string()
  .refine((val) => !isNaN(new Date(val).valueOf()), {
    message: 'Invalid date string',
  })
  .transform((val) => new Date(val));

// Now your run-of-the-mill string is validated and transformed into a Date object
const date: Date = dateSchema.parse('2025-03-20');
```

This approach is great for bridging the gap between what your API or form input looks like versus what your code actually needs.

## Pipelining Transforms

Zod allows chaining transforms. You can do `.transform()` multiple times if each transform’s output type matches the next transform’s input type.

### Example: Combining Validation + Chained Transforms

```ts
import { z } from 'zod';

// Start with a string
const pipeline = z
  .string()
  .transform((val) => val.trim()) // first transform
  .transform((trimmed) => trimmed.toUpperCase()); // second transform

// " hello " -> "hello" -> "HELLO"
pipeline.parse('  hello  ');
```

You can also do advanced checks between transforms. For multi-step transformations, consider if `.superRefine()` might be simpler if you need to add multiple error issues.
