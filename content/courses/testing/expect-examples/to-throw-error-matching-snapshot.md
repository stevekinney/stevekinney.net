---
title: toThrowErrorMatchingSnapshot in Vitest
description: Capture error messages in a snapshot for consistent testing.
modified: 2024-09-28T12:55:13-06:00
---

So let’s break this down. You know when you're writing function tests, and sometimes things go *boom*? Like, errors happen, it's expected, it's part of the program—even Green Day had a couple of rough albums, right? So you want to test that your function deals with things going wrong *exactly* the way you expect.

`toThrowErrorMatchingSnapshot` allows you to capture not just *any error*, but *the whole error message*, and store it in a snapshot. You'll compare that snapshot every time you run the test to ensure nothing fishy changes in your error messages later on. So if an error message changes unexpectedly, boom, you know you’ve caught it.

## When Would You Use It?

Use this bad boy when you know your function is going to throw an error and you want to:

1. Capture the *exact* error message being thrown (not just “Eh, an error happened”).
2. Be warned when the error changes in the future, which can be a subtle but important thing in programs. You don’t always want an error message to be different—you want consistency, especially when debugging or logging.

## Example Time!

Let’s say we're working on a music library app, and there's a function to add songs to an album. We want to throw an error if the song title already exists in the album. Here’s a hypothetical function:

```javascript
function addSongToAlbum(album, songTitle) {
	if (album.songs.includes(songTitle)) {
		throw new Error(`Song "${songTitle}" already exists in the album.`);
	}
	album.songs.push(songTitle);
}
```

We want to test that the error we’re throwing is consistent. Here's how you can write a test using `toThrowErrorMatchingSnapshot`:

```javascript
import { describe, it, expect } from 'vitest';

describe('addSongToAlbum', () => {
	it('should throw an error when the song already exists in the album', () => {
		const album = {
			title: 'Dookie',
			artist: 'Green Day',
			songs: ['Basket Case', 'When I Come Around'],
		};

		const existingSong = 'Basket Case';

		expect(() => addSongToAlbum(album, existingSong)).toThrowErrorMatchingSnapshot();
	});
});
```

## What’s Going On?

In this test, we’re saying, “Hey Vitest, run this function with the song that’s already in the `album` and check if the thrown error matches a snapshot.”

First time you run this, Vitest will *generate* a snapshot, storing the error message `"Song "Basket Case" already exists in the album."`. Every future run will compare the thrown error to this snapshot. If something about the error changes, Vitest will alert you. Maybe someone changed the error message (bad dev! or was it you?), and now it says, “Hey, no duplicating songs!”—that would cause the test to fail.

## TL;DR

- Throwing errors? Cool.
- Want to lock that error message down and track it? `toThrowErrorMatchingSnapshot` is your pal.
- If your error message changes in the future, snapshots will catch it!

Best part? **Zero guesswork**—you’ve got a locked-in snapshot of that error like a musical time capsule from 1994.
