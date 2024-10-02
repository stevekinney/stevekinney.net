---
title: expect.anything in Vitest
description: Learn how to use expect.anything() for flexible value checks.
modified: 2024-09-28T12:51:01-06:00
---

Alright, `expect.anything()` is like the “I don’t actually care, just give me something” of testing. It’s super handy when you want to assert that a certain value exists—it can be anything *except* for `null` or `undefined`. So in those cases where you just want to confirm “something happened,” but the exact value doesn’t matter, this is your go-to.

## When Would I Use It?

Imagine you’ve got a function that returns an object. Some properties of that object you want to check for specific values—but others? Meh, maybe they change based on some other voodoo you don’t need to validate in this particular test. That’s where `expect.anything()` comes in. You can tell Vitest, "I expect this key to exist, but don’t sweat the details."

## Example

Let’s say we have a lovely function called `createSong` for our humble music library. It takes some info about a song and returns an object representing it.

```javascript
// src/musicLib.js
export function createSong(title, artist, album) {
	return {
		title,
		artist,
		album,
		addedAt: new Date(), // This timestamp isn't something we might care about in every test.
	};
}
```

Now, when you test it, you’re absolutely *sure* that `title`, `artist`, and `album` should be correctly set, but `addedAt`? That’s a dynamic timestamp and you’re, frankly, just trying to get some work done today.

So here’s what the test would look like:

```javascript
import { describe, it, expect } from 'vitest';
import { createSong } from './src/musicLib';

describe('createSong', () => {
	it('should create a song object with title, artist, album and some timestamp', () => {
		const title = 'Boulevard of Broken Dreams';
		const artist = 'Green Day';
		const album = 'American Idiot';

		const result = createSong(title, artist, album);

		expect(result).toEqual({
			title: 'Boulevard of Broken Dreams',
			artist: 'Green Day',
			album: 'American Idiot',
			addedAt: expect.anything(), // We don't care what addedAt is, as long as it's not null or undefined.
		});
	});
});
```

Here, we care a lot about the three main properties (`title`, `artist`, and `album`). But for `addedAt`, we’re like, “just give me *something*,” so that’s where `expect.anything()` swoops in to save you from over-specifying stuff you don’t really need to test here.

## Gotcha

Remember, `expect.anything()` won’t match `null` or `undefined`. If that’s what you’re after, you’ll need something else or maybe question if that test is bringing joy. Otherwise, you’re good to go! 🎸
