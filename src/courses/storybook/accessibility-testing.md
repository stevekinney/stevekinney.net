---
title: Accessibility Testing in Storybook
description:
exclude: false
drafted: false
modified: 2024-04-06T12:49:32-06:00
---

Storybook allows you to conduct accessibility audits on your stories using the [`@storybook/addon-a11y`](@storybook/addon-a11y) addon. Let's get it up and running.

```sh
npx storybook@latest add @storybook/addon-a11y
```

This will add a new tab to your addon pane that will show you any issues that your component might have. Under the hood, it's using [`axe-core`](https://www.npmjs.com/package/axe-core) to run the audit.

From the `axe-core` [`README.md`](https://github.com/dequelabs/axe-core/blob/develop/README.md):

> With axe-core, you can find on average 57% of WCAG issues automatically. Additionally, axe-core will return elements as "incomplete" where axe-core could not be certain, and manual review is needed.

## Running Accessibility Audits as Part of Your Test Suite

There is an integration between [Axe](https://www.deque.com/axe/) and [Playwright](https://playwright.dev/) called—unsurprisingly—[`axe-playwright`](https://npm.im/axe-playwright). What's super cool is that Storybook can spin up Playwright and run these tests for you with it's [test runner](test-runner.md).

```ts
import type { TestRunnerConfig } from '@storybook/test-runner';
import { injectAxe, checkA11y } from 'axe-playwright';

const config: TestRunnerConfig = {
	async preVisit(page) {
		await injectAxe(page);
	},
	async postVisit(page) {
		await checkA11y(page, '#storybook-root', {
			detailedReport: true,
			detailedReportOptions: {
				html: true,
			},
		});
	},
};

export default config;
```
