---
title: Testing Environment-Dependent Code with Spies
description: Learn how to reset VITE_ENV in Vitest using beforeEach and vi.stubEnv.
modified: 2024-09-28T15:08:07-06:00
---

Maybe you want to make sure your code behaves as expected given different environment variables. You could get really fancy in the way you filter your tests—or, you could just mock those environment variables for a hot minute.

Consider this example in `examples/logjam/src/log.test.js`.

```ts
describe('development', () => {
	beforeEach(() => {
		vi.stubEnv('MODE', 'development');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('logs to the console in development mode', () => {
		const spy = vi.spyOn(console, 'log');

		log('Hello, world!');

		expect(spy).toHaveBeenCalledWith('Hello, world!');
	});
});
```

More importantly, we probably want to make sure that _doesn't_ log in production.

```ts
describe('production', () => {
	beforeEach(() => {
		vi.stubEnv('MODE', 'production');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('does not log to the console in production mode', () => {
		const spy = vi.spyOn(console, 'log');

		log('Hello, world!');

		expect(spy).not.toHaveBeenCalledWith('Hello, world!');
	});
});
```
