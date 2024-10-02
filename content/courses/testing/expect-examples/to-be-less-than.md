---
title: toBeLessThan in Vitest
description: Learn about the toBeLessThan matcher and its practical uses.
modified: 2024-09-28T12:52:13-06:00
---

So you're probably wondering, *"When would I ever need `toBeLessThan`? I'm a software developer, not a mathematician!"* But trust me, this comes in handy more than you'd think.

## What is `toBeLessThan`?

The `toBeLessThan` matcher is pretty straightforward: it checks if the value on the left-hand side is **less than** the value on the right-hand side. It's like doing a `<` comparison in regular JavaScript, but in more polished and readable test form.

## When to Use It?

Imagine you’re testing a feature where something—like the length of an album or track duration—must always be shorter than, say, 60 minutes. You’re writing code to make sure no ‘prog rock’ monstrosities are slipping by. Or maybe you're testing that the price of a premium subscription is less than a certain budget cap. Basically, whenever you want to validate that values remain under a specific threshold, that's when `toBeLessThan` steps in to save the day.

> Just to note, you're comparing numbers here, so don't go trying to throw strings or objects at it, hoping it'll figure out your intent.

## Example of Using `toBeLessThan`

Okay, let's apply this to our cute little music library. Let's say we want to make sure that no Green Day album (for whatever reason) is longer than 100 minutes. Here's that test:

```javascript
import { describe, it, expect } from 'vitest';

describe('Green Day Album Duration', () => {
	it('should be less than 100 minutes', () => {
		const albumLength = 42; // Let's say Dookie is 42 minutes long
		expect(albumLength).toBeLessThan(100);
	});
});
```

In this test, `toBeLessThan` is making sure that the *legendary* "Dookie" album length is less than 100 minutes. And if Green Day decides to drop some epic 2-hour-long experimental concept album (*perish the thought*), this test would fail. Perfect for keeping bloated albums at bay!

So, whenever you're in a situation where you need to compare and ensure that one number is **less than** another, pull out your trusty `toBeLessThan`. It’s simple, and doesn’t hurt to write!

✌️ Test on, my friend!
