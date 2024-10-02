---
title: 'Mocking and Spying on Local Storage'
description: An example where we mock and spy on local storage.
modified: 2024-09-30T14:14:38-06:00
---

Let's take a look at `examples/element-factory/src/secret-input.test.js` again. We have some functionality where the input field can be pre-populated with whatever is currently in `localStorage`. Let's say that we want to both stub the value of `localStorage` and also be able to introspect the parameters that `localStorage.getItem` was called with.

Let's start by modifying our setup:

```javascript
beforeEach(() => {
	vi.spyOn(localStorage, 'getItem').mockReturnValue('test secret');
	vi.spyOn(localStorage, 'setItem');

	document.body.innerHTML = '';
	document.body.appendChild(createSecretInput());
});
```

Now, let's say that we want to take a look at whether or not the input has the correct value _and_ if it was pulling that value from `localStorage`.

```javascript
it('should have loaded the secret from localStorage', async () => {
	expect(screen.getByLabelText('Secret')).toHaveValue('test secret');
	expect(localStorage.getItem).toHaveBeenCalledWith('secret');
});
```

> [!note] Could we just set and clear local storage using JSDOM or Happy DOM?
> Yea, probably. We could. And, maybe we should. The only added advantage here is
> that we can look at the values that `localStorage.getItem` and `localStorage.setItem`
> were called with.
>
> To be totally transparent, I am mostly doing this because I'm going to have you
> take on more practical examples in a hot minute.

We can also do the same for setting the value. Bear in mind, since the secret is loaded from `localStorage`, you'll need to clear out the input field before typing into it.

```javascript
it('should save the secret to localStorage', async () => {
	const input = screen.getByLabelText('Secret');
	const button = screen.getByText('Store Secret');

	await userEvent.clear(input);
	await userEvent.type(input, 'new secret');
	await userEvent.click(button);

	expect(localStorage.setItem).toHaveBeenCalledWith('secret', 'new secret');
});
```

## Your Turn

> [!example] Can you mock out random numbers?
> Head over to `examples/guessing-game`. This game uses `Math.random` to come up with
> a random number—which could make it hard to test. Can you use the strategies above
> to keep `Math.random()` in a fixed place? **Hint**: `0.5` is a good choice.

You can see an example solution [here](guessing-game-solution.md).

## Further Reading

You can review some more examples [here](overriding-object-properties.md).

- [Overriding Object Properties](overriding-object-properties.md)
- [Mocking DOM Methods](mocking-dom-methods.md)
