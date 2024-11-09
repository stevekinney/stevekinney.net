---
title: Testing Division By Zero in JavaScript
description: Learn how to test division by zero in JavaScript utilities.
modified: 2024-09-28T18:32:10.979Z
---

Math has some rules. For example, you're not allowed to divide by zero. JavaScript gets especially weird about this. `5 / 0` equals `Infinity`. We don't want that. The purpose of our utility library is to protect us from some of the oddities that might come up.

Instead of giving us stuff like `Infinity` or `NaN`, we _want_ our library to throw an error. And, if we want our code to do something, then we should probably test that it does what we want it to do, right?

The question then is: **How do we test to make sure that our code blows up in certain situations**?

## Step 1: Write the Test (Red)

Add a test for division by zero in `calculator.test.js`:

```javascript
// src/calculator.test.js
describe('divide', () => {
	// … previous tests …

	it('throws an error when dividing by zero', () => {
		expect(() => divide(5, 0)).toThrow('Cannot divide by zero');
	});
});
```

## Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

The test fails because an error is not thrown.

## Step 3: Write Minimal Code to Pass the Test (Green)

Modify the `divide` function in `calculator.js`:

```javascript
// src/calculator.js
export function divide(a, b) {
	if (b === 0) {
		throw new Error('Cannot divide by zero');
	}
	return a / b;
}
```

## Step 4: Run the Test Again

Run the test:

```bash
npm test
```

All tests, including the division by zero test, should pass.

## Exercise

Write some tests for the following other oddities. See how many of these you can add to your test suite.

### `+` Vs `-` with Strings and Numbers

The `+` operator concatenates strings, but `-` only works for subtraction with numbers. So you get different results:

```javascript
console.log(5 + '5'); // "55" (string concatenation)
console.log(5 - '5'); // 0 (subtraction)
```

**Your choice**: Either write a test that makes sure that the values of both `a` and `b` are numbers _or_ write some tests that verify that the strings were converted to a number. If converting an argument to a string results in `NaN`, then throw an error.

For example:

- `add(5, '5')`: Either write a test that throws an error or one that verifies that `add` returns `10`.
- But, no matter what, `add(5, 'hotdog')` should probably throw an error.
- Do the same for subtraction, multiplication, and division.
- For division, you want to make sure that dividing by the string `'0'` also throws an error.

### Missing Arguments Are Undefined

We're not using TypeScript right now. It's not totally off the table that someone might call `add(5)`. What should happen in this case? Should it default `b` to `0`? Should it throw an error? Either way, it should probably throw an error in the case of `divide`. Write some tests to make sure this is the case.
