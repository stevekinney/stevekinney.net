---
modified: 2024-09-30T14:26:06-06:00
title: Testing Asynchronous Errors
description: Learn how to write unit tests that test for asynchronous errors.
---

When working with asynchronous functions that throw errors, you need to handle promises and rejected errors. In Vitest, you can test asynchronous error handling using `async/await` or the `.rejects` matcher for promises.

## Using `async/await` to Test Rejected Errors

```js
// Asynchronous function to be tested
async function fetchData() {
	throw new Error('Network error');
}

describe('fetchData', () => {
	it('should throw an error when the promise is rejected', async () => {
		// Use try/catch to verify the error thrown by the asynchronous function
		await expect(fetchData()).rejects.toThrow('Network error');
	});
});
```

In this example:

- The `fetchData` function throws an error asynchronously (in a rejected promise).
- The test uses `await expect(fetchData()).rejects.toThrow('Network error')` to verify that the error is correctly thrown and matches the expected message.

## Using `.rejects` for Promise-Based Error Handling

Vitest provides the `.rejects` matcher to test whether a promise is rejected with an error. This is a concise way to check asynchronous errors without needing `try/catch` blocks.

```js
// Asynchronous function to be tested
async function fetchUserData() {
	return Promise.reject(new Error('User not found'));
}

describe('fetchUserData', () => {
	it('should reject with an error', () => {
		// Test that the promise rejects with the correct error message
		return expect(fetchUserData()).rejects.toThrow('User not found');
	});
});
```

In this example:

- `fetchUserData()` returns a rejected promise.
- The test checks that the promise is rejected and the error message matches `'User not found'`.
