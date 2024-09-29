---
title: Running Tests with Vitest
description: Learn how to run tests using Vitest and Vitest UI in your project.
modified: 2024-09-28T18:32:10.877Z
---

From inside of [companion repository](https://github.com/stevekinney/introduction-to-testing), we're going to navigate to `examples/basic-math`. You'll see that we have two files in `src`:

- `calculator.js`
- `calculator.test.js`

You can use `vitest` to run your tests.

```sh
npx vitest

# Or, if you wanted to run your tests with Vitest UI.
npx vitest --ui
```

For our use cases, we have it defined in our `package.json`. For example, you might have the following script in your `package.json`.

```json
{
	// … other stuff
	"scripts": {
		"test": "vitest"
	}
	// more stuff…
}
```

As you've might have noticed, I've already done this for you.

This means that you can do run `npm test` to run our tests. If you wanted to run it with the UI, you could run `npm test -- --ui` to forward the flag to the `npm` script.

```ts
```