---
title: The Key Difference Between assert and expect
description: Differences in usage patterns and APIs between assert and expect.
modified: 2024-09-28T13:25:43-06:00
---

> \[!NOTE] We Won't Be Covering This in the Course
> This *honestly* isn't all that important. I'm including it here just in case you get curious.

The key difference between `assert` and `expect` lies in their **usage patterns** and **API styles** in testing libraries. Both are used for writing assertions (i.e., verifying that certain conditions hold true in your tests), but they differ in syntax, style, and flexibility.

## `assert`: Assertion Style

- **`assert`** follows a **traditional assertion style**, where specific conditions are explicitly asserted in a statement.
- It is used in **libraries like Node.js' built-in `assert` module** or in test frameworks that use **assertion libraries** such as **Chai** (with `assert` mode).
- **Less chaining**: The `assert` syntax does not lend itself to method chaining. Instead, it takes the condition as a parameter.

```js
import assert from 'assert';

assert.strictEqual(1 + 1, 2); // Passes if 1 + 1 equals 2
assert.strictEqual('foo', 'foo'); // Passes if strings are equal
assert.ok(true); // Passes if the condition is truthy
assert.deepEqual({ a: 1 }, { a: 1 }); // Deep comparison of objects
```

- **Pros**
  - Simple and minimal API.
  - Node.js provides it out-of-the-box.
- **Cons**
  - Less expressive, can result in verbose or less readable test cases.
  - Limited flexibility for customization (e.g., custom matchers or more specific assertion types).

## `expect`: Behavior-Driven Development Style

- **`expect`** follows the **[Behavior-Driven Development](https://en.wikipedia.org/wiki/Behavior-driven_development) (BDD)** style and is typically used in testing libraries like Jest, Vitest, and Mocha/Chai.
- It’s known for being **more expressive** and **chainable**, allowing developers to write more human-readable tests.
- **Chaining**: You can chain different matchers (e.g., `.toBe()`, `.toEqual()`, `.toContain()`) with `expect` to create more flexible and powerful assertions.

### Example Using `expect`

```js
import { expect } from 'vitest';

expect(1 + 1).toBe(2); // Checks if 1 + 1 equals 2
expect('foo').toBe('foo'); // Checks if strings are equal
expect(true).toBeTruthy(); // Checks if value is truthy
expect({ a: 1 }).toEqual({ a: 1 }); // Deep comparison of objects
```

- **Pros**:
  - More expressive and readable due to chaining and flexible matchers.
  - Supports **custom matchers** and additional checks like `.toBeTruthy()`, `.toHaveLength()`, etc.
  - Easier to write tests in a BDD style (more natural language).
- **Cons**:
  - Slightly larger API compared to `assert` due to the additional matchers.
  - May require a testing library like Jest or Vitest for full functionality.

## Key Differences

| Feature         | `assert`                              | `expect`                                                            |
| --------------- | ------------------------------------- | ------------------------------------------------------------------- |
| **Style**       | Traditional, imperative               | BDD (Behavior-Driven Development)                                   |
| **Chaining**    | No chaining                           | Supports chaining                                                   |
| **Usage**       | Used in Node.js `assert` module, Chai | Used in Jest, Vitest, Mocha (BDD mode)                              |
| **Readability** | Less expressive, more verbose         | More readable, expressive syntax                                    |
| **API**         | Minimal, focused on strict assertions | Rich API with matchers like `.toBe()`, `.toEqual()`, `.toContain()` |
| **Flexibility** | Limited flexibility and customization | Flexible with custom matchers and detailed assertions               |

## When to Use `assert` or `expect`?

- Use **`assert`** if you want a **minimal, straightforward assertion library** and do not need the expressiveness of BDD-style tests.
- Use **`expect`** if you prefer a **more readable, BDD-style** test that allows for **chaining and flexible matchers**. It’s commonly found in modern test frameworks like Jest or Vitest and helps create more human-readable tests.

```js
// Using assert
assert.strictEqual(result, expected);

// Using expect
expect(result).toBe(expected);
```

In summary, both are used to write assertions, but `expect` is more flexible, expressive, and better suited for behavior-driven development, while `assert` is simpler and more direct.

I've used both a various points in my career—and I really don't have a preference. We'll use `expect` in this course, because it *feels* like it's more popular at this moment in time.
