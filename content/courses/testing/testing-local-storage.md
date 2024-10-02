---
title: Testing Local Storage
description: We can emulate the DOM for those times when we need to test stuff that is not available in Node
modified: 2024-09-28T14:01:05-06:00
---

Let's say we have some code that touches `localStorage`. Normally, our tests run in Node, but `localStorage` isn't in Node. Sure, we _could_ use [mocks](mocks.md) or [stubs](stubs.md), but we could also just emulate the browser environment.

```javascript
it('should properly assign to localStorage', () => {
	const key = 'secret';
	const message = "It's a secret to everybody.";

	localStorage.setItem(key, message);
	expect(localStorage.getItem(key)).toBe(message);
});
```

## One More Time: With Some DOM Interaction

Consider this function that creates some elements for storing a secret into `localStorage`. You can find this example in `examples/element-factory/src/secret-input.js`.

```javascript
export function createSecretInput() {
	const id = 'secret-input';

	const container = document.createElement('div');
	const input = document.createElement('input');
	const label = document.createElement('label');
	const button = document.createElement('button');

	input.id = id;
	input.type = 'password';
	input.placeholder = 'Enter your secret…';

	label.htmlFor = id;
	label.textContent = 'Secret';

	button.textContent = 'Store Secret';
	button.addEventListener('click', () => {
		localStorage.setItem('secret', input.value);
		input.value = '';
	});

	container.appendChild(label);
	container.appendChild(input);
	container.appendChild(button);

	return container;
}
```

We could write the following tests to verify that that it does what we think it ought to do. Check out `examples/element-factory/src/secret-input.test.js`:

```javascript
import { describe, expect, it, beforeEach } from 'vitest';
import { createSecretInput } from './secret-input.js';

describe('createSecretInput', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should store the value in localStorage', () => {
		const secretInput = createSecretInput();
		const input = secretInput.querySelector('input');
		const button = secretInput.querySelector('button');

		input.value = 'my secret';
		button.click();

		expect(localStorage.getItem('secret')).toBe('my secret');
	});
});
```
