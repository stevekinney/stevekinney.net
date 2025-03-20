---
title: Validating the API with OpenAPI
modified: 2025-03-20T06:55:30-05:00
---

Again, we want to enforce that your server adheres to the specification. Luckily, we have some fancy middleware that will make sure our requests and responses match the specification. Let's use [`openapi-express-validator`](https://www.npmjs.com/package/express-openapi-validator).

We can then use it as middleware to make sure that our responses are up-to-snuff.

```ts
app.use(
	OpenApiValidator.middleware({
		apiSpec: './openapi.json',
		validateRequests: true,
		validateResponses: true,
	}),
);
```
