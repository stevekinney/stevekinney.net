---
title: Testing Function Arguments
description: Learn how to verify function arguments using spies and mocks in Vitest.
modified: 2024-09-28T14:06:36-06:00
---

In unit testing, one of the key tasks is verifying that functions are called with the correct arguments. This ensures that your code is passing the right data through the system and interacting with dependencies in the expected way. Vitest provides some powerful utilities to check the arguments passed to a function, either by using spies or mocks.

## Why Check Function Arguments?

- **Verification of Correct Data Flow**: Ensuring that your functions receive and pass the correct arguments at each stage.
- **Testing Callbacks**: Verifying that callbacks are invoked with the right data, especially in asynchronous code.
- **Ensuring Correct Usage of External Services**: When your code interacts with APIs, databases, or external services, checking the arguments ensures proper integration.

## Using Spies to Check Function Arguments

[Spies](spies.md) in Vitest can track how a function is called, including the arguments passed to it. The `vi.spyOn()` method allows you to monitor existing functions and check their arguments without modifying their behavior.

Here’s how you create a spy and check the arguments. Let's take a look at `examples/logjam/src/log.test.js`.

```js
describe('logger', () => {
	it('logs to the console in development mode', () => {
		const spy = vi.spyOn(console, 'log');

		log('Hello, world!');

		expect(spy).toHaveBeenCalledWith('Hello, world!');

		spy.mockRestore();
	});
});
```

In this example, `spy` tracks the calls to `console.log`. The `expect(spy).toHaveBeenCalledWith('Hello, world!')` assertion checks that the function was called with the correct argument.

## Using Mocks to Check Function Arguments

[Mocks](mocks.md) can also be used to check what arguments were passed to a function. When you create a mock with `vi.fn()`, Vitest automatically tracks the arguments passed to the mock, allowing you to assert on them later.

```js
// Create a mock function
const mockFn = vi.fn();

describe('mock function argument checking', () => {
	it('should be called with the correct arguments', () => {
		// Call the mock function with some arguments
		mockFn('Green Day', 'American Idiot');

		// Check the arguments passed to the mock function
		expect(mockFn).toHaveBeenCalledWith('Green Day', 'American Idiot');
	});
});
```

Here, `mockFn` is called with two arguments, and `expect(mockFn).toHaveBeenCalledWith('Green Day', 'American Idiot')` verifies that the mock was called with the correct data.

## Checking Multiple Calls and Arguments

Vitest allows you to check the arguments passed to a function over multiple calls. The `mock.calls` array stores the arguments passed to the mock in each call, making it easy to verify multiple interactions.

```js
const mockFn = vi.fn();

describe('checking multiple calls', () => {
	it('should track all the arguments for multiple calls', () => {
		// Call the mock function multiple times with different arguments
		mockFn('Green Day', 'Dookie');
		mockFn('Nirvana', 'Nevermind');

		// Check arguments of the first call
		expect(mockFn).toHaveBeenNthCalledWith(1, 'Green Day', 'Dookie');

		// Check arguments of the second call
		expect(mockFn).toHaveBeenNthCalledWith(2, 'Nirvana', 'Nevermind');
	});
});
```

The `toHaveBeenNthCalledWith()` method checks the arguments for the first call and the second call separately, ensuring that each call received the correct parameters.

## Checking Arguments of Asynchronous Functions

When working with asynchronous code, it’s important to ensure that the correct arguments are passed to functions when dealing with promises or callbacks. Vitest’s spies and mocks can handle asynchronous functions as well.

```js
async function fetchBandData(bandName, callback) {
	// Simulate an async operation
	await new Promise((resolve) => setTimeout(resolve, 100));
	callback(`${bandName} data`);
}

describe('fetchBandData', () => {
	it('should call the callback with the correct data', async () => {
		// Create a mock callback
		const callback = vi.fn();

		// Call the async function with the mock callback
		await fetchBandData('Green Day', callback);

		// Verify that the callback was called with the correct argument
		expect(callback).toHaveBeenCalledWith('Green Day data');
	});
});
```

In this example, the mock `callback` is passed to an asynchronous function. The test verifies that the callback was called with the correct argument after the async operation completed.

## Accessing Specific Arguments Using `mock.calls`

In some cases, you may need to manually access the arguments passed to a function in each call. Vitest stores the arguments of every call in the `mock.calls` array, allowing you to directly inspect or assert on them.

```js
const mockFn = vi.fn();

mockFn('Green Day', 'Dookie');
mockFn('Blink-182', 'Enema of the State');

describe('accessing arguments manually', () => {
	it('should manually access arguments of each call', () => {
		// Access the arguments of the first call
		const firstCallArgs = mockFn.mock.calls[0];
		expect(firstCallArgs).toEqual(['Green Day', 'Dookie']);

		// Access the arguments of the second call
		const secondCallArgs = mockFn.mock.calls[1];
		expect(secondCallArgs).toEqual(['Blink-182', 'Enema of the State']);
	});
});
```

This example shows how you can manually inspect the `mock.calls` array to access the arguments passed to each call. Each entry in `mock.calls` corresponds to an array of arguments from one call to the function.

## Conclusion

Checking the arguments passed to a function is super important part of verifying that your code behaves correctly in unit tests. Whether you’re using spies to monitor real functions or mocks to simulate them, Vitest provides powerful tools like `toHaveBeenCalledWith()`, `toHaveBeenNthCalledWith()`, and `mock.calls` to assert on the arguments passed during execution. These capabilities allow you to confidently test that your code is passing the right data to the right places.
