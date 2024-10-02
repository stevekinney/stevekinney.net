---
title: Setting Up Playwright
description: Let's get Playwright installed and working in a project.
---

In `tests/counter.spec.js`, let's write a simple test to make sure that the page has the title we'd expect.

```js
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('http://localhost:5173');
});

test('has title', async ({ page }) => {
	await expect(page).toHaveTitle(/Accident Counter/);
});
```

## Checking the Initial State

We can also add a test to make sure that the counter starts at the correct number.

```ts
test('has the correct count at the start', async ({ page }) => {
	await expect(page.getByTestId('counter-count')).toHaveText('0');
});
```

## Increment the Counter

> [!example] Click the Increment Button
> Okay, quick example time. Can you go ahead and click the **Increment** button?
> Verify that the count has been incremented. If you want to go for a victory lap,
> then you can also verify that the title has changed as well.

## Spinning Up and Tearing Down the Vite Server

If we want to take the hassle out of needing to remember to spin up the Vite server in another terminal, we _could_ do that programmatically.

```js
import { createServer } from 'vite';

/**@type {import('vite').ViteDevServer} */
let server = null;

test.beforeEach(async ({ page }) => {
	server = await createServer({
		configFile: './vite.config.js',
		root: process.cwd(),
		server: {
			port: 1337,
		},
	});
	await server.listen();
	await page.goto('http://localhost:1337');
});

test.afterEach(async () => {
	await server.close();
});
```
