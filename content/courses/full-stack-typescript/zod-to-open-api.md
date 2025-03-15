---
title: Generating OpenAPI Contracts from Zod Schemas with zod-to-openapi
modified: 2025-03-15T17:15:00-06:00
---

[`zod-to-openapi`](https://www.npmjs.com/package/zod-to-openapi) is a super cool tool that allows you to generate OpenAPI specifications directly from your Zod schemas. This approach ensures that your API documentation is always in sync with your validation logic, reducing the risk of inconsistencies. This guide walks you through using `zod-to-openapi` to create OpenAPI contracts from your Zod-powered Express APIs.

## Install `zod-to-openapi`

Install `zod-to-openapi` as a development dependency:

```bash
npm install zod-to-openapi zod express
```

## Define Your Zod Schemas

Ensure that your Express routes are using Zod schemas for request and response validation.

**Example:**

```typescript
import express, { Request, Response } from 'express';
import { z } from 'zod';

const app = express();
app.use(express.json());

const createUserSchema = z.object({
	username: z.string().min(3),
	email: z.string().email(),
	age: z.number().int().positive().optional(),
});

const userResponseSchema = z.object({
	id: z.string().uuid(),
	username: z.string(),
	email: z.string(),
	age: z.number().int().positive().optional(),
});

app.post(
	'/users',
	(
		req: Request<{}, {}, z.infer<typeof createUserSchema>>,
		res: Response<z.infer<typeof userResponseSchema>>,
	) => {
		// ... your route logic
		const newUser: z.infer<typeof userResponseSchema> = {
			id: '123e4567-e89b-12d3-a456-426614174000',
			username: req.body.username,
			email: req.body.email,
			age: req.body.age,
		};
		res.status(201).json(newUser);
	},
);

app.get(
	'/users/:userId',
	(req: Request<{ userId: string }>, res: Response<z.infer<typeof userResponseSchema>>) => {
		// ... your route logic
		const user: z.infer<typeof userResponseSchema> = {
			id: req.params.userId,
			username: 'john_doe',
			email: 'john@example.com',
			age: 30,
		};
		res.json(user);
	},
);
```

## Generate OpenAPI Components from Zod Schemas

Use `zod-to-openapi` to generate OpenAPI components from your Zod schemas.

**Example:**

```typescript
import { createRoute, generateOpenApiDocument } from 'zod-to-openapi';
import { createUserSchema, userResponseSchema } from './your-schemas'; // Import your Zod schemas

const components = {
	schemas: {
		CreateUserRequest: createUserSchema,
		UserResponse: userResponseSchema,
	},
};

const document = generateOpenApiDocument({
	title: 'My Express API',
	version: '1.0.0',
	components,
	paths: {
		'/users': {
			post: createRoute({
				request: {
					body: {
						content: {
							'application/json': {
								schema: createUserSchema,
							},
						},
					},
				},
				responses: {
					201: {
						description: 'User created',
						content: {
							'application/json': {
								schema: userResponseSchema,
							},
						},
					},
				},
			}),
			get: createRoute({
				responses: {
					200: {
						description: 'list of users',
						content: {
							'application/json': {
								schema: z.array(userResponseSchema),
							},
						},
					},
				},
			}),
		},
		'/users/{userId}': {
			get: createRoute({
				request: {
					params: z.object({ userId: z.string() }),
				},
				responses: {
					200: {
						description: 'User details',
						content: {
							'application/json': {
								schema: userResponseSchema,
							},
						},
					},
				},
			}),
		},
	},
});

console.log(JSON.stringify(document, null, 2));
```

## Save the OpenAPI Specification

Save the generated OpenAPI specification to a file (e.g., `openapi.json` or `openapi.yaml`).

```bash
node your-script.js > openapi.json
```

## Serve the OpenAPI Specification (Optional)

You can serve the generated OpenAPI specification using [`swagger-ui-express`](https://www.npmjs.com/package/swagger-ui-express) to provide an interactive documentation interface.

```bash
npm install swagger-ui-express
```

```typescript
// index.ts
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import openapiDocument from './openapi.json';

const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

app.listen(3000, () => {
	console.log('Server listening on port 3000');
});
```

## Benefits

- **Synchronization:** Ensures that your API documentation is always synchronized with your validation logic.
- **Type Safety:** Leverages Zod's type safety to generate accurate OpenAPI schemas.
- **Reduced Errors:** Minimizes the risk of inconsistencies between your API and documentation.
- **Automation:** Automates the process of generating OpenAPI contracts.
- **Maintainability:** Simplifies the maintenance of your API documentation.

By using `zod-to-openapi`, you can streamline the process of generating OpenAPI contracts from your Zod-powered Express APIs, ensuring accuracy and consistency.
