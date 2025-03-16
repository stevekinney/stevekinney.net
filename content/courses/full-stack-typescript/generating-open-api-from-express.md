---
title: Generating OpenAPI Contracts from an Existing Express API
modified: 2025-03-15T17:00:00-06:00
---

Creating an OpenAPI contract from an existing Express API can be a valuable way to document your API, improve collaboration, and generate client SDKs. This guide outlines the steps to generate an OpenAPI specification from your existing Express routes.

## Inspect Your Existing Express Routes

Before generating an OpenAPI contract, carefully inspect your existing Express routes. Pay attention to:

- **Endpoints:** List all the API endpoints (e.g., `/users`, `/products/{id}`).
- **HTTP Methods:** Identify the HTTP methods used for each endpoint (e.g., GET, POST, PUT, DELETE).
- **Request Parameters:** Note any path parameters, query parameters, or request body structures.
- **Response Structures:** Document the expected response structures for each endpoint.
- **Headers and Cookies:** Identify any custom headers or cookies used in requests or responses.

## Choose an OpenAPI Generation Tool

Several tools can help generate OpenAPI contracts from existing Express APIs. Popular options include:

- **[`swagger-jsdoc`](https://www.npmjs.com/package/swagger-jsdoc):** Generates OpenAPI specifications from JSDoc annotations in your code.
- **[`express-openapi`](https://www.npmjs.com/package/express-openapi):** Allows you to define your API using a YAML or JSON file and maps it to your Express routes.
- **[`ts-node-dev`](https://www.npmjs.com/package/ts-node-dev) and [`openapi-typescript`](https://www.npmjs.com/package/openapi-typescript):** When combined with properly typed code, you can generate an openapi spec from your typescript code.
- **[`openapi-express`](https://www.npmjs.com/package/openapi-express):** Generates an openapi spec from the running express server.

For this guide, we'll focus on `swagger-jsdoc`, as it's a popular and relatively simple option.

## Install `swagger-jsdoc`

Install `swagger-jsdoc` as a development dependency:

```bash
npm install swagger-jsdoc --save-dev
```

This installs [swagger-jsdoc](https://www.npmjs.com/package/swagger-jsdoc) which allows you to write OpenAPI specifications using JSDoc comments in your code.

## Add JSDoc Annotations to Your Express Routes

Add JSDoc annotations to your Express route handlers to describe the API endpoints, request parameters, and response structures.

**Example:**

```typescript
/**
 * @swagger
 * /users:
 * get:
 * summary: Get a list of users
 * parameters:
 * - in: query
 * name: page
 * schema:
 * type: integer
 * description: Page number
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * description: Number of users per page
 * responses:
 * 200:
 * description: Successful response
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * $ref: '#/components/schemas/User'
 * post:
 * summary: Create a new user
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/CreateUserRequest'
 * responses:
 * 201:
 * description: User created
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/User'
 */
app.get('/users', (req, res) => {
	// ... your route logic
});

app.post('/users', (req, res) => {
	// ... your route logic
});

/**
 * @swagger
 * components:
 * schemas:
 * User:
 * type: object
 * properties:
 * id:
 * type: string
 * username:
 * type: string
 * email:
 * type: string
 * CreateUserRequest:
 * type: object
 * properties:
 * username:
 * type: string
 * email:
 * type: string
 */
```

## Configure `swagger-jsdoc`

Create a configuration file (e.g., `swagger.js`) to define the OpenAPI specification's metadata and point to your route files.

```javascript
// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'My Express API',
			version: '1.0.0',
			description: 'A sample API',
		},
	},
	apis: ['./your-route-files/*.js'], // Path to your route files
};

const specs = swaggerJsdoc(options);

module.exports = specs;
```

## Generate the OpenAPI Specification

Create a script to generate the OpenAPI specification and save it to a file (e.g., `swagger.json` or `swagger.yaml`).

```javascript
// generate-swagger.js
const fs = require('fs');
const specs = require('./swagger');

fs.writeFileSync('swagger.json', JSON.stringify(specs, null, 2));
```

Run the script:

```bash
node generate-swagger.js
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
import swaggerDocument from './swagger.json';

const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(3000, () => {
	console.log('Server listening on port 3000');
});
```

## Validate the OpenAPI Specification

Validate the generated OpenAPI specification using online validators or command-line tools to ensure it's valid.

## Benefits

- **Documentation:** Provides clear and interactive documentation for your API.
- **Collaboration:** Facilitates collaboration between frontend and backend developers.
- **Client SDK Generation:** Allows you to generate client SDKs in various languages.
- **Testing:** Enables automated API testing.
