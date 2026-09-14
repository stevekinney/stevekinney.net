---
title: Validating the API with OpenAPI
description: 'Ensure your API follows its specifications using express-openapi-validator middleware for request and response validation.'
---

Again, we want to enforce that your server adheres to the specification. Luckily, we have some fancy middleware that will make sure our requests and responses match the specification. Let's use [`express-openapi-validator`](https://www.npmjs.com/package/express-openapi-validator).

We can then use it as middleware to make sure that our responses are up-to-snuff.

```ts
import OpenApiValidator from 'express-openapi-validator';

app.use(
  OpenApiValidator.middleware({
    apiSpec: './openapi.json',
    validateRequests: true,
    validateResponses: true,
  }),
);
```
