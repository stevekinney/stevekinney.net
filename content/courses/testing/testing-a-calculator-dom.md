---
title: Extending A Calculator With A User Interface Using TDD
description: Learn how to extend a calculator with a basic UI using TDD.
modified: 2024-09-28T15:37:56-06:00
---

In the [first part of this example](basic-math.md).

We'll continue to use TDD principles, writing tests before implementing the functionality. This time, we'll focus on testing the user interface and ensuring that user interactions produce the expected results.

## Setting Up the Testing Environment for the DOM

To test DOM interactions, we'll use **Vitest** with the `jsdom` environment, which simulates a browser environment in Node.js. In addition to Vitest, we're going to me using the following tools:

- [`jsdom`](https://npm.im/jsdom): Simulates the DOM in Node.js.
- [`@testing-library/dom`](https://npm.im/@testing-library/dom): Provides utilities for testing DOM nodes.
- [`@testing-library/user-event`](https://npm.im/@testing-library/user-event): Simulates user interactions.

### `vitest.config.js`

We're going to Vitest to use the `jsdom` environment.

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'happy-dom',
	},
});
```

We have one test that we'll get rid of that just does a sanity check that everything is set up correctly.

```javascript
it('is running our test in a browser-like environment', () => {
	expect(typeof window).not.toBe('undefined');
});
```

## Writing Tests and Code

We'll use TDD to implement the following features:

1. Displaying numbers when buttons are clicked.
2. Performing calculations when the equals button is clicked.
3. Clearing the display when the clear button is clicked.

### Displaying Numbers When Buttons Are Clicked

### Step 0: Load the Calculator into the DOM

We need to put the element that we want to test onto our page. Let's render a fresh calculator before every single test.

```javascript
import { beforeEach, describe, expect, it } from 'vitest';
import { createCalculator } from './calculator.js';

it('is running our test in a browser-like environment', () => {
	expect(typeof window).not.toBe('undefined');
});

describe('Calculator', () => {
	beforeEach(() => {
		createCalculator(document.body);
	});

	it('should have a element with the id of "calculator"', () => {
		expect(document.getElementById('calculator')).not.toBe(null);
	});
});
```

Again, these tests are mostly just to make sure we've wired everything up correctly. If you find it helpful to keep them, you're more than welcome to. But, you can also get rid of them if you want.

#### Writing Our First Test

```javascript
// tests/calculator.dom.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/dom';

