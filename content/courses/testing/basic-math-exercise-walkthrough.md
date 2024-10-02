---
title: 'Walkthrough: Basic Math Exercise'
description: A short walk through for the Basic Math exercise.
modified: 2024-09-29T15:58:56-06:00
---

Here is a walkthrough for the exercise at the end of the section on [implementing some basic tests](basic-math.md).

## Subtraction Function

Ideally, I did `add` for you—so, let's get started by implementing the opposite.

### Step 1: Write the Test (Red)

Add tests for the `subtract` function in `examples/basic-math/src/arithmetic.test.js`:

```javascript
// examples/basic-math/src/arithmetic.test.js
import { subtract } from './calculator';

describe('subtract', () => {
	it('subtracts two positive numbers', () => {
		expect(subtract(5, 3)).toBe(2);
	});

	it('subtracts a larger number from a smaller number', () => {
		expect(subtract(3, 5)).toBe(-2);
	});

	it('subtracts negative numbers', () => {
		expect(subtract(-5, -3)).toBe(-2);
	});
});
```

**Note:** Remember to import `subtract` from `arithmetic.js`.

### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

You'll get an error: `subtract` is not defined.

### Step 3: Write Minimal Code to Pass the Test (Green)

Implement `subtract` in `arithmetic.js`:

```javascript
// example/basic-math/src/arithmetic.js
export const add = (a, b) => {
	return a + b;
};

export const subtract = (a, b) => {
	return a - b;
};
```

### Step 4: Run the Test Again

Run the test:

```bash
npm test
```

All subtraction tests should pass.

### Step 5: Refactor

Again, the code is simple and needs no refactoring.

## Multiplication Function

### Step 1: Write the Test (Red)

Add tests for `multiply` in `examples/basic-math/src/arithmetic.test.js`:

```javascript
// examples/basic-math/src/arithmetic.test.js
import { multiply } from './calculator';

describe('multiply', () => {
	it('multiplies two positive numbers', () => {
		expect(multiply(2, 3)).toBe(6);
	});

	it('multiplies by zero', () => {
		expect(multiply(5, 0)).toBe(0);
	});

	it('multiplies negative numbers', () => {
		expect(multiply(-2, -3)).toBe(6);
	});

	it('multiplies a positive and a negative number', () => {
		expect(multiply(-2, 3)).toBe(-6);
	});
});
```

### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

Error: `multiply` is not defined.

### Step 3: Write Minimal Code to Pass the Test (Green)

Implement `multiply` in `arithmetic.js`:

```javascript
// example/basic-math/src/arithmetic.js
export const add = (a, b) => {
	return a + b;
};

export const subtract = (a, b) => {
	return a - b;
};

export const multiply = (a, b) => {
	return a * b;
};
```

### Step 4: Run the Test Again

Run the test:

```bash
npm test
```

All multiplication tests should pass.

### Step 5: Refactor

No refactoring needed. Life is so simple right now.

## Division Function

### Step 1: Write the Test (Red)

Add tests for `divide` in `examples/basic-math/src/arithmetic.test.js`:

```javascript
// examples/basic-math/src/arithmetic.test.js
import { divide } from './calculator';

describe('divide', () => {
	it('divides two positive numbers', () => {
		expect(divide(6, 3)).toBe(2);
	});

	it('divides a number by one', () => {
		expect(divide(5, 1)).toBe(5);
	});

	it('divides zero by a number', () => {
		expect(divide(0, 5)).toBe(0);
	});

	it('divides negative numbers', () => {
		expect(divide(-6, -3)).toBe(2);
	});

	it('divides a positive and a negative number', () => {
		expect(divide(-6, 3)).toBe(-2);
	});
});
```

### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

Error: `divide` is not defined.

### Step 3: Write Minimal Code to Pass the Test (Green)

Implement `divide` in `arithmetic.js`:

```javascript
// example/basic-math/src/arithmetic.js
export const add = (a, b) => {
	return a + b;
};

export const subtract = (a, b) => {
	return a - b;
};

export const multiply = (a, b) => {
	return a * b;
};

export const divide = (a, b) => {
	return a / b;
};
```

### Step 4: Run the Test Again

Run the test:

```bash
npm test
```

All division tests should pass.

### Step 5: Refactor

Again. No refactoring needed. I'm just trying to make a point here.
