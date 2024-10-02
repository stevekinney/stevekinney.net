---
title: Only Running Tests For Related Files
description: Learn how to run only related tests in Vitest to save time.
modified: 2024-09-28T15:23:09-06:00
---

Picture this: You’ve been cranking away on some code, making changes, darting between files like a superhero full of caffeine. Then comes the dreaded moment—time to rerun the tests. All. Of. Them.

Eh, not so fast.

Instead of running the whole test suite, you can ask Vitest to only run the tests that are related to the files you've been working on. In this way, you can save yourself some time dealing with a full build just to test one pesky little function. Let’s break it down into bite-sized steps.

## The Command: `vitest related`

Vitest provides a super useful feature called `vitest related`. As the name suggests, it runs the tests that are **related to the recent changes you made**. So, if you're knee-deep in a project and make some changes to a specific file, you can just run the tests tied to that specific file.

Here’s how you use it:

```bash
npx vitest related path/to/your/file.js
```

Yeah—it's that simple. You point `vitest related` at your changed files and Vitest does the rest. It automagically runs the tests that are impacted by the files you changed. No more waiting for a gazillion other tests that aren’t relevant to your current change.

But let’s break down a couple of scenarios where this is mega handy.

## Example #1: You’ve Been Tweaking a Single Function in One File

Let’s say we’ve got a simple function doing some manipulations in `mathUtils.js`. Here’s the code:

```javascript
// mathUtils.js
export const addNumbers = (a, b) => a + b;

export const subtractNumbers = (a, b) => a - b;
```

And we’ve got some tests in `mathUtils.test.js`:

```javascript
// mathUtils.test.js
import { describe, it, expect } from 'vitest';
import { addNumbers, subtractNumbers } from './mathUtils';

describe('mathUtils', () => {
	it('should add numbers correctly', () => {
		expect(addNumbers(2, 2)).toBe(4);
	});

	it('should subtract numbers correctly', () => {
		expect(subtractNumbers(2, 1)).toBe(1);
	});
});
```

You make some edits to `mathUtils.js`—let's say you’re rethinking your whole “subtracting numbers” thing because subtraction is chaotic (just ask anyone trying to balance books…). You tweak the function logic.

Instead of running **every single test** in your app—you just pass in the file you've been editing:

```bash
npx vitest related src/utils/mathUtils.js
```

Boom. Vitest looks at that file, figures out which tests correspond to it (`mathUtils.test.js`), and runs only those.

Nice, huh?

## Example #2: Multiple Files, Same Principle

Now, let's swerve into a slightly more complex situation. Maybe you're working on multiple files—helpers, components, and the whole shebang. You wanna make sure your changes are good without running everything.

Easy. Just feed it all the files you've messed with:

```bash
npx vitest related src/utils/mathUtils.js src/components/Button.js
```

Vitest will search for any tests associated with the given files and run those suckers for you. No pointless waiting around, watching all the irrelevant tests pass.

## Pro Tip: Add it to Your Workflow

This is perfect for those “whoops” moments where you’re unsure if you just broke something, but you don’t wanna slog through all the tests. A nice addition to your pre-commit process or even wired into CI/CD stages, if you're that fancy (I envy your coolness).

To wrap it all up, **`vitest related`** is your ticket to quick, efficient test runs based on what you're currently touching in the code. It’s painless, saves a ton of time, and keeps you in the flow without smashing the brakes of the full test suite. Even better? It feels good. Like sipping a fresh coffee after realizing your tests do, in fact, pass.

Time to put this knowledge to work! Keep those tests focused and fast, and remember: Just because you *can* run the entire suite doesn't always mean you *should*.
