---
title: Generating OpenAPI Contracts from an Existing Express API
description: >-
  Learn how to generate OpenAPI specifications from your existing Express API
  using tools like swagger-jsdoc.
modified: 2025-03-20T08:44:29-05:00
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
