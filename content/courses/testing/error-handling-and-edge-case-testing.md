---
title: Testing Errors and Handling Edge Cases
description: Learn to test error handling and edge cases using Vitest.
modified: 2024-09-29T15:57:54-06:00
---

Let's talk about those error-prone, sneaky little troublemakers we like to call _edge cases_. You know—the weird stuff users (and co-workers) do that you didn’t see coming.

## Why Test Error Handling?

Errors happen. [Murphy’s Law](https://en.wikipedia.org/wiki/Murphy%27s_law) comes for all of us. The point is: Your code _will_ break. That’s a given. Proper error-handling tests let you at least break in _style_. A well-placed `try/catch` will not only keep a production app from imploding but will also give you valuable feedback on what went wrong.

- **Ensure Proper Error Handling**: Verifying that functions throw errors correctly helps ensure your application behaves as expected when things go wrong.
- **Prevent Silent Failures**: Testing for thrown errors helps avoid situations where the code fails silently, making debugging difficult.
- **Enforce Validation**: Testing functions that are expected to throw errors for invalid input or failed operations ensures your code properly validates and guards against incorrect behavior.

When you test error handling, you're ensuring your app gracefully handles the worst-case scenarios. You know, like someone passing `undefined` into a method that expects a string. (Happens more than we'd like.)

## A Real-World Example: Testing for Invalid Input

Let’s dive into an example. Imagine you’ve got a function that converts strings into numbers. You want to make sure it doesn’t explode when handed something it can't handle, like `"two"` or `null`.

```js
// examples/utility-belt/src/string-to-number.js
export const stringToNumber = (value) => {
	const number = Number(value);

	if (isNaN(number)) {
		throw new Error(`'${value}' cannot be parsed as a number.`);
	}

	return number;
};
```

We’ve got a simple function here that only wants to deal with _valid_ string numbers. But what if a user types `"hello"` or passes `undefined` because… well, users? Errors abound! Let’s make sure our function throws those errors in a controlled way.

## Writing Error Tests with Vitest

Now, let’s write some Vitest tests to cover these special moments. When writing tests around error handling, your goal is to catch the exceptions. But, let's start with the happy path.

```js
// examples/utility-belt/src/string-to-number.test.js
describe('stringToNumber', () => {
	it('converts a string to a number', () => {
		expect(stringToNumber('42')).toBe(42);
	});
});
```

So far, so good. But, let's begin to walk through some of the edge cases. We know the following things:

1. Throwing an error in a test results in the test failing.
2. We want to test a case where the function _should_ throw an error.

We might be tempted to write something like this:

```javascript
it.fails('throws an error if given a string that is not a number', () => {
	expect(stringToNumber('foo')).toBe(42);
});
```

But that's gross.

1. Sure, it passes. But, maybe not for the reason we think?
2. We haven't asserted anything about the way it failed.

For example the following is a _real_ mistake that I made while I was writing this.

```javascript
it.fails('throws an error if given a string that is not a number', () => {
	expect('foo').toBe(42);
});
```

I forgot to even include the function that were testing—and yet the function still passed. That's right—even someone as smart and charming as yours truly can get false positives if they're not careful.

## Testing That a Function Threw an Error

Let me update that first rule: **uncaught** errors will cause a test to fail. Let's get back to a failing test case and work from there.

```javascript
it('throws an error if given a string that is not a number', () => {
	expect(stringToNumber('foo')).toBe(42);
});
```

Yup, it's failing and the error message tells us why. But, we're trying to test that bogus input causes and error and not just trying to set ourselves up for a world where our test suite fails for the rest of eternity.

Let's try calling the `toThrow()` method.

```javascript
it('throws an error if given a string that is not a number', () => {
	expect(stringToNumber('foo')).toThrow();
});
```

