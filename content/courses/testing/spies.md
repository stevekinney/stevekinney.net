---
title: Using Spies
description: Learn how to use spies in Vitest to monitor function calls.
modified: 2024-09-28T15:30:10-06:00
---

A spy is a type of [test double](test-doubles.md) used to monitor and record information about function calls without modifying the function's actual behavior by default. Spies are used to observe how functions are called during execution, allowing you to verify details like the number of times a function was invoked, the arguments passed to it, and its return values. Unlike stubs or mocks, spies do not replace the function with predefined behavior unless explicitly configured to do so.

Spies are particularly useful when you want to check interactions within the system under test while allowing the real function to execute as usual.

## Key Features of Spies

- **Tracking Behavior**: Spies can track whether a function was called, how many times it was called, and with what arguments.
- **Verification**: You can use spies to verify that certain functions were triggered under the right conditions.
- **Non-intrusive**: Spies do not modify the function’s original behavior unless explicitly configured to do so.

## When to Use Spies

- You want to verify how many times a function is called and with what arguments.
- The function you are testing interacts with external or internal functions, and you need to monitor those interactions.
- You want to confirm whether a callback or handler was invoked during a specific operation.
- You are testing functions that are not easily isolatable or modifiable, but you still need to observe their usage.

## Creating a Spy in Vitest

In Vitest, you can create spies using the `vi.spyOn()` method, which monitors an existing function. It doesn’t change the actual behavior of the function unless you explicitly instruct it to do so.

Here’s how you create a basic spy:

```js
const spy = vi.spyOn(console, 'log');
```

This spy will watch the `console.log` function and record how many times it was called, the arguments passed to it, and other call details.

## Spying on Function Calls, Parameters, and Return Values

Let’s go through an example where we spy on a function and verify its behavior. Consider a function that logs an error message when a ticket sale fails:

```js
function handleTicketSaleError(errorMessage) {
	console.error(`Error: ${errorMessage}`);
}
```

In our test, we can spy on `console.error` to ensure it was called with the correct argument:

```js
import { describe, it, expect, vi } from 'vitest';

describe('handleTicketSaleError', () => {
	it('logs an error message when ticket sale fails', () => {
		// Spy on console.error
		const errorSpy = vi.spyOn(console, 'error');

		// Call the function under test
		handleTicketSaleError('Payment declined');

		// Assert that the spy tracked the correct call
		expect(errorSpy).toHaveBeenCalledWith('Error: Payment declined');

		// Clean up: Restore the original function
		errorSpy.mockRestore();
	});
});
```

In this example, `errorSpy` watches `console.error` and verifies that the correct error message was logged when `handleTicketSaleError` was called.

## Verifying the Number of Calls, Arguments Passed, and Context of Calls Using Spies

One of the main advantages of spies is their ability to provide detailed information about how functions are called. You can verify:

- **The number of times a function was called**.
- **The arguments passed to the function**.
- **The return value of the function**.
- **The context (`this` value)** in which the function was called.

Here’s an example that demonstrates how to check these properties:

```js
function processOrder(orderId) {
	console.log(`Processing order: ${orderId}`);
}

describe('processOrder', () => {
	it('should log the correct order ID', () => {
		// Spy on console.log
		const logSpy = vi.spyOn(console, 'log');

		// Call the function under test
		processOrder('12345');

		// Verify the spy was called exactly once
		expect(logSpy).toHaveBeenCalledTimes(1);

		// Verify the spy was called with the correct argument
		expect(logSpy).toHaveBeenCalledWith('Processing order: 12345');

		// Clean up: Restore the original function
		logSpy.mockRestore();
	});
});
```

In this test, we use `logSpy` to verify:

1. The function was called once (`toHaveBeenCalledTimes`).
2. The function was called with the argument `'Processing order: 12345'` (`toHaveBeenCalledWith`).

Spies give you powerful control over testing interactions, allowing you to validate that your code is making the correct calls and passing the correct arguments without altering the real behavior of the functions under test.

## Expect Methods

- `toHaveBeenCalled()`: Passes if the spy was ever called.
- `toHaveBeenCalledTimes(times)`: Passes if the spy was called the correct number of times.
- `toHaveBeenCalledWith(…args)`: Passes if the function has _ever_ been called with the arguments that you specify.
- `toHaveBeenLastCalledWith`: Passes if the function was most recently called with the arguments that you specify.
- `toHaveBeenNthCalledWith(time, …args)`: Passes if the function was called whichever time you specified with the arguments you specified.
- `toHaveReturned()`: Passes if the function returned (e.g., it didn't throw an error).
- `toHaveReturnedTimes(times)`: Passes if the function returned however many times you specify.
- `toHaveReturnedWith(value)`: Passes if the function has ever successfully returned with the value you specify.
- `toHaveLastReturnedWith(value)`: Passes if the function most recently returned with the value you specify.
- `toHaveNthReturnedWith(time, value)`: Passes if the function returned whichever time you specified with the value you specified.

## Another Example: Basic Math

```javascript
// math.test.js
import { test, expect, vi } from 'vitest';
import * as math from './arithmetic';

test('calls add with correct arguments', () => {
	// Arrange
	const addSpy = vi.spyOn(math, 'add');

	// Act
	const result = math.add(2, 3);

	// Assert
	expect(addSpy).toHaveBeenCalledWith(2, 3);
	expect(result).toBe(5);

	// Cleanup
	addSpy.mockRestore();
});
```

**Explanation:**

- **`vi.spyOn(object, methodName)`**: Creates a spy on the specified method.
- The spy allows us to verify that `add` was called with the correct arguments.
- **Cleanup**: Restore the original method to avoid side effects.
