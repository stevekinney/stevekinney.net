---
title: Mocking Fetch And Network Requests With Vitest
description: Learn how to mock fetch and network requests using Vitest.
modified: 2024-09-28T15:10:36-06:00
---

Let’s talk about something near and dear to every developer’s heart — dealing with and testing **network requests**. If you're working on an app that even _sniffs_ at the internet, you're going to have to call APIs, and eventually, you're going to need to test that code. When that time comes, there’s no reason to actually hit the API every time you run your test suite — after all, let’s _maybe_ not DDoS the API server, or worse: make your tests super slow. That's where **mocking network requests** comes in, and thankfully, mocking `fetch` with Vitest is a breeze.

## Write a Function to Fetch Data

Let's create a basic function that will throw a fetch call out into the wild and return the data. We’re keeping things basic with a JSON placeholder API.

```javascript
async function getData() {
	const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
	const data = await response.json();
	return data;
}

export { getData };
```

Looks good. Now if you want to test this function, you really shouldn't hit the actual API in your tests, because I promise you… unreliable network calls in your CI tests at 3 a.m.? _Not a vibe._ What we want is to mock it, baby!

## Mocking Fetch with Vitest

Vitest’s got your back when it comes to mocking. Here’s the deal: `fetch` is available on `window` in most environments. So, when mocking, we tell Vitest to replace `window.fetch` with our own version.

Let’s write a simple Vitest test that's gonna mock `fetch`.

### Here’s Where the Magic Happens

```javascript
import { test, vi, expect } from 'vitest';
import { getData } from './yourFunctionFile';

test('fetches data successfully from API', async () => {
	// Mock the fetch function.
	const mockResponse = {
		userId: 1,
		id: 1,
		title: 'Test Todo',
		completed: false,
	};

	// Here we tell Vitest to mock fetch on the `window` object.
	global.fetch = vi.fn(() =>
		Promise.resolve({
			json: () => Promise.resolve(mockResponse),
		}),
	);

	// Call the function and assert the result
	const data = await getData();
	expect(data).toEqual(mockResponse);

	// Check that fetch was called exactly once
	expect(fetch).toHaveBeenCalledTimes(1);
	expect(fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/todos/1');
});
```

Boom! That’s it. Let’s walk through this for a sec because you might think "What sorcery is this?"

- `vi.fn()` is Vitest's mock function. You’re mocking `fetch`, making it return exactly whatever we want — in this case, we're resolving the promise with our `mockResponse`.
- `global.fetch` is where we mock the fetch function because in Node, `fetch` isn’t automatically globally available like in the browser.
- You're verifying that `fetch` is called once and is called with the correct URL. You'll sleep easy at night knowing your code is yelling into the void exactly how and when it should be.

## Step 4: Clean Up After Tests

Taking out the trash is an important step in testing. Mocks can get a bit "sticky" (the technical term!), so let’s make sure we reset `fetch` after each test.

```javascript
import { afterEach } from 'vitest';

afterEach(() => {
	vi.clearAllMocks(); // Reset all mocked calls between tests
});
```

Yeah, it’s just good test hygiene. Clean up after yourself, future-you will be grateful.

## Real Talk: Testing The Error State

Because, hey, what happens if the Internet explodes or the server just shrugs at your request? You’ve gotta test those too!

Let’s see how we’d test an error, like when fetch itself rejects:

```javascript
test('handles fetch failure', async () => {
	global.fetch = vi.fn(() => Promise.reject('API is down'));

	await expect(getData()).rejects.toEqual('API is down');
	expect(fetch).toHaveBeenCalledTimes(1);
});
```

Here, `fetch` rejects with an error, and we test that our function properly rejects too. Easy peasy.

## Wrapping Up

Just remember, the goal isn’t to test whether fetch works. (**Spoiler alert**: it does.) You're focusing on ensuring that your code behaves properly in a variety of fetch-related scenarios.
