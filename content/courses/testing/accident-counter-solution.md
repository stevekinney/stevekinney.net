---
modified: 2024-09-30T10:55:21-06:00
title: 'Accident Counter: Solution'
description: 'The solution for the Accident Counter exercise in the "Introduction to Testing" course for Frontend Masters.'
---

Your code might look a bit different, but here is one possible solution.

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Counter } from './counter';

import '@testing-library/jest-dom';

describe('Counter ', () => {
	beforeEach(() => {
		render(<Counter />);
	});

	it('renders with an initial count of 0', () => {
		const countElement = screen.getByTestId('counter-count');
		expect(countElement).toHaveTextContent('0');
	});

	it('disables the "Decrement" and "Reset" buttons when the count is 0', () => {
		const decrementButton = screen.getByRole('button', { name: 'Decrement' });
		const resetButton = screen.getByRole('button', { name: 'Reset' });

		expect(decrementButton).toBeDisabled();
		expect(resetButton).toBeDisabled();
	});

	it('displays "days" when the count is 0', () => {
		const unitElement = screen.getByTestId('counter-unit');
		expect(unitElement).toHaveTextContent('days');
	});

	it('increments the count when the "Increment" button is clicked', async () => {
		const incrementButton = screen.getByRole('button', { name: 'Increment' });
		const countElement = screen.getByTestId('counter-count');

		await userEvent.click(incrementButton); // Using userEvent for a real click event

		expect(countElement).toHaveTextContent('1');
	});

	it('displays "day" when the count is 1', async () => {
		const incrementButton = screen.getByRole('button', { name: 'Increment' });
		const unitElement = screen.getByTestId('counter-unit');

		await userEvent.click(incrementButton); // Increment the count

		expect(unitElement).toHaveTextContent('day');
	});

	it('decrements the count when the "Decrement" button is clicked', async () => {
		const incrementButton = screen.getByRole('button', { name: 'Increment' });
		const decrementButton = screen.getByRole('button', { name: 'Decrement' });
		const countElement = screen.getByTestId('counter-count');

		await userEvent.click(incrementButton); // Increment first
		await userEvent.click(decrementButton); // Then decrement

		expect(countElement).toHaveTextContent('0');
	});

	it('does not allow decrementing below 0', async () => {
		const decrementButton = screen.getByRole('button', { name: 'Decrement' });
		const countElement = screen.getByTestId('counter-count');

		await userEvent.click(decrementButton); // Should not decrement below 0

		expect(countElement).toHaveTextContent('0');
	});

	it('resets the count when the "Reset" button is clicked', async () => {
		const incrementButton = screen.getByRole('button', { name: 'Increment' });
		const resetButton = screen.getByRole('button', { name: 'Reset' });
		const countElement = screen.getByTestId('counter-count');

		await userEvent.click(incrementButton); // Increment first
		await userEvent.click(resetButton); // Then reset

		expect(countElement).toHaveTextContent('0');
	});

	it('disables the "Decrement" and "Reset" buttons when the count is 0', () => {
		const decrementButton = screen.getByRole('button', { name: 'Decrement' });
		const resetButton = screen.getByRole('button', { name: 'Reset' });

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
