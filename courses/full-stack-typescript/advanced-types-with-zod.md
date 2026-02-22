---
title: Advanced Types with Zod
description: >-
  Learn about advanced type constructs in Zod including literals, enums, tuples,
  unions, discriminated unions, and more.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-03-16T17:35:22-06:00'
---

## Literals

```ts
const literalSchema = z.literal('hello');

literalSchema.parse('hello'); // Valid
// literalSchema.parse("world"); // Throws ZodError: Expected literal 'hello', received 'world'
```

## `z.enum()` for Fixed Sets

When you only allow a few valid string values, define them in an enum schema.

### Example

```ts
const colorEnum = z.enum(['RED', 'GREEN', 'BLUE']);

// passes
colorEnum.parse('RED');

// fails
colorEnum.parse('PURPLE');
```

### Why Not Use `.literal()` Union?

- `z.enum(["RED", "GREEN", "BLUE"])` is more direct for small sets of strings.
- TS can also interpret it as a union of those string literals.
- If you have a large set, union is equally valid, just more verbose.

## Tuples

```ts
const tupleSchema = z.tuple([z.string(), z.number()]);

tupleSchema.parse(['hello', 123]); // Valid
// tupleSchema.parse([123, "hello"]); // Throws ZodError: Expected string, received number at index 0
// tupleSchema.parse(["hello"]); // Throws ZodError: Expected tuple to have 2 elements, but got 1
```

## Unions

```ts
const stringOrNumberSchema = z.union([z.string(), z.number()]);

stringOrNumberSchema.parse('hello'); // Valid
stringOrNumberSchema.parse(123); // Valid
// stringOrNumberSchema.parse(true);  // Throws ZodError: Expected string | number, received boolean
```

## Intersections

```ts
const stringSchema = z.object({ a: z.string() });
const numberSchema = z.object({ b: z.number() });
const intersectionSchema = z.intersection(stringSchema, numberSchema);

intersectionSchema.parse({ a: 'hello', b: 123 }); // Valid
// intersectionSchema.parse({ a: "hello" }); // Throws ZodError: Required at 'b'
```

### Reusable Schema Components with Unions

Create reusable schema components by defining schemas as variables or functions. This promotes modularity and reduces code duplication.

```ts
const baseUserSchema = z.object({
  id: z.number().positive(),
  createdAt: z.date(),
});

const customerSchema = baseUserSchema.extend({
  customerType: z.literal('customer'),
  orders: z.array(z.object({ orderId: z.string() })),
});

const adminSchema = baseUserSchema.extend({
  customerType: z.literal('admin'),
  permissions: z.array(z.string()),
});

const userSchema = z.union([customerSchema, adminSchema]); // Combine reusable schemas
```

## Discriminated Unions

When your data has a known “discriminator” field, `z.discriminatedUnion()` is more efficient (and more explicit) than normal unions.

### Example: `type` or `kind` as the Discriminator

```ts
import { z } from 'zod';

const customerSchema = z.object({
  type: z.literal('customer'),
  orders: z.array(z.string()),
});

const adminSchema = z.object({
  type: z.literal('admin'),
  permissions: z.array(z.string()),
});

const userSchema = z.discriminatedUnion('type', [customerSchema, adminSchema]);

// Succeeds if type === 'customer' or 'admin'
userSchema.parse({
  type: 'customer',
  orders: ['order1', 'order2'],
});
```

### Benefits

- **Performance**: Zod can skip checking every union branch once it sees the discriminator.
- **Clarity**: If your input object's `type` or `kind` is incorrect, you'll get an immediate error.

## `never`, `unknown`, and `any`

Zod includes special schemas that mirror TypeScript's built-in utility types:

- `z.never()` — always fails. If you see `z.never()`, that property can _never_ validly exist.
- `z.unknown()` — anything can pass, but the final type is `unknown`. Good for storing data you won't interact with directly.
- `z.any()` — anything can pass _and_ the final type is `any`. Rarely recommended, but can be a last resort if you absolutely can't type something.

### Example

```ts
const exoticSchema = z.object({
  no: z.never(), // always invalid
  hidden: z.unknown(), // always valid, type = unknown
  whatever: z.any(), // always valid, type = any
});
```

**Pro Tip**: Lean on strong typing as much as possible. `z.unknown()` and `z.any()` can be necessary but generally reduce type safety.

## Strict vs. Passthrough vs. Strip

When validating objects, Zod handles _extra/unknown keys_ differently depending on the mode:

### Strip (default)

### Strict

### Passthrough

### Example

```ts
const baseObj = z.object({ name: z.string() });

// Strict
const strictObj = baseObj.strict();
strictObj.parse({ name: 'Zod', age: 99 });
// => throws: unrecognized key "age"

// Passthrough
const passObj = baseObj.passthrough();
passObj.parse({ name: 'Zod', age: 99 });
// => { name: "Zod", age: 99 }

// Default (strip)
baseObj.parse({ name: 'Zod', age: 99 });
// => { name: "Zod" } (age is stripped out)
```

Use the mode that best suits your data. Strict is good when you want to ensure no unexpected fields slip in; passthrough is handy if you want to keep them for logging or debugging.
