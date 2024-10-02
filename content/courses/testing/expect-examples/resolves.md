---
title: resolves in Vitest
description: Learn how to test promises using resolves in Vitest.
modified: 2024-09-28T12:51:43-06:00
---

Let’s talk about promises. You’ve got this nice promise, but testing them isn't always as smooth as you’d like, right? Enter `resolves`. In Vitest, `expect(…).resolves` is something you're going to use when you're working with promises that need a little expectation love.

In short, if you’ve got a function that returns a promise and you want to test what happens when that promise *resolves*, you use `resolves`. It basically says, “Hey, Vitest, I expect this promise to *actually fulfill* and when it does, here's what I expect to be delivered on that promise.”

## When to Use it

So, whenever you’ve got an async function (hello fetch calls, third-party APIs, database operations), and you want to assert what it resolves to, this is your tool of choice.

Let’s say you’ve got your Green Day music library app (we all know this is more fun than fiddling with some user form, right?). You hit an API for getting artist information asynchronously. Obviously, we want to check that when that promise resolves, we get good ol' Billy Joe Armstrong.

## Example

Here’s a quick rundown. Let’s say we’ve got an async function to fetch an artist:

```javascript
const fetchArtist = () => {
	return new Promise((resolve) => {
		setTimeout(
			() =>
				resolve({
					name: 'Green Day',
					genre: 'Punk Rock',
				}),
			100,
		);
	});
};
```

Now let’s write a darn test for it.

```javascript
import { expect, it } from 'vitest';

it('resolves Green Day artist data', async () => {
	await expect(fetchArtist()).resolves.toEqual({
		name: 'Green Day',
		genre: 'Punk Rock',
	});
});
```

## What's Happening?

We’re telling Vitest to wait for `fetchArtist()` to resolve and then checking that the resolved value is what we expect. As in, we *expect* the promise to deliver exact, glorious details of Green Day and their associated punk rock genre.

No more oversleeping your awaits and missing out on testing those promise resolutions. Pretty slick and simple, right?

When your code needs to test what's popping out of a resolved promise, you know where to go: `resolves`. It's like waiting for your coffee to brew, but instead of coffee, you get testable data! 🌟
