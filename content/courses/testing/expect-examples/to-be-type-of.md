---
title: toBeTypeOf in Vitest
description: Learn about thetoBeTypeOf method and its usage in Vitest.
modified: 2024-09-28T12:53:00-06:00
---

Let’s talk about **`toBeTypeOf`**, one of those handy matchers in Vitest that you’re going to use far more often than you realize. If you’ve ever had to figure out why your function started acting funny because *someone* (totally not you, of course) passed in a string instead of a number, `toBeTypeOf` is your new best friend.

## What Does `toBeTypeOf` Do?

In a nutshell—it asserts that some value is of a certain type. It's Vitest’s way of letting you say, "I expect this variable to be a string", or "This had better be a number!"

You’d use it when you want to ensure that a certain value is of a specific type. For instance, if you have a function that’s supposed to take an `albumName` as a string, you can write a test to make sure nothing funny (or tragic) happens by verifying the type passed.

## When Would You Use It?

Okay, imagine you’ve got yourself a nice little function, say, `addSongToAlbum`. It’s really simple: you give it a song, plop it into an album. But the thing is, you *need* that `song` to be an object, not a string, not a number. With `toBeTypeOf`, you can make sure you’re steering that ship straight. Use it whenever you're doing type checks and when typing isn’t enforced, like when someone gives you unexpected arguments or incorrect API responses.

## Example of `toBeTypeOf`

Because talking about *Green Day* never gets old, let’s say we’ve got an album titled "Dookie", and we want to make absolutely sure that when someone adds a new song to this album, it's actually an object (containing things like title, duration, and artist) and not accidentally a string like `"Basket Case"`. Here’s where `toBeTypeOf` wrecks shop:

```js
import { describe, expect, test } from 'vitest';

function addSongToAlbum(album, song) {
	album.songs.push(song);
}

describe('addSongToAlbum', () => {
	test('should add a song object to the album', () => {
		const song = {
			title: 'Basket Case',
			duration: '3:00',
			artist: 'Green Day',
		};

		const album = {
			title: 'Dookie',
			songs: [],
		};

		// Add the song to the album
		addSongToAlbum(album, song);

		// Technically, we want to check that the song is added as an object
		expect(typeof album.songs[0]).toBeTypeOf('object');
		// Boom! Song is an object as expected.
	});

	test('should not accept a non-object as a song', () => {
		const songTitle = 'Basket Case';
		const album = {
			title: 'Dookie',
			songs: [],
		};

		addSongToAlbum(album, songTitle);

		// This should fail if someone tries adding a string to the album
		expect(typeof album.songs[0]).toBeTypeOf('object');
		// Because "Basket Case" is just a string, and that's not what we're after.
	});
});
```

## In Conclusion

**`toBeTypeOf`** is your go-to when you need to assert the *type* of a value. Use it whenever you have strict expectations about a function’s inputs or arguments and want to avoid any "Wait, why is this a `string`?" confusion.

In our example—our *masterpiece* Green Day music library—it's helping make sure we're getting a consistent, predictable type when adding songs to albums. We're not trying to drop a song title string into an array where an object should live. So, it’s safe to say, if you type it wrong, `toBeTypeOf` will gladly slap you back into reality!
