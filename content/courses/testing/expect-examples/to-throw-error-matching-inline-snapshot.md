---
title: toThrowErrorMatchingInlineSnapshot in Vitest
description: Learn how to assert errors with inline snapshots in Vitest.
modified: 2024-09-28T12:55:10-06:00
---

So here’s the deal: `expect().toThrowErrorMatchingInlineSnapshot()` is used to assert that a function throws an error **matching a predefined inline snapshot**. This might sound a little abstract, but it’s incredibly useful when you need to make sure that a function is not just throwing *any* ol' error, but that it's throwing THE EXACT error message you expect. And to make things better (and less annoying), it allows you to **“snapshot” the error message** within your tests, often auto-generating it the first time it runs. Vitest will take a mental picture of the error and then compare future test runs against that snapshot to ensure the error doesn’t mysteriously change.

So why would you use this? Well, it's great if you’ve got a function that should throw a specific type of error, and you don’t want to hard-code and maintain that error message inside every test. Instead, Vitest remembers it for you. One less thing for us developers to have to keep in our brains. Woohoo.

## Example

Let’s say we’ve got a music library system, and you want to prevent anyone from adding songs to an album that are **over 10 minutes long**, because we’re not running the infinite jam band playlist here, folks.

```javascript
function addSongToAlbum(album, song) {
	const { title, duration } = song;

	if (duration > 600) {
		// songs longer than 10 minutes should throw
		throw new Error(`The song '${title}' is too long!`);
	}

	album.songs.push(song);
}
```

Now, let’s write a test to verify that error gets thrown when we try to add a song that’s *way* too long. We’ll use `toThrowErrorMatchingInlineSnapshot` to assert that the error we get matches the message we're aiming for:

```javascript
import { describe, it, expect } from 'vitest';

describe('addSongToAlbum', () => {
	it('throws when trying to add a song that is too long', () => {
		const greenDayAlbum = { songs: [] };
		const longSong = { title: 'The Jam That Never Ends', duration: 1200 };

		expect(() => addSongToAlbum(greenDayAlbum, longSong)).toThrowErrorMatchingInlineSnapshot(
			`"The song 'The Jam That Never Ends' is too long!"`,
		);
	});
});
```

## What Happens Here?

- The `expect(() => addSongToAlbum(…))` part is us saying "Hey, I expect this function call to explode with an error."
- `.toThrowErrorMatchingInlineSnapshot()` says, "Compare that exploding error against the snapshot string I provide you, please."

The cool bit is that if the snapshot doesn’t exist (like running this test for the first time), Vitest can **auto-generate** this snapshot for you. Next time you run that test, it’s like, “Yeah, looks the same, all good,” unless the error message changes unexpectedly—then it’ll yell at you.

## When to Use It?

You want this when:

- You’ve got functions that should throw specific errors.
- You want to avoid hardcoding error messages repeatedly across tests.
- You’re a lazy dev that loves Vitest doing the bulk of the work (no shame!).

There you go—a way to make error testing easy and maintainable, and keep your code free of unnecessary hardcoded artifacts!
