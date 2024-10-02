---
title: not in Vitest
description: Learn how to use thenot modifier in Vitest for negative testing.
modified: 2024-09-28T12:51:33-06:00
---

So you’re cooking along, writing some sweet tests. Everything’s passing… and then it hits you. You *don't* just need to check if something is true. Nope. You need to be *sure* that something is **not** true.

Enter: `not`. This little helper lets you flip the script on your expectations. Instead of checking if something is what you expect, you can ask, "Yo, is this **NOT** that?"

## What It Does

In Vitest, `expect` is like your trusty magnifying glass—you use it to check if things line up with what you think they should be. But sometimes, you need the *opposite*. That’s where `.not` comes in. It’s essentially a way of saying, "Check that this isn’t true." So, if something is equal, `.not` makes sure it is *NOT* equal. It's that simple.

## When You’d Use It

You’d pull out `.not` when you need to confirm something should **not** happen or shouldn’t take a certain form. For example, say you’re testing your music library app, which has a bunch of albums. One album might be from Green Day, and you want to test that a new album isn't the same as a previous one. `.not` to the rescue!

It’s super handy when you want to make sure an array doesn’t contain certain values, an object property is missing, or even when you want to ensure some fancy DOM selection stuff isn’t working as expected.

## Example

Let’s say we’re building that music library, and we’re validating that an Artist should not have two albums with the *same* title. You're gonna want to write a test something like this:

```javascript
import { describe, expect, it } from 'vitest';

describe('Album Titles', () => {
	it('should not allow duplicate album titles', () => {
		const artist = {
			name: 'Green Day',
			albums: ['Dookie', 'American Idiot'],
		};

		const newAlbum = 'Dookie';

		// Now, let’s make sure there's no duplicate title action going on here
		expect(artist.albums).not.toContain(newAlbum);
	});
});
```

### Breakdown

- `expect(artist.albums)` is saying, "Hey, check out this array of albums."
- `.not.toContain()` is then ensuring `Dookie` isn’t being added *again*.

So, when you use `.not`, you're essentially like, "I know Green Day made a *ton* of albums, but we can’t have two `Dookie`s, okay?"

### Pro Tip

Whenever you feel like you want to assert that something *shouldn’t* be true, `.not` is going to be your best friend. Use it to keep things in line when you're writing tests that need a bit of negative enforcement.
