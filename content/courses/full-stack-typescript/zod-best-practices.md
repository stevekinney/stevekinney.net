---
title: Best Practices with Zod
modified: 2025-04-28T17:33:44-06:00
description: >-
  Learn best practices with Zod for efficient runtime validation, including
  avoiding redundant checks, reusing schemas, and optimizing performance in
  large-scale data scenarios.
---

Runtime validation does introduce overhead – after all, it's extra code executing – but Zod is designed to be fairly efficient and small. Still, in performance-sensitive scenarios or large data throughput, you should be mindful of how and when you validate.

## Validate only when Necessary

Avoid redundant validations. If you've validated data once and you trust it hasn't changed, there's no need to validate it again. For example, if you parse incoming JSON with Zod at your API boundary, you can consider that data trusted within your system afterward (especially because Zod will have also given it a precise type). Don't re-parse the same object multiple times in different layers.

## Do Schema Parsing outside Hot Loops

If you have to validate a large number of items, try not to do it inside a tight loop unnecessarily. If possible, vectorize the operation (e.g. validate an array schema of items in one go, rather than item by item in a loop). Zod can validate an entire array of objects with one schema (and it will return an error detailing which index failed).

## Reuse Schemas

Defining a schema (like calling `z.object({…})`) is not hugely expensive, but there's no need to recreate the same schema every time you use it. Define your schemas once (say at module initialization) and reuse them for each validation. This is both for code clarity and a tiny performance win (avoid re-instantiating validators).

## Leverage .parse Vs .safeParse Appropriately

In some performance critical code, using `parse` in a try/catch might actually be slower than `safeParse` because throwing exceptions is expensive. If you expect failures to be common or you're doing a lot of validations, using `safeParse` (which returns a result object) can be more efficient than try/catch on exceptions.

## Partial Validations

If you only need to validate part of a large object, consider structuring your schemas so you can validate just that part. For instance, if you have already validated an outer object but later want to validate a nested piece differently, you could call a schema for that nested piece instead of re-validating the whole thing.

Zod's default behavior for object schemas is to **strip unknown properties**. This means it will iterate over extra keys and remove them. If performance is critical and you don't mind unknown properties, you could use `.passthrough()` to avoid the cost of stripping (which in practice is minor, but it is an extra step).

Conversely, `.strict()` will throw on unknown keys, which adds a check for each key. These costs are usually negligible unless your objects have huge numbers of keys or you're validating thousands of objects per second. In most applications, the clarity and safety of validation far outweigh the micro-performance concerns.

Finally, remember that premature optimization is dangerous. Profile if you suspect validation is a bottleneck. Zod is pretty fast for typical use (and much faster than say JSON schema validation in many cases). If you do hit performance issues (for example, validating a massive deeply nested structure), you can sometimes split the work or adjust your approach (maybe validate streaming chunks, etc.). But for the majority, using Zod out-of-the-box shouldn't pose problems, and the bottleneck is more likely to be I/O or database, not the validation step.

## A Free Debugging Trick

One nice thing about Zod is that because schemas are code, you can use the same debugging techniques as normal code. Step through in a debugger if needed, or add temporary `.refine(x => { console.log(x); return true; })` to see intermediate values if debugging transform pipelines.
