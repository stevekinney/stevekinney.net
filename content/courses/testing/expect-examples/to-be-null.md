---
title: toBeNull in Vitest
description: Learn how to use expect().toBeNull() to test for null values.
modified: 2024-09-28T12:52:53-06:00
---

`expect().toBeNull()` checks if the value you're testing is `null`. It’s one of those helpful little methods in Vitest that makes your intentions super clear. Instead of checking if something is `undefined` or some other falsy value, you're explicitly saying, "Hey, this should be `null`." Think of it as being the universe's way of keeping your code sane when `null` is involved.

## When to Use It

You’d use `toBeNull()` when you *know* something should be `null` and that’s exactly what you want to assert. Because, let’s face it, `null` and `undefined` are not the same thing! While they might get along in some JavaScript trickery, you probably want to be precise when testing, right? This is a great way to make sure you're not burning your future self by assuming a falsy value is good enough.

## Real World Example

Let’s say you’re building a simple music library app (because music makes the code go faster, right?). Imagine you have an artist that doesn’t have an album yet. You might want to check that the list of albums is `null`—not just empty, not undefined—but specifically `null`.

```javascript
import { describe, expect, it } from 'vitest';

describe('Music Library', () => {
	it('should have null albums if no albums exist', () => {
		const artist = {
			name: 'Green Day',
			albums: null, // No albums yet for some strange reason...
		};

		expect(artist.albums).toBeNull(); // Looks right? This test will pass!
	});
});
```
