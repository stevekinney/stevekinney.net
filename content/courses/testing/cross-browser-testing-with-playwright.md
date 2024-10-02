---
title: Cross-Browser Testing with Playwright
description: Learn how to perform cross-browser testing with Vitest and Playwright.
modified: 2024-09-28T14:34:59-06:00
---

Let’s talk about cross-browser testing, because let’s be real, the odds that your app is only ever going to be used on the latest Chrome version are about as good as finishing a Friday without hitting *at least* one merge conflict. You’ve got users out there with different setups—Safari, Firefox, Edge, maybe even IE11 (gross).

Let’s explore a quick and practical way to set up cross-browser testing so you can handle browser quirks without rage-clicking into oblivion.

## Install Vitest with Playwright

To test an app across multiple browsers, we need a headless browser automation tool to simulate them. We're going to use **Playwright** because it allows us to run tests in different browsers like Chrome (or its shy sibling, Chromium), Firefox, and WebKit (covers Safari). Best part? It snaps right into your Vitest setup.

First, you need to get Vitest and Playwright working in cosmic harmony:

```bash
npm install vitest @playwright/test
```

That gives you access to Playwright’s automated browsers inside Vitest. It’s like peanut butter and jelly, but for JavaScript testing.

## Configure Vitest for Playwright

Next up: managing browser environments with Vitest. However, before we jump in, let’s set up our Playwright config. Create a file `playwright.config.ts` in your root directory:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run dev',
		port: 3000,
	},
	use: {
		browserName: 'chromium', // default browser, we'll override this in our tests
		headless: true, // no need to pop open an actual browser tab
	},
});
```

Make sure your local server runs on port 3000. You can change that up, depending on your setup. Playwright’s built-in config is super helpful here because it knows how to control browser settings.

## Writing a Cross-Browser Test

Now, let’s write a feature test and run it through a bunch of browsers.

First, in your test file, import what we need for automated testing:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Cross-browser button test', () => {
	test('should render a button in Chromium', async ({ page }) => {
		await page.goto('http://localhost:3000');
		const button = await page.locator('button');
		await expect(button).toHaveText('Submit');
	});

	test('should render a button in Firefox', async ({ page }) => {
		await page.goto('http://localhost:3000');
		const button = await page.locator('button');
		await expect(button).toHaveText('Submit');
	});

	test('should render a button in WebKit', async ({ page }) => {
		await page.goto('http://localhost:3000');
		const button = await page.locator('button');
		await expect(button).toHaveText('Submit');
	});
});
```

You could get fancier with this, but we’re trying to keep it simple for now. Here, Vitest is forcing Chrome (via `chromium`), Firefox, and WebKit (hello, Safari!) to go to `localhost:3000` and check if the button labeled 'Submit' exists. It's like a check-in for all major browsers.

## Running the Tests

To kick off your tests, create a simple script in your `package.json`:

```json
"scripts": {
  "test:e2e": "vitest run"
}
```

Then run the script with:

```bash
npm run test:e2e
```

Vitest will spin up the Playwright scripts, pull up virtual browsers, and run the tests. The browsers don’t actually pop open on your screen because we’re in `headless` mode, but trust me—they're doing the hard work in the background.

## Test in Multiple Browsers Simultaneously

If you'd rather **test multiple browsers in parallel**, you can modify the syntax with loops or Playwright's `projects` feature. Playwright can run tests across multiple browsers like a multitasking wizard, but without making you burn extra brain cycles:

```typescript
test.use({ browserName: 'webkit' });
test('webkit test', async ({ page }) => {
	await page.goto('https://example.com');
	// Your test here for WebKit
});
test.use({ browserName: 'firefox' });
test('firefox test', async ({ page }) => {
	await page.goto('https://example.com');
	// Your test here for Firefox
});
```

This efficiently loops through the browser tests so you're not cluttering your `test.describe`.

## Wrapping Up

The great thing is that Vitest lets Playwright do most of the heavy lifting, running your app inside the simulated browsers with minimal setup. Not only do you get faster feedback, but you've also got some serious coverage across the major browsers without installing half a dozen VMs or keeping an ancient version of IE lying around.

Is cross-browser testing still painful? Meh, a little. But, at least we’ve got the tools to help make it just painful *enough*.
