---
title: expect.stringContaining in Vitest
description: Learn how to use expect.stringContaining to test substrings in Vitest.
modified: 2024-09-28T12:51:24-06:00
---

Alright! Let's talk about **`expect.stringContaining`**, one of those little gems in Vitest that can make your life *so much easier* when you're testing strings. Specifically, this matcher lets you check if one string contains another substring, without needing an exact match for the whole string.

The magic behind **`expect.stringContaining`** is that it doesn’t care what’s around the substring—it just wants to make sure that the substring is somewhere in there. You’d typically use this when you’re not super concerned about the entire string, but you just want to validate that it contains *something specific*. It's like doing a quick search through your buddy's Spotify playlist to make sure there’s at least one Green Day song in there—because, let’s face it, what kind of playlist would it even be without Green Day?

## When to Use expect.stringContaining

Imagine you're working with some data where the entire string might vary, or you don’t care about every little detail, but you still need to confirm that the absolutely crucial part—the core information—is present. Maybe it’s an error message, a log file, or even just some HTML output from a component! 🤷

Common situations for `expect.stringContaining`:

- Checking if **API responses** contain something important without checking the whole thing.
- Validating **log messages**.
- Looking for specific parts in **HTML strings**.

In short, you're going “I don’t care *what else* is in there, but **this** part? Yeah, it's gotta be there.”

## Example of expect.stringContaining

Let’s say our *naive music library* app is generating some artist descriptions, and we want to ensure that Green Day is mentioned somewhere in the description, regardless of other details.

```javascript
import { describe, expect, it } from 'vitest';

describe('Artist description', () => {
	it('should contain "Green Day"', () => {
		const description =
			'Green Day is a punk rock band formed in the late 80s with a huge influence on pop-punk.';

		// We don't care if the string has extra text – just ensure "Green Day" is mentioned
		expect(description).toEqual(expect.stringContaining('Green Day'));
	});

	it('should fail if "Green Day" is missing', () => {
		const description = 'A popular band from the 90s with multiple platinum albums.';

		expect(description).not.toEqual(expect.stringContaining('Green Day'));
	});
});
```

### Explanation

- **First test:** We're using `expect.stringContaining` to check if `"Green Day"` is mentioned in the **`description`** string. It doesn't matter what else the string says, as long as that part’s in it.
- **Second test:** We're flipping the script: Here we're making sure that the description **does not** contain "Green Day." And using `.not` reminds us that sometimes testing for what *shouldn’t* happen is just as important.

### The Power Move

One last thing—combine `expect.stringContaining` with **other matchers** like `toEqual`, in cases where the string comes nested inside objects or arrays. That’s when it really starts pulling its weight.

So, next time you need to say “Look, I don’t need exact matches, but if this string doesn’t mention Green Day, I’m flipping a table,” then `expect.stringContaining` is your friend.
