---
title: expect.arrayContaining in Vitest
description: Learn how to use expect.arrayContaining to test array subsets.
modified: 2024-09-28T12:51:04-06:00
---

Let’s talk about **`expect.arrayContaining`**—one of those methods that sounds like it’s just begging for a real-world example. And I’ve got just the thing for you!

## What Does it Do?

At a high level, **`expect.arrayContaining`** is used in your tests when you want to make sure that an array includes certain elements without necessarily matching the whole array.

You don’t care about the entire contents of the array? You just want to make sure that it contains some specific elements? Perfect! **`arrayContaining`** is exactly what you’re looking for.

## When Would You Use It?

Good question! You’d use this when you’re running a test and you want to verify that a subset of an array is present—say you don’t care if the array has additional elements, or even what order the elements are in. What you *do* care about is that certain key items are hanging out in there somewhere!

Let’s say we’re testing a music library API, and you’re checking if your favorite band **Green Day** has certain albums in their discography. You don’t care if the library has a bunch of other Green Day albums you’re not interested in right now (because let’s be real, they have a ton). You just want to see if *“Dookie”* and *“American Idiot”* are in the lineup. **`arrayContaining`** solves that.

## Example

Let’s say we’ve got a simple function that returns a band’s albums from our *completely fictional* music library API:

```js
function getAlbumsByArtist(artist) {
	return ['Dookie', 'American Idiot', 'Revolution Radio', 'Father of All...'];
}
```

Now, let’s add a Vitest test to make sure that *“Dookie”* and *“American Idiot”* are coming through the list. We don’t care about every album being returned because today we're feeling nostalgic for '90s Green Day.

```js
import { expect, test } from 'vitest';

test('Green Day albums include Dookie and American Idiot', () => {
	const albums = getAlbumsByArtist('Green Day');

	expect(albums).toEqual(expect.arrayContaining(['Dookie', 'American Idiot']));
});
```

## Breakdown

- **`expect(albums)`**: We’re making an assertion about the array of albums that gets returned.
- **`expect.arrayContaining([ "Dookie", "American Idiot" ])`**: Here, we say that the `albums` array should contain at least these two albums. It can contain more (and probably will), and the order doesn’t matter either.

## When Should You Reach for This?

You’ll reach for **`arrayContaining`** whenever you’ve got an array of things and your test only cares about making sure specific items are included. It’s especially handy in situations where you expect there to be more data returned than what you’re verifying.

There you go! Now when life gives you giant arrays of data, just remember: you don’t always have to test the whole array if you don’t want to.
