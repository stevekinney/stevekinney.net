---
title: toBeNan in Vitest
description: Learn about thetoBeNaN matcher to handle NaN values in Vitest.
modified: 2024-09-28T12:52:19-06:00
---

Let's talk about **`toBeNaN`**, one of those handy matchers you can use when dealing with numbers that just *decide* not to be numbers. If you're working with JavaScript for longer than, I don’t know, 5 minutes, you’ve probably seen *NaN* pop up when a calculation goes sideways. Stuff like dividing by zero or performing arithmetic with something that isn’t a number. Good times, right?

## What Does `toBeNaN` Do?

In Vitest, `toBeNaN` is a matcher that checks whether a value is **precisely** `NaN`. So yeah, we're not just checking whether the value is *not a number*, but that it's actually the special, official `NaN` type in JavaScript—because JavaScript is, y'know… JavaScript. ⚙️

## When Would You Use It?

You use `toBeNaN` when testing a function that might return `NaN` under certain conditions and you want to verify that outcome. Maybe you're building some kind of math utility (or trying to fix *someone else's* broken one), and it's expected to throw back `NaN` when given goofy input.

## Example Time: Green Day’s Dumb Calculator 🎤

Say you’re working on a simple music library app, but for whatever reason, the backend team asked for a calculator to be integrated in your Green Day catalog. I dunno, it's a weird request, but let’s roll with it.

Here’s a function that divides the number of albums by the number of songs. Don't ask why, just go with the flow:

```javascript
function calculateAlbumsPerSong(albums, songs) {
	return albums / songs;
}
```

Now, let’s say that for some reason, if `songs` is 0 (which should *never* happen, but just in case), we expect this function to return `NaN`. Why? Because dividing by zero in JS causes —you guessed it— *NaN* to rear its mysterious head.

Let’s write a test for that:

```javascript
import { expect, test } from 'vitest';
import { calculateAlbumsPerSong } from './calculateAlbumsPerSong';

test('returns NaN when songs is 0', () => {
	const albums = 10;
	const songs = 0;

	const result = calculateAlbumsPerSong(albums, songs);

	expect(result).toBeNaN();
});
```

Here, we check to ensure that when there are zero songs (`songs = 0`), the division results in `NaN`—and the `toBeNaN` matcher steps in like the hero it is, verifying that for us.

## Why Not Use `toBe`?

Great question! You might think you could compare `result` to `NaN` directly, like `expect(result).toBe(NaN);`, but here’s where JavaScript decides to be… *special*. `NaN` doesn’t equal `NaN`, because… reasons (that's a rabbit hole for another day).

So instead, `toBeNaN` opens the backdoor, checks with JavaScript, and says: *“Yes, this is actually NaN, weird as that may seem.”*

***

And there you go! `toBeNaN` makes sure that you’re not just catching *any* kind of “non-number-y” nonsense, but specifically that you’re catching JavaScript’s infamous `NaN`.
