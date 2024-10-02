---
title: toHaveBeenCalled in Vitest
description: "Learn how Vitest's toHaveBeenCalled can test function calls."
modified: 2024-09-28T12:53:15-06:00
---

Ah, `toHaveBeenCalled`. This is one of those simple but oh-so-satisfying matchers that reminds you *why* you're testing in the first place: to find out if stuff actually happens the way it's supposed to.

So, what does `toHaveBeenCalled` do? It checks if a **mocked** function (like one you might mock during a test) was called at least once. It's like saying, "Hey, did this function even get invoked?" Pretty useful, right?

## When Would You Use It?

You'd typically use `toHaveBeenCalled` when you want to confirm that some function—a callback, an API call, a band manager adding yet another reunion tour—actually ran during your test.

Let’s say you have an app that plays songs when you click a "play" button (because, you know, people gotta jam to *Basket Case*). You want to make sure that when your user clicks "play," your `playSong()` function got called. That’s a perfect job for `toHaveBeenCalled`.

## Example Time!

Let’s do a little mock function magic with a simple example in our Vitest-powered music library:

### The Code We Want to Test

Imagine you’ve got a function that plays a song by calling your `playSong()` function:

```javascript
function handlePlayButtonClick(playSong) {
	playSong();
}
```

Nothing too fancy here. This function is just a thin wrapper around `playSong()`—because let’s be real, sometimes your click handlers don’t have much to them. The important thing here is that when the user clicks the play button, `playSong()` had better be running. Otherwise, your users won’t hear the sweet melodies of Green Day, and that’s a problem.

### The Test

Now, we’re going to write a test to check that `playSong()` actually gets called when you click the button.

```javascript
import { describe, it, expect, vi } from 'vitest';
import { handlePlayButtonClick } from './musicPlayer'; // This is where our function lives

describe('handlePlayButtonClick', () => {
	it('calls playSong when the play button is clicked', () => {
		const mockPlaySong = vi.fn(); // Create a mock function

		handlePlayButtonClick(mockPlaySong);

		expect(mockPlaySong).toHaveBeenCalled(); // Check if it was called at least once
	});
});
```

### What’s Happening Here?

1. **`vi.fn()`**: This creates a mock function that we can spy on. Instead of calling a real `playSong()` function (which might actually start playing music—fun for the first test, annoying by the hundredth), we substitute it with a mock.
2. **`handlePlayButtonClick(mockPlaySong)`**: This simulates the play button being clicked. It’ll try to call that `playSong` function—which we’ve substituted with our mock.
3. **`expect(mockPlaySong).toHaveBeenCalled()`**: Here’s the star of the show! We’re making sure that `playSong()` got called during the action we’re testing. If it didn’t, the test fails, and we know something went wrong.

### Quick Recap

- **What does it do?** Checks if a mocked function was called at least once.
- **When should you use it?** When you need to verify that a specific function was actually called in the course of running your code.
- **Why’s it handy?** Because *what's more frustrating than a function living its best life in production, only to realize later it wasn't even called during execution?*

With Vitest’s `toHaveBeenCalled`, you can rest easy knowing that, yes, your mocked functions are getting invoked exactly as you expect… unless they aren’t, in which case, you’ve now got some debugging to do. 😅
