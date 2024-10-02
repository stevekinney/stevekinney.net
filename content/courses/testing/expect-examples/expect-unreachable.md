---
title: expect.unreachable in Vitest
description: Learn how to use expect.unreachable for unreachable code paths.
modified: 2024-09-28T12:51:30-06:00
---

Let's be honest. Sometimes code gets a little… weird. You’ve got code paths that **should absolutely never, ever, under any circumstances run**, right? Good news: `expect.unreachable` is your buddy for those cases.

You throw it in when you're like, "Yo, if we hit this line of code, something went seriously wrong." It’s kind of like raising your hand in the middle of debugging and saying, *"This shouldn't have happened."*

Vitest provides `expect.unreachable` for those moments when you want to explicitly say, "This bit of code should not be reachable in any scenario—if it’s executed, our assumptions are seriously messed up."

## When Do I Use It?

You’d use `expect.unreachable` for scenarios like:

- You're mocking stuff, and you’re making absolutely sure that a certain function doesn't get called.
- Maybe you’ve got a switch statement or some if-else logic, and there’s that one fallback case that **should not** get hit. You want to be alerted if it does.

Basically, you use it when you know this line is an error by definition—like it should raise the testing alarm bells if it ever runs.

## Example

Let's say we're working on our beloved music library app, and we’re returning some data about a song. Now, imagine for some reason we have a format check—you know, for those ancient .midi files no one wants—but it should never happen because we don’t support it.

```js
function getSongFormat(song) {
	switch (song.format) {
		case 'mp3':
			return 'MP3 Format';
		case 'flac':
			return 'FLAC Format';
		default:
			// We should NEVER hit this unless a new unsupported format was accidentally passed
			expect.unreachable();
	}
}
```

In this example, if for some reason we pass an unsupported format like `'midi'` to `getSongFormat`, Vitest will throw an error and say, “Dude, you reached code that you shouldn’t have reached.”

### A Simple Test Example

```js
import { expect, test } from 'vitest';

test('getSongFormat should not fall into unsupported formats', () => {
	const song = { title: 'Basket Case', format: 'midi' };

	// We're testing intentional failure here
	expect(() => getSongFormat(song)).toThrow('Unreachable');
});
```

When you run this test, it’ll throw an error because `expect.unreachable` is triggered as soon as we step into that unsupported format.

## Wrap-up

So to recap, `expect.unreachable` is for those "oh heck no" situations where something **shouldn't** be happening, but you want to throw an error just in case it does. It’s a safeguard to ensure you don’t silently hit unexpected behavior in your app. Use it to make your intentions really, really clear and keep those code paths on the straight and narrow.
