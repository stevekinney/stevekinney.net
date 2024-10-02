---
title: 'Testing the DOM: The Setup'
description: Learn about JSDOM and Happy DOM for testing in Vitest.
modified: 2024-09-28T14:02:19-06:00
---

Yes. Node runs JavaScript just like the browser. It's also missing a bunch of stuff that you'll normally find in your browser of choice—namely, the DOM.

## Using a DOM Library with Vitest

To use [JSDOM](https://www.npmjs.com/package/jsdom), you can set it as the environment for your tests.

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
	},
});
```

Alternatively, you could choose to use [Happy DOM](https://www.npmjs.com/package/happy-dom).

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'happy-dom',
	},
});
```

You can also set the environment on a per-file basis at the top of your test file.

```js
// @vitest-environment jsdom
```

## What's the Difference?

### TL;DR

- Choose **JSDOM** if you need **accuracy** and a more realistic browser environment for testing.
- Choose **Happy DOM** if you need **speed** and don't require full browser standards for your tests.

| Feature          | **JSDOM**                                     | **Happy DOM**                             |
| ---------------- | --------------------------------------------- | ----------------------------------------- |
| **Focus**        | Browser-like accuracy                         | Performance and speed                     |
| **Performance**  | Slower, more memory usage                     | Faster, low memory usage                  |
| **API Coverage** | More comprehensive                            | Focuses on essential web APIs             |
| **Use Case**     | Full browser simulation in tests              | Lightweight testing with speed            |
| **Integration**  | Popular in Jest, Mocha                        | Popular in Vitest, fast test environments |
| **Best for**     | Complex web apps, real-world browser behavior | Fast unit/integration tests, simple DOM   |

### Comparison Between **JSDOM** and **Happy DOM**

Both **JSDOM** and **Happy DOM** are JavaScript libraries used to simulate the browser environment in a Node.js runtime, enabling server-side testing of web components and DOM interactions without a real browser. However, they have some key differences in terms of performance, feature set, and use cases.

### Purpose & Usage

#### JSDOM

- A widely used tool that provides a complete, standards-compliant implementation of the DOM and web APIs in Node.js.
- Focused on mimicking the browser environment as closely as possible.
- Popular for testing libraries like **Jest** and **Vitest** when working with frameworks such as React, Vue, and Angular.
- Best for tests that need a realistic browser-like environment.

#### Happy DOM

- A faster, lightweight alternative to JSDOM, designed for **speed**.
- Primarily focused on performance, making it ideal for use in environments like **Vitest** where quick DOM manipulation and fast feedback loops are critical.
- Good for simpler tests where speed is more important than strict adherence to web standards.
- Optimized for minimal memory usage and rapid execution.

### Performance

#### JSDOM

- Known to be slower than Happy DOM due to its emphasis on accurately replicating the full browser environment.
- Higher memory usage because of its detailed implementation of web APIs and the DOM.
- May be slower for large test suites or performance-critical applications.

#### Happy DOM

- Much **faster** than JSDOM due to its lightweight design and reduced complexity.
- Optimized for **speed**, making it a better choice for large test suites or cases where performance is a priority.
- Faster DOM manipulation and rendering, making it ideal for quick testing in a CI environment.

### Browser API Support

#### JSDOM

- Provides a more **comprehensive** implementation of web standards and browser APIs (e.g., DOM, CSSOM, Fetch API, etc.).
- More accurate in emulating a browser-like experience, which is necessary when testing complex browser behaviors.

#### Happy DOM

- Focuses on a **subset** of essential browser APIs that are most commonly used in testing.
- Less complete than JSDOM in terms of implementing the full browser API, but covers most common use cases.
- For simpler web apps, Happy DOM may provide all the necessary features without the overhead of full standards compliance.

### Use Cases

#### JSDOM

- **Best for projects** where you need a close approximation of the actual browser environment, especially when testing web applications or libraries that heavily rely on advanced browser features.
- Ideal for comprehensive **end-to-end testing** that simulates real-world browser behavior.

#### Happy DOM

- **Best for fast testing** environments where performance is crucial (e.g., unit tests, simple DOM manipulations).
- Often used in libraries like **Vitest** for **lightweight, speedy testing** in web projects.

### Community & Ecosystem

#### JSDOM

- A well-established tool with a large user base and strong integration into popular testing frameworks like **Jest** and **Mocha**.
- Regularly updated to stay compatible with the latest web standards.

#### Happy DOM

- Gaining popularity due to its integration with **Vitest** and its speed benefits.
- Still developing its ecosystem but is growing in adoption, especially for performance-sensitive projects.

## A Couple of Gotchas

Real talk—nothing’s perfect. There are a few things to keep in mind when running tests in browser mode:

1. **It’s still not a real browser.** You're not getting every subtlety of a specific Chrome or Firefox version. Remember, this is JSDOM-ified, meaning it's designed to act like a browser rather than being one.
2. **Performance.** Running tests with `jsdom` can be a bit slower than straight-up Node tests. It’s the cost of emulating browser stuff.
3. **Browser-specific issues.** Just because something works in Vitest browser mode doesn’t mean it’ll work in *all* browsers. (I’m looking at you, Internet Explorer.)
