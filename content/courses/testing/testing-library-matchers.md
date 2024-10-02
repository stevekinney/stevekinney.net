---
modified: 2024-09-30T10:44:47-06:00
title: "Working with Testing Library's Matchers"
description: "Learn how to test DOM nodes more effectively using Testing Library's Matchers"
---

Testing Library also includes some useful matchers for making expectations on DOM elements. As a fun bonus, we're going to use React as well—just to show you how little of a difference it makes when it comes to testing your UI in the DOM.

Let's head on over to `examples/accident-counter`.

## Setting Up Testing Library's Matchers

In `examples/accident-counter/src/counter.test.jsx`, we can extend the methods provided by `expect` by pulling in `@testing-library/jest-dom`.

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Counter } from './counter';

import '@testing-library/jest-dom';
```

This will call `expect.extend()`, which allows us to set up [customer matchers](custom-matchers.md). This will give us the following new methods on `expect`.

- `toBeDisabled`
- `toBeEnabled`
- `toBeEmptyDOMElement`
- `toBeInTheDocument`
- `toBeInvalid`
- `toBeRequired`
- `toBeValid`
- `toBeVisible`
- `toContainElement`
- `toContainHTML`
- `toHaveAccessibleDescription`
- `toHaveAccessibleErrorMessage`
- `toHaveAccessibleName`
- `toHaveAttribute`
- `toHaveClass`
- `toHaveFocus`
- `toHaveFormValues`
- `toHaveStyle`
- `toHaveTextContent`
- `toHaveValue`
- `toHaveDisplayValue`
- `toBeChecked`
- `toBePartiallyChecked`
- `toHaveRole`
- `toHaveErrorMessage`

You can read more about `@testing-library/jest-dom` [here](https://github.com/testing-library/jest-dom).

## Rendering the Counter

We want to render the `Counter` component before each test. This will put it back to it's original state.

```javascript
describe('Counter', () => {
	beforeEach(() => {
		render(<Counter />);
	});
});
```

## Testing the Counter

Now, let's write a quick test to see if it's rendering as expected.

```javascript
it('renders with an initial count of 0', () => {
	const countElement = screen.getByTestId('counter-count');
	expect(countElement).toHaveTextContent('0');
});
```

Notice the new `toHaveTextContent` method.

We can also verify that the `decrement` and `reset` buttons are disabled when the counter is at zero.

```javascript
it('disables the "Decrement" and "Reset" buttons when the count is 0', () => {
	const decrementButton = screen.getByRole('button', { name: 'Decrement' });
	const resetButton = screen.getByRole('button', { name: 'Reset' });

	expect(decrementButton).toBeDisabled();
	expect(resetButton).toBeDisabled();
});
```

## Your Turn

> [!example] Exercise

Implement as many of the following tests as you can:

- It displays "days" when the count is 0.
- It increments the count when the "Increment" button is clicked.
- It displays "day" when the count is 1.
- It decrements the count when the "Decrement" button is clicked.
- It does not allow decrementing below 0.
- It resets the count when the "Reset" button is clicked.
- It disables the "Decrement" and "Reset" buttons when the count is 0.
- It updates the document title based on the count.

You can see a potential solution [here](accident-counter-solution.md).
