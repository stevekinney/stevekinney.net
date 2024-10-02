---
title: toHaveReturnedWith in Vitest
description: Learn about the toHaveReturnedWith matcher with a practical example.
modified: 2024-09-28T12:54:07-06:00
---

Let's dive into **`toHaveReturnedWith`** with an example that *might* just hit home.

## What It Does

**`toHaveReturnedWith`** is a matcher that checks if a *mocked function* (aka a simulated version of a real function) returned a specific value—at least one time during its executions.

So, you're basically asking: "Hey, was this the value that came back from this function at any point?"

## When Would You Use It?

You'll use this when you need to verify that a *mocked function* actually returned the expected value during its run time, and not just what it was called *with* (there’s another matcher, `toHaveBeenCalledWith`, for that!). This is ripe for those cases where you want to ensure that your function did its job and spat out the right result. Think of processing something or calculating a value instead of just verifying inputs.

## Example Time

Let’s imagine we have a music library, and there's a function that fetches all the albums for an artist. We want to ensure that this mocked fetching process returns the correct list of albums for Green Day.

```javascript
import { vi, it, expect } from 'vitest';

// Our pretend function that would "fetch" albums
const fetchAlbums = (artist) => {
	if (artist === 'Green Day') {
		return ['Dookie', 'American Idiot', 'Nimrod'];
	}
	return [];
};

// Mock that function
const mockedFetchAlbums = vi.fn(fetchAlbums);

it('should fetch albums for Green Day', () => {
	mockedFetchAlbums('Green Day'); // the function gets called

	expect(mockedFetchAlbums).toHaveReturnedWith(['Dookie', 'American Idiot', 'Nimrod']);
});
```

### What’s Happening?

- We create a mock `mockedFetchAlbums` function using `vi.fn()`.
- We call the function with `'Green Day'` (because, why not?).
- We then check if, at any point, that function call returned the array of Green Day albums.

Notice how we're not checking **how** the function was called, but **what** it returned. So, if your function is expected to return specific stuff, you'd use this matcher to make sure you got the right output. Easy peasy.

In the real world, you’d use this when mocking or spying on a function’s behavior and its result, not just how it was called. It's especially handy for APIs, data transforms, or anything that has a return value you're super invested in.
