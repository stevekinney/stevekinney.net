---
title: toHaveNthReturnedWith in Vitest
description: "Learn how to use Vitest'stoHaveNthReturnedWith matcher."
modified: 2024-09-28T12:53:47-06:00
---

Buckle up folks—this matcher is super handy when you're dealing with functions that return values multiple times (like when you're mocking something that's called repeatedly). The `toHaveNthReturnedWith` matcher lets you check if a function returned a specific value on a specific call.

It saves you from tracking every return manually like some sort of test detective. Instead, you ask it, "Hey, on the third time this function ran, did we get *this* back?"

## When You’d Use It

Suppose you’re testing a function that gets called multiple times (maybe inside a loop or in response to user actions), and you want to ensure that the nth time it’s invoked, it returns a specific value. You'd use `toHaveNthReturnedWith` to confirm that the right stuff is coming out at specific "checkpoints."

This is *especially* useful when you're testing **mocks** or **spies** that simulate real-life code interactions, like mimicking an API call or database query. Rather than sifting through every return value in order manually, you point to the exact call you’re interested in.

## Example

Let's bring in the Green Day music library scenario! Imagine you have a `getRandomAlbum` function that returns an album from Green Day at random.

```javascript
function getRandomAlbum() {
	const albums = ['Dookie', 'American Idiot', 'Nimrod'];
	return albums[Math.floor(Math.random() * albums.length)];
}
```

Now, let’s say we want to test this using a mock function:

```javascript
import { expect, test, vi } from 'vitest';

test('it returns the correct album on specific calls', () => {
	const getRandomAlbum = vi.fn();
	getRandomAlbum
		.mockReturnValueOnce('Dookie')
		.mockReturnValueOnce('American Idiot')
		.mockReturnValueOnce('Nimrod');

	getRandomAlbum(); // First call, returns "Dookie"
	getRandomAlbum(); // Second call, returns "American Idiot"
	getRandomAlbum(); // Third call, returns "Nimrod"

	expect(getRandomAlbum).toHaveNthReturnedWith(1, 'Dookie');
	expect(getRandomAlbum).toHaveNthReturnedWith(2, 'American Idiot');
	expect(getRandomAlbum).toHaveNthReturnedWith(3, 'Nimrod');
});
```

This is awesome when you expect different return values on repeated calls, like testing a random selection or different data depending on scenarios.

## Mid-Tutorial Coffee Break 🤔

Picture it: You’re manually tracking down call return values. Call one, call two, call three—sweating all over the console log trying to figure out what’s going on.

Now with `toHaveNthReturnedWith`, you just tell the test which call and what you expect it to return. It cuts down on the frustration *immensely*, especially when mocking repeated calls.
