---
title: toBe in Vitest
description: Learn how to use the toBe matcher in Vitest for strict equality.
modified: 2024-09-28T12:51:50-06:00
---

Let's talk about `toBe`. In Vitest (and other testing frameworks like Jest), `toBe` is a *matcher*, which is just a fancy word for "the thing we use to check if two values are the same."

## What Does `toBe` Do?

You’ve got something you want to test. You know what result you’re expecting, and you want to make sure it matches what your function actually returns. That’s where `toBe` comes in. It's used for **strict equality**. So, when you use `toBe`, Vitest is checking if the value you're testing is **exactly** the same as the expected value.

That means it doesn't just look at the values but also their types. For example, `1` (number) isn't the same as `'1'` (string), so `toBe` would fail the test if you compared those.

## When Would I Use It?

Use `toBe` for primitive values like numbers, strings, and booleans when you want exact equality. If you’re testing an object or array, you’d want to use a different matcher like `toEqual` because `toBe` checks if it’s the exact same object in memory (not just if their contents are the same). But for most other cases (string comparison, number comparison, booleans), `toBe` is your go-to tool.

So, if we’re testing that a function returns a number or a string, for example, this is your bread & butter.

## Example

Let’s say we’re jamming on a little music library app. You’ve got a function that returns the number of albums Green Day has released, and you want to test it. No big deal, right?

```js
// Our simple music library code:
function getAlbumCount(artist) {
	if (artist === 'Green Day') {
		return 13;
	}
	return 0;
}

// The test case:
import { describe, expect, it } from 'vitest';

describe('getAlbumCount', () => {
	it('should return 13 for Green Day', () => {
		expect(getAlbumCount('Green Day')).toBe(13);
	});

	it('should return 0 for a band not in the library', () => {
		expect(getAlbumCount('Unknown Band')).toBe(0);
	});
});
```

### What's Happening?

In that first test, we expect `getAlbumCount('Green Day')` to return the exact value `13`. `toBe(13)` ensures that the function’s return value matches *exactly* what we’re expecting.

In the second test, for a band not in the library, we’re expecting the fallback value of `0`, and `toBe(0)` checks if the returned value is indeed `0`.

If `getAlbumCount` returned `13` for Green Day, the test passes. If it returned `12` (say, you forgot to include their latest release), things go red, and Vitest politely lets you know there's a bug.

## Summary

Use `toBe` when you need to check if two values are exactly equal, including types. It’s your go-to matcher when dealing with basic JavaScript values like strings, numbers, and booleans. Save the more complex matchers for objects and arrays!
