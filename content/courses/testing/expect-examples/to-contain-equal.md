---
title: toContainEqual in Vitest
description: Use toContainEqual to check deep equality in arrays of objects.
modified: 2024-09-28T12:53:09-06:00
---

Picture this: You've got an array, and that array is filled with objects. Now, you want to make sure that it contains an object that matches another object you're testing against. This is where `toContainEqual` comes in clutch.

**When should you use it?**

The `toContainEqual` matcher comes in when you're dealing with arrays of objects and you want to check if an array contains an object with specific values. It's important to note that `toContainEqual` performs a deep equality check. This means it’ll happily check that two objects have the same structure and values, even if they're not the same instance of the object.

Imagine you’re building your music library app, and you want to check if an array of albums contains a particular album object. You don't care if it’s the same object reference; you just want to know that the objects are structurally the same. That's your opportunity to use `toContainEqual`.

**Example**

Let’s say your music library has a list of albums, and one of those albums belongs to the band Green Day (of course). You want to test if your array of albums contains the "American Idiot" album. Here’s how you could do that:

```javascript
import { describe, it, expect } from 'vitest';

describe('Music Library', () => {
	it('should contain the album "American Idiot" by Green Day', () => {
		const albums = [
			{ title: 'Warning', artist: 'Green Day', year: 2000 },
			{ title: 'Dookie', artist: 'Green Day', year: 1994 },
			{ title: 'American Idiot', artist: 'Green Day', year: 2004 },
		];

		const americanIdiot = {
			title: 'American Idiot',
			artist: 'Green Day',
			year: 2004,
		};

		expect(albums).toContainEqual(americanIdiot);
	});
});
```

Boom. In this scenario, even though the `americanIdiot` object is a separate instance, as long as it matches an object in the `albums` array (structurally speaking), `toContainEqual` will give the green light.

***

**Key takeaway:** Use `toContainEqual` when you’ve got arrays filled with objects, and you want to verify that an object with the same structure is in that array, without worrying about it being the *exact* same instance of the object.

Just remember, for simple arrays (like checking for a specific string or number), you can stick with the good ol' `toContain`. For objects? That's `toContainEqual` territory.
