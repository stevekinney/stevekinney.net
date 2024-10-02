---
title: toStrictEqual in Vitest
description: Understanding toStrictEqual for detailed object comparisons in tests.
modified: 2024-09-28T12:55:01-06:00
---

So let's talk about `toStrictEqual`. It’s like that extra-picky friend everyone has. You know the type—the one that notices *everything* and won't let anything slide. In the realm of testing, `toStrictEqual` is your tool to ensure that what you're comparing checks out down to the tiniest little details.

## What Does it Do?

It’s here to ensure that *every detail* between two values matches, including object types and properties—nested or otherwise. It’s way more strict than its more laid-back cousin, `toEqual`.

### Object Comparison Rules

1. All keys and values need to match, and types matter.
2. Nested objects or arrays? Yep, `toStrictEqual` goes all the way down the rabbit hole to check everything.
3. It even makes sure that objects are of the exact same instance of a class or prototype.

You'd reach for `toStrictEqual` when you want to make sure two objects (or arrays) are *exactly* the same in every nuance—no shortcuts allowed. Want to make sure that your object doesn’t have any extra keys or fuzzy type mismatches? Boom, `toStrictEqual`!

## Example Time!

Imagine we're working on that music library app. Let’s write a test that checks if an album object is exactly as we expect it to be—no extra properties sneaking in, no type gotchas.

```js
import { describe, expect, it } from 'vitest';

describe('Album Comparison', () => {
	it('should create the correct album object for "Dookie" by Green Day', () => {
		const actualAlbum = {
			title: 'Dookie',
			artist: {
				name: 'Green Day',
				genre: 'Punk Rock',
			},
			releaseYear: 1994,
			songs: ['Basket Case', 'When I Come Around', 'Longview'],
		};

		const expectedAlbum = {
			title: 'Dookie',
			artist: {
				name: 'Green Day',
				genre: 'Punk Rock',
			},
			releaseYear: 1994,
			songs: ['Basket Case', 'When I Come Around', 'Longview'],
		};

		expect(actualAlbum).toStrictEqual(expectedAlbum);
	});
});
```

In this example, we’ve got two nice and neat album objects with the same structure. The `toStrictEqual` assertion will verify that `actualAlbum` matches `expectedAlbum` in every way—nested objects, arrays, the whole shebang.

### When Would You Use This?

Whenever you have complex data structures (think objects with nested data, arrays of objects, etc.) and need your test to verify that there’s no extra junk floating around or weird type behavior happening. If order or type matters, `toStrictEqual` has you covered.

For instance, if `actualAlbum` accidentally had an extra property like `{ coverImage: "Dookie.jpg" }` thrown into it, or if one of those song names was somehow typed as `undefined`, `toStrictEqual` would *absolutely* catch that mismatch. It's saying, "No extra keys, period. Types must match. Nested properties too."

It’s strict but fair—just like your very particular friend who knows all the lyrics to *every* Green Day song.
