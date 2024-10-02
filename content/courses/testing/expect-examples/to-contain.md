---
title: toContain in Vitest
description: "Learn how to check if values exist in data using Vitest's toContain."
modified: 2024-09-28T12:53:05-06:00
---

So you’ve got this data, and you want to check if something is in it. You know, like a song in an album or an album in a collection. That's where `toContain` comes in! It's a matcher used to check if a certain value exists inside strings or arrays. Nice, right?

**When would you use it?**

- You want to make sure a song title exists in your array of songs.
- You want to verify that a certain substring shows up in a string.

It’s helpful for those situations where you don’t need to validate the entire array or string, but just whether a certain value is hanging out inside there, casually being included.

**Example:**

Let’s say you’re building a little music library app (we all love Green Day, right?). You have an array of song titles for the album *Dookie*, and you want to check if the fan-favorite "Basket Case" is in that collection.

```js
import { describe, it, expect } from 'vitest';

describe('Green Day Album Tests', () => {
	it('should contain "Basket Case" in the songs array', () => {
		const dookieSongs = ['Burnout', 'Having a Blast', 'Chump', 'Longview', 'Basket Case', 'She'];

		expect(dookieSongs).toContain('Basket Case');
	});

	it('should contain a string in the album title', () => {
		const album = 'Dookie by Green Day';

		expect(album).toContain('Green Day');
	});
});
```

**What’s happening here?**

In the array-based test, we’re using `toContain` to verify that `'Basket Case'` is one of the songs in the `dookieSongs` array. Simple!

In the second test, we use it to confirm that the string `album` includes the substring `"Green Day"`. It’s not about the entire string, just whether it *contains* that snippet.

***

And there you have it! Perfect for those "Is this thing in here?" kind of moments.
