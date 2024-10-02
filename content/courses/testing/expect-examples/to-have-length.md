---
title: toHaveLength in Vitest
modified: 2024-09-28T12:53:41-06:00
---

So you're knee-deep in your test file, and you're dealing with arrays, strings—basically anything that has a `length` property. You just need to assert, “Yo, this thing has exactly 'x' items or characters in it.” That's where `toHaveLength` comes in.

## What Does it Do?

The `toHaveLength` matcher is used to check that an object, array, or string has a specific length. It’s great when you’re dealing with lists, collections, or any sequence-like thing, and you need to ensure it contains the expected number of elements, characters, or whatever.

## When Would I Use It?

- You’ve got an array of albums, and it better have *exactly* the number of albums you expect.
- You’re testing a string input, like the name of an artist, and you need to check it’s not too short (seriously, no artist name should have just one letter).
- You’ve got an object that has a length property—because, JavaScript, of course!

Basically, if you want to assert the count of *anything*, `toHaveLength` is your jam.

## Example

Let’s say we’ve got a simple music library structure like this.

```javascript
const artists = [
	{ name: 'Green Day', albums: ['Dookie', 'American Idiot'] },
	{ name: 'Nirvana', albums: ['Nevermind', 'In Utero'] },
];
```

Now, you want to make sure the number of albums for "Green Day" is exactly 2. We can test that:

```javascript
import { describe, expect, it } from 'vitest';

describe('Music Library', () => {
	it('checks that Green Day has exactly two albums', () => {
		const greenDay = artists.find((artist) => artist.name === 'Green Day');
		expect(greenDay.albums).toHaveLength(2);
	});
});
```

**What’s happening here?**

- We’re saying, *"Hey, those albums for Green Day? That should be exactly 2."*
  If the length is off, Vitest will call you out and tell you what you got wrong.

Pretty straightforward, right? You just watch for an array, string, or anything else that has a `length` and drop `toHaveLength` on it to make sure you're not surprised during runtime.

Now, go forth and count responsibly!
