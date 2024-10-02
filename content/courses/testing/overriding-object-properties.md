---
title: Overriding Object Properties
description: Learn how to override object properties in Vitest with various methods.
modified: 2024-09-30T14:12:04-06:00
---

In some test scenarios, you may need to override or mock specific properties of objects rather than functions. This can be useful when testing code that relies on object properties like environment variables, configuration settings, or dynamic values that are read from objects at runtime. In Vitest, you can override object properties using `vi.spyOn()` or directly setting properties to mock values during your tests.

## Use Cases for Overriding Object Properties

- **Environment variables**: Simulating different environments by overriding `process.env` properties.
- **Configuration objects**: Changing the values of configuration settings to test how your code behaves under different conditions.
- **Global objects**: Overriding global objects like `window`, `navigator`, or `document` in browser-based applications.
- **Dynamic properties**: Mocking values of properties that change over time, such as `Date.now` or `Math.random`.

## Overriding Object Properties with `vi.spyOn()`

When overriding getter or setter properties, you can use `vi.spyOn()` to replace their behavior. This is especially useful for built-in object properties like `window.location` or `process.env` that you need to override in a test.

Here’s an example of overriding a getter:

```js
// Spy on the global object property (e.g., window.location.href)
vi.spyOn(window, 'location', 'get').mockReturnValue({
	href: 'https://mocked-url.com',
});

describe('URL Test', () => {
	it('should use the mocked location', () => {
		// Test that the code uses the mocked URL
		expect(window.location.href).toBe('https://mocked-url.com');
	});
});
```

In this example, the `vi.spyOn()` method is used to spy on and mock the `location` property of the `window` object. It replaces the getter so that `window.location.href` returns the mocked value `'https://mocked-url.com'` instead of the real URL.

## Directly Overriding Object Properties

You can also directly override object properties for more straightforward scenarios, such as modifying the `process.env` object or other custom properties.

```js
// Override process.env property directly
process.env.API_KEY = 'mocked-api-key';

describe('API Key Test', () => {
	it('should use the mocked API key', () => {
		// Test that the code reads the mocked API key
		expect(process.env.API_KEY).toBe('mocked-api-key');
	});
});
```

In this example, the `process.env.API_KEY` property is directly overridden to simulate a different environment configuration for the test. After the test, you can restore the original value to ensure no side effects on other tests.

## Overriding Getters and Setters

For more complex scenarios where properties use getters or setters, you can override them directly by redefining the property using `Object.defineProperty()`.

Here’s how to override a property with a custom getter:

```js
// Override a property with a custom getter
Object.defineProperty(window, 'innerWidth', {
	get: vi.fn(() => 1024),
});

describe('Window Width Test', () => {
	it('should return the mocked window width', () => {
		// Test that the code returns the mocked width
		expect(window.innerWidth).toBe(1024);
	});
});
```

In this example, we use `Object.defineProperty()` to mock `window.innerWidth` with a custom getter that returns the value `1024`. This allows you to control how the property behaves during your tests.

## Restoring Overridden Properties

After overriding object properties, it’s important to restore them to their original state to avoid side effects in other tests. Vitest provides `mockRestore()` to reset spied or mocked properties.

```js
const originalHref = window.location.href;

vi.spyOn(window, 'location', 'get').mockReturnValue({
	href: 'https://mocked-url.com',
});

describe('URL Test', () => {
	afterEach(() => {
		// Restore the original property after each test
		window.location.href = originalHref;
	});

	it('should use the mocked location', () => {
		expect(window.location.href).toBe('https://mocked-url.com');
	});
});
```

By restoring the original value of `window.location.href` in the `afterEach()` block, you ensure that the overridden property does not interfere with other tests.

## Conclusion

Overriding object properties in Vitest is a powerful technique for testing code that relies on dynamic or external values like environment variables, configuration objects, or global properties. Whether you’re using `vi.spyOn()` to mock getters and setters, directly modifying properties, or using `Object.defineProperty()` for more advanced control, overriding properties allows you to test different scenarios in isolation. Always remember to reset or restore the original properties after the test to maintain clean, isolated test environments.
