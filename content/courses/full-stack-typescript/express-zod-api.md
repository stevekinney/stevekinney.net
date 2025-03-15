---
title: Building Type-Safe APIs with express-zod-api
modified: 2025-03-15T16:30:00-06:00
---

[`express-zod-api`](https://www.npmjs.com/package/express-zod-api) is a powerful library that combines the type safety of Zod with the flexibility of Express, allowing you to define and validate your API endpoints with ease. This guide will walk you through setting up and using `express-zod-api` to create robust and type-safe APIs.

## Installation

Install `express-zod-api` and its peer dependencies:

```bash
npm install express-zod-api zod express
```

## Defining API Endpoints

`express-zod-api` revolves around defining API endpoints as objects that specify the path, method, input validation (using Zod), and output schema.

### Example: Creating a User Endpoint

```typescript
import express from 'express';
import { createExpressEndpoints, z } from 'express-zod-api';

const app = express();
app.use(express.json());

const createUserEndpoint = {
	method: 'post',
	path: '/users',
	request: {
		body: z.object({
			username: z.string().min(3),
			email: z.string().email(),
			age: z.number().int().positive().optional(),
		}),
	},
	response: z.object({
		id: z.string().uuid(),
		username: z.string(),
		email: z.string(),
		age: z.number().int().positive().optional(),
	}),
	handler: async ({ input, res }) => {
		// Input is automatically validated against the request schema
		const { username, email, age } = input.body;

		// Simulate user creation
		const newUser = {
			id: '123e4567-e89b-12d3-a456-426614174000', // Example UUID
			username,
			email,
			age,
		};

		// Respond with the validated response schema
		res.status(201).json(newUser);
	},
};

// Create Express endpoints from the API definition
createExpressEndpoints({
	endpoints: [createUserEndpoint],
	app,
});

app.listen(3000, () => {
	console.log('Server listening on port 3000');
});
```

### Key Concepts

- **`method`:** The HTTP method (e.g., 'get', 'post', 'put', 'delete').
- **`path`:** The API endpoint path.
- **`request`:** Defines the input validation using Zod schemas for `body`, `query`, and `params`.
- **`response`:** Defines the output schema using Zod.
- **`handler`:** An asynchronous function that receives the validated `input` and `res` (Express response object).

## Handling Query and Path Parameters

`express-zod-api` makes it easy to handle query and path parameters.

### Example: Get User by ID

```typescript
const getUserEndpoint = {
	method: 'get',
	path: '/users/:userId',
	request: {
		params: z.object({
			userId: z.string().uuid(),
		}),
	},
	response: z.object({
		id: z.string().uuid(),
		username: z.string(),
		email: z.string(),
	}),
	handler: async ({ input, res }) => {
		const { userId } = input.params;
		// ... logic to get the user
		const user = {
			id: userId,
			username: 'john_doe',
			email: 'john@example.com',
		};
		res.json(user);
	},
};
```

### Example: Search Users with Query Parameters

```typescript
const searchUsersEndpoint = {
	method: 'get',
	path: '/search',
	request: {
		query: z.object({
			query: z.string().optional(),
			page: z.number().int().positive().default(1),
			limit: z.number().int().positive().default(10),
		}),
	},
	response: z.array(
		z.object({
			id: z.string().uuid(),
			username: z.string(),
			email: z.string(),
		}),
	),
	handler: async ({ input, res }) => {
		const { query, page, limit } = input.query;
		// ... search logic
		const users = [
			{
				id: '123e4567-e89b-12d3-a456-426614174000',
				username: 'john_doe',
				email: 'john@example.com',
			},
		];
		res.json(users);
	},
};
```

## Error Handling

`express-zod-api` automatically handles Zod validation errors, returning a 400 status with error details. You can also handle custom errors within your handlers.

### Example: Custom Error Handling

```typescript
const exampleEndpoint = {
	// ...
	handler: async ({ res }) => {
		try {
			// some logic that can throw errors.
			throw new Error('custom error');
		} catch (e) {
			if (e instanceof Error) {
				res.status(500).json({ error: e.message });
			} else {
				res.status(500).json({ error: 'unknown error' });
			}
		}
	},
};
```

## Benefits of `express-zod-api`

- **Type Safety:** Zod ensures that your API inputs and outputs are validated and typed.
- **Simplified API Definition:** Define your API endpoints as objects, making them easy to read and maintain.
- **Automatic Validation:** Zod validation is automatically applied to incoming requests.
- **Reduced Boilerplate:** `express-zod-api` reduces the amount of code you need to write for validation and error handling.
- **Clear Documentation:** Zod schemas serve as clear documentation for your API endpoints.
- **Improved Developer Experience:** The library enhances the development experience by providing strong typing and validation.
