---
title: toHaveNthResolvedWith in Vitest
description: Learn how to use toHaveNthResolvedWith for testing async calls.
modified: 2024-09-28T12:53:44-06:00
---

Let's dive into the nitty-gritty of `toHaveNthResolvedWith`. First off, let’s address **what it does**:

`toHaveNthResolvedWith` is a matcher in Vitest that allows you to check the result of **Promise resolution** in a **specific position** for a mock function that’s been **called multiple times**. Think of it like this: You're testing a function that's dealing with async operations (like fetching data), and you want to know if the second, third, or nth call to the function resolved with some specific value.

## When you’d Use it

Use `toHaveNthResolvedWith` when:

1. You’re working with a mock function that handles Promises.
2. The function has been called more than once, and you specifically care about the resolved value of one of the calls. Like, maybe the 2nd or 3rd one.

It’s super useful when you're testing how your function handles **multiple async requests** over time. Instead of guessing "Wait, which result was this again?!" you can just zero in on the exact call you care about.

## Example: The Music Library 👀

Let’s say you’re building a naive little music library interface, and you have a function that fetches information about artists. You’re testing what happens if someone looks up Green Day, a random band, and Weezer — in that order.

```js
// Imagine we’ve got a mock for fetching artist details
const fetchArtistDetails = vi.fn();

fetchArtistDetails
	.mockResolvedValueOnce({ artist: 'Green Day', genre: 'Punk Rock' })
	.mockResolvedValueOnce({ artist: 'Some Random Band', genre: 'Unknown' })
	.mockResolvedValueOnce({ artist: 'Weezer', genre: 'Alternative' });

describe('fetchArtistDetails', () => {
	it('checks the result of the second resolved call', async () => {
		// Call it multiple times
		await fetchArtistDetails();
		await fetchArtistDetails();
		await fetchArtistDetails();

		// Now let’s test that the second call returned "Some Random Band"
		expect(fetchArtistDetails).toHaveNthResolvedWith(2, {
			artist: 'Some Random Band',
			genre: 'Unknown',
		});
	});
});
```

## What’s Happening?

- `mockResolvedValueOnce` is the star here. It lets us define what each call to the mock function should resolve to.
- We call `fetchArtistDetails` three times (each pretend artist lookup).
- Then, you use `toHaveNthResolvedWith` to say, "OK, for the **second resolved promise**, I expect the value to be `{ artist: 'Some Random Band', genre: 'Unknown' }`."

This makes it super easy to locate and test specific async responses in a list of operations!

## TL;DR

Use `toHaveNthResolvedWith` to assert what value a **specific call** to a mock async function resolves with. It’s awesome for testing multiple async requests and making sure responses happen in the sequence you expect. Now go fetch those artists! 🎶
