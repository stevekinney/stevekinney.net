---
title: poll in Vitest
description: "Learn how Vitest'spoll method handles asynchronous conditions."
modified: 2024-09-28T12:51:37-06:00
---

Let's talk about the `poll` method available in Vitest's `expect`. This one is pretty cool but not necessarily the first thing you might think of when writing tests. It’s more like a rescue tool for those annoying async conditions that aren’t immediate but you still want to wait for them to eventually happen before calling something a failure. Think of it as: Vitest gives you a way to check something *eventually* becomes true.

## What Does it Do?

The `poll` method will repeatedly run your expectation over a period until it passes or a timeout is hit. The idea is that you're testing something where the timing might be unpredictable — like maybe you're waiting for an API response to trigger some UI change, but it doesn’t happen immediately after the first request. If you’ve ever written a test where something intermittently works because the thing you want to verify doesn’t pass right away… This is for you.

## When Would I Use It?

As a practical example, let’s say you've got a music library application where after adding a song to a playlist, the UI should update, but that update is triggered by something happening asynchronously—a slow `setTimeout`, a WebSocket event, or just lag in your JavaScript-engine-wrapped-around-rice-noodles. In these cases, your app might behave like you expect after a moment, but not immediately. Instead of throwing tons of `setTimeout`s or retries all over your tests manually, `poll` is like, “I got you.”

## Example

Consider our music library with a list of songs for the artist Green Day. You want to verify that after clicking an "Add to Favorites" button, the song *eventually* appears in the "Favorites" list. Maybe your app has some delayed confirmation or a debounce function that makes things tricky.

```javascript
import { expect } from 'vitest';

test('add song to favorites eventually', async () => {
	const greenDaySong = { title: 'Basket Case', artist: 'Green Day' };

	// Simulate adding a song
	await addToFavorites(greenDaySong);

	// Wait for the UI to eventually show this song in 'Favorites'
	await expect(fetchFavoriteSongs()).poll(
		async (favorites) => {
			// Check the song exists in the array
			return favorites.some((song) => song.title === greenDaySong.title);
		},
		{ interval: 100, timeout: 2000 },
	); // Retry every 100ms, for up to 2 seconds
});
```

### Breakdown

- `addToFavorites` does something async in the app—either updates state, calls an API, etc.
- The `fetchFavoriteSongs` function gets the current list of favorites, but the list might not update immediately after adding the song (maybe it's debounced or the API is slow).
- We call `poll`, which repeatedly checks the condition (in this case, whether the added song appears in the list) every 100ms, for up to 2 seconds.

You'll use `poll` when you need to “wait” for something expected to happen, but its timing can be a bit… inconsistent. I like to think of `poll` as the tool that makes you *less* stressed about weird timing issues.

In summary: “Relax, it’ll get there.”
