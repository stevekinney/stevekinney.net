---
title: Clearing, Restoring, and Resetting Mocks
description: Learn how to manage mocks effectively using Vitest.
modified: 2024-09-28T14:19:13-06:00
---

Mocking is all well and good when it's intended, but it's going to haunt you if old mocks linger on well past their welcome. Once you’ve mocked something, you want to make sure that those mocks don’t stick around like a bad code smell. That's why **clearing**, **restoring**, and **resetting** mocks are vital parts of your testing toolkit. So, let’s break it down like refactoring a confusing callback hell into promise chains.

## When To Use Each

We'll get into the specifics of each in a moment, but let's just compare them at a high level before we dive in.

- **Clear**: You’ve created some complex mock logic, and now you're retracing steps, clearing call history to test cleanly.
- **Reset**: You made a mess with return values or `.mockImplementation`—and now you just want to start over without rebuilding the mock.
- **Restore**: You’re done mocking, you want to reinstate the original functionality, and walk away like nothing ever happened.

## Clearing Mocks

Clearing a mock removes all *invocation history*. Let's say you've got a mock that's been called a few times, and you want to reset the call count back to zero. That’s *clearing* in action.

```js
const myFunc = vi.fn();

// Call it a few times
myFunc('arg1');
myFunc('arg2');

// Clear the mock's call history
myFunc.mockClear();

console.log(myFunc.mock.calls.length); // Ah, nice! Back to 0.
```

Use `mockClear()` when you want to ensure that your tests are checking fresh invocation data. This way, you’re not being haunted by any ghost calls from previous tests. Common use case? When you're running the same mock across multiple assertions but want a clean slate for each.

> \[!TIP] Pro Tip
> If your tests rely on the **number of times** a function is called, reset that call count before each test—so you're always getting fresh numbers.

## Resetting Mocks

While **clearing** wipes out call history, **resetting** is like hitting the factory reset button on your microwave—it clears not only the previous calls but also any custom mock implementations.

```js
const myFunc = vi.fn(() => 'I got mocked');

// Call the function
console.log(myFunc()); // “I got mocked”

// Reset the mock to its initial state
myFunc.mockReset();

// Now, it's just an empty mock function again
console.log(myFunc()); // undefined
```

When should you reset? Think of it as hitting *undo*. If you’ve changed what the mock returns, and you’re like, "Nope, never should've done that,” then this is your ticket to sanity.

> \[!WARNING] A Word on Resetting
> With reset, you'll still *have* the mock object, but it behaves like it did out of the box—call count set to `0`, and no return values or side effects.

## Restoring Mocks

Now, here's the nuclear option: **restoring** mocks. This completely removes the mock's implementation and puts things back the way they were before you even touched it. If you’re mocking a native function or something from a shared library, this is how you avoid accidentally breaking things later.

```js
// Let's mock Math.random
vi.spyOn(Math, 'random').mockReturnValue(0.5);

console.log(Math.random()); // 0.5

// Restore the original implementation
Math.random.mockRestore();

console.log(Math.random()); // Now we're back to good ol' randomness
```

When you restore a mock, it brings the original, un-mocked function back. This is super useful, especially when you're messing with native APIs—because, trust me, leaving `Math.random()` mocked throughout your app is guaranteed to produce test nightmares later.

## Object Methods

For a moment, let's assume `const fn = vi.fn()`.

- `fn.mockClear()`: Clears out all of the information about how it was called and what it returned. This is effectively the same as setting `fn.mock.calls` and `fn.mock.results` back to empty arrays.
- `fn.mockReset()`: In addition to doing what `fn.mockClear()`, this method replaces the inner implementation with an empty function.
- `fn.mockRestore()`: In addition to doing what `fn.mockReset()` does, it replaces the implementation with the original functions.

## Mock Lifecycle Methods

You'd typically put these in an `afterEach` block within your test suite.

- `vi.clearAllMocks`: Clears out the history of calls and return values on the spies, but does *not* reset them to their default implementation. This is effectively the same as calling `.mockClear()` on each and every spy.
- `vi.resetAllMocks`: Calls `.mockReset()` on all the spies. It will replace any mock implementations with an empty function.
- `vi.restoreAllMocks`: Calls `.mockRestore()` on each and every mock. This one returns the world to it's original state.

### Conclusion

Vitest gives you the tools you need to keep your tests clean, your mocks simple, and your frustrations (mostly) in check. The key is knowing when to clean up after yourself. Mocks can be powerful, but if you don’t clear, reset, or restore them properly, you’ll end up wondering why things are on fire and you're dealing with mocking baggage from previous tests.
