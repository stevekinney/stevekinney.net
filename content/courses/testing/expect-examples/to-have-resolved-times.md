---
title: toHaveResolvedTimes in Vitest
description: Learn how to use the toHaveResolvedTimes matcher for promises.
modified: 2024-09-28T12:53:55-06:00
---

Let's talk about `toHaveResolvedTimes`. Imagine you're calling a promise-based function and you need to ensure that during your test, this function resolves a specific number of times. That's exactly where `toHaveResolvedTimes` comes into play!

This is essentially a matcher built to test how many times a promise successfully resolves. It's super useful when you're working with asynchronous code and want to ensure that a promise was resolved a certain number of times—like for instance, if you're testing that a certain API call was made repeatedly or that your music library only makes the necessary album fetch requests.

## When to Use it

You'd wanna pull this out:

1. When you've got async operations that return promises, and you wanna test how many times they've successfully resolved.
2. When you mock or stub out your functions, and you need to verify that they’ve been resolved the correct number of times during a test.

Let’s say you're writing a test for adding albums to your music library and you want to make sure that a fetchAlbums function is only trying to fetch the albums one time (and not, you know, accidentally slamming that poor API multiple times).

## Example Time

Imagine we’ve got a function `fetchAlbums` that fetches albums from an API (because duh, it’s a music library). We want to make sure that this function gets called and resolves once, not twice, not twenty.

```javascript
import { vi, describe, it, expect } from 'vitest';

// Our pretend fetchAlbums function
const fetchAlbums = vi.fn(() => Promise.resolve(['Dookie', 'American Idiot']));

describe('Music Library - fetchAlbums', () => {
	it('should only resolve fetchAlbums once when fetching albums', async () => {
		// Use the function in your test scenario
		await fetchAlbums();

		// Here we tell Vitest: "Yo, make sure this function resolved exactly ONCE."
		expect(fetchAlbums).toHaveResolvedTimes(1);
	});
});
```

In this example:

- We're using Vitest's `vi.fn()` to mock our `fetchAlbums` function, which returns a promise that resolves with a list of albums (`Dookie`, `American Idiot`—we're feeling that Green Day vibe today).
- After calling the function inside the test, `toHaveResolvedTimes(1)` checks that `fetchAlbums` resolved successfully once and only once. If it resolved zero times, or too many times (like any async funkiness), this test is going down.

You’d use this matcher when you care about the number of successful resolves and need to check for precision in async behavior.

Isn’t it sweet when your tests make sure async code behaves like you expect? Now get out there and control your promises!
