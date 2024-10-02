---
title: Understanding Hooks
description: Learn how to use hooks for setup, teardown, and test isolation in Vitest.
modified: 2024-09-28T15:24:05-06:00
---

Hooks are functions that run at specific stages of your test execution lifecycle. They allow you to perform setup and teardown operations, ensuring that each test runs in a consistent environment. Vitest provides several hooks that mirror those found in other testing frameworks:

- `beforeAll`: Runs once before all tests in a suite.
- `afterAll`: Runs once after all tests in a suite.
- `beforeEach`: Runs before each test in a suite.
- `afterEach`: Runs after each test in a suite.

## Why Use Hooks?

- **Setup and Teardown**: Prepare the testing environment before tests run and clean up afterward.
- **Avoid Code Duplication**: Share common setup code among multiple tests.
- **Test Isolation**: Ensure that tests do not interfere with each other by resetting the state before each test.
- **Improved Readability**: Keep tests focused on assertions rather than setup details.

## Example 1: Using `beforeEach` and `afterEach`

Suppose you're testing a simple counter object:

```javascript
// counter.js
let value = 0;

export const counter = {
	get value() {
		return value;
	},
	increment() {
		value++;
	},
	decrement() {
		value--;
	},
	reset() {
		value = 0;
	},
};
```

These tests will fail because the counter is going to maintain state between the tests.

```javascript
describe('Counter', () => {
	it('starts at zero', () => {
		expect(counter.value).toBe(0);
	});

	it('can increment', () => {
		counter.increment();
		expect(counter.value).toBe(1);
	});

	// Let's get this test to *not* fail.
	it('can decrement', () => {
		counter.increment();
		counter.decrement();
		expect(counter.value).toBe(0);
	});
});
```

For exta fun, try out `describe.shuffle` to see it get into some other weird states.

### Solution: Use the `beforeEach` Hook

```javascript
// counter.test.js
import { expect, test, beforeEach } from 'vitest';
import { counter } from './counter';

describe('Counter', () => {
	beforeEach(() => {
		counter.reset();
	});

	it('starts at zero', () => {
		expect(counter.value).toBe(0);
	});

	it('can increment', () => {
		counter.increment();
		expect(counter.value).toBe(1);
	});

	// Let's get this test to *not* fail.
	it('can decrement', () => {
		counter.increment();
		counter.decrement();
		expect(counter.value).toBe(0);
	});
});
```

- The `beforeEach` hook resets the counter to zero before each test.
- Each test can assume the counter starts at zero, ensuring test isolation.

## Using `beforeAll` and `afterAll`

Suppose you have tests that require setting up a database connection:

```javascript
// db.js
export const db = {
	connect: async () => {
		/* … */
	},
	disconnect: async () => {
		/* … */
	},
	clear: async () => {
		/* … */
	},
};
```

Here is a fun example of what a test suite might look like using hooks.

```javascript
// db.test.js
import { expect, test, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from './db';

beforeAll(async () => {
	// Arrange: Connect to the database once before all tests
	await db.connect();
});

afterAll(async () => {
	// Cleanup: Disconnect from the database after all tests
	await db.disconnect();
});

beforeEach(async () => {
	// Arrange: Clear the database before each test
	await db.clear();
});

test('fetches data from the database', async () => {
	// Act: Insert test data and fetch it
	// Assert: Verify the fetched data
});

test('updates data in the database', async () => {
	// Act: Update test data
	// Assert: Verify the data was updated
});
```

**Explanation:**

- `beforeAll` connects to the database once before the tests run.
- `afterAll` disconnects from the database after all tests have completed.
- `beforeEach` clears the database before each test to ensure a clean state.

## Nesting Hooks with `describe`

When organizing tests into groups using `describe`, you can have hooks that apply only to that group.

```javascript
import { test, expect, describe, beforeEach } from 'vitest';

let data;

describe('Group 1', () => {
	beforeEach(() => {
		data = { value: 1 };
	});

	test('data value is 1', () => {
		expect(data.value).toBe(1);
	});
});

describe('Group 2', () => {
	beforeEach(() => {
		data = { value: 2 };
	});

	test('data value is 2', () => {
		expect(data.value).toBe(2);
	});
});
```

**Explanation:**

- Each `describe` block has its own `beforeEach` hook.
- The `data` variable is set differently for each group, isolating the tests.

### Example 4: Asynchronous Hooks

Hooks can be asynchronous, allowing you to perform operations like fetching data or waiting for promises.

```javascript
import { test, expect, beforeEach } from 'vitest';

let user;

beforeEach(async () => {
	// Simulate fetching user data
	user = await fetchUser();
});

test('user name is Alice', () => {
	expect(user.name).toBe('Alice');
});

async function fetchUser() {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({ name: 'Alice' });
		}, 100);
	});
}
```

**Explanation:**

- The `beforeEach` hook is marked as `async` and waits for `fetchUser`.
- Tests can rely on `user` being available and populated.

## Some Best Practices with Hooks in Vitest

- **Keep Hooks Lean**: Avoid putting too much logic in hooks. They should set up the environment, not perform complex operations.
- **Use the Appropriate Hook**: Choose `beforeAll` or `beforeEach` based on whether the setup needs to run once or before every test.
- **Test Isolation**: Ensure that the state is reset between tests to prevent flaky tests.
- **Avoid Shared State**: Be cautious with global variables. If used, make sure they're properly managed within hooks.
- **Handle Asynchronous Code Properly**: Use `async`/`await` in hooks when dealing with asynchronous operations.
- **Error Handling in Hooks**: If a hook fails, Vitest will skip the tests in that suite. Make sure to handle errors appropriately.

## Common Pitfalls

- **Forgetting to Return or Await Promises**: If you have asynchronous code in your hooks, ensure you're returning the promise or using `async`/`await`.
- **Overusing Global Hooks**: Placing too much logic in `beforeAll` can lead to tests that are hard to understand or debug.
- **Not Cleaning Up**: Failing to reset or clean up resources can cause tests to interfere with each other.
