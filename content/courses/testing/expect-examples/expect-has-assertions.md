---
title: expect.hasAssertions in Vitest
description: Ensures at least one expectation is made in a test block.
modified: 2024-09-28T12:51:19-06:00
---

Ok, here we go. So, `expect.hasAssertions()` is like the bouncer at the door, making sure some expectations are happening in your test. Basically, this function is used to verify that **at least one `expect` statement** exists inside your function or test block. You can think of it as a sanity check on your test that ensures you're actually, well, *testing* something.

## When Would You Use It?

You’d use `expect.hasAssertions()` when you want to make sure any assertions have been made. It's particularly handy in situations where you're dealing with asynchronous work — like when you're mocking API calls — and you’re not totally sure if the code inside your asynchronous block has run correctly. This little guy helps you catch scenarios where something went wrong but no expectations were actually made, so you’re left wondering what happened, staring at a passing test that really *should have failed*.

## A Practical Example

Let's say we're working with our somewhat imaginary but totally awesome music library that handles artists, albums, and songs. We slap on some Green Day tracks, and something async is happening (maybe fetching album details). We'd use `expect.hasAssertions()` to ensure that the assertions inside actually run, even with async code.

```javascript
import { fetchAlbumDetails } from './musicLibrary'; // Imagine this function fetches album details

test('fetch album details for Green Day', async () => {
	expect.hasAssertions(); // Make sure we have *some* assertions happening in this test

	const albumDetails = await fetchAlbumDetails('Dookie');

	expect(albumDetails.title).toBe('Dookie');
	expect(albumDetails.artist).toBe('Green Day');
});
```

In this case, `expect.hasAssertions()` ensures that **at least one assertion** is made in the test. If the async code didn't work as expected (maybe `fetchAlbumDetails` rejected or didn't resolve), and no assertions got hit, the test wouldn't just pass idly and make us all feel weird inside — it would fail.

So it’s your friendly, pre-emptive check. Not a wild hero moment feature, but the one who keeps you out of those “quiet failures” that are much harder to debug.
