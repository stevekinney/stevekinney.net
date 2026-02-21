---
title: Customer Matchers in Vitest
description: Create custom matchers in Vitest for specialized assertions.
modified: '2025-07-29T15:09:56-06:00'
date: '2024-10-02T08:49:23-05:00'
---

Let's say you can't find the `expect` method that makes you happy. You _could_ extend the matchers in Vitest.

```javascript
// vitest.setup.js
import { expect } from 'vitest';

expect.extend({
  toBeWithinRange(received, min, max) {
    const pass = received >= min && received <= max;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${min} - ${max}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${min} - ${max}`,
        pass: false,
      };
    }
  },
});
```

Let's see it in action.

```javascript
test('number is within range', () => {
  expect(10).toBeWithinRange(5, 15);
});
```

## A More Interesting Example

Let's say you're working with **dates**. Testing for "is this date after that date?" could be a little annoying with vanilla matchers.

Here's a custom matcher for checking if one date is later than another:

```js
expect.extend({
  toBeLaterThan(received, comparedDate) {
    const pass = new Date(received) > new Date(comparedDate);
    if (pass) {
      return {
        message: () => `expected ${received} not to be later than ${comparedDate}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be later than ${comparedDate}`,
        pass: false,
      };
    }
  },
});
```

Boom! Now you can write some crisp, clear date comparisons:

```js
test('date comparison', () => {
  expect('2023-10-10').toBeLaterThan('2023-09-01'); // ✅ True.
  expect('2023-05-15').toBeLaterThan('2023-07-01'); // 💣 False.
});
```

## Best Practices

1. **Keep the matcher simple**. You don't want to write a novel for each matcher. Remember, code is read more often than it's written, so make sure that your custom matcher is easy to understand at a glance.
2. **Detailed error messages**. When a test fails, the developer (spoiler: future you) needs to understand _why_ things exploded. A good message makes debugging way less painful.
3. **Leverage context for your app**. Extend matchers when you find yourself repeating specific checks. In the land of testing, **DRY** doesn't just stand for "Don't Repeat Yourself", it stands for "**Don't Rage Yet**", because tests are meant to stay calm and concise.
