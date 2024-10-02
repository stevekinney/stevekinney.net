---
title: 'Setting The Stage: Testing React Hooks'
description: Learn how to test React hooks using Vitest and Testing Library.
modified: 2024-09-28T15:45:56-06:00
---

We’re going to use Vitest along with the `@testing-library/react-hooks` package. This magical package lets you test hooks in isolation, without any of the noise of rendering a full component. So it's like putting your hook inside a little bubble, free from distraction.

## Writing a Simple Hook

Let’s assume you’ve got a hook that tracks how much coffee you've consumed. Nothing too fancy, just a basic counter.

```javascript
import { useState } from 'react';

export function useCoffeeCounter() {
	const [cups, setCups] = useState(0);

	const drinkCoffee = () => setCups((prev) => prev + 1);

	return {
		cups,
		drinkCoffee,
	};
}
```

Cool, a little hook that increases the number of cups you’ve consumed. Now let’s write some tests for it.

## Setting Up a Basic Hook Test

With `@testing-library/react-hooks`, you can safely test your hook in isolation. Here’s how you roll:

```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import { useCoffeeCounter } from './useCoffeeCounter'; // adjust path as needed

describe('useCoffeeCounter', () => {
	it('should initialize with 0 cups', () => {
		const { result } = renderHook(() => useCoffeeCounter());

		expect(result.current.cups).toBe(0);
	});

	it('should increase the number of cups when drinkCoffee is called', () => {
		const { result } = renderHook(() => useCoffeeCounter());

		// This is where act comes into play—they call it act for a reason.
		act(() => {
			result.current.drinkCoffee();
		});

		expect(result.current.cups).toBe(1);
	});
});
```

Let’s break it down.

- `renderHook` is the main player here. It lets you run your hook just like you would in a component, but without any of the rendering nonsense.
- `result.current` is essentially the return value of your hook. It’s where your state and functions, like `cups` and `drinkCoffee`, live.
- `act` is a necessary helper anytime you're making changes that will affect your hook’s state or side effects. Gotta wrap those state changes!

## Handling More Complex Hooks

Let’s imagine you’re tracking not only the coffee but also your productivity levels (because caffeine is magic). Now, our hook looks like this:

```javascript
import { useState, useEffect } from 'react';

export function useCoffeeCounter() {
	const [cups, setCups] = useState(0);
	const [productivity, setProductivity] = useState(0);

	const drinkCoffee = () => setCups((prev) => prev + 1);

	useEffect(() => {
		if (cups > 0) {
			setProductivity(cups * 10); // More coffee, more productivity—totally how it works!
		}
	}, [cups]);

	return {
		cups,
		productivity,
		drinkCoffee,
	};
}
```

Now the hook also tracks productivity based on cups of coffee consumed. New tests coming right up:

```javascript
describe('useCoffeeCounter', () => {
	it('should increase productivity as coffee cups increase', () => {
		const { result } = renderHook(() => useCoffeeCounter());

		act(() => {
			result.current.drinkCoffee();
		});

		expect(result.current.cups).toBe(1);
		expect(result.current.productivity).toBe(10);
	});

	it('should not affect productivity if no coffee is consumed', () => {
		const { result } = renderHook(() => useCoffeeCounter());

		expect(result.current.cups).toBe(0);
		expect(result.current.productivity).toBe(0);
	});
});
```

And just like that, you’ve covered both cases: one where drinking coffee boosts productivity (as it should!) and one where no coffee keeps you at baseline (a bleak existence, really).

Testing hooks doesn’t have to be the hair-pulling, coffee-chugging ordeal you thought it was. With `renderHook` and `act`, the `@testing-library/react-hooks` makes it super easy to check the state and behavior of your hook in isolation.
