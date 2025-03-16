---
title: Valdating Zod Schemas (Exercises)
modified: 2025-03-20T13:14:15-06:00
---

Below is a list of 10 hands-on challenges that will move you from Zod novice to Zod wizard. Start at the top, work your way down, and you’ll get a tour of Zod’s many features and peculiarities along the way.

## Exercises

### The “Hello, Zod!” Basic Validation

**Concepts**: Simple schemas, `.parse()`, basic `string`/`number` validation

1. Create a Zod schema that validates an object containing:

- A name property (string, required)
- An age property (number, must be >= 0)

1. Write a small function that calls `.parse()` on some sample data:

- `{ name: "Ada", age: 36 }` should pass
- `{ name: "Charles" }` should fail (missing age)
- `{ name: "Bobby Tables", age: -1 }` should fail (negative age)

1. Log the outcome (pass/fail/error messages).

**Goal**: Get comfortable with the most basic usage of Zod. Even your goldfish could do it, but you’ll need these fundamentals everywhere.

### All About Options

**Concepts**: Optional vs. required fields, .optional(), default values

1. Start with the object from Challenge 1, but now the user’s age is optional (maybe they don’t want to share it).
2. If age isn’t provided, default it to 0 via a transform (or show an error if you prefer).
3. Test with:

- `{ name: "Ada" }` (age auto-filled? or do you throw an error?)
- `{ name: "Ada", age: 36 }`
- Empty object or missing name.

**Goal**: Learn how to handle optional fields. It’s basically the difference between “maybe we have it” and “definitely we have it.”

### On the Street Where You Live

**Concepts**: Nested objects, arrays

1. Build a schema for a `UserProfile` that looks like this:

```ts
{
	name: string;
	addresses: Array<{
		street: string;
		city: string;
		zip: string;
	}>;
}
```

1. Users can have multiple addresses, so addresses is an array. At least one address is required.
2. Validate an object with one address, multiple addresses, and no addresses (which should fail).
3. Try introducing an optional second-level property like apartmentNumber.

**Goal**: Learn how to nest schemas and handle arrays. Because data is often complicated, so are validations.

### Now for Something Completely Different: Unions

**Concepts**: Union schemas, .parse(), discriminated unions (optional)

1. Create a Zod schema that accepts either:

- A string that’s exactly `"anonymous"`
- An object with two fields, `id: number` and `name: string`

1. This means you should be able to parse `"anonymous"` or `{ id: 1, name: "Alan" }`.
2. Test with invalid data like `{ id: "wrong", name: "Marvin" }` to see how the union breaks.

**Goal**: Master the union concept, which is essential for handling multiple possible data formats. Sometimes data tries to be sneaky. Unions let you catch it in the act.

### Refining Your Tastes

**Concepts**: `.refine()`, custom error messages

1. Take a numeric field—say, quantity.
2. Add a `.refine()` check that ensures quantity is a prime number (e.g., 2, 3, 5, 7, etc.).
3. If it fails, return a custom error message: “Quantity must be prime!”

**Goal**: Understand how to attach custom validation logic to your schema. Keep calm and refine on.

### Transform-ers: Validation in Disguise

**Concepts**: `.transform()`

1. Create a schema that accepts a string in `YYYY-MM-DD` format (e.g., "2025-03-20").
2. After validating the format, transform it into a JavaScript `Date` object.
3. Confirm that your final .parse() result is indeed a `Date` type (and not a string).

**Goal**: See how Zod can automatically morph one validated type into something else. Data in, transformed data out—like a magical pipeline.

### Adding a Little Brand to Your Life

**Concepts**: Branded types, type-safety in TypeScript

1. Create a branded type for a `UserId` that’s a string under the hood but carries a brand `UserId`.
2. The string must be a valid UUID (use `z.string().uuid()`).
3. Experiment by trying to pass a normal string into a function that expects UserId—TypeScript should complain.

**Goal**: Learn how branding can help differentiate between two string-based types in your code. No more mixing up user IDs with email addresses.

### Making “Partial,” “Pick,” or “Omit” Your Best Friends

**Concepts**: Utility methods (`.partial()`, `.pick()`, `.omit()`)

1. Start with a larger schema describing a user profile (name, email, addresses, phoneNumber, etc.).
2. Create a second schema that’s a partial version—maybe for a “profile update” operation where only certain fields are allowed.
3. Then create a “public profile” schema that omits fields like email or phoneNumber (stuff you don’t want publicly displayed).
4. Validate an example with all your new schemas.

**Goal**: Show how to avoid rewriting the same schema multiple times for different use cases. Because DRY is life.

### Custom Schemas

**Concepts**: `z.custom()`

1. Write a custom schema for a “hex color string” (like `#FFFFFF` or `#000`):

- Must be a string
- Must start with `#`
- Then have either 3 or 6 valid hex digits (0-9, A-F)

1. If it fails, show an error: “Invalid hex color.”
2. Test with valid/invalid strings ("#FFFFFF", "#abc", "#1234567", "123456").

**Goal**: Understand how to do completely custom validation that doesn’t map nicely to existing Zod primitives. This is where you can code your weird, one-of-a-kind rules.

### Put It All Together: Build a Form Validator

**Concepts**: Composition, real-world usage, testing

1. Suppose you have a registration form requiring:

- `username` (string, 4–16 chars)
- `password` (string, at least 8 chars, must contain a digit)
- `email` (string, must match an email pattern or refine it via external lib)
- `birthDate` (optional; if present, must parse to a valid date via .transform())

1. Build a single schema or a set of smaller schemas that compose into a bigger one. Use `.refine()`, `.transform()`, arrays (if your form has multi-step data, for example), or anything else you need.

### Bonus

**Goal**: Practice combining everything you’ve learned. Real forms are riddled with optional fields, specialized rules, and transforms, so this is a good representation of real life.

> [!SUCCESS] Solutions
> You can find the solutions [here](validating-zod-schemas-solution.md).
