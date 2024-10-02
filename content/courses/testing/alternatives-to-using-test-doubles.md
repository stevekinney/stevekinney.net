---
title: Alternatives To Using Test Doubles
description: Explore alternatives to using test doubles in your testing strategy.
modified: 2024-09-28T13:18:53-06:00
---

Put on your imagination cap for a second: You’re writing a test, and you *could* mock something out, but it just feels… wrong.

[Test Doubles](test-doubles.md)—those helpful [stubs](stubs.md), [mocks](mocks.md), and [spies](spies.md)—can be super useful, but they’re not always the best option. In fact, overusing them can lead to fragile tests. Let’s take a look at some solid alternatives to using test doubles and learn when we might not need the shiny bells and whistles of a mock library.

## Test the Real Thing

When possible, writing tests using the actual implementation is often the way to go. This approach keeps your tests grounded in reality and less subject to breaking because some mock behaved in a way you didn’t expect. Instead of trying to pretend what the function would return, let it return what it actually should.

Let's look at an example.

```javascript
function calculateTotal(cartItems) {
	return cartItems.reduce((total, item) => total + item.price, 0);
}

test('calculates correct total from cart items', () => {
	const items = [
		{ name: 'Widget', price: 9.99 },
		{ name: 'Gizmo', price: 12.49 },
	];
	const total = calculateTotal(items);
	expect(total).toBe(22.48);
});
```

Here, there’s no need to stub out anything, no mock need apply, just test the real deal. The function’s behavior is deterministic and plain. Boom. Done. Shipped.

## Inject Your Dependencies

Let’s say your function calls out to *another* part of your code. The temptation here is to mock that other function and avoid external side effects—but sometimes, letting those dependencies do their thing can give you a better test outcome.

For example, suppose you’ve got a `getUserCart` function that hits some local data store and calls `calculateTotal` under the hood. Instead of mocking `calculateTotal`, make use of it! It’s your code after all, and if your functions work well together, you’ve learned a lot more about your system than with partial mocks.

```javascript
function getUserCart(userId, cartService) {
	const cartItems = cartService.getCartByUserId(userId);
	return calculateTotal(cartItems);
}

test('returns correct total from cart service', () => {
	const cartService = {
		getCartByUserId: (id) => [
			{ name: 'Thingamajig', price: 19.99 },
			{ name: 'Doodad', price: 5.99 },
		],
	};

	const total = getUserCart(123, cartService);
	expect(total).toBe(25.98);
});
```

Here, I’m not mocking out `calculateTotal`—I want to see if it works as part of `getUserCart`. Even though I control `cartService` in the test, I let the rest of the code use its implementation. In many situations, letting the real dependencies run wild gives you far more confidence than relying on mocks for everything.

## Use Real Objects, Not Mocked Interfaces

When testing functions that return complex objects, it can be tempting to swap in mocks for the dependencies we call. But wait! You might be better served using real objects or factories to create these complex things, especially if they’re fairly lightweight.

Let’s say you have some `CartItem` object that carries both data and a relevant method.

```javascript
class CartItem {
	constructor(name, price) {
		this.name = name;
		this.price = price;
	}

	getPrice() {
		return this.price;
	}
}
```

If you’re testing how `getPrice` behaves, you probably don’t need to mock it—just use the real thing!

```javascript
test('calculates price of cart item correctly', () => {
	const item = new CartItem('Component A', 99.99);
	expect(item.getPrice()).toBe(99.99);
});
```

No need to mock that `CartItem`; it’s simple enough and faster to just use it directly.

## Self-Contained Tests

Sometimes, mocks exist to patch a leaky test… but let’s be real—maybe the test isn’t as contained as it *should* be. If your tests are self-reliant and focused, you don't need all the mock scaffolding to hold them together. Before reaching for a mock, ask yourself: *Should this test need to know about every other part of the system?* Often the answer is no, and a smaller test means no mocking is needed.

```javascript
test('correctly sums prices in cart', () => {
	const cart = [{ price: 10 }, { price: 20 }];

	const total = cart.reduce((sum, item) => sum + item.price, 0);
	expect(total).toBe(30);
});
```

Here, I don't need to mock anything—just set up my data, perform my action, and check the result. (Test Nirvana achieved!)

## Let Dumb Functions Do Their Thing

By “dumb” functions, I’m talking about pure functions or functions with no side effects. These are your friends during testing. You give them some inputs, they do their thing, and they spit out the right result—no need to mock their behavior.

```javascript
function add(a, b) {
	return a + b;
}

test('adds numbers correctly', () => {
	expect(add(2, 3)).toBe(5);
});
```

I mean, this is so basic it *hurts*—but sometimes, we complicate things unnecessarily by mocking functions that truly don’t need it. If nothing else, remember: simplicity is king in tests.

## Final Thoughts

Don’t get me wrong: mocking *has* its place (and Vitest does make it super easy to mock things with `vi.fn()`), but it’s a scalpel, not a sledgehammer. Always ask yourself if you can test the real implementation first. *Real code means real results.* If you go this route, your tests will be more reliable, you’ll spend less time worrying about mocking intricacies, and you can laser-focus on breaking your code in ways only *real* users would. Objectives aligned, mind at ease, testing purified.
