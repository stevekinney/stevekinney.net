---
title: Debugging Vitest Tests
description: Learn essential tools for debugging tests in Vitest effectively.
modified: 2024-09-28T14:43:06-06:00
---

You've just written the best code of your life, you hit `npm run test`, and oof—something's broken. But now the real fun begins: *debugging*. That's right, if debugging your code wasn't enough, you get to debug your tests too.

Like all debugging, it's the mix of detective work and head-scratching that we all signed up for at some point shortly after choosing this career path. Don’t worry, though. We’re going to walk through the essential tools Vitest offers for debugging, and I promise, it's not as scary as figuring out why your CSS grid isn't lining up.

## Error Messages in Vitest: Your First Clue

Before we dive into fancy debugging tools, let’s talk about reading Vitest’s error messages. That might seem basic, but it’s huge. You run the test, and it fails. Vitest is *really* good at telling you *what* went wrong, which line, and, often, why. So when you see the red "FAIL," slow down and carefully read through the stack trace.

Let’s say you have this failing test:

```javascript
import { expect, test } from 'vitest';
import { addNumbers } from './addNumbers';

test('adds two numbers', () => {
	expect(addNumbers(2, 2)).toBe(5);
});
```

Vitest tells you exactly where it went sideways:

```ts
FAIL  src/addNumbers.test.js > adds two numbers
      Expected: 5
      Received: 4
```

Great. The math went wrong. Sometimes, tests fail for simple reasons—a typo, wrong arguments, or a function behaving badly. Fix the implementation and move on.

But other times, you need to level up your debugging game.

## Running Only One Test

When you’ve got a gnarly error and, say, 135 tests awaiting execution, there’s absolutely no reason to run everything. That’s pure chaos. Focus on **one** test at a time. Vitest to the rescue with `.only`.

```javascript
test.only('adds two numbers', () => {
	expect(addNumbers(2, 2)).toBe(5);
});
```

Boom—Vitest just runs that single test. Now, *all* your attention is on the suspect. Narrow it down and debug faster.

## Using `console.log`

Okay, if we’re being real here, most debugging is just sprucing up the joint with `console.log`. Sometimes, the fastest way to figure out what’s going wrong is to pepper *a few `console.log`s into your code*. If you're adding a million log statements to your actual test files—hey, no judgment—we all do it.

```javascript
test('adds two numbers', () => {
	const result = addNumbers(2, 2);
	console.log('The result is:', result);
	expect(result).toBe(5);
});
```

This quick logging gives you an immediate sense of what’s going on inside your functions. Stack that up with **watch mode**, and you’ll be fixing bugs in no time.

## Using Vitest’s `inspect` Mode for Debugging in Chrome DevTools

Here’s the fancy trick everyone loves. Vitest has an **inspect mode** that allows you to debug with Chrome’s DevTools if `console.log` isn’t cutting it. You know, like you do when your frontend throws a giant tantrum in production. You can even add breakpoints and step through your tests.

To start in inspect mode:

```bash
npx vitest --inspect
```

This will spit out a URL like:

```ts
Debugger listening on ws://127.0.0.1:9229/xxxxx
```

Paste that in Chrome, open DevTools (`Cmd+Opt+I` or F12), and now you can set breakpoints, stalk variables, and generally live the debug life in style. No more pretending you're beyond `console.log`!
