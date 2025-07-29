---
title: Validating Path and Query Parameters with Middleware
modified: 2025-04-16T12:27:20-06:00
description: >-
  Learn how to create middleware in Express to validate path and query
  parameters using Zod schemas for robust request handling. Transform your
  request validation process with ease.
---

We can create similar middleware for validating queries and paths.

```ts
const validateParams =
  <T>(schema: ZodSchema<T>): RequestHandler<Request['params'] & T, ErrorResponse> =>
  (request: Request, response: Response, next: NextFunction) => {
    try {
      request.params = schema.parse(request.params) as Request['params'];
      next();
    } catch (error) {
      return handleError(request, response, error);
    }
  };

const validateQuery =
  <T>(
    schema: ZodSchema<T>,
  ): RequestHandler<Request['params'], ErrorResponse, Request['body'], Request['query'] & T> =>
  (request: Request, response: Response, next: NextFunction) => {
    try {
      request.query = schema.parse(request.query) as Request['query'];
      next();
    } catch (error) {
      return handleError(request, response, error);
    }
  };
```

## Putting It All Together

Now, we can make one middleware that validates all of the different options.

```ts
import { type NextFunction, type Request, type Response } from 'express';
import { type ZodSchema } from 'zod';
import { handleError } from './handle-error.js';

type ValidationOptions = { body?: ZodSchema; params?: ZodSchema; query?: ZodSchema };

/**
 * Creates a middleware to validate multiple parts of a request against Zod schemas
 * @param schemas Object containing optional Zod schemas for body, params, and query
 * @returns Express middleware that validates the specified parts of the request
 */
export const validate = (schemas: ValidationOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        const validatedBody = schemas.body.parse(req.body);
        req.body = validatedBody as Request['body'];
      }

      if (schemas.params) {
        const validatedParams = schemas.params.parse(req.params);
        req.params = validatedParams as Request['params'];
      }

      if (schemas.query) {
        const validatedQuery = schemas.query.parse(req.query);
        req.query = validatedQuery as Request['query'];
      }

      next();
    } catch (error) {
      return handleError(req, res, error);
    }
  };
};
```

**Next**: [Adding Client-Side Validations](adding-client-side-validation)
