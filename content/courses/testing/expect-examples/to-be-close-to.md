---
title: toBeCloseTo in Vitest
description: How to use the toBeCloseTo matcher when dealing with floating-point math.
modified: 2024-09-28T12:51:53-06:00
---

So here's the deal with `toBeCloseTo`. It's your go-to matcher when you're dealing with numbers that are close but not *exactly* the same. In the wonderful world of floating-point math, precision can sometimes be… well, a little fuzzy. You know, when you expect `1.2 + 1.2` to give you `2.4`, but JavaScript might hand you something wild like `2.3999999999999995`. Yeah, *that* nonsense. That's when you'd use `toBeCloseTo`.

The `toBeCloseTo` matcher lets you assert that two numbers are nearly equal, within a tiny margin of error, instead of expecting them to be identical. It becomes particularly useful for those situations where rounding errors pop up, or even when you’re dealing with all sorts of math-heavy code like calculating percentages, measurements, or album durations that rely on floating-point math.

## Usage Example

Let’s say we’ve got our little music app that calculates the length of an album based on individual song durations. If your song durations use floats (like `3.25` minutes for that Green Day track), you’d want to test that the total time is *approximately* what you expect.

```javascript
import { expect, test } from 'vitest';

test('should correctly sum album duration', () => {
	const song1 = 3.15; // in minutes
	const song2 = 4.25;
	const totalDuration = song1 + song2;

	// We expect the total duration to be close to 7.4
	expect(totalDuration).toBeCloseTo(7.4, 2); // 2 decimal places precision
});
```

Here, `toBeCloseTo(7.4, 2)` is saying:

> “Hey, `totalDuration`, be close to `7.4`, within two decimal places.”

Why two decimal places? Well, that’s the second argument. You can specify how many digits you want the matcher to care about. If you don’t pass this argument, Vitest defaults to the precision being 2 decimal places, which is usually pretty reasonable for human-friendly math like this.

### When to Use `toBeCloseTo`

- **Floating-point math**: When you're doing math and expecting possible rounding issues.
- **Handling decimals**: When you need results to be "close enough," like in finance calculations, measurements, or time/durations.

### When *Not* to Use `toBeCloseTo`

- If you need strict equality, this is not your matcher. Use `toBe` for exact matches! (But beware of floats, my friend!)

In short: if you're doing math with decimals—like calculating the total runtime of an album—and don't care about *super-exact* results down to all 52 decimal places, `toBeCloseTo` is your buddy.

Feels good, doesn't it?
