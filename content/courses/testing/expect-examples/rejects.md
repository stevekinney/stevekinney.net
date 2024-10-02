---
title: rejects in Vitest
description: Testing promises that are expected to fail using expect.rejects.
modified: 2024-09-28T12:51:40-06:00
tags: [999]
---

So the `rejects` method is your go-to tool when you're dealing with promises that are expected to fail—you know, your classic async "everything's fine… just kidding" situation.

Think about it: sometimes you write functions that return promises, and the thing you explicitly want to test is the behavior when things go wrong. Like, maybe a file doesn't exist, or an API throws a 404, or you requested **The Battle of Los Angeles**, but the system finds some derivative fake album or something. Whatever the case, stuff happens, and you want to make sure your code handles it properly.

`expect.rejects` allows you to say: "Yo, this promise *better* throw an error, or else something isn't quite right."

## When You'd Use It

Use `expect.rejects` when you want to confirm that a promise will reject—basically when failure is part of the plan (looking at you, unreliable third-party APIs—we see you). It's perfect for making sure your error handling works, or that invalid inputs properly tank the operation instead of returning some awkward undefined result.

## Example

Let’s say we’ve got a function `findAlbumById` that searches for albums in our music library (where, for the sake of our example, if the album doesn’t exist, it rejects the promise).

```javascript
function findAlbumById(id) {
	const albums = {
		1: { id: 1, title: 'Dookie', artist: 'Green Day' },
		2: { id: 2, title: 'American Idiot', artist: 'Green Day' },
	};

	return new Promise((resolve, reject) => {
		const album = albums[id];
		if (album) {
			resolve(album);
		} else {
			reject(new Error('Album not found'));
		}
	});
}
```

Now, let’s write a test to **mirror your disappointment** when the album isn’t found, using `rejects`:

```javascript
import { expect, test } from 'vitest';

test('findAlbumById rejects when the album is not found', async () => {
	await expect(findAlbumById('999')).rejects.toThrow('Album not found');
});
```

## Breakdown

- We call `findAlbumById` with `'999'`, which isn't in the list of albums (sorry, folks, no secret Green Day album #999 here).
- We use `expect.rejects.toThrow()` to check that the promise rejects with the exact error message *“Album not found”*.

Boom. Now you're confident that your function will break properly when the search fails—and this time, it's *supposed* to fail.

Fun fact: Vitest handles promises *so* smoothly here that you can use `await` on the `expect` statement itself, which is kind of magical if you've been testing JavaScript for a few years…
