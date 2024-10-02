---
title: Using Mock Service Worker With Vitest For API Testing
description: Learn how to use Mock Service Worker with Vitest for API testing.
modified: 2024-09-28T16:10:57-06:00
---

Mocking external network requests is a crucial part of testing applications that rely on APIs. **Mock Service Worker (MSW)** is a powerful tool that allows you to intercept and mock network requests at the network level. When combined with **Vitest**, a fast and modern JavaScript testing framework, you can create robust and reliable tests for your applications.

This post explores how to use MSW with Vitest to mock API calls effectively. We'll cover setup, implementation, best practices, and potential pitfalls, helping you understand how to integrate MSW into your testing strategy.

## What is Mock Service Worker (MSW)?

MSW is a JavaScript library that lets you mock API requests by intercepting them at the network level. It works in both browser and Node.js environments, allowing you to:

- Mock REST and GraphQL APIs.
- Simulate different server responses, including errors.
- Keep your tests close to real-world scenarios by not altering the actual code making the requests.

## Why Use MSW with Vitest?

- **Network-Level Mocking**: MSW intercepts actual network requests, providing more realistic test conditions.
- **Flexibility**: Easily mock different responses without changing the code under test.
- **Maintainability**: Keep your tests clean by avoiding hard-coded mocks or complex mocking setups.
- **Consistency**: Use the same mocking approach for both development and testing environments.

## Setting Up MSW with Vitest

### Install MSW

```bash
npm install --save-dev msw
```

### Configure MSW in Your Project

Create a `src/mocks` directory and set up the handlers for your API endpoints.

**Example: Handlers Definition**

```javascript
// src/mocks/handlers.js
import { rest } from 'msw';

export const handlers = [
	// Mock a GET request to /api/user
	rest.get('/api/user', (req, res, ctx) => {
		return res(ctx.status(200), ctx.json({ id: '123', name: 'John Doe' }));
	}),
	// Mock a POST request to /api/login
	rest.post('/api/login', (req, res, ctx) => {
		const { username } = req.body;
		return res(ctx.status(200), ctx.json({ message: `Welcome, ${username}!` }));
	}),
];
```

### Set Up the Server for Testing

Create a file to initialize the MSW server for testing.

```javascript
// src/mocks/server.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(…handlers);
```

### Configure Vitest to Use MSW

In your test setup file (e.g., `setupTests.js`), start the server before tests run and clean up afterward.

```javascript
// setupTests.js
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './src/mocks/server';

// Start the server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset any request handlers that are declared as a part of our tests
// (i.e. for testing one-time error scenarios)
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());
```

Update your `vitest.config.js` to include the setup file:

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		setupFiles: './setupTests.js',
	},
});
```

## Writing Tests with MSW and Vitest

### Example: Testing a Component That Fetches Data

Suppose you have a React component that fetches user data:

```jsx
// UserProfile.jsx
import React, { useEffect, useState } from 'react';

export function UserProfile() {
	const [user, setUser] = useState(null);

	useEffect(() => {
		fetch('/api/user')
			.then((res) => res.json())
			.then(setUser);
	}, []);

	if (!user) return <div>Loading…</div>;

	return (
		<div>
			<h1>{user.name}</h1>
		</div>
	);
}
```

**Test File:**

```jsx
// UserProfile.test.jsx
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { UserProfile } from './UserProfile';

test('renders user profile after fetching data', async () => {
	// Render the component
	render(<UserProfile />);

	// Verify loading state
	expect(screen.getByText(/loading/i)).toBeInTheDocument();

	// Wait for the user data to be displayed
	const userName = await screen.findByText('John Doe');
	expect(userName).toBeInTheDocument();
});
```

**Explanation:**

- The test renders the `UserProfile` component.
- It checks for the loading state.
- It uses `findByText` to wait for the asynchronous update.
- MSW intercepts the `/api/user` request and returns the mocked response defined in `handlers.js`.

### Example: Testing Error Handling

You can mock error responses to test how your component handles failures.

**Adjust the Test:**

```jsx
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { rest } from 'msw';
import { server } from '../mocks/server';
import { UserProfile } from './UserProfile';

test('handles server error', async () => {
	// Override the default handler for this test
	server.use(
		rest.get('/api/user', (req, res, ctx) => {
			return res(ctx.status(500));
		}),
	);

	render(<UserProfile />);

	// Wait for error message
	const errorMessage = await screen.findByText(/failed to load user/i);
	expect(errorMessage).toBeInTheDocument();
});
```

**Explanation:**

- **`server.use(…)`**: Overrides the `/api/user` handler for this test, simulating a server error.
- The component should handle the error and display an appropriate message.
- The test verifies that the error message is displayed.

## Best Practices with MSW

### Centralize Request Handlers

Define all your request handlers in one place (`handlers.js`) to keep your mocks organized.

**Benefits:**

- **Maintainability**: Easier to update and manage mock responses.
- **Reusability**: Handlers can be reused across multiple tests.

### Use Contextual Request Handlers for Specific Tests

Override handlers within tests to simulate different scenarios.

```javascript
server.use(
	rest.get('/api/user', (req, res, ctx) => {
		return res(ctx.status(404), ctx.json({ error: 'User not found' }));
	}),
);
```

**Benefits:**

- **Flexibility**: Test edge cases and error conditions without affecting other tests.
- **Isolation**: Changes to handlers in one test don't impact others.

### Verify Requests in Tests

You can assert that certain requests were made with expected parameters.

```javascript
import { expect, test } from 'vitest';
import { rest } from 'msw';
import { server } from '../mocks/server';

