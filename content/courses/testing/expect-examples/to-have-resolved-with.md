---
title: toHaveResolvedWith in Vitest
description: Check if a Promise resolves with the expected value using Vitest.
modified: 2024-09-28T12:53:58-06:00
---

So let's talk about **`toHaveResolvedWith`**. Picture this: you’ve got yourself a **Promise**, maybe it's an API call, maybe it's some async function doing the heavy lifting in your app. You expect it to resolve with a certain value.

Now, if it resolves successfully and gives you that expected output, **`toHaveResolvedWith`** is your testing buddy that checks whether the resolution matches the value you expect. This comes in handy when you're testing asynchronous code, and you want to make sure those Promises resolve with the right stuff. Testing async logic used to feel like wrestling a greased pig, but **Vitest** makes it way less slippery with this matcher.

## When to Use It

You’ll want to reach for **`toHaveResolvedWith`** when you:

- Have some async function that resolves a value.
- You want to check that the value it resolves with matches what you’re expecting.

Think of **`toHaveResolvedWith`** as a cousin to **`toEqual`** but specialized for **Promises** instead of regular values.

## Example in Action

Let's assume you're working on that *naïve music library* and you have a function called `getArtistInfo` that fetches details about everyone’s favorite band—Green Day. You want to test that when the Promise resolves, it returns the proper artist info.

```javascript
// musicLibrary.js
export function getArtistInfo() {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({
				name: 'Green Day',
				genre: 'Punk Rock',
			});
		}, 100);
	});
}
```

We've got our async function working in some distant land called **the event loop**. Now, let’s test that the value it resolves with is what we expect!

```javascript
import { getArtistInfo } from './musicLibrary';

test('getArtistInfo resolves with correct artist data', async () => {
	const artistData = {
		name: 'Green Day',
		genre: 'Punk Rock',
	};

	await expect(getArtistInfo()).toHaveResolvedWith(artistData);
});
```

## What's Going On Here?

- **`getArtistInfo`** is an async function, and we expect it to eventually resolve with the Green Day details (obviously!).
- **`expect(getArtistInfo())`** grabs the returned Promise.
- **`toHaveResolvedWith`** checks whether the Promise resolves with the expected artist data.

Boom. Green Day data comes back, the test passes, and you get to lean back and sip your beverage of choice knowing your code isn’t gonna let you down.
