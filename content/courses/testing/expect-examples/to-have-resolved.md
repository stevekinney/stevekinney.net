---
title: toHaveResolved in Vitest
description: Understanding how to use the toHaveResolved matcher in Vitest.
modified: 2024-09-28T12:53:52-06:00
---

Great question! Let’s dive in. The `toHaveResolved` matcher in Vitest is all about promises. Specifically, you'd use it when you want to test that a promise **resolves** successfully, meaning the promise doesn't throw an error and "fulfilled" without blowing things up.

If you're working with anything asynchronous in JavaScript—especially promises—you’ll find yourself needing to check whether a specific promise got resolved (versus being rejected). In real life, you'd likely use it when you're writing some async code: fetching data, interacting with APIs, that sort of thing.

## When Would I Use It?

Let's say you're writing a function that fetches albums for a particular artist from your music library app, and you need to make sure the promise resolves correctly. You don’t really care at this point what the returned data looks like (that’s for another test maybe), you just wanna make sure the promise is doing its job and not throwing a fit.

## Example

Suppose we have an `fetchAlbumsForArtist` function that returns a list of albums for Green Day (duh). Here's how that might look when you want to test if it resolves successfully:

```javascript
import { expect, it } from 'vitest';

// Sample function that returns a promise, maybe it's fetching albums from an API, service, or database
const fetchAlbumsForArtist = (artist) => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(['Dookie', 'American Idiot']);
		}, 100);
	});
};

it('should resolve the promise for fetching albums', async () => {
	// expect the promise to resolve successfully (we're not worrying about what's inside)
	await expect(fetchAlbumsForArtist('Green Day')).toHaveResolved();
});
```

## Break it Down

1. **The Function**: `fetchAlbumsForArtist('Green Day')` simulates an async function fetching Green Day's albums.
2. **The Test**: We use `await` to handle the promise. Because, you know, async.
3. **The Matcher**: `toHaveResolved` ensures that the promise resolves as expected. No rejection, no angry exceptions. Just chill.

👉 **When would this fail?** If the promise rejects—say, because of a bad network connection or an internal error—then the test will fail. Likewise, if the promise never resolves (maybe it stays pending forever), that's also a fail.

## Quick Recap

Use `toHaveResolved` when you want to be sure that a promise didn’t fail or stay unresolved. It’s like a bouncer at the door going, “Hey, did the band show up on time?” without caring too much *what* they're playing once they do show up (we’ll worry about that in another test!).
