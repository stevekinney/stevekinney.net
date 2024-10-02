---
title: A Comprehensive Guide to Mocks in Testing
description: Learn how mocks simplify tests by controlling behavior.
modified: 2024-09-28T15:16:29-06:00
---

Generally, speaking it's not helpful to test code that you don't control.

The TL;DR of mocking is that sometimes we need to swap out things we don't control with things that we *do*. For example, it might be outside of the scope of our test to make sure that a third-party API goes down. Or, if that API isn't free, you don't necessarily want to run up a bill every time you run your test suite, right?

A *mock* is a more powerful and flexible type of [test doubles](test-doubles.md) that can both define behavior (like a [stub](stubs.md)) and record information (like a [spy](spies.md)). Mocks allow you to specify exactly how a function should behave, including return values, thrown errors, or complex interactions, while also tracking the number of calls and arguments passed.

> \[!NOTE] Best Practices and Common Pitfalls
> We'll cover this in the slides, but you can review the [best practices and common pitfalls with mocking here](mocking-best-practices.md)

## Key Features of Mocks

- **Configurable Behavior**: Mocks can replace the actual implementation and allow you to configure how they behave in different test cases.
- **Recording Calls**: Like spies, mocks keep track of how many times a function was called and with what arguments.
- **Versatile**: Mocks combine the benefits of both stubs and spies, making them useful in more complex testing scenarios.

You can create a mock function using `vi.fn()` (or, `jest.fn()`), which takes a callback function. If you you don't provide one, it'll just use an empty function as the implementation (e.g. `() => undefined`).

```ts
const getNumber = vi.fn(() => 5000);

const number = getNumber();

expect(number).toBe(5000);
expect(getNumber).toHaveBeenCalled();
expect(number).toHaveReturnedWith(5000);
```

## Methods

- `mockImplementation`: Takes a function that you want your mock function to call whenever it's called.
- `mockImplementationOnce`: Accepts a function that will only be used the *next time* a function is called.
- `withImplementation`: Overrides the original mock implementation temporarily while the callback is being executed. Calls the function immediately.
- `mockReturnValue`: Nevermind the implementation, we just know we want it to return whatever value.
- `mockReturnValueOnce`: Set the return value—but only the *next time* it's called.
- `mockResolvedValue`: Sets the value of the promise when it resolves.
- `mockResolvedValueOnce`: Set the resolved value of a promise *next time* it resolves.
- `mockRejectedValue`: Rejects a promise with the error provided.
- `mockRejectedValueOnce`: Rejects a promise with the error provided *next time*.
- `mockReturnThis`: Sets the value of `this`.

### Example

Suppose you need to mock a function that processes ticket sales and handles different scenarios (success and failure):

```js
// Mock a payment function
const paymentMock = vi.fn();

// Simulate successful and failed payments in different tests
paymentMock.mockReturnValueOnce('Payment Successful').mockReturnValueOnce('Payment Failed');

expect(paymentMock()).toBe('Payment Successful');
expect(paymentMock()).toBe('Payment Failed');

// Verify that the mock was called twice
expect(paymentMock).toHaveBeenCalledTimes(2);
```

In this example, the mock simulates different outcomes for the payment process and tracks the number of calls to ensure everything happens as expected.

### Difference Between Mocks and Stubs

While both mocks and stubs replace the real implementation of functions, there are important differences between them:

- **Stubs**: Stubs only provide predefined behavior when called, but they do not keep track of how many times the function was called or with what arguments.
- **Mocks**: Mocks not only replace the real implementation, but they also keep track of calls, arguments, and context, allowing you to verify interactions in more detail. Mocks can be configured dynamically to return specific values or simulate different conditions during the test.

Mocks are more powerful than stubs because they provide both behavior definition and interaction tracking, making them suitable for testing more complex scenarios.

### Creating Mocks With Vitest

In Vitest, you can create mocks using the `vi.fn()` method, which allows you to define how a function should behave and track calls made to it.

Here’s a simple example of creating a mock:

```js
const paymentMock = vi.fn();
```

This mock can be customized to return values, throw errors, or simulate any behavior you need for testing.

You can also define specific behavior for different test scenarios using `mockReturnValue` or `mockImplementation`.

```js
paymentMock.mockReturnValueOnce('Payment Successful').mockReturnValueOnce('Payment Failed');
```

In this case, the mock will return 'Payment Successful' the first time it is called and 'Payment Failed' the second time.

### Example: Mocking a Database or an External API

Let’s consider an example where we mock an external API that fetches concert details for a band. We’ll use the mock to simulate different scenarios, such as a successful API call and a failure.

Here’s the function we want to test:

```js
async function getConcertDetails(band) {
	const response = await fetch(`/api/concerts?band=${band}`);
	const data = await response.json();
	return data;
}
```

Now, we’ll mock the `fetch` function in our test:

```js
import { describe, it, expect, vi } from 'vitest';
import { getConcertDetails } from './concerts';

describe('getConcertDetails', () => {
	it('returns concert details from the API', async () => {
		// Mock the fetch function to simulate an API response
		const fetchMock = vi.fn(() =>
			Promise.resolve({
				json: () => Promise.resolve({ band: 'Green Day', venue: 'Madison Square Garden' }),
			}),
		);

		// Replace the global fetch function with our mock
		global.fetch = fetchMock;

		// Call the function under test
		const result = await getConcertDetails('Green Day');

		// Assert that the mock API returned the correct data
		expect(result).toEqual({ band: 'Green Day', venue: 'Madison Square Garden' });

		// Verify that the mock was called
		expect(fetchMock).toHaveBeenCalledTimes(1);

		// Clean up: Restore the original fetch function
		fetchMock.mockRestore();
	});
});
```

In this example, `fetchMock` simulates the behavior of the real `fetch` function, allowing us to test the `getConcertDetails` function without making a real network request. We also verify that the mock was called exactly once.

### Asserting Interactions and Behavior of Mocks

Mocks in Vitest allow you to assert not only the return values and errors, but also interactions such as how many times the mock was called, what arguments were passed, and the order of calls.

Here’s how you can assert different interactions with mocks:

```js
// Create a mock function
const fetchMock = vi.fn();

// Define behavior
fetchMock.mockReturnValue('Concert Data');

// Call the mock
fetchMock('Green Day');

// Assert that the mock was called once
expect(fetchMock).toHaveBeenCalledTimes(1);

// Assert that the mock was called with the correct argument
expect(fetchMock).toHaveBeenCalledWith('Green Day');

// Assert the return value of the mock
expect(fetchMock()).toBe('Concert Data');
```

In this example, we verify that `fetchMock` was called exactly once, passed the correct argument, and returned the expected value.

Mocks offer full control over both behavior and interactions, making them an essential tool for testing complex systems where you need detailed insights into how functions are being used and what they return.
