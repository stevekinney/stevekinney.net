---
title: toEqual in Vitest
description: A guide to using toEqual for deep equality checks in Vitest.
modified: 2024-09-28T12:53:12-06:00
---

Let's talk about **toEqual**. This one’s your go-to for checking **deep equality** between objects or arrays. If you’ve got an object or array that you want to compare with something else, and you care about its contents rather than its identity in memory (i.e., you’re not expecting the same object reference), **toEqual** is what you want.

## When Would You Use It?

You'd whip out **toEqual** when you're testing whether two objects have the same **values**. Maybe you’ve got that `getBandInfo()` function for your music library, and it’s returning an object. If you want to check that every field in that object is what you expect, **toEqual** has your back.

Contrast this with **toBe** which just says, “Are these the **exact same** thing in memory?” Like, they’ve gotta be the same object, or else no dice. But with **toEqual**, you care about deep equality—same content, regardless of whether it’s technically the same object behind the scenes.

## Example Time!

Let’s say we’ve got a little music library, and we want to test that our function returns the correct band object.

```javascript
// The function we're testing
function getBandInfo() {
	return {
		name: 'Green Day',
		genre: 'Punk Rock',
		albums: ['Dookie', 'American Idiot'],
	};
}

// Our Vitest test
import { describe, expect, it } from 'vitest';

describe('getBandInfo', () => {
	it('should return the correct band details', () => {
		const result = getBandInfo();
		expect(result).toEqual({
			name: 'Green Day',
			genre: 'Punk Rock',
			albums: ['Dookie', 'American Idiot'],
		});
	});
});
```

### What’s Happening Here?

- **`expect(result).toEqual(…)`**: We’re saying, “Yo, `result` should deeply equal this object.” We don’t care if it’s literally the same object in memory—we just need these key-value pairs.
- The test will pass if the fields of the object match the expected values (even if they aren’t the *same* object but just *look like* the same tightly-packed block of data).

***

So, that’s **toEqual**! Think of it like comparing the content rather than identity. It comes in handy for objects, arrays—you know, things that might look alike but aren’t exact copies in memory.
