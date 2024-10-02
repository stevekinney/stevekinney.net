---
title: Testing Promises
description: Learn how to test promises in Vitest for both resolution and rejection.
modified: 2024-09-28T16:05:47-06:00
---

You *could* use the strategies from [Testing Asynchronous Code](testing-asynchronous-code.md), but let's dig in just a little bit more on promises, in particular.

## Why Test Promises?

- **Ensure Correct Asynchronous Behavior**: Testing promises helps ensure that your code handles asynchronous operations correctly, such as waiting for data before proceeding or catching errors.
- **Simulating Success and Failure Scenarios**: By testing both resolved and rejected promises, you can verify that your code works in all possible cases, including handling errors gracefully.
- **Preventing Silent Failures**: Without proper testing, silent failures in asynchronous code can lead to bugs that are hard to trace and debug.

## Basic Testing of Resolved Promises

When a promise resolves successfully, you want to verify that the returned value matches what you expect. In Vitest, this is typically done using `async` and `await` or returning the promise directly in your test function.

Here’s an example of testing a function that returns a resolved promise:

```js
// Function to be tested
function fetchBandData(bandName) {
	return Promise.resolve({ name: bandName, genre: 'Punk Rock' });
}

describe('fetchBandData', () => {
	it('should return band data when the promise resolves', async () => {
		// Call the function
		const result = await fetchBandData('Green Day');

		// Assert that the promise resolved with the correct value
		expect(result).toEqual({ name: 'Green Day', genre: 'Punk Rock' });
	});
});
```

In this example, the `fetchBandData` function returns a promise that resolves with the band's data. Using `await`, we wait for the promise to resolve and then assert that the result is correct.

## Testing Rejected Promises

In addition to testing successful promise resolutions, it's equally important to test how your code handles promise rejections (errors). Vitest allows you to test rejected promises using `try/catch` blocks or `.rejects` in your assertions.

Here’s how you can test a rejected promise:

```js
// Function to be tested
function fetchBandDataWithError(bandName) {
	return Promise.reject(new Error('Band not found'));
}

describe('fetchBandDataWithError', () => {
	it('should throw an error when the promise rejects', async () => {
		// Assert that the promise rejects with an error
		await expect(fetchBandDataWithError('Unknown Band')).rejects.toThrow('Band not found');
	});
});
```

In this test, the promise is expected to reject with an error, and `expect(…).rejects.toThrow()` ensures that the rejection is properly caught and handled.

## Using `.resolves` and `.rejects`

Vitest provides convenient matchers `.resolves` and `.rejects` to test promises directly without needing `async/await`. These matchers allow you to write more concise and readable tests for both successful and failed promise scenarios.

### Testing Resolved Promises

```js
describe('fetchBandData', () => {
	it('should resolve with band data', () => {
		// Test promise resolution using .resolves
		return expect(fetchBandData('Green Day')).resolves.toEqual({
			name: 'Green Day',
			genre: 'Punk Rock',
		});
	});
});
```

In this example, the test checks if the promise resolves with the expected data using `.resolves.toEqual()`.

### Testing Rejected Promises

```js
describe('fetchBandDataWithError', () => {
	it('should reject with an error', () => {
		// Test promise rejection using .rejects
		return expect(fetchBandDataWithError('Unknown Band')).rejects.toThrow('Band not found');
	});
});
```

Here, `.rejects.toThrow()` is used to verify that the promise rejects with a specific error message.

## Testing Async Functions with Mocks

When your code depends on asynchronous external services (e.g., APIs), you can use mocks to simulate different promise behaviors—both resolution and rejection. This is especially useful when testing functions that rely on external resources without making actual requests.

Here’s an example using a mocked API call:

```js
// Simulate an API module
import * as api from './api';

// Code under test
async function getConcertDetails(bandName) {
	const response = await api.fetchConcerts(bandName);
	return response.data;
}

describe('getConcertDetails', () => {
	// Mock the API module
	vi.mock('./api', () => ({
		fetchConcerts: vi.fn(() =>
			Promise.resolve({ data: [{ venue: 'Wembley', date: '2024-10-05' }] }),
		),
	}));

	it('should return concert details from the mocked API', async () => {
		// Test with the mocked promise
		const result = await getConcertDetails('Green Day');

		// Verify the result
		expect(result).toEqual([{ venue: 'Wembley', date: '2024-10-05' }]);
	});
});
```

In this test, the `api.fetchConcerts` function is mocked to return a resolved promise. You can similarly mock it to return a rejected promise and test the error handling flow.

## Testing Multiple Promises with `Promise.all`

When working with multiple promises in your code, you might need to test them collectively using `Promise.all()`. In Vitest, you can ensure that all promises resolve correctly by awaiting `Promise.all` in your tests.

```js
// Function to be tested
function fetchMultipleBandData() {
	return Promise.all([
		Promise.resolve({ name: 'Green Day', genre: 'Punk Rock' }),
		Promise.resolve({ name: 'Nirvana', genre: 'Grunge' }),
	]);
}

describe('fetchMultipleBandData', () => {
	it('should resolve all promises with the correct data', async () => {
		// Await all promises
		const result = await fetchMultipleBandData();

		// Verify the result of each promise
		expect(result).toEqual([
			{ name: 'Green Day', genre: 'Punk Rock' },
			{ name: 'Nirvana', genre: 'Grunge' },
		]);
	});
});
```

This example shows how to test multiple promises, ensuring that `Promise.all()` resolves with the expected data from both promises.

## Handling Asynchronous Timeouts in Promise Tests

Sometimes, your promises might include delays using `setTimeout` or similar asynchronous operations. In these cases, Vitest's `vi.useFakeTimers()` can help you simulate time passing without waiting for the real timeout.

```js
// Function that returns a delayed promise
function delayedBandData() {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({ name: 'Green Day', genre: 'Punk Rock' });
		}, 3000);
	});
}

describe('delayedBandData', () => {
	it('should resolve the promise after a delay', async () => {
		// Use fake timers to control time
		vi.useFakeTimers();

		// Call the function (but do not await yet)
		const promise = delayedBandData();

		// Fast-forward time
		vi.advanceTimersByTime(3000);

		// Now await the promise resolution
		const result = await promise;

		// Verify the resolved data
		expect(result).toEqual({ name: 'Green Day', genre: 'Punk Rock' });
	});
});
```

In this example, `vi.useFakeTimers()` allows us to simulate the 3-second delay in the promise without waiting for real time to pass.

## A Quick Summary

Testing promises in Vitest is essential for ensuring that your asynchronous code behaves as expected. Whether you're testing resolved promises, rejected promises, or handling multiple async operations, Vitest provides clear and effective tools like `async/await`, `.resolves`, `.rejects`, and mock functions. Additionally, using fake timers for timeouts ensures that tests remain fast and reliable. By fully testing promises, you can catch edge cases, handle errors properly, and build more robust applications.
