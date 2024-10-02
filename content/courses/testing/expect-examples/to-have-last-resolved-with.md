---
title: toHaveLastResolvedWith in Vitest
description: Ensure the last resolved value of a mock matches the expected result.
modified: 2024-09-28T12:53:35-06:00
---

So let's talk about **`toHaveLastResolvedWith`**. It's kind of like that one band member who always hits the perfect note right at the end—this matcher is all about making sure the last resolved value of a mocked promise was exactly what you were expecting.

## What it Does

It asserts that the **last resolved value** of a mock (usually something like a `Promise`) matches the provided value. When you’re dealing with async behavior, especially **mocks** or functions returning promises, this matcher allows you to focus on checking the final resolved value of a mock function that might have been called multiple times.

## When to Use It

You’d use **`toHaveLastResolvedWith`** when you want to verify that **the most recent** (a.k.a. **the last**) time your mocked function resolved, it returned the expected value. If your mock resolves multiple times (which happens more often than we’d like to admit in the wild), you don’t want to check the earlier calls—you only care about the final result.

## Example

Let’s say we’re building a **Music Library** app where we have a function called `fetchArtistAlbums` that fetches the albums of an artist from the backend. Maybe we’re testing that the last call to this function resolved to the most recent batch of albums.

```js
import { test, vi, expect } from 'vitest';

// Our pretend function that we're testing
function fetchArtistAlbums(artistId) {
	// Imagine this does something useful like contacting an API.
	// For now, we're just mocking it.
	return new Promise((resolve) => {
		setTimeout(() => resolve(`Albums for artist ${artistId}`), 100);
	});
}

test('fetchArtistAlbums resolves correctly on the last call', async () => {
	const fetchAlbumsMock = vi.fn(fetchArtistAlbums);

	// Simulate earlier API requests resolving
	await fetchAlbumsMock(1); // Resolves: "Albums for artist 1"
	await fetchAlbumsMock(2); // Resolves: "Albums for artist 2"

	// Simulate the latest API request (Green Day's artist ID, let’s pretend)
	await fetchAlbumsMock(42); // Resolves: "Albums for artist 42"

	expect(fetchAlbumsMock).toHaveLastResolvedWith('Albums for artist 42');
});
```

## TL;DR

If you're dealing with a function that resolves multiple promises, and you need to ensure **the last one** resolved with the correct data, `toHaveLastResolvedWith` is your pal!
