---
modified: 2024-09-28T15:19:02-06:00
title: Auto-Mocking in Vitest
description: Let Vitest mock dependencies on your behalf.
---

Vitest allows you to automatically [mock](mocks.md) entire modules or specific functions, making it easier to isolate and test code without manually creating mocks for every function. Auto-mocking is particularly useful when you are testing complex systems with many dependencies.

You can automatically mock a module using `vi.mock()`:

```js
vi.mock('./api', () => ({
	getConcertDetails: vi
		.fn()
		.mockResolvedValue({ band: 'Green Day', venue: 'Madison Square Garden' }),
}));
```

This will mock the entire `api` module and replace `getConcertDetails` with a mock function that returns predefined data. Auto-mocking simplifies the process of managing mocks in large tests by allowing you to define mocks upfront.
