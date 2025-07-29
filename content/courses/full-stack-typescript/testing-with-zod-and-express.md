---
title: Testing Express APIs with Zod Fixtures and Superagent
description: >-
  Learn how to effectively test your Express APIs using Zod fixtures for test
  data generation and Superagent for HTTP request testing.
modified: 2025-04-16T12:27:20-06:00
---

Testing your Express API is crucial for ensuring its reliability and correctness. This guide demonstrates how to use [`zod-fixture`](https://www.npmjs.com/package/zod-fixture) to generate realistic test data based on your Zod schemas, and [`superagent`](https://www.npmjs.com/package/superagent) to make HTTP requests to your API.

## Install Dependencies

Install the necessary dependencies:

```bash
npm install superagent zod zod-fixture --save-dev
npm install @types/superagent --save-dev # if using TypeScript
```

This installs:

- [`superagent`](https://www.npmjs.com/package/superagent): HTTP client for testing your API
- [`zod`](https://www.npmjs.com/package/zod): Schema validation library
- [`zod-fixture`](https://www.npmjs.com/package/zod-fixture): Generates test data from Zod schemas

## Define Your Zod Schemas

Ensure that your Express API uses Zod schemas for request and response validation.

**Example:**

```typescript
// schemas.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string(),
  age: z.number().int().positive().optional(),
});
```

## Create Zod Fixtures

Use `zod-fixture` to generate test data based on your Zod schemas.

**Example:**

```typescript
// fixtures.ts
import { generateMock } from 'zod-fixture';
import { createUserSchema, userResponseSchema } from './schemas';

export const createUserFixture = () => generateMock(createUserSchema);
export const userResponseFixture = () => generateMock(userResponseSchema);
```

## Write Test Cases

Use `superagent` to make HTTP requests to your Express API and `zod-fixture` to generate test data.

**Example (using Jest):**

```typescript
// app.test.ts
import request from 'superagent';
import { createUserFixture, userResponseFixture } from './fixtures';
import { createUserSchema, userResponseSchema } from './schemas';
import express, { Request, Response } from 'express';
import { z } from 'zod';

const app = express();
app.use(express.json());

app.post(
  '/users',
  (
    req: Request<{}, {}, z.infer<typeof createUserSchema>>,
    res: Response<z.infer<typeof userResponseSchema>>,
  ) => {
    const newUser: z.infer<typeof userResponseSchema> = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: req.body.username,
      email: req.body.email,
      age: req.body.age,
    };
    res.status(201).json(newUser);
  },
);

const server = app.listen(3001); // Use a different port for testing

describe('User API', () => {
  afterAll(() => {
    server.close();
  });

  it('should create a user', async () => {
    const userData = createUserFixture();
    const response = await request.post('http://localhost:3001/users').send(userData);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining(userData));
    expect(userResponseSchema.safeParse(response.body).success).toBe(true);
  });

  it('should handle invalid input', async () => {
    const invalidUserData = { username: 'a', email: 'invalid-email' }; // Invalid username and email
    try {
      await request.post('http://localhost:3001/users').send(invalidUserData);
    } catch (error: any) {
      expect(error.response.status).toBe(400); // Assuming your API returns 400 for invalid input
    }
  });

  it('should generate a valid user response fixture', () => {
    const responseData = userResponseFixture();
    expect(userResponseSchema.safeParse(responseData).success).toBe(true);
  });
});
```

## Run Tests

Run your tests using your chosen testing framework (e.g., Jest, Mocha).

```bash
npx jest app.test.ts
```

## Benefits

- **Realistic Test Data:** `zod-fixture` generates realistic test data based on your Zod schemas, ensuring that your tests closely resemble real-world scenarios.
- **Type Safety:** Zod schemas and fixtures provide type safety, reducing the risk of errors.
- **Simplified Testing:** `superagent` simplifies the process of making HTTP requests, making your tests more readable and maintainable.
- **Validation:** You can easily validate the response body against your zod schemas.
- **Improved Reliability:** Comprehensive testing improves the reliability of your Express API.
