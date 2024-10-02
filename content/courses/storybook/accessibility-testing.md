---
title: Accessibility Testing in Storybook
description:
modified: 2024-09-28T11:31:16-06:00
---

Storybook allows you to conduct accessibility audits on your stories using the [`@storybook/addon-a11y`](https://npm.im/@storybook/addon-a11y) addon. Let's get it up and running.

```sh
npx storybook@latest add @storybook/addon-a11y
```

This will add a new tab to your addon pane that will show you any issues that your component might have. Under the hood, it's using [`axe-core`](https://www.npmjs.com/package/axe-core) to run the audit.

From the `axe-core` [`README.md`](https://github.com/dequelabs/axe-core/blob/develop/README.md):

> With axe-core, you can find on average 57% of WCAG issues automatically. Additionally, axe-core will return elements as "incomplete" where axe-core could not be certain, and manual review is needed.

## Running Accessibility Audits as Part of Your Test Suite

There is an integration between [Axe](https://www.deque.com/axe/) and [Playwright](https://playwright.dev/) called—unsurprisingly—[`axe-playwright`](https://npm.im/axe-playwright). What's super cool is that Storybook can spin up Playwright and run these tests for you with it's [test runner](test-runner.md).

> [!important] Dependencies
> You'll need to install `axe-playwright` if it's not already installed. You can take care of that by running `npm install axe-playwright --save-dev`.
>
> Also, if this is your first rodeo with Playwright in your project, you'll need to install its browsers. You can take care of this by running `npx playwright install`.

In `.storybook/test-runner.ts`, you can set up the following configuration.

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

Now, when you run `npx test-storybook`, it will _also_ check for accessibility violations as well.
