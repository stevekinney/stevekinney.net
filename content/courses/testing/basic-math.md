---
title: Implementing Some Basic Tests
description: Learn to implement and test simple arithmetic functions with TDD.
modified: 2024-09-29T13:47:46-06:00
---

It turns out that there is a lot more to math than just adding numbers. Our product manager also wants us to be able to subtract, multiple, and divide numbers too, apparently. Talk about feature creep.

We'll focus on writing pure functions for arithmetic operations and use Vitest to write and run our unit tests. There will be no user interface; the goal is to practice [test-driven development](test-driven-development.md) principles and unit testing.

We'll implement the following calculator functions:

- `add(a, b)`
- `subtract(a, b)`
- `multiply(a, b)`
- `divide(a, b)`

We're going to be good citizens and start by writing the tests first and then take it from there. We already wrote the `add` function. So, we'll pick up from the `subtract` function.

There is some basic code ready for you in `examples/basic-math` in the [example repository](https://github.com/stevekinney/introduction-to-testing).

### The Bare Minumum Number of Words on Test-Driven Development

I don't insist that you do test-driven development. I certainly don't do it a lot of the time. But, I kind of feel like it's my responsibility to at least walk you through some basic examples that you feel comfortable if someone brings it up in a conversation (i.e. an interview).

The premise is simple:

1. Start with a failing test. Failing tests are typically **red**.
2. Make the test pass. Passing tests are **green**.
3. Optional: Refactor the function—ideally, keeping those tests green.

That's it. Simple, right? You might even be asking why something like this even needs to exist.

Well, that's mostly because of the much more common pattern:

1. Write code.
2. Go to test it.
3. Really that the code you wrote is kind of hard to test.
4. Don't test it.
5. Deal with the consequences.

## Reapproaching the `add` Function

So, I might start with a test like this:

```javascript
describe('add', () => {
	it('adds two positive numbers', () => {
		expect(add(1, 2)).toBe(3);
	});
});
```

Next, I'd run the test and watch it blow up.

Then, I'd pop over to `arithmetic.js` and add a mostly reasonable implementation:

```javascript
export const add = (a, b) => a + b;
```

And then I'd watch it pass. Now, there isn't a lot of refactoring here, but you get the idea.

> \[!example] Exercise
> Okay, enough of listening to me talk. Can you implement the rest of the basic math functions in `examples/basic-math/src/arithmetic.test.js`? Ideally, you want to take some test-driven development for a spin. On one hand, this exercise is *super* easy. On the other hand, you really don't have a great excuse not to do some test-driven development. If you need a helping hand, you can follow [this walkthrough](basic-math-exercise-walkthrough.md).
