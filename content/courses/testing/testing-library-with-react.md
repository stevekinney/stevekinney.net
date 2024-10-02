---
title: Creating Test Files For A Counter Component
description: "Writing tests for the Counter component's rendering and interaction."
modified: 2024-09-28T16:02:28-06:00
---

Let's create a test file for the `Counter` component. We'll start by testing the rendering of the component and interactions.

## Test Breakdown

### Initial Rendering

- `it('renders with an initial count of 0')`: Verifies that the initial state of the counter is `0`.
- `it('displays "days" when the count is 0')`: Ensures the plural form "days" is displayed when the count is `0`.

### Incrementing the Counter

- `it('increments the count when the "Increment" button is clicked')`: Simulates clicking the increment button and verifies that the counter updates to `1`.
- `it('displays "day" when the count is 1')`: After incrementing, checks that the singular "day" is displayed.

### Decrementing the Counter

- `it('decrements the count when the "Decrement" button is clicked')`: Increments the counter, then decrements it, and checks that the counter returns to `0`.
- `it('does not allow decrementing below 0')`: Ensures the counter doesn't go below `0`.

### Resetting the Counter

- `it('resets the count when the "Reset" button is clicked')`: Increments the counter, then clicks the reset button to ensure the counter resets to `0`.

### Disabling Buttons

- `it('disables the "Decrement" and "Reset" buttons when the count is 0')`: Ensures that when the counter is `0`, the "Decrement" and "Reset" buttons are disabled.

### Document Title Updates

- `it('updates the document title based on the count')`: Verifies that the document title is updated dynamically based on the counter value, using the `useEffect` hook.

## The Tests

```jsx
// src/counter.test.jsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Counter } from './Counter';
import { reducer } from './reducer';

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

	it('increments the count when the "Increment" button is clicked', () => {
		const incrementButton = screen.getByText('Increment');
		fireEvent.click(incrementButton);

		const countElement = screen.getByTestId('counter-count');
		expect(countElement).toHaveTextContent('1');
	});

	it('displays "day" when the count is 1', () => {
		const incrementButton = screen.getByText('Increment');
		fireEvent.click(incrementButton);

		const unitElement = screen.getByTestId('counter-unit');
		expect(unitElement).toHaveTextContent('day');
	});

	it('decrements the count when the "Decrement" button is clicked', () => {
		const incrementButton = screen.getByText('Increment');
		const decrementButton = screen.getByText('Decrement');

		fireEvent.click(incrementButton); // Increment first
		fireEvent.click(decrementButton); // Then decrement

		const countElement = screen.getByTestId('counter-count');
		expect(countElement).toHaveTextContent('0');
	});

	it('does not allow decrementing below 0', () => {
		const decrementButton = screen.getByText('Decrement');
		fireEvent.click(decrementButton); // Should not decrement below 0

		const countElement = screen.getByTestId('counter-count');
		expect(countElement).toHaveTextContent('0');
	});

	it('resets the count when the "Reset" button is clicked', () => {
		const incrementButton = screen.getByText('Increment');
		const resetButton = screen.getByText('Reset');

		fireEvent.click(incrementButton); // Increment first
		fireEvent.click(resetButton); // Then reset

		const countElement = screen.getByTestId('counter-count');
		expect(countElement).toHaveTextContent('0');
	});

	it('disables the "Decrement" and "Reset" buttons when the count is 0', () => {
		const decrementButton = screen.getByText('Decrement');
		const resetButton = screen.getByText('Reset');

		expect(decrementButton).toBeDisabled();
		expect(resetButton).toBeDisabled();
	});

	it('updates the document title based on the count', () => {
		const incrementButton = screen.getByText('Increment');
		fireEvent.click(incrementButton);

		expect(document.title).toBe('1 day');

		fireEvent.click(incrementButton);
		expect(document.title).toBe('2 days');
	});
});
```

## Summary

1. **Render Tests**: Check if the `Counter` component renders correctly with initial values.
2. **Interaction Tests**: Test the functionality of the buttons (increment, decrement, reset).
3. **DOM Updates**: Verify that the DOM and document title are updated properly based on the state.
4. **Edge Case Tests**: Ensure that buttons behave correctly when the counter is at its edge values (e.g., not decrementing below 0).

We can also use [user-event](accident-counter-with-user-event.md) to simulate clicks.
