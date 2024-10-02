---
title: Parallel And Serial Test Execution
description: Learn the difference between parallel and serial test execution.
modified: 2024-09-28T18:32:10.886Z
---

## Parallel and Serial Test Execution in Vitest

Let’s talk about test execution! You’ve probably been there… staring at a terminal, watching tests crawl through one at a time, making you question your life choices. But there's good news—Vitest can run your tests in parallel or serially. And each has its place, depending on what you're testing. Let’s break it down.

### Parallel Test Execution

By default, Vitest tries to make your life better by running tests in parallel. What does this mean? Well, it means Vitest will spin up multiple worker threads and run different test files on them simultaneously. This is fantastic because it can shave serious time off your test suite, especially in larger projects.

Here’s the real-world analogy: Imagine having five friends helping you to clean your house, each tackling a different room. That's parallel execution. You get your house clean much faster than if you did it all on your own.

In Vitest, here's what it looks like in practice (which is actually nothing special to configure, because parallels are on by default):

```bash
vitest
```

Boom. That's it. Your tests are parallel unless *you* tell them otherwise.

#### When to Use Parallel Execution

- You’ve got pure, isolated unit tests that don’t step on each other’s toes.
- Your tests are independent and don’t need sequential state (aka you’re not messing with the same global data).

#### Gotchas with Parallel Tests

Parallel is great—until it’s not. If your tests are making assumptions about data or the state of the world (like global variables or shared databases), running them in parallel can lead to some strange, difficult-to-track-down bugs. So, yes, it makes things fast, but as always, there’s danger hiding in the shadows.

### Serial Test Execution

But wait, what if you want to run things *in order*? Maybe you're testing something like the progression of a workflow or interacting with a global variable that needs to stay consistent across tests. You don’t want Vitest going all "Wild Wild West" on your workflow by running them at the same time. In those cases, you can switch to running tests serially!

Imagine this: You're washing dishes one plate at a time. Not glamorous or fast, but it gets the job done predictably, right? That’s serial execution.

All you have to do is tell Vitest to calm down using the `--run` flag, and tests will happen one-by-one.

#### Setting up Serial Execution

If you want the entire suite to run serially, it’s as easy as:

```bash
vitest --run
```

But let’s say you want most tests to stay parallel, except for a few troublemakers. You can mark individual tests or a suite to run serially by using Vitest’s `test.concurrent` and `test.serial` APIs.

For example, here’s what a serial test might look like:

```javascript
import { test, expect } from 'vitest';

test.serial('should do one thing after another', () => {
	// Your serial test code here
	const actual = 1 + 1;
	const expected = 2;
	expect(actual).toBe(expected);
});
```

#### When to Use Serial Execution

- You’ve got tests with global state (ugh) or databases where one test depends on the result of another.
- You need to simulate a sequence of steps that must happen in a specific order.

### Best Practices for Test Execution

Let's solve the world’s problems (or at least a few testing-related ones):

1. **Prefer parallel testing**: It’ll save you time, frustration, and maybe even some coffee refills. Most tests should be able to run independently.
2. **Use serial sparingly**: Once you start having tons of serial tests, what you’re really doing is introducing potential bottlenecks. Look twice at those tests and see if there's a design flaw you can fix before you resort to serial.
3. **Decouple state**: If your tests *need* to be run in a specific order, ask yourself if there's a better way to write those tests. Could you stub that global state? Could you mock that database? Often, the answer is yes.

### Wrapping Up

Vitest has your back when it comes to both parallel and serial execution. Which one should you pick? Well, parallel should be your go-to. It’s fast, it’s efficient, and it keeps your feedback loop nice and tight. But don’t forget you’ve got that sequential ace in your pocket for those tricky tests where order matters.

Try `vitest --run` if things aren’t working quite right, and remember to laugh when you realize it’s all because multiple tests are sharing that one pesky variable. Ah, JavaScript… always keeping us on our toes.
