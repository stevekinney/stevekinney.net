---
title: toHaveBeenCalledWith in Vitest
description: Learn how to use toHaveBeenCalledWith to verify function calls.
modified: 2024-09-28T12:53:24-06:00
---

So *toHaveBeenCalledWith* is like when you catch your roommate “borrowing” your stuff, and you need the *receipts*. You’re not just interested in whether something got called—you’re like, “I want to know exactly HOW it was called!” Vitest’s *toHaveBeenCalledWith* is perfect for asserting that a function (especially a mock function—trust me, you’ll mock a lot of things in testing) was called with a specific set of arguments.

## When Should I Use *toHaveBeenCalledWith*?

You’d use *toHaveBeenCalledWith* when you want to check that a particular function was called *correctly*—meaning it was called with exactly the right arguments. Imagine you’re testing a function that manages an API call to record a song’s details, and you need to ensure it sends the right payload to the server. You don’t care (right now) about what the API returns. You just care if that interaction happened the way you expect.

## Real-World Example

Let’s take our musically-inclined app and say we’ve got a function `saveSong` that saves a song to an album:

```javascript
// songService.js
export function saveSong(apiClient, albumId, song) {
	const payload = {
		albumId,
		song,
	};
	apiClient.post('/songs', payload);
}
```

We’re going to test it to make sure it’s called with the right stuff. Here’s the test:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { saveSong } from './songService'; // The function we're testing

describe('saveSong', () => {
	it('should call apiClient.post with the correct payload', () => {
		// Create a mock for apiClient with a post method
		const mockApiClient = {
			post: vi.fn(),
		};

		// Arrange our test data
		const albumId = 42;
		const song = {
			title: 'Basket Case',
			artist: 'Green Day',
		};

		// Act: Call the function we're testing
		saveSong(mockApiClient, albumId, song);

		// Assert: Was the post method called with the right arguments?
		expect(mockApiClient.post).toHaveBeenCalledWith('/songs', {
			albumId: 42,
			song: {
				title: 'Basket Case',
				artist: 'Green Day',
			},
		});
	});
});
```

## Breaking Down the Example

1. We mock the `apiClient.post` function with `vi.fn()`. We don’t care if it actually posts to a server during the test; we just want to see if it’s called with the right arguments.
2. We define the `albumId` and `song` objects that should be fed into `saveSong`.
3. We call `saveSong` with those arguments.
4. Then, the magic: we use `expect(mockApiClient.post).toHaveBeenCalledWith()` to check if the mock API client was called with exactly the URL `'/songs'` and a payload that matches what we passed.

## Quick Tip

Mocking is your best friend here, otherwise you'd be hitting some external API every time you run the test, which no one wants when you're just trying to see if your code's working right. Better to keep those calls in check.

In short, toHaveBeenCalledWith: good for keeping your functions on track and making sure they’re told exactly what to do!
