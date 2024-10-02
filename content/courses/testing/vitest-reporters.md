---
title: Reporters in Vitest
description: Learn how to create and implement custom reporters in Vitest.
modified: 2024-09-28T14:40:20-06:00
---

Reporters are what you see in your terminal when you run your tests. It turns out that there are some options here. I've almost always used the built-in, default reporter. But, maybe you want something different. Or maybe, you *need* a different format for some other kind of tooling to ingest or something.

### Default Reporter

By default, Vitest goes with a pretty simple format in your terminal. It's essentially the *classic newsroom feel*: you get a list of all test suites, along with which tests passed or failed.

Let’s simplify this with a quick setup and run:

#### Install Vitest (if You Haven't already)

```bash
npm install vitest --save-dev
```

#### Create a Simple Test File (`example.test.js`)

```js
import { expect, test } from 'vitest';

test('math works', () => {
	expect(1 + 1).toBe(2);
});

test('this one will fail', () => {
	expect(2 + 2).toBe(5);
});
```

#### Run Your Tests

```bash
npx vitest
```

Here’s the output from your terminal:

```ts
 PASS  example.test.js > math works
 FAIL  example.test.js > this one will fail
     expect(received).toBe(expected) // Object.is equality

     Expected: 5
     Received: 4

   ● example.test.js:6:20

Test Files  1 failed | 1 passed
```

Simple and to the point, right? But sometimes we want **more** or **less**.

### Built-in Reporters

Vitest comes with a bunch of built-in reporters like your standard "news anchors," each with a different style of reporting the testing situation. Here are some of the most commonly used ones:

#### Dot Reporter

The **dot** reporter is for people who think the terminal’s main job is to stay as quiet and non-verbose as possible. It gives you a dot for every test, and a failure means the dot will turn red. Think of it like the minimalist approach to testing:

```bash
npx vitest --reporter dot
```

And here’s what it'll output:

```ts
  ..F
```

Translation: Two tests passed (.), and one failed (F). Short, sweet, and ready for your brain to decode it.

#### Verbose Reporter

Maybe you're more of a *give-me-everything* kinda person. If you want your test output to feel like a full log of basically every tiny thing going on, the **verbose** reporter is your jam.

```bash
npx vitest --reporter verbose
```

With this, you’ll get a blow-by-blow account including the test suites, individual tests, and detailed results. Verbose is like the sports commentator that describes the entire game in full detail.

#### JSON Reporter

Sometimes, we’re not even interested in human-readable formats. Who needs it, right? Maybe you're plotting to feed your test results into some external dashboard or CI/CD pipeline as part of an automated process. The **json** reporter will output your test results in a JSON object:

```bash
npx vitest --reporter json
```

Here’s a simplified version of the output:

```json
{
	"numFailedTests": 1,
	"numPassedTests": 1,
	"testResults": [
		{
			"name": "math works",
			"status": "passed"
		},
		{
			"name": "this one will fail",
			"status": "failed"
		}
	]
}
```

#### Tap Reporter

For old-school engineers or teams using certain CI systems, the **tap** format (Test Anything Protocol) is a time-tested tool you'll recognize. This spits out the results in a format which is designed for other systems to process:

```bash
npx vitest --reporter tap
```

You’ll get output like this:

```ts
TAP version 13
1..2
ok 1 math works
not ok 2 this one will fail
```

Yep, it's that minimal and direct. It’s all about the machines, man.

### Combining Reporters

What if you want the best of both worlds? Say you want the **dot** reporter for your command-line scanning, and the **json** reporter to send results to CI?

Good news, you can totally combine them together, like ketchup and mustard. Just pass them both:

```bash
npx vitest --reporter dot --reporter json
```

Boom. Now you’ve got dots in your terminal and JSON data flying wherever you want it!

## Custom Reporters

You’ve got your tests running with Vitest, and everything looks shiny… except maybe the default output doesn’t scratch that developer itch, right? Maybe you’ve got a VIP watching over your CI pipeline who's like, "It's fine, but I wish it looked *cooler*."

Or maybe you're staring at your terminal and thinking, "Could this have more info—*or*, could it bless me with *less* info?" Time to roll up your sleeves and whip up a **custom reporter**.

Vitest lets you create custom reporters to control what gets spit out in your command line. Let’s walk through crafting a custom reporter that’ll make your tests feel more at home, whether that’s jazzed up or minimalistic.

## Why Custom Reporters Matter

Imagine this: you’ve got a CI pipeline breaking *occasionally* (ugh), and you need to get to the root cause ASAP. The default reporter's output is okay, but what if you could give it just a *bit* more context? Custom reporters allow you to surface specific information that’s helpful in your scenario—whether that’s cleaner logs, specific metrics, or a creative touch that livens up your test reports.

Some other hypothetical use cases:

- Making CEOs and managers feel *something* when they see test results.
- Addressing special requirements for audit or compliance reasons.
- Controlling the noise level—sometimes you just want the deets, not the fanfare.

## Setting Up a Custom Reporter

Great, the “why” is clear. Now let’s get our hands dirty and write one.

Vitest gives you a hook into the test runner through a **Reporter API**. The basic structure involves creating a class with methods that correspond to certain test events—like when a test starts, finishes, or (heaven help us) fails.

Let’s craft a simple custom reporter that says, "Hello, testing world," whenever a test starts.

```js
// hello-world-reporter.js
export class HelloWorldReporter {
	onTestStart(test) {
		console.log(`Hello from ${test.name}`);
	}

	// Optional: here's where all your reporting dreams can come true
	onTestPass(test) {
		console.log(`🎉 Hooray! Test passed: ${test.name}`);
	}

	onTestFail(test) {
		console.log(`💥 Oh no! Test failed: ${test.name}`);
	}
}
```

## Hooking It Into Vitest

Okay, we’ve got the *HelloWorldReporter* locked and loaded. Now we just need to tell Vitest to use it.

Here’s how you connect it in your `vitest.config.js` file.

```js
import { defineConfig } from 'vitest/config';
import { HelloWorldReporter } from './hello-world-reporter';

export default defineConfig({
	test: {
		reporters: [new HelloWorldReporter()],
	},
});
```

In this case, `reporters` expects an array. You could add multiple reporters to combine custom ones with Vitest’s built-ins (like `['default', new HelloWorldReporter()]`). It’s basically like building a superhero team of test output handlers.

## Running Your Tests with the Custom Reporter

Boom! That’s it. Now, when you run `vitest`, you’ll start seeing your custom messages come through.

```bash
$ vitest

 Hello from Sample Test
 🎉 Hooray! Test passed: Sample Test
```

If a test fails? Expect some fireworks:

```bash
 💥 Oh no! Test failed: Crazy Edge Case
```

## Where to Take This Next

Custom reporters vary *wildly* depending on what you’re trying to achieve. Maybe you want to generate a file with summary stats, spit out a more compact report for quicker reads, or build a visual dashboard from the results.

You can go as simple or complex as you need. Heck, you could even pipe your results into a `Slack` webhook or have them broadcast in Morse code over the office speakers (not that I’d recommend it, but *hey*, it's your world).

Key things you can hook into:

- `onTestStart(test)` – The moment a test begins
- `onTestPass(test)` – When a test sails through
- `onTestFail(test)` – Your test hits the *failure iceberg*
- `onRunComplete(testResults)` – Everything’s done and dusted
