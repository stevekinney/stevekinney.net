---
title: Refining Types with Zod
modified: 2025-04-28T17:33:44-06:00
description: >-
  A guide to creating and using custom validation schemas in Zod, including
  refining schemas, custom validation, nested types, branded types, and best
  practices for error handling and testing.
---

Zod ships with a generous spread of primitive and composite schema definitions right out of the box. If your “custom type” can be expressed as a straightforward Zod object or union, just use one of those like we saw in the [introduction earlier](introduction-to-zod.md).

```ts
import { z } from 'zod';

const userSchema = z.object({
  name: z.string(),
  age: z.number().int().min(0),
});

type User = z.infer<typeof userSchema>;

const parsedUser = userSchema.parse({
  name: 'Ada Lovelace',
  age: 36,
});
```

> [!TIP] Pro-Tip
> If your custom type is basically just a structured shape (like a person or a fancy shape with some optional properties), you may not need anything beyond Zod's standard schemas.

## Refining Schemas

Zod's `.refine()` method lets you tack on custom validation logic. Let's say you have an email field that _must_ end with `frontendmasters.com`. Start with a regular string, then refine away:

```ts
const emailSchema = z.string().refine((value) => value.endsWith('frontendmasters.com'), {
  message: 'Email must end with frontendmasters.com',
});

const validatedEmail = emailSchema.parse('hellofrontendmasters.com'); // passes

emailSchema.parse('hello@anotherdomain.com');
// throws ZodError: Email must end with frontendmasters.com
```

> [!NOTE] Note
> If you prefer leaning on external validator libs (e.g., validator.js), you can hook that up in `.refine()`

## Creating Custom Schemas

Sometimes you have a type so weird that `.refine()` just won't cut it—or maybe you want more direct control. That's where `z.custom()` steps in. It's ideal for things that can't be well represented by simple types, or for checking shape plus brand. For example:

```ts
// Suppose we want a schema for a string that must parse into a valid Date
const validDateString = z.custom<string>(
  (value) => {
    if (typeof value !== 'string') return false;

    // Attempt to parse date
    const date = new Date(value);
    // Check if it's a real date
    return !isNaN(date.valueOf());
  },
  {
    message: 'Invalid date string provided',
  },
);

// If you also want TypeScript to know it's a string, you'll do:
type ValidDateString = z.infer<typeof validDateString>; // string

validDateString.parse('2025-03-20'); // success
validDateString.parse('not-a-date'); // throws ZodError
```

> [!WARNING] Fair Warning
> `z.custom()` returns a schema that by default yields the type unknown. If you want TypeScript to trust you, you can explicitly cast or define a generic type argument like `z.custom<string>()`. Just be sure your validator logic is bulletproof.

## Validating Complex or Nested Types

If you have an object containing arrays containing objects (or other labyrinthine shapes that look like they were designed by an M.C. Escher fan), compose your schemas:

```ts
const addressSchema = z.object({
  street: z.string(),
  zipCode: z.string().length(5),
});

const userWithAddressSchema = z.object({
  name: z.string(),
  addresses: z.array(addressSchema).nonempty(),
});

type UserWithAddress = z.infer<typeof userWithAddressSchema>;

userWithAddressSchema.parse({
  name: 'Grace Hopper',
  addresses: [
    { street: '1900 Sea St', zipCode: '12345' },
    { street: '3 Admiral Dr', zipCode: '99999' },
  ],
}); // passes
```

Keep nesting all you like. If your data structure is complicated, at least Zod's layered approach keeps the validator logic tidy.

## Branded Types for Extra Semantics

Zod has a concept of “branded” types, letting you layer on custom brand markers to differentiate otherwise identical primitives. This is great if you want to give a type special meaning without creating a new runtime type. For instance, you can have a UserId that's just a string under the hood but is recognized as a distinct brand in your code:

```ts
const userIdSchema = z.string().uuid().brand<'UserId'>();

type UserId = z.infer<typeof userIdSchema>; // string & { __brand: "UserId" }

const userId = userIdSchema.parse('7c45ae8a-cf6e-4f72-b12f-6fbb21ce3ab9'); // works
userIdSchema.parse('not-a-uuid'); // throws ZodError
```

This _can_ help catch mistakes if you accidentally pass the wrong string to a function expecting a UserId.

## Be Opinionated About Error Messages

Zod out-of-the-box has decent error messaging, but do your future self (and your teammates) a favor by customizing the error messages in `.refine()`, `.optional()`, etc.:

