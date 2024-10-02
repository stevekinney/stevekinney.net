---
title: expect.any in Vitest
description: Learn how to useexpect.any to assert types in Vitest tests.
modified: 2024-09-28T12:50:58-06:00
---

So here’s what’s going on with `expect.any`: You’ll likely run into situations where you don’t care *exactly* what a value is, but you do care about its **type**. Maybe you’re not concerned if a function returns a string that says "hello" or "goodbye"—but you do need to know that it’s, well, **a string**.

This is where `expect.any` shines. Instead of checking for super-specific values, you use it to check that the value is of a certain type—like a string, number, or even a class instance.

## When Should You Use It?

You know those times when you’re thinking, “I know this function returns an object, but I really don’t care what the exact details are—I just need to know it's not `null` or `undefined` and that it’s an instance of some class or type”? That’s prime real estate for `expect.any`.

It’s super useful when:

- You’re testing functions that dynamically generate values—like timestamps or random IDs.
- You’re mocking or spying on functions and don’t care about the exact value returned, just the type.
- You want to make sure that the **type** of something is correct, but the value might change over time.

## Example

Let’s play with this in the context of our *music library*. Imagine you’ve got a function that adds an artist. It’ll return an object that includes the artist’s name and a timestamp. We want to check that this timestamp exists and is a **number**, but we don’t care about the actual value of the timestamp (because, you know, it’ll change every time).

```js
// Our function to test
function addArtist(artistName) {
	return {
		name: artistName,
		createdAt: Date.now(), // We don’t care what this actual value is
	};
}

// Our test
import { expect, test } from 'vitest';

test('should add artist with a valid timestamp', () => {
	const artist = addArtist('Green Day');

	expect(artist).toEqual({
		name: 'Green Day',
		createdAt: expect.any(Number), // We just care that this is some kind of number
	});
});
```

**What’s happening here?** We’re verifying that the result includes a `createdAt` value, but instead of nailing down the exact number (because matching dynamic timestamps—yikes, no thanks!), we tell Vitest we *expect* that this will be a `Number`. And that, my friends, is `expect.any` in action!

It’s like saying: "Hey Vitest, as long as you've got *something* here that fits this type, we're good."
