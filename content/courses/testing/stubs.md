---
title: Using Stubs
description: Learn how to use stubs to simulate behavior in testing.
modified: 2024-09-28T15:33:03-06:00
---

A stub is a type of test double used to replace a real function with a simplified, controlled version for testing purposes. The primary purpose of a stub is to simulate the behavior of real code by providing predefined responses. Stubs do not track how often a function is called or with what arguments—it only replaces the real implementation to ensure that tests run in a predictable, isolated environment.

Stubs are useful when you need to isolate a unit of code and control the behavior of its dependencies without worrying about external systems, such as APIs or databases.

## When to Use Stubs

Use stubs when:

- You want to replace a dependency to isolate the function under test.
- The real dependency involves side effects, such as I/O operations, network calls, or database queries, which you do not want to run during testing.
- You need to simulate different behaviors from the external systems (e.g., returning specific data or triggering an error) to cover various test cases.
- You want to speed up tests by eliminating real-time-consuming operations, such as network requests or file I/O.

Stubs are best suited for situations where you don’t need to verify how often or how a function is called but simply want to control what it returns.

## Creating Stubs with Vitest

In Vitest, you can easily create stubs using the `vi.fn()` method. This function allows you to replace the actual implementation of a dependency and return specific values when the stubbed function is called.

Here’s how you create a simple stub:

```js
const fetchStub = vi.fn(() =>
	Promise.resolve({ band: 'Green Day', venue: 'Madison Square Garden' }),
);
```

`fetchStub` will always return a resolved promise with predefined data, simulating an API response. This can be used to replace an actual network request in a test.

## Example: Stubbing External Dependencies (e.g., API Calls, File System interactions)

Let’s walk through a real-world example. Imagine you are testing a function that fetches concert details for a band by making an API call. You want to avoid making the actual API call in your test and instead control the behavior using a stub.

Here’s the function to be tested:

```js
async function getConcertDetails(band) {
	const response = await fetch(`/api/concerts?band=${band}`);
	const data = await response.json();
	return data;
}
```

Now, in the test, we can create a stub for the `fetch` function to simulate an API response without making a real network request:

```js
import { describe, it, expect, vi } from 'vitest';
import { getConcertDetails } from './concerts';

describe('getConcertDetails', () => {
	it('returns concert details from the API', async () => {
		// Stub the fetch function to simulate an API response
		const fetchStub = vi.fn(() =>
			Promise.resolve({
				json: () => Promise.resolve({ band: 'Green Day', venue: 'Madison Square Garden' }),
			}),
		);

		// Replace the global fetch function with our stub
		global.fetch = fetchStub;

		// Call the function under test
		const result = await getConcertDetails('Green Day');

		// Assert that the stubbed API returned the correct data
		expect(result).toEqual({ band: 'Green Day', venue: 'Madison Square Garden' });

		// Clean up: Restore the original fetch function
		fetchStub.mockRestore();
	});
});
```

In this test, we replace the real `fetch` function with a stub that simulates the API call, returning a predefined JSON response. This allows us to test the `getConcertDetails` function without making a real network request.

## Asserting the Behavior of Code with Stubs

When using stubs, you typically want to assert that the function you’re testing behaves correctly given the predefined responses. In the example above, we verify that `getConcertDetails` returns the correct concert information when the `fetchStub` provides the simulated API data.

Vitest also provides methods to check how many times a stub was called, although this is not the primary use of a stub. You can, however, assert that the stubbed function was called if needed:

```js
expect(fetchStub).toHaveBeenCalledTimes(1);
```

This ensures that `fetchStub` was called exactly once, which helps verify that the `getConcertDetails` function triggered the expected network request behavior.

Using stubs, you can simulate various responses (e.g., API errors, timeouts, or different data) and assert that your code reacts accordingly, all without relying on real external systems.

## Stubs

A *stub* is a test double that provides pre-determined responses to function calls, typically to replace a real dependency with controlled behavior. Stubs do not track how the function is called; they just serve as replacements that return fixed values.

### Key Features of Stubs

- **Predefined Behavior**: Stubs are used to define how a function behaves for a test. You can control what value is returned or what actions are taken when the stubbed function is called.
- **Isolation**: Stubs help isolate the function under test from the actual implementation of its dependencies.
- **Simplicity**: Stubs are simple replacements and do not track or record how many times they were called or with which arguments.

### An Example

Imagine a function that fetches concert data from an API. You can create a stub to simulate the API returning data without making a real network call.

```js
// Stub the fetch function to always return fixed data
const fetchStub = vi.fn(() =>
	Promise.resolve({ band: 'Green Day', venue: 'Madison Square Garden' }),
);

// Now use this stubbed version in your test instead of making a real API call.
```

In this example, the `fetchStub` ensures the test runs with consistent data, even without making the actual network request.

### Using Stubs in Vitest

A **stub** is similar to a mock but focuses on providing predefined responses rather than tracking interactions.

**Example: Stubbing a Function**

```javascript
// notifier.js
export function notify(message) {
	// Sends a notification (e.g., email, SMS)
}
```

**Test:**

```javascript
// notifier.test.js
import { test, expect, vi } from 'vitest';
import { notify } from './notifier';

test('sends a notification', () => {
	// Arrange
	const notifyStub = vi.fn();

	// Replace the real notify function with the stub
	notifyStub('Test message');

	// Act
	// (No action needed since we're stubbing the function)

	// Assert
	expect(notifyStub).toHaveBeenCalledWith('Test message');
});
```

**Explanation:**

- The stub `notifyStub` replaces the real `notify` function.
- The focus is on ensuring that `notify` is called with the correct arguments.
