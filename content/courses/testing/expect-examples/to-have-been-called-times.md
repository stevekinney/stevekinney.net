---
title: toHaveBeenCalledTimes in Vitest
description: Learn how to use the toHaveBeenCalledTimes matcher in Vitest.
modified: 2024-09-28T12:53:19-06:00
---

Here's the deal: `toHaveBeenCalledTimes` is a matcher in Vitest that, as the name suggests, checks how many times a **mock function** (or spy, or jest-like "hey, what's *this* thing doing?") has been called during a test. It's super useful when you want to test whether certain functions, like event handlers or API calls, are being executed the correct number of times.

## Why Would You Use It?

You’d grab this matcher when you're dealing with functions you think are being called more times (or fewer times) than they should. Maybe you set up a `click` event listener and expect it to get hit exactly once, but the button's getting mashed, and it's triggering it… **seven times**. 🤦

This matcher helps you **assert** whether a mock function was called the right number of times, like a bouncer counting how many people came to the party—but instead of a party, it's just stressed out developers and broken promises.

**When would I use it?**

- Verifying API calls or function invocations after a specific user action.
- Ensuring that side effects like network requests or console logs are happening the expected number of times.

## Example

Let’s stick with our ongoing "Mid-2000s Punk Rock Music Library Application." Imagine you’ve got a `fetchAlbums` function that pulls Green Day's discography when a user clicks a button.

```js
const fetchAlbums = jest.fn();

function displayAlbums(artist) {
	if (artist === 'Green Day') {
		fetchAlbums();
	}
}
```

Now, let’s write the test for that:

```js
import { describe, it, expect, vi } from 'vitest';

describe('displayAlbums function', () => {
	it('should call fetchAlbums once when artist is Green Day', () => {
		const fetchAlbums = vi.fn();

		// We hit ‘em with the Green Day and make sure the albums are fetched!
		displayAlbums('Green Day');

		expect(fetchAlbums).toHaveBeenCalledTimes(1);
	});
});
```

### Key Takeaways

- We expect `fetchAlbums` to be called **exactly once**. If it was called zero times or two times, the test would fail.
- If you swap `'Green Day'` with another band like (dare we say) *Coldplay*, and the function doesn't call `fetchAlbums()`, we can infer our logic is nice and conditional.

## Real-World Scenarios

- **Button click**: Ensuring a user's interaction (like clicking a button) fires the handler only once.
- **API calls**: Making sure we’re not accidentally hitting endpoints multiple times with redundant information. Or worse—missing a call!

That’s it! Calm the chaos in your functions. `toHaveBeenCalledTimes` is like traffic control for your functions, making sure they behave themselves.
