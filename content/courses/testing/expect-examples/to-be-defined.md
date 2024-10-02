---
title: toBeDefined in Vitest
description: A guide on usingtoBeDefined to verify defined values in Vitest.
modified: 2024-09-28T12:51:56-06:00
---

t

So you’re looking at `toBeDefined`. This one’s pretty straightforward but can come in clutch when you're trying to make sure that something exists, as in it’s not `undefined`. Picture this: You’ve got an object, a variable, or a function return value that *might* be set… and you want to verify it’s actually defined.

## What Does `toBeDefined` Do?

At its core, `toBeDefined` is checking that a variable or property doesn’t have the value of `undefined`. That’s it. If the thing has been defined with *anything* (even `null`), this test will pass.

## When Would I Use It?

You’d use `toBeDefined` when you’re expecting *anything*, as long as it isn’t `undefined`—which is often used as a signal that something went wrong or is missing. Let’s say you’re calling a function that adds a new artist to your music library, and you want to ensure that the resulting object includes the artist’s name and not some spooky `undefined` value!

## Example

Let’s pretend you’re working on a feature that allows users to add their favorite punk bands like Green Day to their music library. After adding the band, you want to make sure the `bandName` is actually defined (not `undefined`) in the returned object.

```javascript
import { describe, it, expect } from 'vitest';

function addArtist(artistName) {
	return {
		name: artistName,
	};
}

describe('addArtist', () => {
	it('should define the name of the artist', () => {
		const artist = addArtist('Green Day');
		expect(artist.name).toBeDefined();
	});
});
```

In this code, we define a super simple function called `addArtist`—it takes a band name and returns an object with that name. The test is making sure that when we add Green Day, the `name` property isn’t mysteriously `undefined`.

### When Things Can Go sideways…

Imagine you forgot to pass a value into `addArtist`, or there was a bug and the function wasn’t assigning the `artistName` properly. Your test would fail if `artist.name` were `undefined`, which is exactly what we’re checking for.

***

And that’s `toBeDefined` in a nutshell! You’d use it when you need to verify that something… well, exists—but you don’t care exactly what it is. Just something that isn't `undefined`.
