---
title: Understanding Test Context
description: Learn how to use the test context feature in Vitest effectively.
modified: 2024-09-28T15:34:11-06:00
---

Allow me to paint a picture: Imagine you’re working on a project (yours or the team's chaotic Frankenstein) where every test depends on some shared state, configuration, or custom data per test. You want to pass information along with your tests in a way that doesn’t feel like duct-taping random values onto global variables. What do? Enter **test context** in Vitest.

Test context is your handy sidekick when you’ve got some config or data that’s different for each test but still needs to be easily accessible throughout your test body. Instead of manually juggling variables in each test case, **Vitest** lets you bind any contextual values you need to the test instance itself. Let’s take a look at how you get that sweet context going.

Vitest's [test contexts](https://vitest.dev/guide/test-context.html) are inspired by [Playwright's fixtures](https://playwright.dev/docs/test-fixtures).

`it` and `test` take a function as a second argument. This function receives the test context as a argument. The test context has two main properties:

- `meta`: Some metadata about the test itself.
- `expect`: A copy of the Expect API bound to the current test.

## Setting Context with `test.context`

Vitest gives you this magical `test.context` object that you can throw stuff into inside each test. Basically, think of `test.context` as that utility belt where Batman (you) can keep all your gadgets and not let things get messy. Each test gets its own context, so they don't bleed values into each other—thankfully saving you from one of those *"Why does everything break when I run all my tests together?"* moments.

Let's write a simple test that stores something in the context:

```javascript
import { test, expect } from 'vitest';

test('it should store a value in the context', (ctx) => {
	// let's put some cool stuff into this context thing
	ctx.foo = 'bar';

	expect(ctx.foo).toBe('bar');
});
```

Let’s slow down here: The `ctx` object that you see there? That’s the context. You can store whatever floats your boat into it, and it's local to **that particular test**. In this case, we’re shoving a `'bar'` value into the `ctx.foo` slot and then asserting that it’s there. Straightforward and to the point, right?

## Accessing Context in Hooks

Hold on—you’re probably thinking, *What if I want to set the context before the test runs? Like in some `beforeEach` hook?*

That's exactly where contexts are even more powerful. You can modify test contexts *inside* `beforeEach()` or even `afterEach()` hooks, which makes them ridiculously useful when you need to do some setup for each test without cluttering the test itself.

Check this out:

```javascript
import { beforeEach, test, expect } from 'vitest';

beforeEach((ctx) => {
	// let's set the context up in a hook
	ctx.user = { name: 'Alice', role: 'admin' };
});

test('it should access the context modified in beforeEach', (ctx) => {
	expect(ctx.user.name).toBe('Alice');
	expect(ctx.user.role).toBe('admin');
});

test('it should have a different context for each test', (ctx) => {
	// this is a fresh context, distinct from the previous test
	expect(ctx.user.name).toBe('Alice');
	ctx.user.role = 'editor';
	expect(ctx.user.role).toBe('editor');
});
```

Here, we’re stuffing a `user` object into the context in the `beforeEach` hook. Now, every test has access to this juicy context without repeating yourself, which is super important when you're trying to keep tests DRY and not copy-paste the same setup all over the place.

And notice: Each test gets its **own** isolated context. So changes in one test are **not** going to mess with another.

## Context Between Tests Is Isolated

Now, you might be wondering: *So what happens with context across multiple tests?* The cool thing is that each test has **its own context instance**, meaning that you can safely modify the context within a test, and it won't affect other tests.

Earlier, when we updated `ctx.user.role = 'editor'` in the second test, it didn’t affect the `user.role` in the first test. That’s the context doing its job to keep things isolated and sane. You don’t want to be in a world where tests are secretly sharing information behind your back. Trust me, it’s a dark place.

## Practical Example: Mocking an API in Context

A real-world-ish example: let’s say you need to mock an API result, and each test needs different data. You could slap this onto the context using the hooks. Watch this:

```javascript
import { beforeEach, test, expect } from 'vitest';

// pretending we're mocking some API, no big deal
beforeEach((ctx) => {
	ctx.apiResponse = { data: 'default' }; // set default data
});

test('api returns default data initially', (ctx) => {
	expect(ctx.apiResponse.data).toBe('default');
});

test('api returns different data for another test', (ctx) => {
	// yeah, just modify the context for this test only
	ctx.apiResponse.data = 'different!';

	expect(ctx.apiResponse.data).toBe('different!');
});
```

What did we do here? We initialized a default API response in `beforeEach`, letting every test have its own clean slate. If one test needs the response to be different, it can override the context for that specific run without bothering any other test.

## When Context Could Be Too Much

So context is neat and all, but just because you *can* doesn’t always mean you *should*. It’s tempting to start treating `ctx` like a storage locker, cramming everything in there. Do you really need twenty variables in your test’s context? Probably not. Sometimes, it’s better to keep your tests straightforward and only use context sparingly, for setup values or shared instances that genuinely make sense.

Context is awesome for reducing shared setup boilerplate, but don’t let it grow into this abstract mess of values you have to keep track of later. The goal is to make tests readable and maintainable, right? If `test.context` helps with that, great! If not, maybe step back and think about whether you're trying to solve a problem that doesn’t really exist (we've all been there).

## Conclusion

Vitest’s test context is like that sneaky-but-helpful tool you didn’t know you needed. It keeps your tests clean, lets you pass around data smoothly, and helps avoid the weird pitfalls of global state between tests. Just remember: moderation is key. The context is there to help, but don’t turn it into a dumping ground!
