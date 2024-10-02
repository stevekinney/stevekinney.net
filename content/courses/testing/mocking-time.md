---
title: Mocking Timers, Dates, And System Utilities
description: Learn how to mock timers, dates, and utilities in Vitest.
modified: 2024-09-28T15:14:27-06:00
---

A lot of UIs tend to show stuff like time and dates. As we've discussed previously, we want our tests to be consistent. As [Steve Miller once wrote](https://www.youtube.com/watch?v=HlItAutxJzk\&list=OLAK5uy_lRxgtVPfsBuzpgFdYdFi0Ej0J2mNwzz2A), (but let's be honest, you 're thinking of [Seal's version from the Space Jam soundtrack](https://www.youtube.com/watch?v=gxbBp9SH81U)):

> Time keeps on slipping into the future.
> Time keeps on slipping, slipping, slipping into the future.

Under the hood, Vitest uses [`@sinonjs/fake-timers`](https://github.com/sinonjs/fake-timers).

Typically, if you need to control time in your tests, you'd opt in to using Sinon's fake timers before the test suite in question and then you'd be a good time traveler and try to put everything back the way you found it when you're all done.

```ts
beforeEach(() => {
	// Take control of time.
	vi.useFakeTimers();
});

afterEach(() => {
	// Put things back the way you found it.
	vi.useRealTimers();
});
```

`useFakeTimers()` replaces the global `setTimeout`, `clearTimeout`, `setInterval`, `setImmediate`, `clearImmediate`, `process.hrtime`, `performance.now`, and `Date` with a custom implementation that you can control.

It returns a `clock` object that starts at the Unix epoch (i.e. `0`). If you want to start time at some other point, you can pass it a different integer, but I'm going to argue that you're better off using `setSystemTime`, as we'll see below.

```ts
vi.useFakeTimers(1677952591024);
```

Time is also effectively frozen unless you choose to advance it yourself. If you want time to move forward as it normally does, you can pass a option to `useFakeTimers()`.

```ts
vi.useFakeTimers({ shouldAdvanceTime: true });
```

## Manipulating time

### Setting the Time

Now in any test, you can manually set the time to whatever you need it to be.

```ts
const date = new Date(2012, 1, 1, 13);
vi.setSystemTime(date);
```

- You can get access to the mocked time using `vi.getMockedSystemTime()`.
- You can get access to the *real* time using `vi.getRealSystemTime()`. (I cannot even come up with a reason why you'd want to do this. I'm just mentioning it in the name of completeness).

### Advancing Time Forward

These are helpful when setting timers like `setInterval` and `setTimeout`.

- `vi.advanceTimersByTime`, `vi.advanceTimersByTimeAsync`: Moves the current time forward by a specified number of milliseconds.
- `vi.advanceTimersToNextTimer`, `vi.advanceTimersToNextTimerAsync`: Advances time until the next timer is fired.
- `vi.getTimerCount`: Returns a count of the number of remaining timers.
- `vi.runAllTimers`, `vi.runAllTimersAsync`: Run all of the timers. (This one will throw an an error at 10,000 tries if you have a `setInterval` that is never cleared.)
- `vi.runAllTicks`: Call every microtask created by `process.nextTick`.

## Cleaning Up

- `vi.clearAllTimers`: Removes any timers that are scheduled to run.
- `vi.restoreCurrentDate`: Put the original `Date` object back where it belongs.
- `vi.useRealTimers`: When all of your timers have run out, this method will return all of your mocked timers back to their original implementations.

## Mocking Timers, Dates, and other System Utilities

In some cases, your code may rely on system utilities like timers or dates, which can introduce unpredictability into your tests. Vitest provides built-in functionality to mock and control system utilities like `setTimeout`, `setInterval`, and `Date` to ensure your tests behave consistently.

### Mocking Timers

When dealing with timers, such as `setTimeout` or `setInterval`, you can mock them to control their behavior in tests using `vi.useFakeTimers()`.

```js
// Mock the timers
vi.useFakeTimers();

// Example function that uses setTimeout
function delay(callback) {
	setTimeout(() => {
		callback('Delayed');
	}, 1000);
}

describe('delay function', () => {
	it('should call callback after delay', () => {
		const callback = vi.fn();

		// Call the function under test
		delay(callback);

		// Fast-forward time
		vi.advanceTimersByTime(1000);

		// Assert that the callback was called
		expect(callback).toHaveBeenCalledWith('Delayed');
	});
});
```

In this example, `vi.useFakeTimers()` allows us to take control of the timers and fast-forward time with `vi.advanceTimersByTime(1000)` to simulate the passing of time without waiting for real-world delays.

### Mocking Dates

Similarly, you can mock the `Date` constructor to return specific dates or times.

```js
// Mock the current date to always return a specific date
const mockDate = new Date(2024, 1, 1);
vi.setSystemTime(mockDate);

describe('mocked Date', () => {
	it('should return the mocked date', () => {
		const currentDate = new Date();
		expect(currentDate).toEqual(mockDate);
	});
});
```

By using `vi.setSystemTime()`, you can ensure that `new Date()` always returns a consistent value, making tests that rely on dates predictable.

## Mocking Modules and Resetting Mocks

In more complex systems, you may want to mock entire modules to isolate the code under test. Vitest allows you to mock specific modules with `vi.mock()`, which provides flexibility in controlling the behavior of dependencies.

```js
// Mock the api module
vi.mock('./api', () => ({
	getConcertDetails: vi
		.fn()
		.mockResolvedValue({ band: 'Green Day', venue: 'Madison Square Garden' }),
}));
```

This allows you to mock all the functions inside the `api` module at once. When testing, this mocked version will replace the real module, ensuring you can simulate various scenarios.

### Resetting Mocks

After running a test, it’s important to reset or restore the mocks to their original state to avoid cross-test interference. You can reset mocks using `vi.resetAllMocks()` or restore original implementations with `mockRestore()`.

```js
// Reset all mocks after each test
afterEach(() => {
	vi.resetAllMocks();
});
```

This ensures that each test starts with fresh mocks and eliminates unintended behavior caused by shared state between tests.

## Combining Mocks with Spies and Stubs

You can combine the functionality of mocks, spies, and stubs for more advanced test scenarios. For example, you can mock a function and also spy on its interactions or stub a method inside a mock.

```js
// Create a mock and spy on one of its methods
const mockObject = {
	method: vi.fn().mockReturnValue('Mocked result'),
};

// Spy on the method
const spy = vi.spyOn(mockObject, 'method');

mockObject.method('argument');

// Verify the interaction
expect(spy).toHaveBeenCalledWith('argument');
expect(spy).toHaveReturnedWith('Mocked result');
```

This example combines a mock and a spy, allowing you to control the behavior of the method and also observe how it is used within the test.

## Example: Mocking Timeouts or Asynchronous Functions like `setTimeout`

Mocking asynchronous functions like `setTimeout` is another advanced use case. By mocking timers, you can simulate asynchronous behavior without actually waiting for the real delay.

Here’s an example where we mock `setTimeout` and use `vi.useFakeTimers()` to control the flow of time in an asynchronous function:

```js
function delayedFunction(callback) {
	setTimeout(() => {
		callback('Done');
	}, 3000);
}

describe('delayedFunction', () => {
	it('should call callback after timeout', () => {
		// Mock the timer
		vi.useFakeTimers();

		const callback = vi.fn();

		// Call the function under test
		delayedFunction(callback);

		// Fast-forward the timer
		vi.advanceTimersByTime(3000);

		// Assert that the callback was called
		expect(callback).toHaveBeenCalledWith('Done');
	});
});
```

In this test, the timer is controlled using `vi.useFakeTimers()` and `vi.advanceTimersByTime()`, which simulates the `setTimeout` without waiting for the actual delay. This allows you to test asynchronous code in a controlled and predictable way.
