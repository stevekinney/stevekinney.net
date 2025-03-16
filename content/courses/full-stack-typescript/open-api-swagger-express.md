---
title: Type-Safe APIs with OpenAPI and TypeScript
modified: 2025-03-15T16:00:00-06:00
---

OpenAPI (formerly Swagger) provides a powerful way to define and document your API contracts. Integrating it with TypeScript ensures type safety and consistency across your application. This guide walks you through defining your API using OpenAPI, generating TypeScript types, and using them within your Express application.

## Defining Your API with OpenAPI

OpenAPI uses YAML or JSON to describe your API's endpoints, request/response bodies, and other details.

### Example OpenAPI Specification (openapi.yaml):

```yaml
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get a list of users
      parameters:
        - name: query
          in: query
          description: Search query
          schema:
            type: string
        - name: page
          in: query
          description: Page number
          schema:
            type: integer
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
    post:
      summary: Create a new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /users/{userId}:
    get:
      summary: Get a user by ID
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        username:
          type: string
        email:
          type: string
    CreateUserRequest:
      type: object
      properties:
        username:
          type: string
        email:
          type: string
```

This YAML file defines endpoints for retrieving and creating users, along with their request/response schemas.

## Generating TypeScript Types

The [`openapi-typescript`](https://www.npmjs.com/package/openapi-typescript) tool generates TypeScript types from your OpenAPI specification.

```bash
npm install -D openapi-typescript
```

### Generate Types:

```bash
npx openapi-typescript openapi.yaml -o src/types/api.d.ts
```

This command generates `src/types/api.d.ts`, containing TypeScript types corresponding to your OpenAPI schemas.

### Example Generated Types (`api.d.ts`)

```typescript
export interface User {
	id?: string;
	username?: string;
	email?: string;
}

export interface CreateUserRequest {
	username?: string;
	email?: string;
}

export interface paths {
	'/users': {
		get: {
			parameters: {
				query?: {
					query?: string;
					page?: number;
				};
			};
			responses: {
				'200': {
					content: {
						'application/json': components['schemas']['User'][];
					};
				};
			};
		};
		post: {
			requestBody: {
				content: {
					'application/json': components['schemas']['CreateUserRequest'];
				};
			};
			responses: {
				'201': {
					content: {
						'application/json': components['schemas']['User'];
					};
				};
			};
		};
	};
	'/users/{userId}': {
		get: {
			parameters: {
				path: {
					userId: string;
				};
			};
			responses: {
				'200': {
					content: {
						'application/json': components['schemas']['User'];
					};
				};
			};
		};
	};
}

export interface components {
	schemas: {
		User: {
			id?: string;
			username?: string;
			email?: string;
		};
		CreateUserRequest: {
			username?: string;
			email?: string;
		};
	};
}
```

## Using Generated Types in Express

Import the generated types into your Express route handlers:

```typescript
import express, { Request, Response } from 'express';
import { paths } from './types/api';

const app = express();
app.use(express.json());

// Example route handler
app.get(
	'/users',
	(
		req: Request<
			{},
			paths['/users']['get']['responses']['200']['content']['application/json'],
			{},
			paths['/users']['get']['parameters']['query']
		>,
		res: Response<paths['/users']['get']['responses']['200']['content']['application/json']>,
	) => {
		// Access typed query parameters
		const query = req.query.query;
		const page = req.query.page;
		// ... your logic
		const users: paths['/users']['get']['responses']['200']['content']['application/json'] = [
			{ id: '1', username: 'john', email: 'john@example.com' },
		];
		res.json(users);
	},
);

app.post(
	'/users',
	(
		req: Request<
			{},
			paths['/users']['post']['responses']['201']['content']['application/json'],
			paths['/users']['post']['requestBody']['content']['application/json']
		>,
		res: Response<paths['/users']['post']['responses']['201']['content']['application/json']>,
	) => {
		// Access typed request body
		const { username, email } = req.body;
		// ... your logic
		const user: paths['/users']['post']['responses']['201']['content']['application/json'] = {
			id: '2',
			username: username,
			email: email,
		};
		res.status(201).json(user);
	},
);

app.get(
	'/users/:userId',
	(
		req: Request<
			paths['/users/{userId}']['get']['parameters']['path'],
			paths['/users/{userId}']['get']['responses']['200']['content']['application/json']
		>,
		res: Response<
			paths['/users/{userId}']['get']['responses']['200']['content']['application/json']
		>,
	) => {
		const userId = req.params.userId;
		// ... your logic
		const user: paths['/users/{userId}']['get']['responses']['200']['content']['application/json'] =
			{ id: userId, username: 'john', email: 'john@example.com' };
		res.json(user);
	},
);

// ... other routes
```

## Benefits

- **Single Source of Truth:** Your OpenAPI specification serves as the central definition of your API.
- **Type Safety:** Generated TypeScript types ensure consistency between your API and code.
- **Improved Documentation:** OpenAPI provides interactive documentation for your API.
- **Reduced Errors:** Type checking catches potential errors early in development.

## Workflow Enhancements

- Integrate `openapi-typescript` into your build process to automatically generate types whenever your OpenAPI specification changes.
- Use OpenAPI validation tools to ensure your specification is valid.
- Consider using code generation tools to generate Express route handlers from your OpenAPI specification.
- Use libraries like [`express-openapi-validator`](https://www.npmjs.com/package/express-openapi-validator) to validate requests against your openAPI spec at runtime.