test('submits form data correctly', async () => {
	let requestBody;

	server.use(
		rest.post('/api/submit', (req, res, ctx) => {
			requestBody = req.body;
			return res(ctx.status(200));
		}),
	);

	// … render component and trigger form submission …

	expect(requestBody).toEqual({ name: 'Alice', age: 30 });
});
```

### Handle Unhandled Requests

Configure MSW to alert you to unhandled requests, helping catch missing handlers.

```javascript
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
```

Options for `onUnhandledRequest`:

- `'bypass'`: Default behavior, unhandled requests proceed as normal.
- `'warn'`: Logs a warning for unhandled requests.
- `'error'`: Throws an error for unhandled requests.

### Use TypeScript for Better Type Safety (Optional)

If you're using TypeScript, MSW provides type definitions to enhance your development experience.

## Potential Pitfalls and How to Avoid Them

### Forgetting to Reset Handlers

**Issue**: Overridden handlers persist across tests, causing unexpected behavior.

**Solution**:

- Use `server.resetHandlers()` in `afterEach` to reset handlers after each test.

```javascript
afterEach(() => server.resetHandlers());
```

### Mocking Incorrectly Formatted Responses

**Issue**: Returning responses that don't match the expected format can cause test failures.

**Solution**:

- Ensure that mocked responses match the shape and structure expected by the code under test.

### Ignoring Unhandled Requests

**Issue**: Missing handlers for API calls can lead to unhandled requests, causing tests to pass when they should fail.

**Solution**:

- Set `onUnhandledRequest` to `'error'` during testing to catch unhandled requests.

### Over-Mocking

**Issue**: Over-mocking can lead to tests that don't reflect real-world behavior.

**Solution**:

- Mock only external network requests.
- Avoid mocking internal functions or modules unnecessarily.

## Examples in Practice

### Testing a Component with Multiple API Calls

```jsx
// Dashboard.jsx
import React, { useEffect, useState } from 'react';

export function Dashboard() {
	const [user, setUser] = useState(null);
	const [notifications, setNotifications] = useState([]);

	useEffect(() => {
		fetch('/api/user')
			.then((res) => res.json())
			.then(setUser);

		fetch('/api/notifications')
			.then((res) => res.json())
			.then(setNotifications);
	}, []);

	if (!user || notifications.length === 0) return <div>Loading…</div>;

	return (
		<div>
			<h1>Welcome, {user.name}</h1>
			<ul>
				{notifications.map((n) => (
					<li key={n.id}>{n.message}</li>
				))}
			</ul>
		</div>
	);
}
```

**Handlers:**

```javascript
// handlers.js
export const handlers = [
	rest.get('/api/user', (req, res, ctx) => {
		return res(ctx.status(200), ctx.json({ id: '123', name: 'Alice' }));
	}),
	rest.get('/api/notifications', (req, res, ctx) => {
		return res(
			ctx.status(200),
			ctx.json([
				{ id: '1', message: 'Notification 1' },
				{ id: '2', message: 'Notification 2' },
			]),
		);
	}),
];
```

**Test:**

```jsx
// Dashboard.test.jsx
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Dashboard } from './Dashboard';

test('renders user and notifications', async () => {
	render(<Dashboard />);

	expect(screen.getByText(/loading/i)).toBeInTheDocument();

	const welcomeMessage = await screen.findByText(/welcome, alice/i);
	expect(welcomeMessage).toBeInTheDocument();

	const notificationItems = await screen.findAllByRole('listitem');
	expect(notificationItems).toHaveLength(2);
});
```

**Explanation:**

- MSW handles both `/api/user` and `/api/notifications` requests.
- The test verifies that both user data and notifications are rendered correctly.

## Conclusion

Using Mock Service Worker with Vitest provides a powerful and flexible way to mock network requests in your tests. By intercepting requests at the network level, MSW allows you to create realistic and maintainable tests that closely mimic actual application behavior.

### Key Takeaways

- **MSW Benefits**:
  - Mocks network requests at the network level.
  - Works seamlessly in both browser and Node.js environments.
  - Simplifies testing of components that rely on external APIs.
- **Best Practices**:
  - Centralize request handlers for maintainability.
  - Use contextual handlers to simulate different scenarios.
  - Verify requests and responses within tests.
  - Handle unhandled requests to catch missing handlers.
- **Avoiding Pitfalls**:
  - Reset handlers between tests to prevent cross-test contamination.
  - Ensure mocked responses match expected formats.
  - Be cautious of over-mocking.

By integrating MSW into your testing workflow with Vitest, you can enhance the reliability and robustness of your tests, ultimately leading to higher-quality applications.

### When to Use MSW

- **API-Dependent Components**: When testing components that make HTTP requests to external APIs.
- **Error Handling Scenarios**: To simulate server errors and test how your application responds.
- **Complex Response Structures**: When dealing with complex or large API responses that would be cumbersome to mock manually.

### Potential Limitations

- **Learning Curve**: Requires understanding of how MSW intercepts requests and how to configure handlers.
- **Setup Overhead**: Initial setup may be more involved compared to simple mocking, but pays off in the long run.
