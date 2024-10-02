---
title: Mocking Dependencies
description: Learn how to mock dependencies using Vitest for reliable tests.
modified: 2024-09-30T14:13:34-06:00
---

When writing unit tests, it's _super important_ to isolate the code under test from its external dependencies. Dependencies could include services like databases, external APIs, file systems, or third-party libraries that you don't want to interact with directly in your tests. By mocking these dependencies, you can simulate their behavior, control their output, and ensure that your tests remain fast, reliable, and focused on the logic being tested.

## Why Mock Dependencies?

- **Isolation**: By mocking dependencies, you can test your code in isolation without relying on external services or systems.
- **Control**: You can control the behavior of dependencies, such as simulating errors, returning specific data, or testing different scenarios.
- **Performance**: Mocking allows you to avoid the overhead of interacting with slow or unavailable services like databases or network calls.
- **Repeatability**: Mocks ensure consistent behavior, making tests more predictable and easier to debug when they fail.

## How to Mock Dependencies in Vitest

Vitest provides powerful methods like `vi.fn()` and `vi.mock()` to mock functions, modules, and services that your code depends on. You can mock individual functions, or you can mock entire modules to replace their real implementations during testing.

If we go back to our `log` function in `examples/logjam`—you'll see that in production, we send the log to the "server" if we're in production. `sendToServer` is a no-op because in a previous example, I didn't want our test to blow up, but you can imagine that it's calling `fetch` or something. And, you don't particularly want that happening every time you run your tests. So, we can choose to mock out that function instead.

```js
vi.mock('./send-to-server', {
	sendToServer: vi.fn(),
});
```

`vi.mock()` takes a path fro a dependency and let's you replace that functionality with a mock.

Now, we can run our tests with that function mocked out.

```js
beforeEach(() => {
	vi.stubEnv('MODE', 'production');
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetAllMocks();
});

it('sends messages to the server in production mode', () => {
	log('Hello, world!');

	expect(sendToServer).toHaveBeenCalledWith('info', 'Hello, world!');
});
```

### Auto-Mocking

If all you're doing is mocking out every function in a module, you can just use Vite's [Auto-Mocking](auto-mocking.md) functionality.

```js
vi.mock('./send-to-server');
```

This will do the same thing as the above example. The auto-mocking algorithm works something like this:

- All arrays will be emptied.
- All primitives and collections will stay the same.
- All objects will be deeply cloned.
- All instances of classes and their prototypes will be deeply cloned.

## Mocking Individual Functions

If your code depends on individual functions from a service or module, you can mock those specific functions using `vi.fn()` to simulate their behavior.

Here’s an example of mocking a database service function:

```js
// Database service that will be mocked
function fetchBandData(bandName) {
	// Normally this would fetch from a database
	return database.query(`SELECT * FROM bands WHERE name = '${bandName}'`);
}

// Code under test
async function getBandDetails(bandName) {
	return await fetchBandData(bandName);
}

describe('getBandDetails', () => {
	it('should return mocked band data', async () => {
		// Mock fetchBandData to simulate database response
		const mockFetchBandData = vi.fn(() =>
			Promise.resolve({ name: 'Green Day', genre: 'Punk Rock' }),
		);

		// Call the function with the mocked dependency
		const result = await mockFetchBandData('Green Day');

		// Check that the function was called with the correct argument
		expect(mockFetchBandData).toHaveBeenCalledWith('Green Day');

		// Assert the return value
		expect(result).toEqual({ name: 'Green Day', genre: 'Punk Rock' });
	});
});
```

In this example, we replace the real `fetchBandData` function with a mock implementation that simulates a database call. This ensures that our test runs quickly and in isolation.

## Mocking Entire Modules

In cases where your code depends on multiple functions from a module or service, you can mock the entire module using `vi.mock()`. This is particularly useful for mocking external libraries or services that provide multiple functionalities.

Here’s how to mock an entire module:

```js
// Imagine you have a module called 'api' with various functions
import * as api from './api';

// Code under test
async function getConcertDetails(bandName) {
	return await api.fetchConcerts(bandName);
}

describe('getConcertDetails', () => {
	// Mock the entire api module
	vi.mock('./api', () => ({
		fetchConcerts: vi.fn(() =>
			Promise.resolve([{ venue: 'Madison Square Garden', date: '2024-09-01' }]),
		),
	}));

	it('should return mocked concert details', async () => {
		// Call the function with the mocked module
		const result = await getConcertDetails('Green Day');

		// Check that the fetchConcerts mock was called
		expect(api.fetchConcerts).toHaveBeenCalledWith('Green Day');

		// Assert the return value
		expect(result).toEqual([{ venue: 'Madison Square Garden', date: '2024-09-01' }]);
	});
});
```

In this example, the entire `api` module is mocked, and the `fetchConcerts` function is replaced with a mock that returns predefined concert data. This allows the test to run without making real API calls.

## Mocking Node.js Built-in Modules

You can also mock built-in Node.js modules like `fs` or `http` if your code interacts with the file system or performs network requests.

Here’s an example of mocking the `fs` module:

```js
import * as fs from 'fs';

// Code under test
function readConfigFile(filePath) {
	return fs.readFileSync(filePath, 'utf-8');
}

describe('readConfigFile', () => {
	// Mock the fs module
	vi.mock('fs');

	it('should read the mocked config file', () => {
		// Mock the fs.readFileSync method
		vi.spyOn(fs, 'readFileSync').mockReturnValue('mocked file content');

		// Call the function under test
		const result = readConfigFile('/path/to/config');

		// Assert the returned file content
		expect(result).toBe('mocked file content');
	});
});
```

In this test, the `fs.readFileSync` method is mocked to return predefined content, allowing you to test your function without needing an actual file on the file system.

## Example: Mocking an External API

Here’s a complete example of mocking an external API dependency using Vitest:

```js
// Assume you have an API module
import * as api from './api';

// Code under test
async function fetchConcertData(bandName) {
	const response = await api.getConcerts(bandName);
	return response.data;
}

describe('fetchConcertData', () => {
	// Mock the API module
	vi.mock('./api', () => ({
		getConcerts: vi.fn(() => Promise.resolve({ data: [{ venue: 'Wembley', date: '2024-10-05' }] })),
	}));

	it('should fetch concert data using the mocked API', async () => {
		// Call the function under test
		const result = await fetchConcertData('Green Day');

		// Assert that the API was called with the correct argument
		expect(api.getConcerts).toHaveBeenCalledWith('Green Day');

		// Check the returned data
		expect(result).toEqual([{ venue: 'Wembley', date: '2024-10-05' }]);
	});
});
```

In this example, we mock the entire API module, ensuring the test doesn’t make any real API requests. The mock returns predefined data, allowing you to control the test scenario completely.

Whether you’re mocking APIs, databases, or file systems, mocking ensures that your tests remain predictable, fast, and focused on the logic under test. Always, always, always remember to reset or restore mocks after tests to maintain a clean and consistent test environment.

## `vi.doMock`

[`vi.doMock`](https://vitest.dev/api/vi.html#vi-domock) is basically the same as `vi.mock` except for the fact that it's _not_ hoisted to the top, which means you have access to variables. The _next_ import of that module will be mocked.

## Further Reading

- [Mocking the File System](mocking-the-file-system.md)
