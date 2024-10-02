---
title: toHaveBeenLastCalledWith in Vitest
description: Learn how to use the toHaveBeenLastCalledWith matcher in Vitest.
modified: 2024-09-28T12:53:27-06:00
---

Okay, so picture this: You've got a function, right? Let's say it's `createAlbum`. You’re calling it left and right in your app with different arguments, but you only *really* care about the very last call it got. Like, who cares about the first one from some random place in the app, right?

That’s where **toHaveBeenLastCalledWith** comes in. This matcher is specifically about making sure your mock/stub/spy was called *most recently* with the exact arguments you expected. It doesn't matter if it was called before with other arguments, as long as the *last call* checks out.

You'll want to use this when you:

1. Have a function (especially a mock or spy).
2. Don’t care about how or when it was called before (because every time before the last one was a warm-up lap).
3. Need to assert that the very last call went through as intended.

## Example

You’re working on our little music management app. We’ve got an `addSongToAlbum` function that’s supposed to add a song to the latest album. So, you mock `addSongToAlbum` to make sure it was last called with the right song and album.

```javascript
import { vi, describe, it, expect } from 'vitest';

// Here's that function we want to mock
function addSongToAlbum(album, song) {
	// pretend there's logic here to add the song to the album
}

// Mock it because we know this will get called multiple times
const addSongToAlbumMock = vi.fn(addSongToAlbum);

describe('adding songs to albums', () => {
	it('should add the latest song to the correct album', () => {
		const album = { title: 'Dookie', artist: 'Green Day' };
		const song1 = { title: 'Basket Case', durationSeconds: 183 };
		const song2 = { title: 'When I Come Around', durationSeconds: 177 };

		// Call the mock a couple of times, like you'd expect in real life
		addSongToAlbumMock(album, song1);
		addSongToAlbumMock(album, song2); // This is the money call

		// Now let's check the last call
		expect(addSongToAlbumMock).toHaveBeenLastCalledWith(album, song2);
	});
});
```

In this case, **toHaveBeenLastCalledWith** is like playing referee. It doesn't care about that first time `addSongToAlbum` was called with `song1`. But it will make sure *the last time it got called*—it was with `album` and `song2`. And notice how we didn’t have to bother about how many other calls happened before. We just focus on the final one.

It’s especially useful in scenarios where the function is getting hit multiple times in your code, but only the last one matters for the test you’re writing.
