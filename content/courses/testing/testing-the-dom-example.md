---
title: Testing a DOM Element
description: Learn how to test DOM interactions using Vitest and DOM Testing Library.
modified: 2024-09-28T16:08:44-06:00
---

Imagine you have a button, and when you click it, something happens. Classic case, right? Let’s whip up a basic test for that interaction. Here’s a simple function, found in `examples/element-factory/src/button.js`, that creates our DOM structure and adds some behavior:

```javascript
// examples/element-factory/src/button.js
export function createButton() {
	const button = document.createElement('button');
	button.textContent = 'Click Me';

	button.addEventListener('click', () => {
		button.textContent = 'Clicked!';
	});

	return button;
}
```

Nothing fancy—just a button that says "Click Me," and when you click it, it changes to "Clicked!" It’s like a microwave tutorial level for DOM testing.

## Writing the Test

Now let's test this sucker and make sure it's not lying to us. We’ll add a new test case to ensure the button successfully changes text on click.

```javascript
import { it, expect, describe } from 'vitest';
import { createButton } from './button.js';

describe('createButton', () => {
	it('should create a button element', () => {
		const button = createButton();
		expect(button.tagName).toBe('BUTTON');
	});

	it('should have the text "Click Me"', () => {
		const button = createButton();
		expect(button.textContent).toBe('Click Me');
	});

	it('should change the text to "Clicked!" when clicked', () => {
		const button = createButton();
		button.click();
		expect(button.textContent).toBe('Clicked!');
	});
});
```

Whether you're using `jsdom` or `happy-dom`, all of the DOM methods have been filled in for you. The code is still running in Node, technically—but it has access to all of the methods that you might otherwise only find in the browser.
