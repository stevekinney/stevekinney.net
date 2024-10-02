---
title: Starting with Simple Tests
description: Learn how to test basic expressions and functions using Vitest.
modified: 2024-09-29T14:04:33-06:00
---

> \[!TIP] Sample Code Repository
> If you haven't already, now is a good time to clone [the repository with the sample code for this course](https://github.com/stevekinney/introduction-to-testing).

Let's start with the world's simplest test. I have an example of this code in `examples/scratchpad/index.test.js`, but you probably don't need to worry about running it just yet.

```js
import { test, expect } from 'vitest';

it('is a super simple test', () => {
	expect(true).toBe(true);
});
```

You *could* run this test by running `npm test` from the command line, but don't expect any surprises.

At the highest level, we can see the following:

- There is a function called `test` that takes two arguments:
  - A string that represents the name of the test.
  - A function that contains the body of the test.
- Inside of that function, we use an assert library to make a statement about what we expect to be the way the world works.
  - In this case, we're expecting this two things to be equal and they are.

> \[!TIP] Pro-Tip
> You'll see other tests where instead of `test`, we use `it`. There is literally no difference between these two functions. They are aliases of each other. You can use them interchangeably.

Okay, well this works—but, it's a little ridiculous. Let's actually test some expressions or maybe even a function.

```js
test('another test, but with some logic', () => {
	expect(1 + 1).toBe(2);
});
```

```js
test('a test with a function', () => {
	const add = (a, b) => a + b;
	expect(add(1, 2)).toBe(3);
});
```

The selling point here is that when we write tests, we can make a bunch of statements about how we *expect* our code to work. Our test suite's job is to save us the hassle of having to manually check on all of these things. Instead, the test runner will grab our code and make sure that everything still works the way that we expect as we go about our business adding features and refactoring code.

Generally speaking, it's unlikely that our `add` function would live inside of a test. More likely, it's a utility function of some kind that we'd use in our application.

We'll keep our scratchpad around in the repository for anytime we want to do some quick experiments, but let's hop over to `examples/basic-math/src/arithmetic.js` instead.

We can pull out our *very* exciting function into it's own file like we might otherwise expect to see in our normal day-to-day.

```javascript
// arithmetic.js
export const add = (a, b) => {
	return a + b;
};
```

We can add the test in `arithmetic.test.js`.

```javascript
// src/arithmetic.test.js
import { describe, it, expect } from 'vitest';
import { add } from './arithmetic';

describe('add', () => {
	it('should add two numbers', () => {
		expect(add(1, 2)).toBe(3);
	});
});

describe.todo('subtract', () => {});

describe.todo('multiply', () => {});

describe.todo('divide', () => {});
```

## Adding Tests

Every test you write comes at some infinitesimally small cost, which I suppose can add up over time. The unhelpful rule for how many tests you should write is "as many as you need." But, generally speaking—we want to at least cover some of the edge cases.

```javascript
// src/arithmetic.test.js
import { describe, it, expect } from 'vitest';
import { add } from './arithmetic';

describe('add', () => {
	it('should add two positive numbers', () => {
		expect(add(1, 2)).toBe(3);
	});

	it('should two negative numbers', () => {
		expect(add(-2, -3)).toBe(-5);
	});

	it('should a positive and a negative number', () => {
		expect(add(5, -3)).toBe(2);
	});
});
```

We'll add a few more in a later section, but this is a pretty good start for now. Especially because we haven't looked at [running your tests](running-tests.md) just yet.

But first, let's take a hot minute to talk about [how tests work](how-tests-work.md).

## Related Reading

- [Running Tests](running-tests.md)
- [How Tests Work](how-tests-work.md)
- [Filtering Tests](filtering-tests.md)
- [Organizing and Annotating Tests](organizing-and-annotating-tests.md)
