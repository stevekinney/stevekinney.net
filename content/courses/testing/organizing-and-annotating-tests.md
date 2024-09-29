---
title: Describe
description: Learn how to use describe for organizing tests in suites.
modified: 2024-09-28T18:32:11.017Z
---

## `describe`

You can group a set of tests into a suite using `describe`. If you don't use `describe`, all of the tests in a given file as grouped in a suite automatically.

The is primarily used for organizing your tests. It's helpful because it allows you to skip or isolate a particular group of tests.

> If you provide a `string` after `npm test` or `npx vitest`, then Vitest will only run the rests with that `string` in the filename. Let's say we have two test files: `math.test.ts` and `words.test.ts`. Running `npm test math` will *only* run `math.test.ts` and *not* `words.test.ts`.

For example, if we ran our suite against `examples/02-test-suites/math.test.ts` (using `npm test math --reporter="verbose" --run`, just to make a point), we would see something like this:

```ts
✓ math.test.ts (8)
  ✓ add (2)
    ✓ should add two numbers correctly
    ✓ should not add two numbers incorrectly
  ✓ subtract (2)
    ✓ should subtract the subtrahend from the minuend
    ✓ should not subtract two numbers incorrectly
  ✓ multiply (2)
    ✓ should multiply the multiplicand by the multiplier
    ✓ should not multiply two numbers incorrectly
  ✓ divide (2)
    ✓ should multiply the multiplicand by the multiplier
    ✓ should not multiply two numbers incorrectly
```

## Hooks

Using `describe` allows you to pass a name to your suite, which is helpful when you're debugging. It also gives you access to some helpful hooks:

- `beforeEach`: Runs before each and every test.
- `afterEach`: Runs after each and every test.
- `beforeAll`: Runs at the very beginning when the suite starts.
- `afterAll`: Runs after all of the tests in the suite have completed.

## Annotations

These are fairly similar to what we saw with our individual tests.

`describe` also has some annotations that add some logic to if any when the suite should run:

- `describe.skip`: Skip this suite.
- `describe.skipIf`: Skip this suite if the provided value is truthy.
- `describe.only`: Only run this suite (and any others that use `.only` as well, of course). You probably *don't* want to accidentally commit this. Trust me. It's embarassing.
- `describe.todo`: Marks a suite as something you're going to implement later. This is helpful when you know the kinds of tests that you'll need and and want to keep track of how many you have less.
- `describe.each`: Used for generating a multiple suites on based on a collection of data. We'll talk about this more in [Parameterizing Tests](parameterizing-tests.md).
- `describe.concurrent`: Run all of the tests in this suite concurrently. We'll talk about this more in [parallelizing-tests](parallelizing-tests.md).
- `describe.shuffle`: Run these tests in a random order.

## Organizing Test Suites and Test Cases

The `describe` function allows you to group related tests together. It takes two arguments:

- A string that names the test suite.
- A callback function that contains the tests or nested `describe` blocks.

The basic syntax looks something like this.

```javascript
describe('Test Suite Name', () => {
	// Nested tests or describe blocks
});
```

### Benefits of Using `describe`

- **Improved Readability**: Logical grouping makes it easier to understand what is being tested.
- **Shared Setup and Teardown**: Utilize hooks like `beforeEach` and `afterEach` within a `describe` block for shared setup.
- **Selective Execution**: Run or skip entire groups of tests during development.
- **Hierarchical Organization**: Reflect the structure of your application in your tests.

### Best Practices

#### Group Tests by Functionality

Organize tests around specific functionalities or features.

```javascript
describe('Math Utilities', () => {
	test('adds numbers correctly', () => {
		// Test code
	});

	test('multiplies numbers correctly', () => {
		// Test code
	});
});
```

#### Use Nested `describe` Blocks for Complex Structures

For complex modules, nesting can mirror the application's structure.

```javascript
describe('User Module', () => {
	describe('Authentication', () => {
		test('successfully logs in with valid credentials', () => {
			// Test code
		});

		test('fails to log in with invalid credentials', () => {
			// Test code
		});
	});

	describe('Profile Management', () => {
		test('updates user profile', () => {
			// Test code
		});
	});
});
```

#### Write Clear and Descriptive Names

Names should clearly state what is being tested.

```javascript
describe('Array Methods', () => {
	describe('push', () => {
		test('adds an element to the end of the array', () => {
			// Test code
		});
	});
});
```

#### Utilize Hooks Within `describe` Blocks

Use `beforeEach`, `afterEach`, `beforeAll`, and `afterAll` to manage setup and teardown specific to a test suite.

