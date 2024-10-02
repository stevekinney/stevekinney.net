---
title: Install userEvent
description: Refactor your tests to use userEvent instead of fireEvent.
modified: 2024-09-28T13:04:21-06:00
---

> \[!NOTE] If You're Not Using the Example Repository
> I've already done this for you, but I'm going to include this for reference. If you haven’t installed `@testing-library/user-event`, you made need to do a `npm install --save-dev @testing-library/user-event`.

## Refactor the Test File to Use `userEvent`

Update the test cases to use `userEvent` instead of `fireEvent`.

### Refactored Test Code

```jsx
// src/counter.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

describe('Counter Component', () => {
	beforeEach(() => {
		render(<Counter />);
	});

	it('renders with an initial count of 0', () => {
		const countElement = screen.getByTestId('counter-count');
		expect(countElement).toHaveTextContent('0');
	});

	it('displays "days" when the count is 0', () => {
		const unitElement = screen.getByTestId('counter-unit');
		expect(unitElement).toHaveTextContent('days');
	});

	it('increments the count when the "Increment" button is clicked', async () => {
		const incrementButton = screen.getByText('Increment');
		await userEvent.click(incrementButton); // Using userEvent for a real click event

		const countElement = screen.getByTestId('counter-count');
		expect(countElement).toHaveTextContent('1');
	});

	it('displays "day" when the count is 1', async () => {
		const incrementButton = screen.getByText('Increment');
		await userEvent.click(incrementButton); // Increment the count

		const unitElement = screen.getByTestId('counter-unit');
		expect(unitElement).toHaveTextContent('day');
	});

	it('decrements the count when the "Decrement" button is clicked', async () => {
		const incrementButton = screen.getByText('Increment');
		const decrementButton = screen.getByText('Decrement');

		await userEvent.click(incrementButton); // Increment first
		await userEvent.click(decrementButton); // Then decrement

		const countElement = screen.getByTestId('counter-count');
		expect(countElement).toHaveTextContent('0');
	});

	it('does not allow decrementing below 0', async () => {
		const decrementButton = screen.getByText('Decrement');
		await userEvent.click(decrementButton); // Should not decrement below 0

		const countElement = screen.getByTestId('counter-count');
		expect(countElement).toHaveTextContent('0');
	});

	it('resets the count when the "Reset" button is clicked', async () => {
		const incrementButton = screen.getByText('Increment');
		const resetButton = screen.getByText('Reset');

		await userEvent.click(incrementButton); // Increment first
		await userEvent.click(resetButton); // Then reset

		const countElement = screen.getByTestId('counter-count');
		expect(countElement).toHaveTextContent('0');
	});

	it('disables the "Decrement" and "Reset" buttons when the count is 0', () => {
		const decrementButton = screen.getByText('Decrement');
		const resetButton = screen.getByText('Reset');

		expect(decrementButton).toBeDisabled();
		expect(resetButton).toBeDisabled();
	});

	it('updates the document title based on the count', async () => {
		const incrementButton = screen.getByText('Increment');
		await userEvent.click(incrementButton);

		expect(document.title).toBe('1 day');

		await userEvent.click(incrementButton);
		expect(document.title).toBe('2 days');
	});
});
```

## Explanation of Changes

### Replacing `fireEvent` with `userEvent`

`fireEvent` triggers events directly on DOM elements, but it does not simulate user behavior as realistically as `userEvent`.

`userEvent.click()` simulates a user clicking on the button, which results in a more realistic simulation of what would happen in a browser.

### `await` For Asynchronous Behavior

The `userEvent` API is more asynchronous than `fireEvent`, so we need to use `await` when clicking buttons to ensure the UI updates correctly before assertions.

### Improved User Simulation

`userEvent` handles various user interactions (e.g., mouse events, key presses, typing) more closely to how a user would interact with the browser, making the tests more robust.

## Why Use `userEvent` Over `fireEvent`?

- **Realism**: `userEvent` better simulates actual user interaction, such as holding down a button, typing, or clicking. It accounts for browser behavior more accurately.
- **Future-Proofing**: `userEvent` is recommended by Testing Library and has better support for future browser features.
- **Async Handling**: Some actions that require browser delays (like typing or multiple clicks) are better handled with `userEvent`.

In this refactored test suite, we used `userEvent` to simulate real user interactions with the `Counter` component. This method is more reliable and representative of how users interact with your app, and it prepares your tests to handle more complex interactions in the future.
