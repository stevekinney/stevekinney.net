---
title: Strategies For Testing Conditional Logic
description: Learn how to effectively test conditional logic in your code.
modified: 2024-09-28T15:31:06-06:00
---

Conditional logic is one of those things that can sneak up on you. You start with something simple: "Just handle this one edge case." The next thing you know, you’ve got more `if` statements than you do lines of actual code. And when things go wrong—and they _will_—it’s usually because some branch of your conditional logic went rogue.

Testing these conditions can feel like untangling a ball of yarn, but don’t worry. Let’s walk through this step by step and break it down.

## First, Know What You’re Testing

Before we write a single test, we need to know what conditions we’re dealing with. Let's picture a simple function that calculates a discount based on the number of items a user buys. Something like this:

```javascript
const calculateDiscount = (items) => {
	if (items > 10) {
		return 0.2; // 20% discount
	} else if (items > 5) {
		return 0.1; // 10% discount
	} else {
		return 0; // No discount
	}
};
```

Seems straightforward, right? Three different conditions, and we need to make sure all of them are covered.

## Step 1: Identify Test Cases

This might feel too obvious, but it’s _so_ crucial. You gotta test **every branch**. Every condition in your `if` or `switch` (if you’re feeling fancy) needs a test case.

Let’s break this down:

1. **Test items greater than 10**: Make sure we get that sweet, sweet 20% discount when items exceed 10.
2. **Test items greater than 5 but less than or equal to 10**: Here, we expect that more modest 10% discount.
3. **Test items 5 or less**: Sorry, pal, no discount for you.

## Step 2: Write Tests for Each Condition

Let’s write some tests with Vitest to see this magic happen. No need for mocks or stubs this time—just pure conditional logic.

First things first, let's get Vitest rolling. If you haven’t already, sprinkle a bit of this command into your project:

```bash
npm install vitest --save-dev
```

We’re good to go. Now let’s make sure we’re covering every branch of our function.

```javascript
import { describe, it, expect } from 'vitest';
import { calculateDiscount } from './discounts'; // Assume your function lives here

describe('calculateDiscount - conditional logic tests', () => {
	it('should return a 20% discount if more than 10 items', () => {
		const discount = calculateDiscount(11);
		expect(discount).toBe(0.2);
	});

	it('should return a 10% discount if more than 5 items but less than or equal to 10', () => {
		const discount = calculateDiscount(7);
		expect(discount).toBe(0.1);
	});

	it('should return 0 discount if 5 or fewer items', () => {
		const discount = calculateDiscount(3);
		expect(discount).toBe(0);
	});
});
```

Boom. **Three tests.** All paths covered. Not only is our logic thoroughly tested, but now we have pigeonholed ourselves into knowing when something goes wrong.

## Step 3: Think About Edge Cases

We _all_ know nothing breaks production like an edge case. So, let’s think about situations that aren’t as straightforward—like those pesky boundaries.

1. What happens on the _exact_ boundary (i.e., 5, 10)?
2. What happens if `items` is `0`?
3. What about negative numbers? Should that even be possible?

If you really want to sleep at night, let’s cover those too:

```javascript
it('should return 0 discount for exactly 5 items', () => {
	const discount = calculateDiscount(5);
	expect(discount).toBe(0);
});

it('should return 0 discount for exactly 10 items', () => {
	const discount = calculateDiscount(10);
	expect(discount).toBe(0.1);
});

it('should return 0 discount for 0 items', () => {
	const discount = calculateDiscount(0);
	expect(discount).toBe(0);
});

it('should return 0 discount for negative number of items', () => {
	const discount = calculateDiscount(-1);
	expect(discount).toBe(0);
});
```

If there's one thing we’ve learned in this industry, it's that users will find creative ways to break everything **literally every time**, so we might as well prepare for it.

## Step 4: Refactor with Confidence

Here’s the best part—you can now mess with your logic confidently. Want to tweak the discount thresholds later on? Go ahead! Your tests have got your back. They provide that magical safety net that ensures you’re not unknowingly changing behavior left and right.

Maybe later you decide, "Hey, let’s give a 15% discount for exactly 10 items." You can change:

```javascript
if (items > 10) {
	return 0.2;
} else if (items >= 10) {
	// Adjusted!
	return 0.15; // New sweet spot
}
```

Then, re-run your tests:

```bash
npx vitest run
```

If anything was broken in your refactor—guess what? The tests will scream at you. And you’ll know _exactly_ where to look.

## Conclusion: Embrace Branch Testing

Testing conditional logic is less about making sure things pass and more about making sure you’re covering all the angles. Every condition, every branch, every edge case—it’s all in play. Getting to 100% coverage isn’t just a vanity metric here; it’s a necessity. Without it, you're walking a tightrope without a net.

So, next time you’re sprinkling in conditionals like a chef seasoning a dish, make sure you're seasoning your tests accordingly. Because nothing ruins a refactor faster than a missed `else` clause.
