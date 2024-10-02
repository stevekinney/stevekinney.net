---
title: toMatchInlineSnapshot in Vitest
description: Learn how to usetoMatchInlineSnapshot in Vitest for testing.
modified: 2024-09-28T12:54:17-06:00
---

So **`toMatchInlineSnapshot`** — this is one of those sneaky little helpers that most people don’t even realize they need until they use it, and then BAM, they can’t live without it. But let’s unpack it a little.

## What Does it Do?

At a high level, **`toMatchInlineSnapshot`** compares the received value (whatever value your test produces) against a snapshot that’s stored *right in your test file*. That’s the "inline" part. It's like you take a picture of the current output and say, "This is what I expect this value to be in the future." You store that picture, or the *snapshot*, directly in the test. Later, when you run the test again, it compares the current value to that snapshot you saved and makes sure they match, so it catches unintentional changes to your output.

## When Would You Use It?

This comes in handy when you have somewhat complex output that you don’t want to manually assert piece by piece. You just let Vitest handle capturing the expected output automatically, and when things change, it’ll tell you. You can also update the snapshot easily if that change is intentional.

So imagine in our little music library—you're working on a function that formats an artist object, including their album list, song titles, etc. That returned object might get a little bloated, and testing every key manually can get out of hand.

Also, if something *does* change in the snapshot, you can quickly see if it's a desired change or if you've broken something without even touching the test.

## Example Time 🎸

Let’s say we have a function called `getArtistInfo` that returns a Green Day artist profile along with their albums and songs. Here’s how you could set up an inline snapshot:

```javascript
import { describe, expect, it } from 'vitest';

function getArtistInfo(artistId) {
	// Just a mockup of what the function might do
	return {
		id: artistId,
		name: 'Green Day',
		albums: [
			{
				title: 'Dookie',
				songs: ['Basket Case', 'When I Come Around'],
			},
			{
				title: 'American Idiot',
				songs: ['American Idiot', 'Boulevard of Broken Dreams'],
			},
		],
	};
}

describe('getArtistInfo', () => {
	it('returns the correct artist info', () => {
		const artistId = 1;
		const info = getArtistInfo(artistId);

		// Here's where we use toMatchInlineSnapshot
		expect(info).toMatchInlineSnapshot(`
      {
        "id": 1,
        "name": "Green Day",
        "albums": [
          {
            "title": "Dookie",
            "songs": [
              "Basket Case",
              "When I Come Around"
            ]
          },
          {
            "title": "American Idiot",
            "songs": [
              "American Idiot",
              "Boulevard of Broken Dreams"
            ]
          }
        ]
      }
    `);
	});
});
```

## What's Happening Here?

- The call to `toMatchInlineSnapshot()` compares the `info` object's structure and values to the snapshot captured in the test (living between the backticks).
- If `getArtistInfo` returns the right thing (i.e., Green Day's profile matches what we expected), the test passes.
- Now, here’s where the magic happens: if you execute this test the first time and you don't have a snapshot yet, Vitest will generate it for you! Don’t worry, pal—it’s got your back.
- But if someone messes with `getArtistInfo` and suddenly Billie Joe Armstrong is credited with an album he never wrote, the test will fail, letting us know something’s off.

## TL;DR

- Use **`toMatchInlineSnapshot`** when it's too much work to write out every single expectation by hand.
- It’s great for scenarios where output is pretty complex and lengthy—it's like tracking changes but in an easier-to-maintain format right in your test file.
- You can update snapshots with a single command if changes are expected so you’re not stuck constantly debugging.

There you have it. Simple, powerful, and it saves you from writing 300 `expect` statements for every little property. Now, wouldn't that be a Green Day miracle? 🎶
