---
title: Guessing Game Solution
description: 'The solution to the "Guessing Game" exercise in the "Introduction to Testing" course.'
modified: 2024-09-30T13:35:09-06:00
---

For starters, we want to make sure we can hold the return value of `Math.random()` in place so that we can test against it.

```javascript
beforeEach(() => {
	vi.spyOn(Math, 'random').mockReturnValue(0.5);
});
```

We also want to make sure we put everything back after every test. This is mostly precautionary. But, it's good practice. So, let's do it.

```javascript
afterEach(() => {
	vi.restoreAllMocks();
});
```

Now, I probably wouldn't keep this test. But, for our purposes, it does illustrate that our function is being mocked correctly.

```javascript
it('should have a secret number', () => {
	const game = new Game();
	expect(game.secretNumber).toBeTypeOf('number');
	expect(game.secretNumber).toBe(50); // This is the new part.
});
```

And now that we can consistently rely on the secret number holding steady, we can test the rest of our implementation.

```javascript
it('should return the correct response if the number is too low', () => {
	const game = new Game();
	expect(game.guess(49)).toBe('Too low!');
});

it('should return the correct response if the number is too low', () => {
	const game = new Game();
	expect(game.guess(51)).toBe('Too high!');
});

it('should return the correct response if the number is correct', () => {
	const game = new Game();
	expect(game.guess(50)).toBe('Correct! You guessed the number in 1 attempts.');
});

it('should return the correct response if the number is already guessed', () => {
	const game = new Game();
	game.guess(49);
	expect(game.guess(49)).toBe('You already guessed that number!');
});

it('should return the correct number of guesses made', () => {
	const game = new Game();

	game.guess(49);
	game.guess(51);
	game.guess(50);

	expect(game.guesses.size).toBe(3);
});
```

## Completed Example

This is the entire file if you want to see everything in one place.

```javascript
import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { Game } from './game';

describe('Game', () => {
	beforeEach(() => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return an instance of a game', () => {
		// This is mostly a dummy test.
		const game = new Game();
		expect(game).toBeInstanceOf(Game);
	});

	it('should have a secret number', () => {
		// Thisn't really a useful test.
		// Do I *really* care about the type of the secret number?
		// Do I *really* care about the name of a "private" property?
		const game = new Game();
		expect(game.secretNumber).toBeTypeOf('number');
		expect(game.secretNumber).toBe(50);
	});

	it('should return the correct response if the number is too low', () => {
		const game = new Game();
		expect(game.guess(49)).toBe('Too low!');
	});

	it('should return the correct response if the number is too low', () => {
		const game = new Game();
		expect(game.guess(51)).toBe('Too high!');
	});

	it('should return the correct response if the number is correct', () => {
		const game = new Game();
		expect(game.guess(50)).toBe('Correct! You guessed the number in 1 attempts.');
	});

	it('should return the correct response if the number is already guessed', () => {
		const game = new Game();
		game.guess(49);
		expect(game.guess(49)).toBe('You already guessed that number!');
	});

	it('should return the correct number of guesses made', () => {
		const game = new Game();

		game.guess(49);
		game.guess(51);
		game.guess(50);

		expect(game.guesses.size).toBe(3);
	});
});
```
