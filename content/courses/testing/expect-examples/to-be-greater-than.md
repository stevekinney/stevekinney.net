---
title: toBeGreaterThan in Vitest
description: Learn how to use toBeGreaterThan matcher in Vitest for number comparisons.
modified: 2024-09-28T12:52:02-06:00
---

So you've got `toBeGreaterThan`, and it's a matcher you're gonna love when you're working with numbers. You use it when you want to check that **a value is greater than some other value**. Pretty straightforward.

## When Would You Use This?

Imagine this: you're working on a music library app, right? Let's say we have a feature that tracks how often a song has been played. Now, maybe you want to write a test to make sure your code logic ensures the play count of a song **increases** after playback.

Sound familiar? Awesome. This is exactly when you’d bust out `toBeGreaterThan`—when you want to verify that the updated value is higher than its previous state (or another number).

## Example

Let's say we’re tracking the number of plays for Green Day’s *Basket Case* (because, why not?). You might have a function called `playSong` that increments the play count. We'll set up a test to check if the play count after calling `playSong()` is greater than the original play count.

```javascript
// playCount.js
export function playSong(song) {
	song.playCount += 1;
}
```

Now, we’re gonna test that play count with Vitest:

```javascript
import { playSong } from './playCount';

test('should increase the play count of the song', () => {
	const song = { title: 'Basket Case', artist: 'Green Day', playCount: 3 };

	playSong(song);

	expect(song.playCount).toBeGreaterThan(3);
});
```

## Breakdown

- **Before** calling `playSong()`, *Basket Case’s* play count is 3.
- After calling the function, we expect that `song.playCount` is now **greater than 3**.
- So we slap `expect(song.playCount).toBeGreaterThan(3)` at the end to make sure things are working as they should!

And that’s it! Simple but powerful. You’re making sure the numbers go in the right direction after your function does its thing.
