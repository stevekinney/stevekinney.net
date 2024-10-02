---
title: Advanced Test Configuration With Vitest
description: Dive into advanced Vitest configurations for better efficiency.
modified: 2024-09-28T13:10:18-06:00
---

## Customizing the `vitest.config.ts`

Vitest is pretty awesome right out of the box, but sometimes you need to customize things to fit your project. This brings us to the `vitest.config.ts` file.

> \[!NOTE] This is Mostly Vite-Related Content
> Most of what we're covering here related to Vite—and thereby Vitest. Our friends at [Frontend Masters](https://frontendmasters.com) have [a whole course on Vite](https://frontendmasters.com/courses/vite/) that is taught by a *very* dapper instructor.

Here’s a basic one as a refresher:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		coverage: {
			reporter: ['text', 'json', 'html'],
		},
	},
});
```

This gives you a decent setup—global variables available across all tests, using `jsdom` —but Vitest's true power shines through when you start to flex this configuration.

### Setting up Test Aliases

Let’s knock out something simple but powerful: **path aliases**. If you're deep into a project, your imports are probably starting to look like a tangled mess of relative paths.

```ts
import MyComponent from '../../../../../component/MyComponent';
```

*Yikes*, right? Time to leverage Vitest's configurability. You can set up path aliases to tidy things up.

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			'@components': path.resolve(__dirname, 'src/components'),
			'@utils': path.resolve(__dirname, 'src/utils'),
		},
	},
});
```

Now in your tests, it’s much cleaner:

```ts
import MyComponent from '@components/MyComponent'; // Phew.
```

Neat and readable. Plus, we’re already one step closer to a maintainable codebase.

### Handling ESM and CommonJS Together

Ah yes, the modern mess of JavaScript modules. You're probably encountering both in your project, and it can get nasty when you try to test them. Sometimes, you need to treat CommonJS and ESM *differently*. No problem—Vitest’s got you covered.

```ts
export default defineConfig({
	test: {
		deps: {
			fallbackCJS: true, // Handle CommonJS dependencies that break ESM resolution
		},
	},
});
```

This little addition can save you headaches when testing packages that work with `require()` while your code lives in the glorious land of `import`.

### Isolating Test Environments

Here's a quick scenario. Let’s say you're testing a Node application. You’re using actual **file reads**, and it is *slow*. But you know about mocking, right? But wait! Before you even get into mocking (which is another can of worms), Vitest lets you run each test file in complete **isolation**—sort of like a mini-reset between each run.

```ts
// vitest.config.ts
export default defineConfig({
	test: {
		isolate: true, // Ensure each test file runs in its own VM context
	},
});
```

This turns each test file into its own bubble. That means if you're changing `global variables`, messing with servers, or tweaking API states, Vitest will restore the peace and clean up the neighborhood automatically after each file.

## Test Timeouts and Reruns

So, what happens when one of your tests drags on, like… for-ev-er. Maybe it depends on network latency or takes a second to spin up resources. You don’t want your test suite hanging just because one test feels a little lazy, right? Vitest lets you set **global timeouts**, but you can configure them on a *test-by-test* basis too. Get ready to save precious minutes of your life:

### Global Timeouts

```ts
export default defineConfig({
	test: {
		testTimeout: 5000, // 5 seconds, if it takes longer, something is wrong.
	},
});
```

That’s right, 5000 milliseconds. More than enough time for most tests. If anything runs longer than that, Vitest will scream at you, and maybe it’s time to investigate **why**.

### Test Rerun: Flaky Test Insurance

That occasional test that just decides it wants some attention by failing randomly? (Yeah, we *all* have that *one* test.) Let’s tell Vitest to rerun it automatically a few times before calling it a failure:

```ts
export default defineConfig({
	test: {
		retry: 2, // Will rerun a failing test 2 times before marking it as failed
	},
});
```

Boom—no more "it failed on CI but passed locally" headbanging. But hey, if it's failing more than twice, it's time for **you** to shine your detective cap.

## Fine-Tuning Watch Mode

Here's what usually happens after you start integrating **watch mode** into your life: you make a tiny code change, Vitest detects it, runs hundreds of tests, and suddenly your CPU is on fire. Yeah, running everything might be overkill. Luckily, we can refine which tests are run on each watch cycle for better speed.

### Only Run Changed Tests

```ts
export default defineConfig({
	test: {
		watch: {
			include: ['src/**'],
			exclude: ['node_modules/**', '*.spec.js'], // avoid triggering for these
		},
	},
});
```

This way, you're far more selective during your test runs—letting you focus only on the changes that matter.

## Conclusion

The goal here isn’t just about writing squeaky-clean tests—**it’s about staying sane** while doing it. Take these tips as your advanced toolbox to wield Vitest the next time complexity strikes.
