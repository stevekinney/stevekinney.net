---
title: Mocking DOM Methods
description: "Let's take a look at mocking methods… in the DOM."
modified: 2024-09-28T13:35:29-06:00
---

Way back [in the beginning](the-basics.md), we got `add` working, but let’s up our game. Let’s assume we’ve got a button that increments a counter when clicked. We want to test that the user sees the count increase.

We’ll need to adjust our setup a bit for the DOM:

```html
<!-- index.html -->
<html lang="en">
	<head>
		<title>Counter</title>
	</head>
	<body>
		<div id="app">
			<p id="counter">0</p>
			<button id="increment">Increment</button>
		</div>

		<script>
			const counterElement = document.getElementById('counter');
			const buttonElement = document.getElementById('increment');
			let count = 0;

			buttonElement.addEventListener('click', () => {
				count += 1;
				counterElement.textContent = count;
			});
		</script>
	</body>
</html>
```

Here’s the test for that behavior:

```js
import { describe, it, expect } from 'vitest';

describe('Counter app', () => {
	it('should increment the count when the button is clicked', () => {
		// Set up DOM
		document.body.innerHTML = `
      <p id="counter">0</p>
      <button id="increment">Increment</button>
    `;

		const button = document.getElementById('increment');
		const counter = document.getElementById('counter');

		// Fake our state
		let count = 0;
		button.addEventListener('click', () => {
			count += 1;
			counter.textContent = count;
		});

		// Simulate the button click
		button.click();

		// Check if the behavior is what we expect
		expect(counter.textContent).toBe('1');
	});
});
```

Rather than testing the internal state directly, we’re checking **the thing we care about most**—what the user sees: that number goes up when the button is clicked. Now when some poor soul is maintaining your app in the future, they can *immediately tell* what’s going on—oh, button click equals counter change, cool. They don’t have to dig into how the inner state of `count` works.

## Mocking DOM Methods

Sometimes you need to mock up DOM methods or third-party services—stuff that gets a little trickier in tests. Let’s mock the `getElementById` function to see how easy it is in Vitest:

```js
import { describe, it, vi } from 'vitest';

describe('DOM tests', () => {
	it('should call getElementById', () => {
		const spy = vi.spyOn(global.document, 'getElementById').mockReturnValue({
			textContent: '0',
		});

		const element = document.getElementById('counter');

		expect(spy).toHaveBeenCalled();
		expect(element.textContent).toBe('0');

		spy.mockRestore();
	});
});
```

You just mocked `getElementById` and verified it was called. Vitest comes with a mocking library built-in, so you don’t need to yank in extra dependencies just for the basics like spies, mocks, and stubs.
