---
title: soft in Vitest
description: Learn how to use expect.soft for non-blocking assertions in Vitest.
modified: 2024-09-28T12:51:46-06:00
---

So here's the deal: **`expect.soft`** is kind of like your chill friend who says, "Hey, you messed up, but I'm not gonna block everything because of it. Keep going." In traditional tests, if an **expectation fails**, the test says, "Nope, I'm out of here," and the test run stops right there. With **`expect.soft`**, Vitest lets you fail an individual assertion while continuing through the rest of the test. It won't stop the party just because one thing didn't go as expected—so you can see all the failures at once without running the whole suite again.

You'd use **`expect.soft`** in scenarios where you care about multiple assertions at once and want to evaluate all of them before calling it quits on the test. This is especially helpful when you're dealing with more complex objects or functions and don't want to keep re-running your test just to uncover additional failures.

## Example Scenario

Let’s say you’ve got a music library app (like the one we keep talking about 🙌), and you're writing a test for its `Album` object. You want to check multiple properties of an album after it's created—its `title`, `artist`, and maybe the `number of tracks`. You want to see all issues in one go rather than stopping at the first failure.

Here’s how you’d do that:

```js
import { expect, test } from 'vitest';

test('Album should have the correct properties', () => {
	const album = {
		title: 'Dookie',
		artist: 'Green Day',
		numberOfTracks: 14,
	};

	expect.soft(album.title).toBe('American Idiot'); // Incorrect title—this will fail
	expect.soft(album.artist).toBe('Green Day'); // Artist is correct—this will pass
	expect.soft(album.numberOfTracks).toBe(12); // Incorrect track count—this will fail

	// Even though two assertions failed, the test will continue to the end.
});
```

Without **`expect.soft`**, the test would fail immediately at the first `expect(album.title).toBe('American Idiot')` because Green Day released *Dookie*, not *American Idiot*. But, with **`expect.soft`**, Vitest just raises an eyebrow, throws that failure in the results, and moves on to check the other soft assertions. You’ll get the full picture of the failures at the end of the test run instead of stopping at the first one.

## When Would I Use It?

If you're testing something complex with multiple important assertions—and especially in real-world projects that might have lots of tests—you probably don’t want to stop the whole show at the first red flag. That's where **`expect.soft`** shines. It helps you capture more opportunities for failure in one shot, which means fewer re-runs of your tests. Translation: less rage clicking rerun, more time to actually fix bugs.

Happy testing!
