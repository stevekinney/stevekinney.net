---
title: toThrowError in Vitest
description: Learn how to use thetoThrowError assertion in Vitest.
modified: 2024-09-28T12:55:05-06:00
---

Ahh, **`toThrowError`**, the superhero assertion when you're dealing with functions that are a little… temperamental. You know those functions I’m talking about: the ones that don’t just return nice and friendly values, but *explode*, throwing errors in your face when things go wrong. Sometimes, they throw an error *on purpose*. And you kinda want to make sure they do that, y'know, for science… or sanity. That’s where **`toThrowError`** comes in.

## What it Does

The **`toThrowError`** method in Vitest verifies that a particular function throws an error when invoked. Simple as that. It's perfect when you need to check if a function behaves *appropriately* under bad circumstances—maybe invalid input or whatever bad data users shove into it at 2:00 AM after your app's shipped.

## When to Use It

You'd use `toThrowError` when you're writing tests for a function that *should* choke (uhh, gracefully, of course) on specific conditions, and you want to confirm it's doing just that. For example, if a function, say, needs to throw an error whenever an invalid argument is passed, or if it encounters a situation it wasn't designed to handle—then you'll want to ensure that happens in your test.

## Example

OK, let’s say we’ve got our *naïve music library app* that we'll nurture into a fully-featured behemoth. Part of your app needs to look up an artist by name. But what happens if the user passes an empty string or some nonsense in there?

```javascript
// musicLibrary.js
export function findArtistByName(artistName) {
	if (!artistName) {
		throw new Error('Artist name is required');
	}
	// logic to find artist...
	return { name: artistName, albums: [] };
}
```

What we’re doing here is making sure that if the `artistName` is falsy (i.e., no name provided), we throw an error. Great. Now, let’s assert that this is actually happening because, y'know, we don’t exactly trust ourselves yet.

```javascript
// musicLibrary.test.js
import { findArtistByName } from './musicLibrary';

describe('musicLibrary', () => {
	it('throws an error if artist name is missing', () => {
		expect(() => findArtistByName('')).toThrowError('Artist name is required');
	});
});
```

Look closely at the syntax. Compared to how we'd normally call a function like `findArtistByName('')`, in our test, we instead **wrap it in an anonymous function**: `() => findArtistByName('')`. That way, we're telling Vitest, "Hey, this function *throws* and we want you to catch that and confirm the error was thrown."

### Bonus: Testing Generic Errors

You don’t **need** to match the full error message, either. You can keep it simple and check that *any* error is thrown:

```javascript
expect(() => findArtistByName('')).toThrowError();
```

That’ll check that an error (any error) was thrown, but sometimes you'll want to be specific. Up to you!

## When You’ll Love This

You’ll love using `toThrowError` when you need bulletproof confidence that your code is throwing the right error at just the right time: making those edge cases you often forget about robustly tested. 💥 It's especially useful when your API responds with errors or when invalid operations trigger them.

Just watch out—you *do* need an excuse for throwing errors; don’t go throwing them around willy-nilly because you’ve got `toThrowError` at your side.
