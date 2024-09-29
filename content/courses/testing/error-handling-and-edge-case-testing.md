---
title: Error Handling And Edge Case Testing With Vitest
description: Learn to test error handling and edge cases using Vitest.
modified: 2024-09-28T14:53:07-06:00
---

Let's talk about those error-prone, sneaky little troublemakers we like to call *edge cases*. You know—the weird stuff users do that you didn’t see coming. They're a lot like traffic: You planned for a smooth drive, but, oh hey, most of the road is under construction. Nice. But instead of pulling out your hair, we can deal with edge cases through some **good error handling** and **thorough testing**.

Now, since you're here, I’ll assume you care about solid code that won’t crash when someone tries to log in with an emoji as their password. And hey—good for you! Let’s take a look at how Vitest can make testing for these situations easy *and* fun—well, at least it'll be easy.

## Why Test Error Handling?

Errors happen. [Murphy’s Law](https://en.wikipedia.org/wiki/Murphy%27s_law) comes for all of us. The point is: Your code *will* break. That’s a given. Proper error-handling tests let you at least break in *style*. A well-placed `try/catch` will not only keep a production app from imploding but will also give you valuable feedback on what went wrong.

- **Ensure Proper Error Handling**: Verifying that functions throw errors correctly helps ensure your application behaves as expected when things go wrong.
- **Prevent Silent Failures**: Testing for thrown errors helps avoid situations where the code fails silently, making debugging difficult.
- **Enforce Validation**: Testing functions that are expected to throw errors for invalid input or failed operations ensures your code properly validates and guards against incorrect behavior.

When you test error handling, you're ensuring your app gracefully handles the worst-case scenarios. You know, like someone passing `undefined` into a method that expects a string. (Happens more than we'd like.)

## A Real-World Example: Testing for Invalid Input

Let’s dive into an example. Imagine you’ve got a function that converts strings into numbers. You want to make sure it doesn’t explode when handed something it can't handle, like `"two"` or `null`.

```js
// utility.js
export function convertStringToNumber(str) {
	if (typeof str !== 'string' || isNaN(Number(str))) {
		throw new Error('Invalid input');
	}
	return Number(str);
}
```

We’ve got a simple function here that only wants to deal with *valid* string numbers. But what if a user types `"hello"` or passes `undefined` because… well, users? Errors abound! Let’s make sure our function throws those errors in a controlled way.

## Writing Error Tests with Vitest

Now, let’s write some Vitest tests to cover these special moments. When writing tests around error handling, your goal is to catch the exceptions. In Vitest, we use `.toThrow()` or `.toThrowErrorMatchingSnapshot()`. Let’s break this down:

```js
import { describe, it, expect } from 'vitest';
import { convertStringToNumber } from './utility';

describe('convertStringToNumber', () => {
	it('should convert valid string numbers to actual numbers', () => {
		const number = convertStringToNumber('42');
		expect(number).toBe(42);
	});

	it('should throw an error for invalid string input', () => {
		expect(() => convertStringToNumber('hello')).toThrow('Invalid input');
	});

	it('should throw an error for non-string values', () => {
		expect(() => convertStringToNumber(null)).toThrow('Invalid input');
		expect(() => convertStringToNumber(undefined)).toThrow('Invalid input');
		expect(() => convertStringToNumber({})).toThrow('Invalid input');
	});
});
```

## Breaking It Down

- **Test 1**: *Happy path*, as we call it. The input is a valid string number like `"42"`, and we make sure we’re getting the correct number back.
- **Test 2 & 3**: Now we’re testing for invalid input. `"hello"` or `null` should throw an error. Even funnier, try passing an **object** because someone will eventually do this. If that error’s thrown, we’re golden!

## Testing for Edge Cases

Now that we’ve got error handling covered, let's throw in some edge cases. Edge cases are those wacky scenarios that you would *never* expect, but you soon learn you must *always* expect.

For example, what happens if the string is an empty string? Or, what about a string that’s, like, *all* spaces? Let’s throw those cases into the mix and see what happens:

```js
describe('Edge cases for convertStringToNumber', () => {
	it('should throw an error for empty strings', () => {
		expect(() => convertStringToNumber('')).toThrow('Invalid input');
	});

	it('should throw an error for strings with only spaces', () => {
		expect(() => convertStringToNumber('    ')).toThrow('Invalid input');
	});
});
```

Here we introduce **empty strings** and **space-filled strings** into the test arena. Your function doesn’t care if there’s air or nothing behind part of the input. It’s still a red flag, and we want to make sure our tests call it out when those flags are raised.

## Custom Error Messages

Okay, so we’ve been throwing generic errors like “Invalid input” all around, but you might want to take it up a notch. Custom error messages can give you *context*.

```js
export function convertStringToNumber(str) {
	if (str === '') {
		throw new Error('Input cannot be empty');
	}
	if (typeof str !== 'string' || isNaN(Number(str))) {
		throw new Error('Input must be a valid string number');
	}
	return Number(str);
}
```

Then, your corresponding test:

```js
it('should throw a specific error for empty strings', () => {
	expect(() => convertStringToNumber('')).toThrow('Input cannot be empty');
});
```

Now your error can say exactly what went wrong. Custom error messages: saving devs everywhere from needless head-scratching.

## Takeaways on Testing Errors and Edge Cases

- Expect things to go wrong—and test for it.
- Gracefully handle unreasonable inputs with custom error messages. Future you—and your users—will thank you.
- Throw wild edge cases at your code during testing. If your tests pass, you’re cruising toward a production environment with a little more peace of mind.

And that’s it! You’re now better equipped to handle errors *and* those fringe cases like a pro. May fewer bugs and unexpected inputs come your way—but if they do, you’ve got Vitest and your trusty tests at the ready.