---
title: toHaveBeenNthCalledWith in Vitest
description: Learn how to use toHaveBeenNthCalledWith in mocked function tests.
modified: 2024-09-28T12:53:31-06:00
---

So you've got yourself a function that gets called multiple times—maybe you're iterating over a set of songs in your music library app, perhaps calling another function for each one. But now you need to assert that the function was called with certain arguments during **specific invocations**. That’s where `toHaveBeenNthCalledWith` comes in.

## What Does it Do?

`toHaveBeenNthCalledWith` checks that a **mocked function** was called with **specific arguments** on the **nth** call. It's not just about whether the mocked function was called but whether it got the arguments you expected on a particular call. If you’re dealing with code that makes multiple sequential calls to something, this is the tool that gives you fine-grained control to verify that specific invocation.

## When Would I Use It?

You’ll wanna use this method when you have a function that gets called multiple times in your test, but you only care what happens during a specific call. For example, your music library is processing songs by Green Day, and each song translates into API calls. You want to verify if the API call for the second song (and not the first or third) was exactly what you expected.

## How about an Example?

Let's break it down with something practical. Imagine you’ve got this function called `playSong`, which calls an API `logPlayback` every time a song is played.

```javascript
function playAlbum(album, logPlayback) {
	album.songs.forEach((song, index) => {
		logPlayback(song);
	});
}
```

Now here’s the test. We wanna see if `logPlayback` was called with the **right song** during the **second call**.

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('playAlbum', () => {
	it('logs playback for every song', () => {
		const greenDayAlbum = {
			title: 'Dookie',
			artist: 'Green Day',
			songs: ['Basket Case', 'When I Come Around', 'Welcome to Paradise'],
		};

		const mockLogPlayback = vi.fn(); // We mock the logPlayback function

		playAlbum(greenDayAlbum, mockLogPlayback);

		// Now we start asserting the specific calls we care about
		expect(mockLogPlayback).toHaveBeenNthCalledWith(1, 'Basket Case'); // First call
		expect(mockLogPlayback).toHaveBeenNthCalledWith(2, 'When I Come Around'); // Second call
		expect(mockLogPlayback).toHaveBeenNthCalledWith(3, 'Welcome to Paradise'); // Third call
	});
});
```

## Bringing it home

In this example, `mockLogPlayback` represents that function we're testing, and we’re making sure that on the **second call** it’s passed the argument `'When I Come Around'`. This is what `toHaveBeenNthCalledWith` is all about, helping you check that functions are not just called but called **with the right data at the right time**. Perfect for when your functions get chatty, and you wanna keep them in check.
