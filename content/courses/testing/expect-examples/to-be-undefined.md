---
title: toBeUndefined in Vitest
description: Learn how expect(...).toBeUndefined checks if a value is undefined.
modified: 2024-09-28T12:53:02-06:00
---

Let's dive into **expect(…).toBeUndefined**.

## What It Does

*expect(…).toBeUndefined* is pretty straightforward. Surprise, surprise… it checks if the value you’re passing is, in fact, `undefined`. If your value is `undefined`, the test is going to pass. If it’s anything else—like `null`, `0`, or an empty string (even though those sorta feel like "nothing" too)—the test is going to throw some red text at you, because nope, that's *not* `undefined`.

## When You’d Use It

You’ll use this when you’re trying to confirm that something has not been set or initialized. For example, let’s say you're working with some function that's supposed to "optionally" set a value. If the value isn’t provided, you really want to make sure things stay nice and undefined, right?

Maybe you're dealing with inputs in an app or optional properties in an object. You’ll write tests with `toBeUndefined` to make sure you're catching those cases where variables are deliberately unassigned.

## Example

Let’s say we’re adding albums to our music library and we want to check if an album’s `description` is `undefined` when someone skips adding it. Here’s how you could write a test for that:

```javascript
import { describe, it, expect } from 'vitest';

const createAlbum = ({ title, artist, year, description }) => {
	return {
		title,
		artist,
		year,
		description,
	};
};

describe('createAlbum', () => {
	it('should have `undefined` as description when no description is provided', () => {
		// Create an album but forget to pass the description field
		const album = createAlbum({
			title: 'Dookie',
			artist: 'Green Day',
			year: 1994,
		});

		expect(album.description).toBeUndefined();
	});
});
```

Here, we’re making sure our function is smart enough to leave `description` out when it’s not provided. No description? Cool, it’s `undefined`. ✅
