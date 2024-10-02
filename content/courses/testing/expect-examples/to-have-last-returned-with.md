---
title: toHaveLastReturnedWith in Vitest
description: Learn how to use toHaveLastReturnedWith for mock functions in Vitest.
modified: 2024-09-28T12:53:38-06:00
---

est

My friend. Let’s talk about *one of those matcher methods* you bust out when you're dealing with mock functions, aka the unsung heroes of your tests. Specifically, we're looking at `toHaveLastReturnedWith`, which is kinda like saying, *"Hey, I need to make sure that the **last** time this mock function was called, it returned exactly this value."*

## When Would You Use It?

Picture this: You're testing a function that gets called multiple times—like maybe you're fetching data, or some complex music library operation—and you’re interested in checking what the **last call** returned. This is pretty useful if the mock function behavior changes with every call (perhaps you're simulating paginated results or dealing with an evolving playlist). So, you're not just interested in *any* return value, you're laser-focused on verifying the last one.

## The Gist of It

`toHaveLastReturnedWith` is going to check if the most recent return value of your mock function matches what you're expecting. This helps you verify that your function is behaving correctly at its very last call, which might be particularly important if you've got multiple calls in your test scenario.

## Example Time: Music Library Mock-up

Let’s go with our trusty invented music library. We’re mocking a function that fetches an artist's albums over time, and we want to make sure after a series of returns, the last one is *specifically* what we expect.

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('Music Library: getAlbumsByArtist', () => {
	it('should return the last album fetched', () => {
		const getAlbumsByArtist = vi
			.fn()
			.mockReturnValueOnce(['Dookie', 'American Idiot']) // First time: 2 albums
			.mockReturnValueOnce(['21st Century Breakdown']); // Second time: Just 1 album

		// Call the mock function a couple of times
		getAlbumsByArtist('Green Day');
		getAlbumsByArtist('Green Day');

		// Now let's verify that the last call returned '21st Century Breakdown'
		expect(getAlbumsByArtist).toHaveLastReturnedWith(['21st Century Breakdown']);
	});
});
```

In this somewhat contrived but useful example, we mock a function that simulates fetching albums for an artist (in this case, the mighty Green Day). On the first call, we say the mock function should return two albums (`Dookie`, `American Idiot`). On the second call, it returns just `21st Century Breakdown`. Our test checks that the last value returned from the final call to `getAlbumsByArtist` was exactly `21st Century Breakdown`.

In short, `toHaveLastReturnedWith` gives you peace of mind that your function closed out with the result you were expecting. It's great when you're working with sequences of calls and need to zero in on that final output.
