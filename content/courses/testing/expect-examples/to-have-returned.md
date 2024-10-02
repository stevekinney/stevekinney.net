---
title: toHaveReturned in Vitest
description: Learn how to use the toHaveReturned matcher in unit testing.
modified: 2024-09-28T12:54:01-06:00
---

Okay, so *toHaveReturned* is one of those handy matchers that give you the power to assert if a **mock function** has been called and has successfully returned **any value** at least once. It's like checking if the function did its job and didn't just fail silently or throw an error.

You'd use this in scenarios where you're dealing with functions that should produce a return value. For instance, let’s say you have some complex logic, and you don’t care what the return value is (we’re keeping it simple for now)—you just want to make sure that the function *actually* completed successfully.

Think of this like ensuring that your coffee machine at least brewed you something, even if you're hoping it tastes better than bitter disappointment.

Here’s when you wanna pull this out of your testing toolbox:

- When you’re mocking a function, and you just wanna make sure the function went to work and came back.
- You don’t care about **what** it’s returning specifically (yet), but you want assurance that the return path is hit.

## Quick Example

So let’s say we’re working on a **naive music library** app—of course, we’re gonna high-five Green Day in there somewhere. Imagine we mock a function to retrieve albums for an artist, and we just wanna make sure that the function returned **something** when it was called.

```javascript
import { describe, expect, it, vi } from 'vitest';

// Mock function to fetch albums of an artist
const fetchAlbums = vi.fn(() => {
	return ['Dookie', 'American Idiot', 'Nimrod'];
});

describe('Music Library', () => {
	it('should have fetched albums for the artist', () => {
		fetchAlbums(); // Call the mocked function
		expect(fetchAlbums).toHaveReturned();
	});
});
```

## What’s Happening Here?

- We’ve got **`fetchAlbums`** as the mocked function using `vi.fn()`.
- It returns a lovely list of some of Green Day’s finest albums.
- We call our `fetchAlbums()` function.
- Then the line **`expect(fetchAlbums).toHaveReturned()`** is doing the work of checking if **fetchAlbums** returned something. Reminder: We don’t care what—it just needs to have done its job and sent something back.

## When To Use It

You’ll grab **`toHaveReturned`** when you’re writing tests and you only care that the function executed successfully enough to return *something*—meaning no exceptions, no weird "undefined" situations. It’s like a pulse check for your function. If you’re getting more picky later (like checking that it returns the *correct* value), you’ve got other matchers like `toReturnWith` or `toEqual` to get more specific.

Simple test, simple peace of mind.