```ts
const fancySchema = z.number().int().min(1, {
  message: 'Number must be a positive integer. This includes you, 0.',
});
```

Don't be afraid to be explicit. Cryptic error messages lead to more debugging time (which leads to more coffee, which might be good, but also leads to more frustration, which definitely isn't).

---

## Testing Your Custom Schemas

Take the extra step and write a quick test or two for your custom logic:

```ts
import { describe, it, expect } from 'vitest'; // or your test runner
import { validDateString } from './path/to/your/schema';

describe('validDateString', () => {
  it('should parse a valid date', () => {
    expect(() => validDateString.parse('2025-03-20')).not.toThrow();
  });

  it('should throw on invalid date', () => {
    expect(() => validDateString.parse('Feb 30th, 2025')).toThrow();
  });
});
```

Tests ensure that future you (who might be sleep-deprived) doesn't accidentally break your carefully constructed custom schemas.

## Composing Zod Schemas

You can compose smaller schemas together. Even for wild custom requirements, break them down into smaller, easier-to-test pieces. For example, if you need a “positive integer less than 1000 that is also prime,” you might define a prime checker then .refine() on top of a smaller schema:

```ts
function isPrime(num: number): boolean {
  if (num < 2) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
}

const primeUnder1000Schema = z.number().int().min(2).max(999).refine(isPrime, {
  message: 'Number must be prime',
});
```

## Super Refinement

`.superRefine(refinement: (value, ctx: RefinementCtx<T>) => void)` is similar to `.refine()`, but provides a `RefinementCtx` object for adding multiple error messages or errors at specific paths within the schema. More powerful for complex validation scenarios.

```ts
const productSchema = z
  .object({
    price: z.number().positive(),
    quantity: z.number().int().nonnegative(),
  })
  .superRefine((data, ctx) => {
    if (data.price > 1000 && data.quantity > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'High-value items must have quantity 0 for initial stock',
        path: ['quantity'],
      });
    }
  });

productSchema.parse({ price: 1200, quantity: 0 }); // Valid
// productSchema.parse({ price: 1200, quantity: 5 }); // Throws ZodError: High-value items must have quantity 0 for initial stock at 'quantity'
```

## Preprocessing

`.preprocess(fn: (input: unknown) => unknown, schema: ZodSchema)` applies a preprocessing function _before_ validation. Useful for cleaning up or transforming input data before it's validated against the core schema.

```ts
const preprocessNumberSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    return parseInt(val, 10); // Try to parse string to number
  }
  return val; // Otherwise, return original value
}, z.number().positive());

preprocessNumberSchema.parse('42'); // Valid, returns 42 (number)
preprocessNumberSchema.parse(42); // Valid, returns 42 (number)
// preprocessNumberSchema.parse("abc"); // Throws ZodError (after preprocessing): Expected number, received nan
```

Keeping these validations separate from the raw schema logic keeps your code cleaner and more manageable.

**Fun Fact**: There is also `z.superPreprocess`. `.superPreprocess(fn: (input: unknown, ctx: PreprocessContext) => unknown)` which is similar to `.preprocess()`, but provides a `PreprocessContext` for more control over preprocessing and error handling during preprocessing.

## `.superRefine()` for Multi-Error Reporting

`.refine()` allows you to throw a single error at once. `.superRefine()` is more flexible: you call `ctx.addIssue(...)` for each problem.

### Example: Multiple Issues in a Single Validation

```ts
import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8)
  .superRefine((val, ctx) => {
    if (!/[A-Z]/.test(val)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Password must include an uppercase letter',
      });
    }
    if (!/\d/.test(val)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Password must include a digit',
      });
    }
    // You can add more checks if needed...
  });
```

Now, if the password is missing both uppercase letters _and_ digits, you get _two distinct errors._ That's helpful for user feedback—otherwise, a single `.refine()` would typically throw just one error message.

## Some Final Thoughts

- **Be mindful of performance**: For extremely large schemas or high-traffic endpoints, you might need to optimize or memoize certain checks. Zod is already pretty efficient, but if you do something insane in .refine(), you'll pay for it.
- **Validate input at the edges**: Don't wait until half your codebase has touched the data to realize it's invalid. Validate as close to the “data entry point” as you can—be it an API endpoint, a form submission, or a message queue consumer.
- **Keep an eye on updates**: Zod evolves. New versions might bring new features or better performance. It's worth checking once in a while to see if your custom logic can be replaced by a newly released built-in method.
