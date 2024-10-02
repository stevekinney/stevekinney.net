---
title: expect.assertions in Vitest
description: Learn how to use expect.assertions for async code testing in Vitest.
modified: 2024-09-28T12:51:09-06:00
---

Ah, `expect.assertions`—a handy little tool that can save you from pulling your hair out when your test decides to skip an assertion like, "Peace out—I’m not running today." So what does this do exactly?

`expect.assertions(number)` tells Vitest, "**Yo, Vitest!** I expect exactly `number` assertions to be called during this test." It comes in super useful when you’re dealing with asynchronous code—especially when you want to double-check that **all** your assertions actually ran.

Without this, you might write a test that *looks* like it works but sneaks out the back door before the important stuff actually happens. Cue weeks of confusion as you try to figure out why something wasn’t properly tested 😡.

## When Would You Use It?

Good question. The most common scenario where `expect.assertions` becomes your BFF is when you’re testing **async code** like promises, API calls, or pretty much anything where the test has to wait for something to happen. If your test finishes before those assertions run (uh-oh), Vitest will happily tell you, "Yup, I’m all done," without realizing that your assertions weren't called.

In those "fun" moments, `expect.assertions` steps in to make sure all expected assertions are eventually reached, safeguarding you from code quietly ignoring your tests.

## Example Time: Async Testing With `expect.assertions`

Let’s say we’ve got a music library app (how convenient!) and we’re testing a function that fetches an album’s details:

Here’s our function `getAlbum`:

```js
async function getAlbum(albumId) {
	if (!albumId) {
		throw new Error('Album ID is required');
	}

	// Simulate an async request to get album details
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({
				artist: 'Green Day',
				album: 'Dookie',
				year: 1994,
			});
		}, 100);
	});
}
```

Now, we want to write a test to make sure this function behaves when:

1. It throws an error if no `albumId` is provided.
2. It resolves with album details when the `albumId` is valid.

```js
import { expect, test } from 'vitest';
import { getAlbum } from './musicLibrary';

test('getAlbum throws an error with no albumId', async () => {
	expect.assertions(1);

	try {
		await getAlbum();
	} catch (e) {
		expect(e.message).toBe('Album ID is required');
	}
});

test('getAlbum returns correct album details', async () => {
	expect.assertions(1);

	const details = await getAlbum(1);

	expect(details).toEqual({
		artist: 'Green Day',
		album: 'Dookie',
		year: 1994,
	});
});
```

### Breakdown

In both tests, `expect.assertions(1)` is basically saying, "Hey! I fully expect one assertion to be called in this test—nothing more, nothing less." This way, if something goes sideways (like your try-catch not catching an error, or your async function completing before the assertion), Vitest throws a red flag, and you avoid those mysterious silent failures.

And that’s it! You’ve now got a handy tool in your testing toolbox to make sure your **assertions don't ghost you mid-test**. 😉

***

Honestly, if you’ve ever lost precious debugging time only to realize your test wasn’t making it to that crucial `expect` statement, this method will feel like a mini superhero strapped right into your test suite.
