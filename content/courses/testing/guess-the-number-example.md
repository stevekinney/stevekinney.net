---
title: Building A "Guess The Number" Game Using Test-Driven Development With Vitest
description: Learn to build a "Guess the Number" game using TDD with Vitest.
modified: 2024-09-28T18:32:10.824Z
---

## Building a "Guess the Number" Game Using Test-Driven Development with Vitest

**Table of Contents**

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Project Setup](#project-setup)
4. [Understanding Test-Driven Development](#understanding-test-driven-development)
5. [Setting Up Vitest](#setting-up-vitest)
6. [Designing the Game Logic](#designing-the-game-logic)
7. [Implementing the Game Logic with TDD](#implementing-the-game-logic-with-tdd)
   - [1. Generating a Random Number](#1-generating-a-random-number)
   - [2. Making a Guess](#2-making-a-guess)
   - [3. Providing Feedback](#3-providing-feedback)
   - [4. Tracking Attempts](#4-tracking-attempts)
   - [5. Handling Invalid Inputs](#5-handling-invalid-inputs)
8. [Running the Tests](#running-the-tests)
9. [Conclusion](#conclusion)
10. [Additional Exercises](#additional-exercises)

***

### Introduction

In this guide, we'll build a simple **"Guess the Number"** game using **Test-Driven Development (TDD)** with **Vitest**, a modern JavaScript testing framework. The game logic will be developed through unit tests without any user interface. This approach will help you focus on writing clean, testable code and understanding the principles of TDD.

**Objectives:**

- Learn how to apply TDD to build a game.
- Understand how to write unit tests with Vitest.
- Develop the game logic for a "Guess the Number" game.
- Write tests for various functionalities, including random number generation and user input handling.

### Prerequisites

- Basic knowledge of JavaScript (ES6+ syntax).
- Familiarity with Node.js and npm.
- Understanding of unit testing concepts.
- Node.js and npm installed on your machine.

### Project Setup

1. **Create a New Directory**

   ```bash
   mkdir guess-the-number-tdd
   cd guess-the-number-tdd
   ```

2. **Initialize npm**

   ```bash
   npm init -y
   ```

3. **Install Vitest**

   ```bash
   npm install --save-dev vitest
   ```

4. **Set Up the Project Structure**

   ```ts
   guess-the-number-tdd/
   ├── package.json
   ├── vitest.config.js
   ├── src/
   │   └── game.js
   └── tests/
       └── game.test.js
   ```

   - `src/`: Contains the source code for the game logic.
   - `tests/`: Contains the test files.

### Understanding Test-Driven Development

**Test-Driven Development (TDD)** is a software development approach where you:

1. **Write a Test**: Write a test for the next bit of functionality.
2. **Run the Test and See It Fail**: Ensures the test detects the absence of functionality.
3. **Write the Minimal Code to Pass the Test**: Implement just enough code to make the test pass.
4. **Refactor**: Improve the code while keeping the tests passing.
5. **Repeat**: Continue with the next functionality.

This cycle is often referred to as **Red-Green-Refactor**.

### Setting Up Vitest

Add a test script to your `package.json`:

```json
{
	"scripts": {
		"test": "vitest"
	}
}
```

Create a `vitest.config.js` file (optional for simple setups):

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
	},
});
```

### Designing the Game Logic

Before we start coding, let's outline the game logic:

- The game generates a random number within a specified range (e.g., 1 to 100).
- The player makes guesses to find the number.
- After each guess, the game provides feedback:
  - If the guess is too high.
  - If the guess is too low.
  - If the guess is correct.
- The game tracks the number of attempts.
- The game ends when the player guesses the correct number.
- Input validation ensures that guesses are valid numbers within the range.

### Implementing the Game Logic with TDD

#### 1. Generating a Random Number

##### Step 1: Write the Test (Red)

Create `tests/game.test.js`:

```javascript
// tests/game.test.js
import { describe, it, expect } from 'vitest';
import { createGame } from '../src/game';

describe('Guess the Number Game', () => {
	it('generates a random number between 1 and 100 by default', () => {
		const game = createGame();
		expect(game.secretNumber).toBeGreaterThanOrEqual(1);
		expect(game.secretNumber).toBeLessThanOrEqual(100);
	});

	it('allows setting a custom range', () => {
		const game = createGame(1, 50);
		expect(game.secretNumber).toBeGreaterThanOrEqual(1);
		expect(game.secretNumber).toBeLessThanOrEqual(50);
	});
});
```

**Explanation:**

- We test that `createGame` generates a random number within the default range (1 to 100).
- We test that a custom range can be specified.

##### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

You'll get an error: `createGame` is not defined.

##### Step 3: Write Minimal Code to Pass the Test (Green)

Implement `createGame` in `src/game.js`:

```javascript
// src/game.js
export function createGame(min = 1, max = 100) {
	return {
		secretNumber: Math.floor(Math.random() * (max - min + 1)) + min,
		min,
		max,
		attempts: 0,
	};
}
```

##### Step 4: Run the Test Again

Run the test:

```bash
npm test
```

Tests should now pass.

##### Step 5: Refactor (if necessary)

Our code is acceptable as is.

#### 2. Making a Guess

We need to implement a function to make a guess.

##### Step 1: Write the Test (Red)

Add to `tests/game.test.js`:

```javascript
describe('makeGuess', () => {
	it('increments the number of attempts', () => {
		const game = createGame();
		game.makeGuess(50);
		expect(game.attempts).toBe(1);
	});

	it('returns "correct" when the guess is equal to the secret number', () => {
		const game = createGame();
		game.secretNumber = 42;
		const result = game.makeGuess(42);
		expect(result).toBe('correct');
	});

	it('returns "too high" when the guess is greater than the secret number', () => {
		const game = createGame();
		game.secretNumber = 42;
		const result = game.makeGuess(50);
		expect(result).toBe('too high');
	});

	it('returns "too low" when the guess is less than the secret number', () => {
		const game = createGame();
		game.secretNumber = 42;
		const result = game.makeGuess(30);
		expect(result).toBe('too low');
	});
});
```

**Explanation:**

- We test that `makeGuess` increments the attempts.
- We test the feedback for correct, too high, and too low guesses.

##### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

Errors occur because `makeGuess` is not defined.

##### Step 3: Write Minimal Code to Pass the Test (Green)

Update `src/game.js`:

```javascript
export function createGame(min = 1, max = 100) {
	return {
		secretNumber: Math.floor(Math.random() * (max - min + 1)) + min,
		min,
		max,
		attempts: 0,
		makeGuess(guess) {
			this.attempts++;
			if (guess === this.secretNumber) {
				return 'correct';
			} else if (guess > this.secretNumber) {
				return 'too high';
			} else {
				return 'too low';
			}
		},
	};
}
```

##### Step 4: Run the Test Again

Run the test:

```bash
npm test
```

All tests should pass.

##### Step 5: Refactor

No immediate refactoring needed.

#### 3. Providing Feedback

We've already implemented feedback in the previous step, but let's add tests for edge cases.

##### Step 1: Write Additional Tests (Red)

Add to `tests/game.test.js`:

```javascript
describe('makeGuess', () => {
	// … previous tests …

	it('handles negative numbers correctly', () => {
		const game = createGame(-50, 50);
		game.secretNumber = -10;
		expect(game.makeGuess(-20)).toBe('too low');
		expect(game.makeGuess(0)).toBe('too high');
	});
});
```

##### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

The test should pass if the previous implementation handles negative numbers.

##### Step 3: Verify the Implementation

Our `makeGuess` function already compares numbers correctly, including negative numbers.

##### Step 4: Refactor

Ensure that comparisons handle edge cases correctly.

#### 4. Tracking Attempts

We need to ensure the game tracks the number of attempts accurately.

##### Step 1: Write Additional Tests (Red)

Add to `tests/game.test.js`:

```javascript
describe('attempts tracking', () => {
	it('counts the number of attempts made', () => {
		const game = createGame();
		game.makeGuess(10);
		game.makeGuess(20);
		game.makeGuess(30);
		expect(game.attempts).toBe(3);
	});
});
```

##### Step 2: Run the Test

Run the test:

```bash
npm test
```

The test should pass, confirming attempts are tracked.

#### 5. Handling Invalid Inputs

We need to handle cases where the guess is not a valid number or is out of range.

##### Step 1: Write the Test (Red)

Add to `tests/game.test.js`:

```javascript
describe('input validation', () => {
	it('throws an error when the guess is not a number', () => {
		const game = createGame();
		expect(() => game.makeGuess('a')).toThrow('Invalid guess');
	});

	it('throws an error when the guess is out of range', () => {
		const game = createGame(1, 50);
		expect(() => game.makeGuess(0)).toThrow('Guess must be between 1 and 50');
		expect(() => game.makeGuess(51)).toThrow('Guess must be between 1 and 50');
	});
});
```

##### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

Errors occur because we haven't implemented input validation.

##### Step 3: Write Minimal Code to Pass the Test (Green)

Update `src/game.js`:

```javascript
export function createGame(min = 1, max = 100) {
	return {
		secretNumber: Math.floor(Math.random() * (max - min + 1)) + min,
		min,
		max,
		attempts: 0,
		makeGuess(guess) {
			if (typeof guess !== 'number' || isNaN(guess)) {
				throw new Error('Invalid guess');
			}
			if (guess < this.min || guess > this.max) {
				throw new Error(`Guess must be between ${this.min} and ${this.max}`);
			}
			this.attempts++;
			if (guess === this.secretNumber) {
				return 'correct';
			} else if (guess > this.secretNumber) {
				return 'too high';
			} else {
				return 'too low';
			}
		},
	};
}
```

##### Step 4: Run the Test Again

Run the test:

```bash
npm test
```

All tests should pass.

##### Step 5: Refactor

Consider moving validation logic into separate functions if needed.

***

At this point, we've implemented the core game logic using TDD.

### Running the Tests

At any point, you can run all tests using:

```bash
npm test
```

Vitest will execute all tests in the `tests/` directory and report the results.

### Conclusion

By following Test-Driven Development principles, we've built a functional "Guess the Number" game without a user interface. We've written unit tests for the game logic, ensuring our code is reliable and behaves as expected.

**Key Takeaways:**

- **TDD Workflow:** Writing tests first helps define expected behavior and leads to better-designed code.
- **Vitest for Testing:** Vitest provides a fast and modern testing experience for JavaScript applications.
- **Unit Testing Focus:** Focusing on unit tests allows us to ensure each part of our code works correctly in isolation.

### Additional Exercises

To further enhance your "Guess the Number" game and testing skills, consider implementing the following features:

1. **Set Maximum Attempts**

   - Modify the game to allow a maximum number of attempts.
   - Write tests to ensure the game ends after the maximum attempts are reached.

2. **Hint System**

   - Implement a hint system that provides additional clues.
   - Write tests to verify hints are accurate and provided correctly.

3. **Replay Functionality**

   - Add a method to reset the game and start over.
   - Write tests to ensure the game resets correctly.

4. **Difficulty Levels**

   - Introduce difficulty levels that adjust the range or number of attempts.
   - Write tests to verify the game behaves correctly at different difficulty levels.

5. **Statistical Tracking**

   - Keep track of statistics like total games played, wins, and average attempts.
   - Write tests to ensure statistics are recorded accurately.

6. **Input Parsing**

   - Enhance input handling to accept strings and convert them to numbers.
   - Write tests to ensure inputs like `'42'` are correctly interpreted.

7. **Multiplayer Mode**

   - Allow multiple players to take turns guessing.
   - Write tests to ensure player turns and scores are managed correctly.

8. **High Score List**

   - Implement a high score system that records the best scores.
   - Write tests to ensure high scores are updated and retrieved correctly.

***

By extending the game and writing tests for new features, you'll deepen your understanding of TDD and improve your testing proficiency.
