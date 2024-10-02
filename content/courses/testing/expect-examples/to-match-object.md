---
title: toMatchObject in Vitest
description: Learn how to use toMatchObject for partial object matching in tests.
modified: 2024-09-28T12:54:21-06:00
---

So let's talk about **`toMatchObject`**. This little guy is super handy when you want to compare objects in your tests, but you don't necessarily care about *every single key* and *every single value* being a perfect match. Maybe some values in your object are irrelevant in this context, or you just want to test a few important properties—either way, `toMatchObject` has your back.

## When Do You Use It?

You'd use `toMatchObject` when you’re dealing with objects and you're like, “I don’t need to check if all the properties are there; I just want to ensure the ones I care about are correct.” For instance, say you’ve got a monster object with 20 properties, but in this specific test, you only care about, like, 3 of them matching. This is the guy you want.

It’s like saying, *"Hey, JavaScript, match this partial structure and we're good."*

## Gotchas?

Just remember—it’s not going to sweat the small stuff (additional properties) as long as the ones you provide match. But, yeah, if the properties you're testing for don’t match or just aren’t there, it's going to fail. No free lunch there.

## Show Me the Code!

Let’s pull this into a simpler example. Like, say you’ve got a music library, and you’ve got a function returning an album object from your Green Day discography:

```js
const getAlbum = () => ({
	artist: 'Green Day',
	title: 'Dookie',
	year: 1994,
	genre: 'Punk Rock',
	label: 'Reprise',
});
```

Now, let’s say in your test, you don't care about all that extra noise like the label, the genre, or even the year—you're just focused on the artist and the album title. Enter `toMatchObject`:

```js
import { describe, it, expect } from 'vitest';

describe('Green Day albums', () => {
	it('should return the correct album with expected artist and title', () => {
		const album = getAlbum();

		expect(album).toMatchObject({
			artist: 'Green Day',
			title: 'Dookie',
		});
	});
});
```

Here, we’re saying, "Look, `toMatchObject`, I don’t care about all the properties in that `album` object. Just check if `artist` and `title` are right. Cool?" And, yeah, if anything's off with *those specific properties*, Vitest is going to give you the ol' red X.

## Wrapping It All Up

So, in short, use `toMatchObject` when you’re dealing with objects and don’t need to validate them from top to bottom. It’s perfect for scenarios where you're testing only the relevant bits and don't want a bunch of irrelevant properties messing up your day.
