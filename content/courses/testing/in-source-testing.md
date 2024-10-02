---
title: In-Source Testing
description: Explore in-source testing with Vitest for quick experimentation.
modified: 2024-09-28T15:01:48-06:00
---

Picture this: You’re zipping along, writing your brand-new feature. Everything’s great, maybe even sipping a fresh cup of coffee. And then it hits you—**you forgot to write unit tests**. But the thought of context-switching, creating dedicated test files, setting up more boilerplate… *ugh*. It’s at these moments that the concept of **in-source testing** shines.

> \[!TIP] A Moment of Honesty
> I typically *only* use this when I am feeling lazy. And, I usually—on a long enough timeline—end up breaking the tests out into their own file.

Instead of creating a separate test for every little file in your project, what if you could… test directly **in the source file itself**? Wild? Maybe. Convenient? Oh, absolutely. Vitest supports in-source testing, which can be your secret weapon for rapid experimentation during development. It’s not necessarily what you'd run in production, but for quick scaffolding, it’s gold.

## Why Use In-Source Testing?

- **Fewer context switches**. Your brain stays in one file. No hunting around to find corresponding test files.
- **Quick hypothesis checks**. Need to test some logic fast? Bam. Do it right next to the code that's bothering you.
- **Keep it scrappy**. You’re not aiming for test perfection here. It’s sort of your playground, where you hone in on small pieces of functionality.

## Setting Up In-Source Tests with Vitest

Enough talk. Let’s get to some code.

Imagine you’ve got this tiny utility function that adds two numbers, `add.js`:

```js
export function add(a, b) {
	return a + b;
}
```

You want to slap a quick test together. No need to pull out a whole separate file for this. You bring the test right to the function’s front door. Say hello to your integrated test suite:

```js
import { describe, it, expect } from 'vitest';

// Here's your function:
export function add(a, b) {
	return a + b;
}

// And now… here's your in-source test!
if (import.meta.vitest) {
	describe('add', () => {
		it('adds two numbers correctly', () => {
			expect(add(2, 3)).toBe(5);
		});

		it('handles negative numbers', () => {
			expect(add(-2, -3)).toBe(-5);
		});
	});
}
```

## What Just Happened Here?

First off, that `import.meta.vitest` right there? That’s a little built-in Vitest trick that checks if you’re currently in a test environment. If yes, it fires up your test block. If not, it just skips right over it. In other words, you won’t be running tests when you’re in production, so it’s neat and safe.

We’ve got a couple of simple `it()` tests in the same file as our function. Vitest’s `describe`, `it`, and `expect` work just like usual—no magic base-trickery here.

## Running In-Source Tests

Now, go ahead and run Vitest just like you normally would:

```bash
npx vitest
```

Vitest will sweep up your test cases embedded in source files and execute them right alongside any of your traditional tests. It’s like you're doubling down: same dev, fewer files!

## A Few Gotchas

Don’t get *too* carried away. In-source testing is perfect for quick, informal checks during development. But as your app scales (just like that slight creep of tech debt you pretend not to see), **best practices** of test organization still matter.

- **Keep production code clean**. You don’t want chunks of test logic shipped to production, so make sure the `import.meta.vitest` gate keeps you from loading those tests outside of dev/test environments.
- **When features grow**, maybe *consider* switching to a dedicated test file. Your in-source testing should be for the quick and dirty experiments, not the 400-line monstrosities that make you cry.

## In-Source Testing in Practice

Here’s where this really shines: You’re in the middle of writing an algorithm, and you want to test specific edge cases quickly—without breaking your flow. Or you’ve got utility functions strewn about and want to know that each incremental step of your work is *rock solid*. In-source testing keeps you fluid and flexible. Perfect for proof-of-concept or when inspiration is rapped out on the keyboard.

## Wrapping It Up

In-source testing isn’t going to be your full-fledged test suite replacement, nor should it be. But when you’re in the middle of it, and the last thing you want to do is open another file to context-switch just to test that tiny piece of logic, this little feature can save you *tons* of time. It’s **low-investment testing**: quick hoop shots while you’re dribbling through a feature.

Use it, enjoy it, but most importantly, don’t let it become another shortcut that causes future-you to suffer when debugging in six months.
