---
title: expect.closeTo in Vitest
description: Learn how expect.closeTo handles floating-point comparisons in Vitest.
modified: 2024-09-28T12:51:13-06:00
---

So, **`expect.closeTo`**—this is your buddy when you're dealing with **floating-point numbers**. You know floating points, right? The ones that seem so innocent until you start adding or dividing them, and suddenly it's like math decided to just do whatever it feels like. You expect a result like `5` and instead get `4.9999999998`, which is close enough, but not **exactly** what you're expecting. That's where **`closeTo`** steps in to save the day.

## When You Would Use It

Let's say you’re testing a function that performs calculations—maybe something’s dividing, adding, or doing a bit of trigonometry. Floating-point numbers don’t always give you that **perfect** match you hoped for. Instead of pulling out your calculator to verify down to the twelfth decimal point, you can use **`expect.closeTo`** to deal with these *"eh, close enough"* scenarios. It allows you to check if a number is "close" to another, within a certain tolerance (known as *delta*, the margin of error you're willing to accept).

## Example of it Being Used

Let’s assume you have a function `calculateTrackLength()` in your music library that estimates the length of a song.

```javascript
function calculateTrackLength(bpm, bars) {
	return (bars / bpm) * 60;
}
```

And now, you’re ready to write some tests, but you’re aware floating-point imprecision might rear its ugly head. Here's a test using **`expect.closeTo`**:

```javascript
import { expect, test } from 'vitest';

test('calculates track length accurately', () => {
	const trackLength = calculateTrackLength(120, 240);

	// We expect 120 BPM and 240 bars to produce a 120-second track.
	// The result might not be exactly 120 due to floating point weirdness. 'delta' says we’re cool with a difference of 0.1 seconds.
	expect(trackLength).toBeCloseTo(120, 1); // within 1 decimal place
});
```

Here, **`expect(trackLength).toBeCloseTo(120, 1)`** is saying, "Hey, as long as this value is within 0.1 of 120, we're good."

Without **`closeTo`**, you'd be comparing exact values like a tyrant. No need to rule so harshly; math is fickle with floats, and sometimes you just gotta meet it halfway.

### Use it When

1. Floating-point results are a fact of life (many times with division or multiplying decimals).
2. You're okay with values not being 100% equal but "close enough."

Given these quirks, *`expect.closeTo`* will help you sleep better at night when you're dealing with funky math results. 😅
