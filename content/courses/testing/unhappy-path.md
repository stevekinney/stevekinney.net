---
title: Unhappy Path
description: Learn how to test edge cases and errors to improve robustness.
modified: 2024-09-29T15:30:11-06:00
---

No, this is *not* my new band name.

The "happy path" refers to the scenario where everything works as expected—inputs are valid, conditions are ideal, and no errors occur. However, the Real World™ is nowhere near as kind.

This is where testing the **unhappy path™** comes in. The unhappy path tests how your code behaves when things go wrong—invalid inputs, failed operations, or unexpected conditions.

Testing the unhappy path ensures your application handles edge cases, errors, and unexpected inputs gracefully. Vitest provides various tools to test these scenarios effectively.

## Why Test the Unhappy Path?

I suspect that I don't really need to sell you on this, but just in case:

- **Robustness**: By testing how your code behaves under abnormal conditions, you ensure your application is robust and can handle real-world issues like invalid input, network failures, and more.
- **Error Handling**: Verifying that your code throws and catches errors correctly is essential to ensure smooth recovery from failures.
- **Security**: Testing edge cases helps prevent unexpected behaviors that could expose vulnerabilities.
- **User Experience**: Users do the strangest things—right? Gracefully handling errors provides better user experiences by preventing crashes or unhandled exceptions.

## Common Unhappy Path Scenarios

Unhappy path testing involves various failure scenarios, such as:

- Invalid inputs (e.g., empty strings, `null`, `undefined`, wrong data types).
- Unsuccessful operations (e.g., network failures, database errors).
- Boundary conditions (e.g., out-of-range values).
- Exceptions thrown by external dependencies or functions.

## Testing Invalid Input

It it takes is like 3 minutes of talking to someone who writes some other programming language to hear the jokes about JavaScript.

- `true + true === 2`
- `1 + '1' === '11'`
- `NaN !== NaN`

The list goes on—but we have better things to get to. Surely out basic arithmetic functions from earlier are susceptible to this right? What would happen in the following cases?

- `add(1)`
- `add(null, 1)`
- `add('1', 2)`
- `add(2, 'potato')`
- `subtract('1', 1)`
- `divide(5, 0)`

So on and so forth. The only *wrong* answer here is `:shrug:`. Really in any of these cases, we have about a grand total of two options:

- Fail gracefully.
- Flip a table (a.k.a. throw an error)

Our tests *need* to cover these edge cases and this is one of the nuances of test-driven development. There is nothing about TDD that precludes you from doing these things—but, calling a day after your red-green-refactor cycle is *also* not going to get you all the way there.

### Additional Examples of Invalid Input

A common unhappy path is when the user provides invalid input. You should test how your code behaves when it receives input that doesn’t meet expectations.

```js
// Function to be tested
function parseAge(age) {
	if (typeof age !== 'number') {
		throw new Error('Invalid age format');
	}
	if (age < 0 || age > 120) {
		throw new Error('Age must be between 0 and 129');
	}
	return age;
}

describe('parseAge', () => {
	it('should throw an error for non-number input', () => {
		// Test invalid input: string
		expect(() => parseAge('thirty')).toThrow('Invalid age format');

		// Test invalid input: null
		expect(() => parseAge(null)).toThrow('Invalid age format');
	});

	it('should throw an error for out-of-range age', () => {
		// Test invalid age: negative number
		expect(() => parseAge(-5)).toThrow('Age must be between 0 and 120');

		// Test invalid age: too high
		expect(() => parseAge(130)).toThrow('Age must be between 0 and 120');
	});

	it('should return the valid age for a number between 0 and 120', () => {
		// Test valid input
		expect(parseAge(25)).toBe(25);
	});
});
```

In this example:

- We test different invalid inputs (a string and `null`) and expect the function to throw an error.
- We test out-of-range numbers to ensure the function throws an error when the input is outside the acceptable range.
- The happy path is also included to check that the function behaves correctly with valid input.

> \[!example] Let's Learn How to Test The Unhappy Path
> There a bunch of other examples below, but let's take a moment to look at how to add a little bit more resiliency to the example we've currently been working with in [Testing Error Handling and Edge Cases](error-handling-and-edge-case-testing.md).

## Testing Errors in Asynchronous Functions

When working with asynchronous functions, such as API calls or database queries, it’s important to test failure scenarios like network errors, timeouts, or service unavailability.

