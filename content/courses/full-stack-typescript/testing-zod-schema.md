---
title: 'Testing with Zod: Building Robust and Maintainable Schemas'
description: >-
  Learn effective strategies for testing Zod schemas to ensure their correctness
  and prevent regressions as your application evolves.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-03-16T17:35:22-06:00'
---

Writing comprehensive unit tests for your Zod schemas is essential to ensure their correctness and prevent regressions as your application evolves. Here are key strategies for testing Zod schemas:

## Test Valid Inputs

Create test cases with valid input data that should successfully parse against your schema. Assert that `schema.parse()` or `schema.safeParse()` returns the expected validated data without errors.

```ts
import { z } from 'zod';
import { describe, it, expect } from 'vitest'; // Example using Vitest

const userSchema = z.object({
  name: z.string().min(2),
  age: z.number().positive(),
});

describe('User Schema', () => {
  it('should parse valid user data', () => {
    const validUserData = { name: 'Alice', age: 30 };
    const parsedUser = userSchema.parse(validUserData);
    expect(parsedUser).toEqual(validUserData); // Assert parsed data is as expected
  });
});
```

## Test Invalid Inputs

Create test cases with invalid input data that should _fail_ validation. Assert that `schema.parse()` throws a `ZodError` or that `schema.safeParse()` returns `success: false`. Examine the `error.errors` array to verify specific error messages and error paths are as expected.

```ts
import { z } from 'zod';
import { describe, it, expect } from 'vitest';

const userSchema = z.object({
  name: z.string().min(2),
  age: z.number().positive(),
});

describe('User Schema', () => {
  it('should throw ZodError for invalid age', () => {
    const invalidUserData = { name: 'Bob', age: -5 };
    expect(() => userSchema.parse(invalidUserData)).toThrowError(z.ZodError); // Assert ZodError is thrown
    try {
      userSchema.parse(invalidUserData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        expect(error.errors[0].message).toBe('Number must be greater than 0'); // Assert specific error message
        expect(error.errors[0].path).toEqual(['age']); // Assert error path
      }
    }
  });

  it('should return success: false and ZodError for safeParse with invalid name', () => {
    const invalidUserData = { name: 'C', age: 25 };
    const result = userSchema.safeParse(invalidUserData);
    expect(result.success).toBe(false); // Assert safeParse returns failure
    if (!result.success) {
      expect(result.error).toBeInstanceOf(z.ZodError); // Assert error is ZodError
      expect(result.error.errors[0].message).toBe('String must be at least 2 characters'); // Assert error message
    }
  });
});
```

## Test Edge Cases and Boundary Conditions

Consider edge cases and boundary conditions for your schemas (e.g., empty strings, null values where nullable is not specified, maximum allowed lengths, minimum/maximum values). Create test cases to ensure your schemas handle these scenarios correctly.

## Test Custom Refinements and Transformations

Thoroughly test your `.refine()`, `.superRefine()`, and `.transform()` methods to ensure your custom validation and transformation logic works as expected.
