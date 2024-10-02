---
title: toHaveProperty in Vitest
description: Learn how to use the toHaveProperty matcher in Vitest.
modified: 2024-09-28T12:53:50-06:00
---

Ah, **`toHaveProperty`**—this little gem is one of those matchers that once you get the hang of it, you'll find yourself using it *all the time*. Here's what it does in a nutshell:

**What it does:** It checks if an object has a specific property, and optionally, it checks if that property has a specific value. Kind of like "Do you have the thing? And if you’ve got the thing, is it set to what I told you to set it to?" This helps you verify if your object structures are as expected, which is pretty crucial for things like making sure responses from an API, or things like album objects in your music library, have the expected shape.

**When you’d use it:** When you're working with objects and you want to ensure that they contain a particular property, or that a property holds a specific value. Think about testing an album object. Maybe we want to make sure that it has an artist and an array of songs. That's a perfect time to break out `toHaveProperty`.

Let’s hit this with some code. You know we love a good Green Day example over here, so let’s assume we’ve got an album object.

## Example

```javascript
import { describe, it, expect } from 'vitest';

describe('Green Day Album', () => {
	it('should have the expected properties', () => {
		const album = {
			title: 'Dookie',
			artist: 'Green Day',
			songs: ['Basket Case', 'When I Come Around', 'She'],
		};

		// Does the album have an 'artist' property?
		expect(album).toHaveProperty('artist');

		// Does it have a 'songs' property that's an array?
		expect(album).toHaveProperty('songs');

		// Check if the artist is specifically 'Green Day'
		expect(album).toHaveProperty('artist', 'Green Day');
	});
});
```

Notice what’s going on here? First, we’re checking to see if the album object even has the `artist` and `songs` properties. That’s super useful when working with dynamic data where you might not know if you’ve got everything in place (might be a bummer if our album didn’t have an artist, right?).

Then, we’re going a step further to ensure that the `artist` property is specifically `'Green Day'`. This is great for when you not only need the property to exist but also want to double-check its value.

This keeps your tests clean, concise, and readable, and it prevents that tough debugging headache when something *almost* works… but not quite.

## Closing Thoughts

In the end, **`toHaveProperty`** is a down-to-business kind of matcher. You call it when you *probably* have an object, but you need to make sure it's the right kind of object. Maybe it's missing the `artist`, or maybe the `title` is wrong—who knows? But `toHaveProperty` ensures things are *where they're supposed to be*. And honestly, isn’t that what we all want in life and code?
