---
title: Why You Don’t Need 100% Code Coverage
description: Code coverage is a tool, not a goal. Let’s discuss why.
modified: 2024-09-28T16:14:08-06:00
---

Ah, [code coverage](code-coverage.md)—the metric that tempts us with thoughts of **perfection**. It dangles the promise that, if only we got 100%, our software would be an impenetrable fortress of correctness. But like many things in the beautiful yet chaotic world of development, that’s just not true.

Here’s the deal: code coverage is **a tool**, not a goal. And making it your goal can lead to some *questionable* decisions that ultimately make your life worse—not better. Let’s break this down step by step with a combination of common sense, experience from the trenches, and maybe a dash of reality-check humor.

## What Code Coverage Actually Tells You

Code coverage measures how much of your code gets executed during tests, and it breaks down into a few categories:

- **Line coverage**: How many lines of code get run.
- **Function coverage**: How many functions get called.
- **Branch coverage**: How many branches (like `if` conditions) are tested.

It’s a **quantitative** measurement—it tells you *how much*, but not *how well*. We can get 100% code coverage, sure, but that number tells us *nothing* about whether our tests are *actually meaningful*. You could write thousands of lines of tests that don’t assert a single sensible thing and, uh, it’ll still say 100%. It’s a bit like telling yourself eating 100% of a family-sized pizza is *self-care*. The action feels good, but was it *really* healthy?

## What Happens When You Chase 100%

Let’s consider this in practice. You’ve got your features all tested, but there are little pockets of imperfection: maybe some error-handling logic, a dead-end function that’s rarely used. And you think, “I’ll just test this real quick to push that coverage up!” But here’s what that process could look like:

### Writing Silly, Useless Tests

To hit that sweet 100%, chances are you’ll end up writing tests that don’t do anything valuable:

```js
it('loads with no errors', () => {
	expect(true).toBe(true);
});
```

Yeah, you ran some code. Congratulations? Getting those extra percentage points by writing trivial tests can feel satisfying, but in reality, you’ve added zero value. You’re testing for the sake of testing, not to catch potential issues or improve the design of your code.

### Ignoring Tests with Actual Value

You’re too focused on coverage, so you bypass tests that predict real-world failures. Like, what happens when users give you bizarre input? Or your database goes on vacation? These are valuable scenarios to handle, and they almost always require thinking beyond “Did I run this line of code?” But if you're obsessed with that last 2% of coverage, you might just forget to cover *bad cases*, and that’s where bugs love to live.

### You’re Encouraging Fragile Tests

Congrats, you hit 100%! But now someone refactors just one set of error handling paths, or they change up the internals slightly. All your coverage-pumping tests break, and they’re breaking because they weren’t *actually testing the important stuff*. That’s a mess. And nobody’s happy when suddenly you’re looking at 30 failed tests, none of which are helping you understand why reality is falling apart.

## What Should You Do Instead?

So instead of chasing 100% just to see those green bars light up, **focus on testing what actually matters**.

### Prioritize Critical Code Paths

You want to make sure you’re thoroughly testing the critical parts of your app—the kind of stuff that users are hitting all the time. Logging in, creating accounts, fetching data, handling payments. Make sure these workflows are airtight.

Pro tip: Use Vitest’s built-in coverage tool just as a **guide** to identify parts of your program you're not thinking about as much. If you’re missing important paths in the code, or any particularly ugly edge cases? Use the coverage report to focus you, but not to control you.

### Test for Real-World Scenarios

Think: “What could actually go wrong? What happens when the sun is shining and when it all goes bad?” Focus on tests that simulate realistic (and freakish) user behavior. For example, what does your app do if someone inputs 30,000 characters into a search box? Or if a third-party service returns a 500 error? Those aren’t lines covered, but **real scenarios guarded against**.

### Write Meaningful, Maintainable Tests

Every test you write should make sense to a future version of yourself or someone else who has to work on the code. Avoid testing implementation details! The more you tie your tests to the internal workings, the harder refactoring becomes.

And guess what? Vitest makes this simpler. With its tight integration into your coding workflow (it works with Vite, which is already delightfully fast), you’re encouraged to write meaningful tests *as you go*. No need to be bogged down by those pointless coverage chases.

## Final Thoughts

I get it. That feeling of hitting 100% on your coverage report—it’s tantalizing. But don’t sacrifice sanity and meaningful tests for artificial perfection. When you lower the pressure to hit that arbitrary mark, you can focus on what’s *actually important*, which is answering, “Does my code work in **the real world**?”

Let’s embrace a more reasonable challenge: shooting for **sufficient** code coverage, with tests that are thoughtful, maintainable, and make debugging worth your time. And hey, on a good day, if it reaches 80% and you can sleep soundly, that’s a win.

Trust me—the users don’t care about your coverage stats. They care about whether the app *actually works*.
