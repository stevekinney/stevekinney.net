---
title: Filtering Tests
description: Learn how to filter tests in Vitest by name, directory, and more.
modified: 2024-09-29T14:05:40-06:00
---

Vitest gives you a bunch of interesting ways to only run *some* of your tests. Let's walking some of the more popular ones.

## Filtering by File Name

If you provide an argument to Vitest, then it'll filter your tests and only try to match the ones with that name.

```sh
npx vitest arithmetic
```

This will run `src/close-enough.test.js`, but none of the other ones.

## Filtering by Test Name

You can also use the `--testNamePattern <pattern>` (or, `-t`, for short) option to filter tests by their name. This can be helpful when you want to filter by the name that you gave the test using either `it` or `test` within a file rather than the name of the file containing the test.

## Filtering by Folder or Directory

The `--dir` flag in Vitest specifies the directory you want Vitest to go looking for tests.

```sh
vitest --dir ./packages/api
```

By providing a directory path as the argument to the `--dir` flag, Vitest will go ahead and recursively search for test files within that directory—and its subdirectories. This allows you to easily specify a specific directory to run tests from, instead of running tests from the entire project.

## Filtering at the Individual Test Level

Sometimes, we don't want all of our tests to run. Some times we only want certain tests to run.

- `test.skip`: Skip this test for now.
- `test.only`: Only run this and any other test that uses `.only`.
- `test.todo`: Note to self—I still need to write this test.
- `test.fails`: Yea, I know this one fails. Don't blow up the rest of the test run, please.

## Only Run Certain Tests

You can use `.only` if you want to run *only* a few of your tests.

```ts
it.only('should work', () => {
	expect(true).toBe(true);
});

test('works with "test" as well', () => {
	expect(true).not.toBe(false);
});
```

## Skip Certain Tests

Alternatively, you can `skip` tests that you don't want to run right now.

```ts
import { it, expect, test } from 'vitest';

it('should work', () => {
	expect(true).toBe(true);
});

test.skip('works with "test" as well', () => {
	expect(true).not.toBe(false);
});
```

Alternatively, you can use `todo` to signify that you want to skip this test for now, *but* it's because you intend to write an implementation for it… eventually.

```ts
it('should work', () => {
	expect(true).toBe(true);
});

test.todo('works with "test" as well', () => {
	expect(true).not to be false);
});
```

## Conditionally Run Tests

You saw some of these (well, the first two) before, but I'll call them out just in case you missed them:

- `test.skipIf`: Only skip this one if I give you a truthy value.
- `test.runIf`: Only run this test if I give you a truthy value.
- `test.concurrent`: Run this test in parallel with any other test using `.concurrent`. We'll cover this in [parallelizing-tests](parallelizing-tests.md).
- `test.each`: I want to generate a bunch of tests. We'll cover this in [Parameterizing Tests](parameterizing-tests.md).

## Examples

```ts
test.runIf(process.env.NODE_ENV === 'development')(
	'it should run in development',

	() => {
		expect(process.env.NODE_ENV).toBe('development');
	},
);
```

```ts
test.skipIf(process.env.NODE_ENV !== 'test')('it should run in test', () => {
	expect(process.env.NODE_ENV).toBe('test');
});
```

## Dynamically Filter Tests

When Vitest (or Jest, for that matter) are watching for changes, you can press the **h** key to open up some options:

- press **a** to rerun all tests
- press **f** to rerun only failed tests
- press **u** to update snapshot
- press **p** to filter by a filename
- press **t** to filter by a test name regex pattern
- press **q** to quit

Filtering by test name can be super useful if you're like me and don't trust yourself to remember to remove your `skip` and `only` annotations. (Although, we'll talk more about this later.)

## Filter Tests By Filename When Starting Up

```ts

npm test foo

```

This will run `foo.test.ts`, but *not* `bar.test.ts`.

## `vitest related`

This will run tests related to whatever file you provide. (So, this is like filter but adds a few more to the mix.)

## `vitest --changed`

Runs tests related to files that changed. Out of the box, this will be against any uncommitted files. But, you can also do cool stuff like `--changed HEAD~1` or give it a branch name to compare to or a particular commit.
