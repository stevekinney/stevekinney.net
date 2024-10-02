---
title: Refactoring Our Button Test
description: Let's look at a solution for using Testing Library to test a button.
modified: 2024-09-28T15:45:56-06:00
---

Again, we're likely going to want to bring in our libraries:

```javascript
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
```

Next we'll use `user-event` to click the button instead of calling a method on the element.

```javascript
it('should change the text to "Clicked!" when clicked', async () => {
	const button = createButton();

	await userEvent.click(button);

	expect(button.textContent).toBe('Clicked!');
});
```

> [!tip] Remember to make the test function asynchronous.

## Rendering the Button to the DOM

We can also choose to render the button to the `document` and find it that way.

```javascript
it('should change the text to "Clicked!" when clicked', async () => {
	document.body.appendChild(createButton());
	const button = screen.getByRole('button', { name: 'Click Me' });

	await userEvent.click(button);

	expect(button.textContent).toBe('Clicked!');
});
```

This is also nice because it makes that test where we make sure that the button has the correct label obsolete. Come to think of it, it also makes that first test where we look at the type of element obsolete as well.
