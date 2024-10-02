---
title: toMatch in Vitest
description: Learn how to use the toMatch method in Vitest for string testing.
modified: 2024-09-28T12:54:10-06:00
---

Let's talk about `toMatch`. When you're working with strings in JavaScript, sometimes you want to say, "Hey, does **part** of this string match something I'm expecting?" That's where `toMatch` comes in.

Basically, you use `toMatch` when you’re testing if a string contains a substring or if it matches a regular expression. This is perfect if you don’t care about the entire string, just some part of it. Instead of trying to go full-on pattern detective yourself, you just let Vitest do the heavy lifting.

## When to Use It

You’d use `toMatch` when you’re looking for **specific text** or **patterns in a string**. This is super useful for things like:

- Making sure an error message contains a specific phrase.
- Verifying output that’s more free-form in structure and not an exact match.
- Testing if your queries or logs include certain keywords.

## Example Use in Action

Let’s say we’re building a music library app (hello Green Day fans!) and we have a function that returns details of an album in string format. Maybe we don’t care about the whole software-breaking level of matching exact punctuation, but we **do** care that it mentions the artist's name somewhere in there.

### Imagine We Have a Function like This

```js
function getAlbumSummary(album) {
	return `${album.title} by ${album.artist}`;
}
```

Now, let’s write a test that makes sure the summary mentions the artist **Green Day**:

```js
import { expect, test } from 'vitest';

test('returns summary that mentions the artist', () => {
	const album = { title: 'Dookie', artist: 'Green Day' };
	const summary = getAlbumSummary(album);

	expect(summary).toMatch('Green Day');
});
```

### What’s Happening Here?

Basically, we’re saying, "I don’t care too much about punctuation or the full content, I just need to make sure that the string produced by `getAlbumSummary` **contains** ‘Green Day’." The test passes as long as it finds that substring anywhere in the string.

You can also get a bit fancier with regular expressions if you need more specific patterns, like so:

```js
expect(summary).toMatch(/Green\s+Day/); // Matches 'Green Day' with possible space variations.
```

### Pro Tip 💡

If you're finding tons of unnecessary errors because you're strictly matching exact strings all the time—step back and think about `toMatch`. It gives you a nice, flexible way of saying, "Hey, I don’t need **everything** to be perfect, I just need this **part** to match."

And just like that, you'll be writing more flexible tests that'll cause you fewer headaches when things like spaces or punctuation decide to mess with you.
