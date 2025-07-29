---
title: Using Zod with Express
description: >-
  Learn how to integrate Zod with Express for type-safe, runtime validation of
  request bodies, query parameters, and URL parameters.
modified: 2025-04-16T12:27:20-06:00
---

Type definitions in TypeScript help you catch mistakes at compile time, but they can't validate data when your code is actually running. That's where a schema validation library like [zod](https://www.npmjs.com/package/zod) shines. It bridges the gap by enforcing runtime checks while preserving type safety.

Below is an example of using Zod in an [Express](https://expressjs.com/) application to ensure that incoming requests match the expected structure before the route handler processes them.

```ts
import { z } from 'zod';
import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.use(express.json());

// Define a schema for creating users
const createUserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
  age: z.number().int().positive().optional(),
});

// Infer the TypeScript type from the schema
type CreateUserInput = z.infer<typeof createUserSchema>;

// Middleware for validating request body
function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

app.post(
  '/users',
  validateBody(createUserSchema),
  (req: Request<{}, {}, CreateUserInput>, res: Response) => {
    // req.body is validated & typed as CreateUserInput
    const { username, email, password, age } = req.body;
    // … create user logic here …
    res.status(201).json({ message: 'User created' });
  },
);
```

## Validating Query Parameters

When working with GET endpoints that include query strings, you can define a schema for req.query. Since query parameters always arrive as strings, you might need z.string().transform(…) or z.coerce.number() to convert them.

```ts
const searchQuerySchema = z.object({
  q: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});
type SearchQuery = z.infer<typeof searchQuerySchema>;

function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      return res.status(400).json({ error: 'Invalid query', details: error });
    }
  };
}

app.get(
  '/search',
  validateQuery(searchQuerySchema),
  (req: Request<{}, {}, {}, SearchQuery>, res: Response) => {
    // req.query is validated & typed as SearchQuery
    const { q, page = 1, limit = 10 } = req.query;
    // … search logic …
    res.json({ query: q, page, limit });
  },
);
```

### Validating URL Parameters

If your routes include path parameters (like /:userId), you can validate req.params using a similar approach.

```ts
const userParamsSchema = z.object({
  userId: z.string().uuid(),
});
type UserParams = z.infer<typeof userParamsSchema>;

function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      return res.status(400).json({ error: 'Invalid params', details: error });
    }
  };
}

app.get(
  '/users/:userId',
  validateParams(userParamsSchema),
  (req: Request<UserParams>, res: Response) => {
    // req.params.userId is validated & typed as a string UUID
    res.json({ userId: req.params.userId });
  },
);
```

## Validating Responses

Zod can also validate your outbound data. This isn't always necessary, but in higher-stakes environments (e.g., financial or medical data), it can be useful to ensure your code returns precisely the format you intend.

```ts
const userListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(createUserSchema), // returning a list of users
});

function sendUserListResponse(res: Response, payload: unknown) {
  // Validate the shape before sending
  const parsedPayload = userListResponseSchema.parse(payload);
  res.json(parsedPayload);
}
```

### Safe Parsing vs. Throwing

If you prefer not to handle exceptions with `try`/`catch`, consider `schema.safeParse(data)` instead of `schema.parse(data)`. It returns `{ success: boolean; data?: T; error?: ZodError }`, letting you respond with a 400 status if success is false.

```ts
const result = createUserSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ errors: result.error.errors });
}
// result.data is valid
```

## Why Use Zod?

1. You get runtime validation _and_ static typing from the same schema.
2. You ensure only valid data hits your route handlers, preventing potential crashes or security holes.
3. Zod integrates well with popular frameworks like [Express](https://www.npmjs.com/package/express), NestJS, or anything else in the Node.js ecosystem.
4. You can extend this pattern to query parameters, URL parameters, and even response data to keep the entire data flow strongly typed and validated.