```js
// Asynchronous function to be tested
async function fetchUserData(userId) {
	if (!userId) {
		throw new Error('User ID is required');
	}
	const response = await fetch(`/api/users/${userId}`);
	if (!response.ok) {
		throw new Error('Failed to fetch user data');
	}
	return response.json();
}

describe('fetchUserData', () => {
	it('should throw an error if userId is not provided', async () => {
		// Test for missing userId
		await expect(fetchUserData()).rejects.toThrow('User ID is required');
	});

	it('should throw an error if the API response is not ok', async () => {
		// Mock the fetch function to simulate an API error
		global.fetch = vi.fn(() => Promise.resolve({ ok: false }));

		// Test for API failure
		await expect(fetchUserData(1)).rejects.toThrow('Failed to fetch user data');
	});

	it('should return user data on success', async () => {
		// Mock fetch to return valid data
		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ id: 1, name: 'John Doe' }),
			}),
		);

		// Test happy path
		const result = await fetchUserData(1);
		expect(result).toEqual({ id: 1, name: 'John Doe' });
	});
});
```

In this example:

- The first test checks that the function throws an error if the `userId` is missing.
- The second test mocks the `fetch` function to simulate an API error and verifies that the function throws an error.
- The happy path is also tested to ensure that valid data is handled correctly.

## Testing Boundary Conditions

Boundary conditions are another common source of errors. Testing the edges of valid ranges ensures that your code behaves correctly for both valid and invalid boundary values.

```js
// Function to be tested
function calculateDiscount(price) {
	if (price < 0) {
		throw new Error('Price cannot be negative');
	}
	if (price > 1000) {
		return price * 0.2; // 20% discount for high prices
	}
	return price * 0.1; // 10% discount otherwise
}

describe('calculateDiscount', () => {
	it('should throw an error for negative prices', () => {
		// Test boundary condition: negative price
		expect(() => calculateDiscount(-10)).toThrow('Price cannot be negative');
	});

	it('should apply 10% discount for prices less than 1000', () => {
		// Test boundary condition: price below 1000
		expect(calculateDiscount(500)).toBe(50);
	});

	it('should apply 20% discount for prices above 1000', () => {
		// Test boundary condition: price above 1000
		expect(calculateDiscount(1500)).toBe(300);
	});
});
```

In this example:

- The unhappy path is tested by checking that negative prices throw an error.
- The boundary condition for prices above 1000 is tested to ensure the correct discount is applied.

## Testing External Dependencies and Failures

Many applications rely on external services, such as databases or APIs. Testing the unhappy path means simulating these external dependencies failing or returning unexpected results.

```js
// Mocking a database call
import * as db from './db';

// Function to be tested
async function getUserData(userId) {
	try {
		const user = await db.findUserById(userId);
		if (!user) {
			throw new Error('User not found');
		}
		return user;
	} catch (error) {
		throw new Error('Database error');
	}
}

describe('getUserData', () => {
	it('should throw an error if the user is not found', async () => {
		// Mock the database to return null (user not found)
		vi.spyOn(db, 'findUserById').mockResolvedValue(null);

		// Test that the function throws the correct error
		await expect(getUserData(1)).rejects.toThrow('User not found');
	});

	it('should throw an error for database failure', async () => {
		// Mock the database to simulate an error
		vi.spyOn(db, 'findUserById').mockRejectedValue(new Error('Database failure'));

		// Test that the function throws a database error
		await expect(getUserData(1)).rejects.toThrow('Database error');
	});

	it('should return user data if the user exists', async () => {
		// Mock the database to return a valid user
		vi.spyOn(db, 'findUserById').mockResolvedValue({ id: 1, name: 'John Doe' });

		// Test happy path
		const result = await getUserData(1);
		expect(result).toEqual({ id: 1, name: 'John Doe' });
	});
});
```

In this example:

- We simulate a database returning `null` to test the scenario where a user isn’t found.
- We mock the database to simulate a failure and check that the function throws the correct error.
- The happy path is also tested to ensure that the function works correctly when the user is found.

## Conclusion

Testing the unhappy path™ is critical for ensuring that your application can handle real-world scenarios, including invalid inputs, failed operations, and external service failures. By using Vitest's powerful tools like `toThrow()`, `rejects.toThrow()`, and mocking, you can simulate these edge cases and verify that your code responds appropriately. Testing the unhappy path leads to more robust applications and better user experiences by gracefully handling errors and preventing crashes or unexpected behavior.