Hmm—it's still broken. This is one little nuance. Calling `stringToNumber` with `'foo'` will throw but we're not set up to catch it. Instead, we have to wrap it in a function. `expect` will call the function inside of a `try`/`catch` block for us and let us know what happened.

```javascript
it('throws an error if given a string that is not a number', () => {
	expect(() => stringToNumber('foo')).toThrow();
});
```

We can still do better. Yes. If I give it some string that can't plausibly be converted to a number, then it will throw an error. But, there are plenty of other reasons why something may throw and error—trust me, I know first-hand.

We can validate that it throws the error we're expecting.

```javascript
it('throws an error if given a string that is not a number', () => {
	expect(() => stringToNumber('foo')).toThrow(`'foo' cannot be parsed as a number.`);
});
```

I might pull out the value since it's being used twice.

```javascript
it('throws an error if given a string that is not a number', () => {
	const value = 'foo';
	expect(() => stringToNumber(value)).toThrow(`'${value}' cannot be parsed as a number.`);
});
```

You can also use part of the message or a regular expression if you only want to make sure one part matches.

```javascript
it('throws an error if given a string that is not a number', () => {
	const value = 'foo';
	expect(() => stringToNumber(value)).toThrow('cannot be parsed as a number');
});
```

## Testing for Edge Cases

Now that we’ve got error handling covered, let's throw in some edge cases. Edge cases are those wacky scenarios that you would _never_ expect, but you soon learn you must _always_ expect. Part of this involves putting on your imagination caps. And this really relates to both the tests you write as well as the implementation.

Off the top of my head, here is all of the junk that I _could_ pass in:

- `string`
- `number`
- `boolean`
- `undefined`
- `null`
- `NaN`
- An object
- An array
- A function
- A promise

For each of these, you have the same two choices:

1. Gracefully handle them
2. Throw an error

For example you could just decide that `true` and `false` are fine because they'll get converted to `1` and `0` respectively. You could decide that a number is okay I guess since it'll harmless pass through. In this case, you probably need to rename the function. Otherwise, we probably need another conditional and an error message because if your intention is that numbers and booleans are going to throw an error—well, they're not going to.

If you _are_ going to throw an error. Then you owe it your furture self to have good error messages. The current error message doesn't really describe the problem and in a large more complicated code base, `'[object Object]' cannot be parsed as a number` is decidedly unhelpful.

> \[!example] Exercise
> Can you add tests for some of these less desirable types? Start with the failing test before adding another check for the particular edge case.

### Taking It Even Further

There is another class of arguments that we _could_ try to throw errors for: A `string` that is totally valid, but might not be what we expect. For example, what happens if the string is an empty string? (**Spoiler**: It's `0`.) Or, what about a string that’s, like, _all_ spaces? Let’s throw those cases into the mix and see what happens:

```js
it('should throw an error for empty strings', () => {
	expect(() => stringToNumber('')).toThrow('Empty strings are not valid input');
});

it('should throw an error for strings with only spaces', () => {
	expect(() => stringToNumber('    ')).toThrow('Empty strings are not valid input');
});
```

Here we introduce **empty strings** and **space-filled strings** into the test arena. Your function doesn’t care if there’s air or nothing behind part of the input. It’s still a red flag, and we want to make sure our tests call it out when those flags are raised.

Now your error can say exactly what went wrong. Custom error messages: saving devs everywhere from needless head-scratching.

## Takeaways on Testing Errors and Edge Cases

- Expect things to go wrong—and test for it.
- Gracefully handle unreasonable inputs with custom error messages. Future you—and your users—will thank you.
- Throw wild edge cases at your code during testing. If your tests pass, you’re cruising toward a production environment with a little more peace of mind.

> \[!example] Exercise
> Surely our basic arithmetic is going to have an equally hard time with all of the ways that numbers can go sideways in JavaScript. Can you update our tests and implementation to account for this? You can see some potential—but certainly \*not( exhaustic—solutions [here](testing-for-errors-exercise.md).