```javascript
describe('Database Tests', () => {
	beforeAll(() => {
		// Connect to database
	});

	afterAll(() => {
		// Disconnect from database
	});

	beforeEach(() => {
		// Seed database
	});

	test('fetches a record successfully', () => {
		// Test code
	});
});
```

#### Keep Tests Focused and Independent

Each test should focus on a single aspect, and tests within a `describe` block should be related but independent.

```javascript
describe('String Manipulation', () => {
	test('converts string to uppercase', () => {
		// Test code
	});

	test('trims whitespace from string', () => {
		// Test code
	});
});
```

#### Avoid Excessive Nesting

Too much nesting can make tests hard to read. Keep the structure as flat as possible while maintaining clarity.

```javascript
// Instead of deeply nested describes
describe('Module A', () => {
	describe('Component B', () => {
		describe('Function C', () => {
			test('performs action X', () => {
				// Test code
			});
		});
	});
});

// Prefer a flatter structure
describe('Component B - Function C', () => {
	test('performs action X', () => {
		// Test code
	});
});
```

#### Use `describe` for Shared Context

Group tests that share the same setup or context.

```javascript
describe('When user is authenticated', () => {
	beforeEach(() => {
		// Mock authentication
	});

	test('accesses protected route', () => {
		// Test code
	});

	test('sees personalized content', () => {
		// Test code
	});
});
```

#### Employ `describe.only` and `describe.skip` During Development

Focus on specific test suites without running the entire test suite.

- `describe.only`: Runs only the specified suite.
- `describe.skip`: Skips the specified suite.

```javascript
describe.only('Critical Functionality Tests', () => {
	// Tests to focus on
});

describe.skip('Deprecated Functionality Tests', () => {
	// Tests to skip
});
```

Remember to remove `.only` and `.skip` before finalizing your code to ensure all tests are executed.

#### Mirror Project Structure in Test Files

Organize test files to reflect the structure of your source code, enhancing navigation and maintainability.

```ts
src / utils / calculate.js;
format.js;
tests / utils / calculate.test.js;
format.test.js;
```

#### 10. Document Complex Test Cases

Add comments to explain non-obvious tests or setups within `describe` blocks.

```javascript
describe('Edge Cases for Date Parsing', () => {
	// Tests for leap years and time zones
	test('correctly parses leap day', () => {
		// Test code
	});
});
```

### Examples

#### Example 1: Testing Utility Functions

```javascript
// utils.js
export function isEven(number) {
	return number % 2 === 0;
}

export function isOdd(number) {
	return !isEven(number);
}
```

**Test Suite:**

```javascript
// utils.test.js
import { describe, test, expect } from 'vitest';
import { isEven, isOdd } from './utils';

describe('Utility Functions', () => {
	describe('isEven', () => {
		test('returns true for even numbers', () => {
			expect(isEven(4)).toBe(true);
		});

		test('returns false for odd numbers', () => {
			expect(isEven(5)).toBe(false);
		});
	});

	describe('isOdd', () => {
		test('returns true for odd numbers', () => {
			expect(isOdd(5)).toBe(true);
		});

		test('returns false for even numbers', () => {
			expect(isOdd(4)).toBe(false);
		});
	});
});
```

#### Example 2: Testing API Endpoints

```javascript
// api.js
export async function fetchData(id) {
	const response = await fetch(`/api/data/${id}`);
	return response.json();
}
```

**Test Suite:**

```javascript
// api.test.js
import { describe, test, expect, beforeEach } from 'vitest';
import { fetchData } from './api';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
	rest.get('/api/data/:id', (req, res, ctx) => {
		return res(ctx.json({ id: req.params.id, value: 'test data' }));
	}),
);

beforeAll(() => server.listen());
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

describe('API Functions', () => {
	test('fetches data successfully', async () => {
		const data = await fetchData(1);
		expect(data).toEqual({ id: '1', value: 'test data' });
	});

	test('handles server errors gracefully', async () => {
		server.use(
			rest.get('/api/data/:id', (req, res, ctx) => {
				return res(ctx.status(500));
			}),
		);

		await expect(fetchData(1)).rejects.toThrow();
	});
});
```

### Key Takeaways

- **Logical Grouping**: Use `describe` to group related tests, enhancing clarity.
- **Shared Setup**: Utilize hooks within `describe` blocks for setup and teardown specific to a group.
- **Descriptive Naming**: Clear names for `describe` and `test` improve readability.
- **Test Isolation**: Keep tests independent to avoid unintended interactions.
- **Avoid Over-Nesting**: Keep the structure simple to maintain readability.
- **Reflect Project Structure**: Organize test files to mirror the source code layout.
- **Focus During Development**: Use `.only` and `.skip` to streamline the testing process.
- **Documentation**: Comment complex tests or setups for future reference.

```ts
```