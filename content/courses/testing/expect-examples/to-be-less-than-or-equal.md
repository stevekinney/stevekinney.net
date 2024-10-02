---
title: toBeLessThanOrEqual in Vitest
description: Learn how to usetoBeLessThanOrEqual in Vitest testing scenarios.
modified: 2024-09-28T12:52:17-06:00
---

Let’s talk about **`toBeLessThanOrEqual`**.

Picture this: you’re building a feature to check the maximum duration of songs you’ll allow in your music library (nobody wants a 10-minute guitar solo… well, *most* people don’t). You need to write a test to ensure that all new songs added must be at or below a certain time limit. This is where **`toBeLessThanOrEqual`** comes into play!

## What Does `toBeLessThanOrEqual` Do?

In simple terms, **`toBeLessThanOrEqual`** compares two values and ensures the value you're testing is either *less than* **or** *equal to* a specific number. So yeah, it’s useful when you want your logic to enforce some upper boundary on a piece of data.

## When Would You Use It?

You’ll want to break out **`toBeLessThanOrEqual`** whenever you've got a threshold or upper limit in your app. Think of checking that a song length isn’t too long, or making sure an album's total runtime doesn’t exceed a given cap, and so on.

Here’s when `toBeLessThanOrEqual` shines:

- Checking the maximum allowed value for a variable (like a song's runtime).
- Enforcing constraints, such as making sure the number of songs in an album doesn’t go over a limit.

Basically, any time you're testing something with a requirement like "can’t be over X amount," this matcher will be a solid choice.

## Example

Let’s take our trusty music library example. Say you've got a rule that no song should be longer than 6 minutes. You'd want to write a test case that ensures any given song doesn’t break this constraint. Here's what that might look like:

```javascript
import { describe, it, expect } from 'vitest';

describe('Song duration tests', () => {
	it('should not allow songs longer than 6 minutes', () => {
		const maxDuration = 360; // seconds (6 minutes)
		const songDuration = 299; // seconds (a short and snappy Green Day jam)

		expect(songDuration).toBeLessThanOrEqual(maxDuration);
	});

	it('should reject songs longer than 6 minutes', () => {
		const maxDuration = 360; // seconds (6 minutes)
		const epicSongDuration = 401; // sounds like someone’s trying to add *November Rain*, huh?

		expect(epicSongDuration).not.toBeLessThanOrEqual(maxDuration);
	});
});
```

In the first test, we’ve got a song that’s **under** the max required limit, so the test passes. In the second test, we’ve snuck in a song that goes over the limit, so it fails if it’s *less-than-or-equal*. Hence, we expect it `not` to pass that test.

All clear? Bottom line: **use `toBeLessThanOrEqual` whenever you need to check that something falls within or under a cap**. It’s perfect for catching those overly ambitious song lengths (or other data that pushes the envelope!).

Now get out there and cut down on your over-extended songs!
