---
title: Using Async/Await
description: Handling asynchronous code with async/await in Vitest.
modified: 2024-09-30T14:27:33-06:00
---

As with almost everything in JavaScript, asynchronous code makes everything harder. (**Spoiler**: But, also—as with almost everything in JavaScript relating to asynchronous code, `async`/`await` tends to make that hard part easier.)

Consider this test for a moment:

```ts
test('Asynchronous code accidentally passes', () => {
	setTimeout(() => {
		expect(false).toBe(true);
	}, 1);
});
```

It's not that this test is any good, it's just that the assertion never runs.

```ts
test('Asynchronous code has zero expectations', () => {
	expect.assertions(0);

	setTimeout(() => {
		expect(false).toBe(true);
	}, 1000);
});
```

Put another way, we can assert that our assertion never—umm—*asserts*.

```ts
test.fails('Code inside of callback never runs', () => {
	expect.hasAssertions();

	setTimeout(() => {
		expect(false).toBe(true);
	}, 1000);
});
```

In some frameworks, you'd be able to do something like this.

```ts
// 🚨 This will not work in Vitest.

test('Code inside of callback never runs', (done) => {
	expect.hasAssertions();

	setTimeout(() => {
		expect(false).toBe(true);

		done();
	}, 1000);
});
```

As the comment says, this will *not* work in Vitest. I only mention it because this course isn't supposed to be Vitest-specific—that's the just the tool we chose to use. Regardless, what follows is *probably* what you want anyway.

## Using `async`/`await`

We no longer live in a world riddled with callbacks. These days, most of our asynchronous code either uses `async`/`await` or—at least—uses promises.

Consider the following two tests:

```ts
const addAsync = (a: number, b: number) => Promise.resolve(a + b);

it.fails("fails if you don't use an async function", () => {
	const result = addAsync(2, 3);

	expect(result).toBe(5);
});

it('passes if use an `async/await`', async () => {
	const result = await addAsync(2, 3);

	expect(result).toBe(5);
});
```

The first test fails with the following error:

```diff
- Expected "5"

+ Received "Promise {}"
```

> [!TIP] Working with Promises
> If you're working with Promises, [Vitest also has some special functionality](testing-promises.md) that you could optionally use.

## Further Reading

- [Testing Promises](testing-promises.md)
- [Testing Asynchronous Errors](testing-asynchronous-errors.md)
