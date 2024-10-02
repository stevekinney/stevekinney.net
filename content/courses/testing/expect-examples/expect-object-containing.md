---
title: expect.objectContaining in Vitest
description: Learn how to use expect.objectContaining in Vitest testing.
modified: 2024-09-28T12:51:21-06:00
---

Let’s break down `expect.objectContaining`. This is one of those matchers that’s like your friend who always shows up *just enough* to help you out—but not too much to overwhelm you. You’ll use this when you’re testing an object but you don’t really care about *all* the properties it has, just a few key ones.

In practice, it’s super useful when you want to ensure that an object has a certain set of properties and values **but you don’t necessarily want to enforce the complete structure** of the object. Your test would pass if the object contains *just* those expected properties, even if it has a bunch of extra ones hanging around.

## When Would You Use It?

Imagine you're dealing with some sort of API response—maybe you requested your album info from the music library. The response has a lot of stuff: `id`, `createdAt`, `updatedAt`, maybe a bunch of other metadata you don't care about in your test. But you do care about, say, the artist and album name, because you’re more concerned with whether those hook up right.

Let’s say, for example, you're testing out a function that fetches album details, and the returned object is supposed to have `artist` and `title` in the properties. The object might actually have a bunch of other stuff—created timestamps or whatever—but you don’t want to write your test to care about *all* that. This is where `expect.objectContaining` comes in.

## Example of Using `expect.objectContaining`

Let’s say we have this function, `getAlbum()`, that gives us details about an album:

```js
const getAlbum = () => {
	return {
		artist: 'Green Day',
		title: 'Dookie',
		releaseYear: 1994,
		tracks: 14, // irrelevant to test, but still here
		id: 'unique-id-12345',
		metadata: { archived: false }, // also irrelevant
	};
};
```

We only care that this object contains the artist and album title in our test.

Here’s how we’d write a test using `expect.objectContaining`:

```js
import { describe, it, expect } from 'vitest';
import { getAlbum } from './musicLibrary';

describe('getAlbum', () => {
	it('should return an album with the correct artist and title', () => {
		const album = getAlbum();

		expect(album).toEqual(
			expect.objectContaining({
				artist: 'Green Day',
				title: 'Dookie',
			}),
		);
	});
});
```

**Boom!** The test is passing as long as our `album` object contains those two key pieces we care about—`artist` and `title`. It can have any other stuff in there, and Vitest won’t mind, because you’re *only holding it accountable for the things that truly matter* in your assertion.

So leave the other details (like that random `id` and `metadata`) aside unless you explicitly care about them. Keep your tests as focused and to the point as possible—that’s the magic of `expect.objectContaining`.

## Recap

Use `expect.objectContaining` when you are testing an object but only want to check that it has some specific properties. This is especially useful when your objects are big or have lots of irrelevant fields that you don't want to lock down in your unit test.
