---
title: Arrange-Act-Assert (AAA) Pattern
description: Learn the AAA pattern for writing clear, maintainable unit tests.
modified: 2024-09-28T15:32:46-06:00
---

## Arrange-Act-Assert (AAA) Pattern

The Arrange-Act-Assert (AAA) pattern is a structured approach to writing unit tests that enhances readability and maintainability. It divides each test into three distinct sections:

1. **Arrange**: Set up the conditions and inputs required for the test.
2. **Act**: Execute the code or function being tested.
3. **Assert**: Verify that the outcome matches the expected result.

### Why It's a Best Practice

- **Clarity**: Clearly separating setup, execution, and verification makes tests easier to read and understand.
- **Consistency**: A uniform structure across tests simplifies writing and maintaining them.
- **Maintainability**: Well-organized tests are easier to update as the codebase evolves.
- **Debugging Efficiency**: Identifying where a test fails becomes straightforward.
- **Single Responsibility**: Encourages testing one functionality at a time, leading to more precise tests.

### Examples in Practice

#### Example 1: Testing a Simple Function

Consider a function that calculates the factorial of a number:

```javascript
function factorial(n) {
	if (n < 0) throw new Error('Negative input not allowed');
	return n === 0 ? 1 : n * factorial(n - 1);
}
```

**Test Using AAA Pattern:**

```javascript
test('calculates factorial of a positive integer', () => {
	// Arrange
	const input = 5;
	const expectedOutput = 120;

	// Act
	const result = factorial(input);

	// Assert
	expect(result).toBe(expectedOutput);
});
```

**Explanation:**

- *Arrange*: Set up the input value and expected output.
- *Act*: Call the `factorial` function with the input.
- *Assert*: Check that the result matches the expected output.

#### Example 2: Testing Error Handling

Testing how a function handles invalid input:

```javascript
function divide(a, b) {
	if (b === 0) throw new Error('Cannot divide by zero');
	return a / b;
}
```

**Test Using AAA Pattern:**

```javascript
test('throws an error when dividing by zero', () => {
	// Arrange
	const numerator = 10;
	const denominator = 0;

	// Act and Assert
	expect(() => {
		divide(numerator, denominator);
	}).toThrow('Cannot divide by zero');
});
```

**Explanation:**

- *Arrange*: Initialize the numerator and set the denominator to zero.
- *Act and Assert*: Execute the function inside an assertion to check for the expected error.

#### Example 3: Testing Asynchronous Code

Suppose there's an asynchronous function that fetches data from an API:

```javascript
async function fetchData(url) {
	const response = await fetch(url);
	return response.json();
}
```

**Test Using AAA Pattern:**

```javascript
test('fetches data successfully from an API', async () => {
	// Arrange
	const url = 'https://api.example.com/data';
	const mockData = { id: 1, name: 'Test Data' };
	global.fetch = vi.fn(() =>
		Promise.resolve({
			json: () => Promise.resolve(mockData),
		}),
	);

	// Act
	const data = await fetchData(url);

	// Assert
	expect(data).toEqual(mockData);
	expect(global.fetch).toHaveBeenCalledWith(url);

	// Cleanup
	global.fetch.mockClear();
	delete global.fetch;
});
```

**Explanation:**

- *Arrange*: Mock the `fetch` function to return predefined data.
- *Act*: Call the `fetchData` function.
- *Assert*: Verify that the returned data matches the mock data and that `fetch` was called with the correct URL.

#### Example 4: Testing a Class Method

Consider a simple `Calculator` class:

```javascript
class Calculator {
	add(a, b) {
		return a + b;
	}
}
```

**Test Using AAA Pattern:**

```javascript
test('adds two numbers correctly using Calculator class', () => {
	// Arrange
	const calculator = new Calculator();
	const num1 = 7;
	const num2 = 3;
	const expected = 10;

	// Act
	const result = calculator.add(num1, num2);

	// Assert
	expect(result).toBe(expected);
});
```

**Explanation:**

- *Arrange*: Create an instance of `Calculator` and set up the numbers.
- *Act*: Invoke the `add` method with the numbers.
- *Assert*: Check that the result equals the expected sum.

#### Example 5: Testing a Function with Side Effects

Suppose a function logs a message to the console:

```javascript
function logMessage(message) {
	console.log(message);
}
```

**Test Using AAA Pattern:**

```javascript
test('logs the correct message to the console', () => {
	// Arrange
	const consoleSpy = vi.spyOn(console, 'log');
	const message = 'Hello, World!';

	// Act
	logMessage(message);

	// Assert
	expect(consoleSpy).toHaveBeenCalledWith(message);

	// Cleanup
	consoleSpy.mockRestore();
});
```

**Explanation:**

- *Arrange*: Spy on the `console.log` method.
- *Act*: Call `logMessage` with a test message.
- *Assert*: Verify that `console.log` was called with the correct message.
- *Cleanup*: Restore the original `console.log` method.

#### Example 6: Testing Edge Cases

Testing a function that processes an array:

```javascript
function getFirstElement(array) {
	if (!Array.isArray(array)) throw new Error('Input must be an array');
	return array[0];
}
```

**Test Using AAA Pattern:**

```javascript
test('returns undefined for an empty array', () => {
	// Arrange
	const inputArray = [];
	const expectedOutput = undefined;

	// Act
	const result = getFirstElement(inputArray);

	// Assert
	expect(result).toBe(expectedOutput);
});
```

**Explanation:**

- *Arrange*: Prepare an empty array.
- *Act*: Call `getFirstElement` with the empty array.
- *Assert*: Verify that the result is `undefined`.

#### Example 7: Testing with Mock Service Worker (MSW)

Testing a function that makes an API call, using MSW to mock the network request:

```javascript
// Function to fetch user data
async function getUser(id) {
	const response = await fetch(`/api/users/${id}`);
	return response.json();
}
```

**Test Using AAA Pattern with MSW:**

```javascript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
	rest.get('/api/users/:id', (req, res, ctx) => {
		const { id } = req.params;
		return res(ctx.json({ id, name: 'John Doe' }));
	}),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('fetches user data successfully', async () => {
	// Arrange
	const userId = '123';

	// Act
	const user = await getUser(userId);

	// Assert
	expect(user).toEqual({ id: '123', name: 'John Doe' });
});
```

**Explanation:**

- *Arrange*: Set up MSW to intercept network requests and return mock data.
- *Act*: Call the `getUser` function with a test user ID.
- *Assert*: Verify that the returned user data matches the mock data.

### Key Takeaways

With all of that said, here's the gist:

- **Separation of Concerns**: The AAA pattern enforces a clear separation between setup, execution, and verification.
- **Readability**: Tests become self-explanatory, serving as documentation for the code's expected behavior.
- **Consistency**: Following a standard pattern reduces cognitive load when switching between different tests or projects.
- **Maintainability**: Easier to update tests when changes occur in the codebase.
- **Debugging Efficiency**: Simplifies identifying where a test might be failing.
