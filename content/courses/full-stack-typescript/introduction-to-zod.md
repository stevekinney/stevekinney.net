---
title: Introduction to Zod
description: >-
  Get started with Zod, a TypeScript-first schema validation library for
  ensuring runtime type safety in your applications.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-03-16T17:35:22-06:00'
---

TypeScript gives you compile‐time type safety, but when your data comes from the wild (APIs, user inputs, env variables), there's no guarantee it will behave. Enter **[Zod](https://www.npmjs.com/package/zod)**—a TypeScript‐first, zero-dependency runtime validation library that makes sure your data is as type-safe as your code (and saves you from unexpected runtime nightmares).

[Zod](https://www.npmjs.com/package/zod) is a TypeScript-first schema declaration and validation library. Unlike using pure TypeScript interfaces (which disappear at runtime), Zod schemas can:

- Validate user input at runtime (on the backend or even on the frontend).
- Provide you with **Zod-inferred** types so you don't have to define data shapes twice.
- **Single source of truth:** One schema that validates data and infers TypeScript types.
- **Better error messages:** Clear, structured error feedback for both developers and users.
- **Modular, composable design:** Build and reuse schemas for all your data needs.
- **Advanced features:** Transformations, custom refinements, asynchronous validations—the works.

## Installing Zod

Like most libraries, you can install Zod using your favorite package manager.

```sh
# Using npm:
npm install zod

# Using yarn:
yarn add zod

# Using pnpm:
pnpm add zod
```

## Basic Usage

## Validating Primitives

At it's simplest level, we can use Zod to verify that something is a given type:

```ts
import { z } from 'zod';

const stringSchema = z.string();

stringSchema.parse('hello');
```

As you might expect, the same applies to numbers.

```ts
const numberSchema = z.number();

numberSchema.parse(42); // Valid
// numberSchema.parse("42"); // Throws ZodError: Expected number, received string
```

You can even validate things like `BitInt`s and `Date` objects.

```ts
const bigintSchema = z.bigint();
const dateSchema = z.date();

bigintSchema.parse(123n);
dateSchema.parse(new Date());
```

### Parsing Objects

Obviously, the above examples are overly-simple. Where Zod comes in handy is when we want to see if an objects matches a given schema.

We can start by defining schemas—which you can think of like you would a `type` or `interface` in TypeScript.

```ts
import { z } from 'zod';

export const UserSchema = z.object({
  name: z.string(),
  email: z.string(),
  age: z.number(),
});

// Automatically infer the TypeScript type
export type UserType = z.infer<typeof UserSchema>;
```

We can also add some additional validation (e.g. making sure something is an email or has a particular length), which we couldn't otherwise do in TypeScript.

```ts
import { z } from 'zod';

export const UserSchema = z.object({
  name: z.string().min(1, "Name can't be empty"),
  email: z.string().email('Invalid email format'),
  age: z.number().int().min(1).max(120),
});

// Automatically infer the TypeScript type
export type UserType = z.infer<typeof UserSchema>;
```

Once you have a schema, you can use Zod to validate objects to make sure that they match that schema.

```ts
// Using parse() – throws on failure
try {
  const validUser = UserSchema.parse({
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
  });
  console.log('Valid user:', validUser);
} catch (error) {
  console.error('Validation error:', error);
}

// Using safeParse() – returns a result object
const result = UserSchema.safeParse({
  name: 'Bob',
  email: 'bob@example', // Invalid email!
  age: 25,
});

if (!result.success) {
  console.error('Validation failed:', result.error.errors);
} else {
  console.log('Valid user:', result.data);
}
```

> [!NOTE]
> Use `safeParse()` to avoid `try`/`catch` clutter while still handling errors gracefully.

## Generating Types from Schema

The magic of Zod is that your schema is your single source of truth. You don't write duplicate types!

```ts
import { z } from 'zod';

const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number().positive(),
});

type Product = z.infer<typeof ProductSchema>;

// Now, Product is:
// { id: string; name: string; price: number; }
```

Your validated data automatically gets the correct TypeScript type—no more mismatched types between your runtime checks and compile-time expectations.

**Next**: [Advanced Types with Zod](advanced-types-with-zod.md)