describe('Calculator', () => {
	let display;

	beforeEach(() => {
		renderCalculator(document.body);

		display = document.getElementById('display');
	});

	it('displays number when a number button is clicked', () => {
		/** @type {NodeListOf<HTMLButtonElement>} */
		const [button] = document.querySelectorAll('button');
		const value = button.dataset.value;

		fireEvent.click(button);

		expect(display.value).toBe(value);
	});

	it('display the sum of multiple numbers when the equals button is clicked', () => {
		const one = document.getElementById('digit-1');
		const two = document.getElementById('digit-2');
		const three = document.getElementById('digit-3');

		fireEvent.click(one);
		fireEvent.click(two);
		fireEvent.click(three);

		expect(display.value).toBe('123');
	});
});
```

**Explanation:**

- We set up the DOM in `beforeEach` using \`renderCalculator.
- We simulate button clicks using `fireEvent.click`.
- We check that the display shows the correct values.

#### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

Tests will fail because we haven't implemented the functionality yet.

#### Step 3: Write Minimal Code to Pass the Test (Green)

Implement the event listeners in `src/index.js`:

```javascript
export function renderCalculator(target) {
	render(calculator, target);

	/** @type {HTMLInputElement} */
	const display = target.querySelector('#display');

	/** @type {NodeListOf<HTMLButtonElement>} */
	const numbers = target.querySelectorAll('.number');

	numbers.forEach((number) => {
		number.addEventListener('click', () => {
			display.value += number.dataset.value;
		});
	});
}
```

**Explanation:**

- We select the display and all buttons.
- We add a click event listener to each button.
- When a button is clicked, we get its `data-value` attribute.
- If `value` exists (i.e., not the equals or clear buttons), we append it to the display.

#### Step 4: Run the Test Again

Run the test:

```bash
npm test
```

Tests should now pass.

#### Step 5: Refactor

Our code is simple but we can ensure it handles only number inputs at this stage.

### Exercise: Performing Multple Button Presses

Can you add support for multple button presses?

```javascript
it('display the sum of multiple numbers when the equals button is clicked', () => {
	const one = document.getElementById('digit-1');
	const two = document.getElementById('digit-2');
	const three = document.getElementById('digit-3');

	fireEvent.click(one);
	fireEvent.click(two);
	fireEvent.click(three);

	expect(display.value).toBe('123');
});
```

### Performing Calculations

#### Step 1: Write the Test (Red)

Add tests to verify that calculations are performed when the equals button is clicked.

Update `calculator.test.js`:

```javascript
it('supports addings two numbers and displaying the result', () => {
	const one = document.getElementById('digit-1');
	const two = document.getElementById('digit-2');
	const add = document.getElementById('add');
	const equals = document.getElementById('equals');

	fireEvent.click(one);
	fireEvent.click(add);
	fireEvent.click(two);
	fireEvent.click(equals);

	expect(display.value).toBe('3');
});
```

**Explanation:**

- We create additional buttons (`+` and `=`) and append them to the DOM.
- We simulate clicking `1 + 2 =`.
- We expect the display to show `3`.

#### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

The test fails because the calculation logic is not implemented.

#### Step 3: Write Minimal Code to Pass the Test (Green)

Modify `src/calculator.js`:

```javascript
export function renderCalculator(target) {
	// … previous code …

	let buffer = 0;

	/** @type {NodeListOf<HTMLButtonElement>} */
	const operators = target.querySelectorAll('.operator');

	/** @type {HTMLButtonElement} */
	const equals = target.querySelector('#equals');

	operators.forEach((operator) => {
		operator.addEventListener('click', () => {
			buffer = display.valueAsNumber;
			display.value = '';
		});
	});

	equals.addEventListener('click', () => {
		const result = buffer + display.valueAsNumber;
		display.value = String(result);
	});
}
```

**Explanation:**

- We keep track of a value using `buffer`. It will start out as zero.
- When a number is clicked, we append it to the display.
- When an operator is clicked, we store `result` and reset the display.
- When the equals button is clicked, we add what is currently in the display to what's previously stored.

#### Step 4: Run the Test Again

Run the test:

```bash
npm test
```

The test should now pass.

#### Step 5: Refactor

Consider handling more operators and ensuring the code is clean.

### Exercise: Clearing the Display

#### Step 1: Write the Test (Red)

Add a test for the clear functionality:

```javascript
it('clears the display when the clear button is clicked', () => {
	const one = document.getElementById('digit-1');
	const clear = document.getElementById('clear');

	fireEvent.click(one);
	fireEvent.click(clear);

	expect(display.value).toBe('');
});
```

#### Step 2: Run the Test and See It Fail

Run the test:

```bash
npm test
```

The test fails because the clear functionality is not properly implemented.

#### Step 3: Write Minimal Code to Pass the Test (Green)

Update `src/calculator.js`:

```javascript
// … existing code ...
/** @type {HTMLButtonElement} */
const clear = target.querySelector('#clear');

clear.addEventListener('click', () => {
	buffer = 0;
	display.value = '';
});
```

#### Step 4: Run the Test Again

Run the test:

```bash
npm test
```

The test should pass.

#### Step 5: Refactor

Ensure that all event listeners are added consistently and the code is organized.

## Running the Tests

Run all tests using:

```bash
npm test
```

Vitest will execute all tests directory and report the results.

We've successfully extended our calculator application by adding a user interface and testing DOM interactions using Vitest. By following TDD principles, we ensured that our UI behaves as expected before implementing the functionality.

## Additional Exercises

For further practice and experimentation, you could consider implementing the following features. I'll leave these as exercises for the reader.

1. **Implement Remaining Operators**
   - Add support for subtraction (`-`), multiplication (`*`), and division (`/`).
   - Write tests for each operator to ensure correct calculations.
2. **Handle Decimal Numbers**
   - Update the calculator to handle decimal numbers.
   - Write tests to verify calculations with decimal inputs.
3. **Operator Chaining**
   - Allow users to perform calculations like `1 + 2 + 3`.
   - Write tests to cover multiple operations in a sequence.
4. **Keyboard Support**
   - Enable users to use the keyboard to input numbers and operators.
   - Write tests to simulate keyboard events and verify functionality.
5. **Error Handling**
   - Display an error message when invalid operations are performed (e.g., division by zero).
   - Write tests to ensure errors are handled gracefully.
6. **Percentage and Square Root Functions**
   - Add buttons for percentage (`%`) and square root (`√`) operations.
   - Implement the functionality and write corresponding tests.
