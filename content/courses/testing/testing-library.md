---
title: Using Testing Library
description: Learn to write user-focused tests using Testing Library with Vitest.
modified: 2024-09-28T16:00:32-06:00
---

[Testing Library](https://testing-library.com/) is designed to help you out with writing tests that focus on user behavior rather than implementation details. It provides utilities to query and interact with the DOM in a way that's similar to how users would.

Let's review the example from the [previous section](testing-local-storage.md).

```javascript
it('should store the value in localStorage', () => {
	const secretInput = createSecretInput();
	const input = secretInput.querySelector('input');
	const button = secretInput.querySelector('button');

	input.value = 'my secret';
	button.click();

	expect(localStorage.getItem('secret')).toBe('my secret');
});
```

This test passes. So, technically it works. But, there are some caveats that make it not super great for testing real world behavior:

1. We're setting the `input` element's value manually rather than simulating a user typing into it.
2. We're calling a method on the button instead of actually clicking on it.

One of the goals of Testing Library is to help us simulate actual user interactions.

## Why Use Testing Library?

- **User-Centric Testing**: Focuses on testing components from the user's perspective.
- **Avoids Implementation Details**: Reduces coupling between tests and component internals.
- **Improved Test Reliability**: Leads to tests that are more robust and less prone to breakage due to refactoring.
- **Accessible Queries**: Encourages testing with queries that reflect accessibility best practices.

## Components of Testing Library

Generally speaking you can think of Testing Library has two parts:

1. **A framework-specific flavor of helper methods**: For example, there is the core [`@testing-library/dom`](https://npm.im/@testing-library/dom). But there is also: [`@testing-library/react`](https://npm.im/@testing-library/react), [`@testing-library/vue`](https://npm.im/@testing-library/vue), [`@testing-library/svelte`](https://npm.im/@testing-library/svelte), etc.
2. **User Event** (`@testing-library/user-event`): A framework agnostic helper library for simulating user events.

## Refactoring the Secret Input

> [!WARNING] User Event is Asynchronous
> The methods provided by `userEvent` are asynchronous, which means your tests will need to use `async`/`await`.

Let's look at this test re-imagined using Testing Library. We'll look at the whole thing and then we'll break it down piece by piece.

```javascript
describe('createSecretInput', async () => {
	beforeEach(() => {
		document.innerHTML = '';
		document.body.appendChild(createSecretInput());
		localStorage.clear();
	});

	it('should store the value in localStorage', async () => {
		const input = screen.getByLabelText('Secret');
		const button = screen.getByRole('button', { name: 'Store Secret' });

		await userEvent.type(input, 'my secret');
		await userEvent.click(button);

		expect(localStorage.getItem('secret')).toBe('my secret');
	});
});
```

### Pulling in Our Dependencies

So, first I need to pull in that helper library—the one that I said was "framework-flavored" earlier. In this case, we're just using vanilla JavaScript. So, we're going with `@testing-library/dom`. We'll also pull in `@testing-library/user-event` for interacting with the DOM as a user might.

```javascript
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
```

### Setting Up the DOM

In the previous iteration, I was just playing around with the elements in memory. They were never rendered to the page. This time around, let's render them into the document. I'm also going to make sure I clear out the `document` before each test.

```javascript
beforeEach(() => {
	// Clear out the DOM.
	document.innerHTML = '';

	// Clear out `localStorage`.
	localStorage.clear();

	// Render our little component.
	document.body.appendChild(createSecretInput());
});
```

### Interact with the DOM

Now, we're going to use some accessibility selectors. `screen` is basically the browser window. This means that your `id` could change or be randomly generated or whatever. We're using the same functionality that a screen reader might use in order to find the elements.

```javascript
it('should store the value in localStorage', async () => {
	const input = screen.getByLabelText('Secret');
	const button = screen.getByRole('button', { name: 'Store Secret' });

	await user.type(input, 'my secret');
	await user.click(button);

	expect(localStorage.getItem('secret')).toBe('my secret');
});
```

> [!danger] Make Sure You're Awaiting Your User Events
> As an experiment—go ahead and remove those `await` keywords and see what happens. **Spoiler**: It's not good.

## When to Use Testing Library

- **Component Interaction Testing**: When you need to test how components respond to user actions.
- **Accessibility Compliance**: Ensuring components are accessible and interact as expected.
- **Behavior Verification**: Validating that components render and update correctly based on props and state.

> [!example] Exercise
> Can you refactor our button from [this section](testing-the-dom-example.md) (found in `examples/element-factory/src/button.js`) to use Testing Library and User Event? You can see a potential solution [here](testing-library-solution.md).

## Additional Reading

`@testing-library/dom` has a function called `fireEvent` that will fire raw events at DOM nodes. This is useful when you need it, but—generally-speaking—you should aim to use `user-event` instead since it will better simulate a user interaction. For example, a simple user event might consist of multiple DOM events.

- The user might click to focus on the field (`click`, `focus`).
- They might press a key (`keydown`, `keypress`).
- They'll probably release that key (`keyup`).
- That'll trigger a `change` event on the input field.

I wrote a bit more on [`user-event` here](user-event.md).
