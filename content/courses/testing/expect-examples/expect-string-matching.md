---
title: expect.stringMatching in Vitest
description: Learn how to useexpect.stringMatching for pattern matching in tests.
modified: 2024-09-28T12:51:28-06:00
---

Let's talk about **`expect.stringMatching`**. This method is handy when you’re writing tests and you don’t care about the *exact* string as long as it matches a particular pattern. Think about it like this: You’re not policing the string for the *exact words*, you just want to make sure it’s at least *heading in the right direction*.

## What Does it Do?

`expect.stringMatching` is used to check if a string matches a regular expression pattern. It’s like saying, “Okay, I don’t need the *exact* phrase, but this string better look like it fits this pattern.” This is awesome when you want a test case that’s flexible enough to handle variations, but still make sure the string is valid in some way.

For example, maybe you want to ensure that an album title contains the word *"Day"* from **Green Day's** discography (I can’t not bring Green Day into this). You might have dynamic data where the exact string isn't always predictable—but you still want it to pass the test.

## When Would I Use It?

- **When the exact string** doesn’t matter as much as **matching a pattern** (e.g., checking for a specific word in a longer text).
- **When the output might change slightly** but must follow a specific format—like tracking IDs, dates, or stuff with prefixes or numbers.
- **In situations where you expect some dynamic text**, but it still needs to adhere to a pattern. For example, matching log entries, file names, or even search results.

## Example: Checking if an Album Title Matches a Pattern

Let’s say you’re writing a music library app, and one part of your app generates album titles. You don’t care specifically which album title it gives you, but you just want to make sure it’s a Green Day album, and it contains the word "Day" in some form. By now, you’ve probably memorized every Green Day album, but your app might not have.

Here’s how you’d roll with it:

```js
import { describe, expect, it } from 'vitest';

describe('Album title generator', () => {
	it('generates an album title containing the word "Day"', () => {
		const generateAlbumTitle = () => 'Dookie Day Tour 2023'; // Okay, maybe this doesn't live up to "Dookie"

		expect(generateAlbumTitle()).toEqual(expect.stringMatching(/Day/));
	});
});
```

### What's Going On?

- The function `generateAlbumTitle` creates a string of the album title dynamically. Again, we don’t care if it’s *exactly* `"Dookie Day Tour 2023"` or something else. We just want to make sure `"Day"` is in there somewhere.
- The `expect.stringMatching(/Day/)` matcher here is wrapped in `expect.toEqual()`, and all it does is check that `"Day"` is in the returned string thanks to that regular expression `/Day/`.

### TL;DR (because Real Life is hectic)

- Use it when you need to check for **patterns in strings**.
- Useful when you don’t care about exact text but just want to make sure things are on the right track.

Got it? Now go match those strings like a pro. 👊
