---
title: toHaveReturnedTimes in Vitest
description: Learn how to use toHaveReturnedTimes in your Vitest tests.
modified: 2024-09-28T12:54:04-06:00
---

Let’s talk **toHaveReturnedTimes**. This matcher comes into play when you want to make sure that a **mock function** (or **spy**) has returned a specific number of times during your test. I'll bet you've been there—your function is firing off correctly, but now you need to verify how many times it actually returns something useful, right? That's exactly what **toHaveReturnedTimes** helps you confirm.

You’d typically use this when your function is expected to complete successfully multiple times, and you'd like to ensure that behavior. Maybe you’ve got something like a function that fetches details about your favorite punk bands, and you need to make sure it returned as many times as you expected.

## Example: Checking the Return Count of a Mock Function

Let's say we have a function `getBandInfo` that fetches info about an artist. In our test, we want to check if it properly returns three times because, let’s face it, when you’re talking about as many iconic albums as Green Day has, it's gotta work!

```javascript
import { describe, expect, test, vi } from 'vitest';

describe('getBandInfo function', () => {
	test('should return 3 times when fetching band info', () => {
		const mockGetBandInfo = vi.fn(() => 'Green Day');

		// Calling the mock function three times
		mockGetBandInfo();
		mockGetBandInfo();
		mockGetBandInfo();

		// Expecting the function to have returned 3 times
		expect(mockGetBandInfo).toHaveReturnedTimes(3);
	});
});
```

In this case, we're calling `mockGetBandInfo()` three times and using `toHaveReturnedTimes(3)` to check whether it successfully returned something three times. If it didn’t? Well, the test would let you know about your shenanigans.

***

## Real-World Use

You’d use this in situations where there's logic in your app that depends on functions completing and returning values a specific number of times—a pagination function, or maybe, like in our little example, something working through a list of albums or artists. If your app relies on repeated calls and responses, **toHaveReturnedTimes** is a great way to tame that chaos and ensure things work as expected.
