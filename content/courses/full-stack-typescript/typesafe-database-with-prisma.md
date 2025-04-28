---
title: Type-Safe Database Access with Prisma
description: A comprehensive guide to using Prisma with tRPC, Express, and TypeScript for end-to-end type safety in your database operations.
date: 2025-03-15T17:00:07-06:00
modified: 2025-03-20T08:07:01-05:00
---

Below is a step‑by‑step tutorial that not only shows you how to set up Prisma with Express and TypeScript for a simple todo app but also highlights the changes you made—replacing your custom TaskClient with Prisma for full type safety. Let's jump in.

## Initialize Prisma

Initialize Prisma by running:

```bash
npx prisma init
```

This creates a `prisma/` folder with a `schema.prisma` file. Edit the file to define your Task model:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model Task {
  id          Int      @id @default(autoincrement())
  title       String
  description String?
  completed   Boolean  @default(false)
}
```

Then run a migration and generate the Prisma client:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

## Integrating Prisma in Your Express Server

Previously, you used a custom `TaskClient` (and a `Database` type from SQLite) to handle your database operations. Now we're switching to Prisma to get true type safety. Here's a look at your diff with changes:

```diff
diff --git a/server/src/server.ts b/server/src/server.ts
index bbdd593..53ee07a 100644
--- a/server/src/server.ts
+++ b/server/src/server.ts
@@ -1,8 +1,10 @@
 import cors from 'cors';
 import express from 'express';
-import type { Database } from 'sqlite';
 import swaggerUi from 'swagger-ui-express';

+import { PrismaClient } from '@prisma/client';
+const prisma = new PrismaClient();
+
```

### Replacing CRUD Methods

Instead of calling methods on your custom client, you now use Prisma's methods:

### `GET /tasks`

```typescript
const tasks = await prisma.task.findMany();
```

### `GET /tasks/:id`

```typescript
const task = await prisma.task.findUnique({ where: { id } });
```

### `POST /tasks`

```typescript
await prisma.task.create({ data: task });
```

### `PUT /tasks/:id`

```typescript
const data = req.body;
await prisma.task.update({ where: { id }, data });
```

### `DELETE /tasks/:id`

```typescript
await prisma.task.delete({ where: { id } });
```

## 6. Full Updated `server.ts` Example

Here's what your complete `server.ts` might look like after integrating Prisma:

```typescript
import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import {
  NewTaskSchema,
  TaskParamsSchema,
  TaskQuerySchema,
  UpdateTaskSchema,
} from 'busy-bee-schema';

import { handleError } from './handle-error.js';
import { openApiDocument } from './openapi.js';
import { validate } from './validate.js';

export async function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve OpenAPI docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  // Expose OpenAPI spec as JSON
  app.get('/openapi.json', (req, res) => {
    res.json(openApiDocument);
  });

  app.get('/tasks', validate({ query: TaskQuerySchema }), async (req, res) => {
    try {
      const tasks = await prisma.task.findMany();
      return res.json(tasks);
    } catch (error) {
      return handleError(req, res, error);
    }
  });

  // Get a specific task
  app.get('/tasks/:id', validate({ params: TaskParamsSchema }), async (req, res) => {
    try {
      const { id } = req.params;
      const task = await prisma.task.findUnique({ where: { id } });

      if (!task) return res.status(404).json({ message: 'Task not found' });

      return res.json(task);
    } catch (error) {
      return handleError(req, res, error);
    }
  });

  app.post('/tasks', validate({ body: NewTaskSchema }), async (req, res) => {
    try {
      const task = req.body;
      await prisma.task.create({ data: task });
      return res.status(201).json({ message: 'Task created successfully' });
    } catch (error) {
      return handleError(req, res, error);
    }
  });

  // Update a task
  app.put(
    '/tasks/:id',
    validate({ params: TaskParamsSchema, body: UpdateTaskSchema }),
    async (req, res) => {
      try {
        const { id } = req.params;

        const data = req.body;
        await prisma.task.update({ where: { id }, data });

        return res.status(200).json({ message: 'Task updated successfully' });
      } catch (error) {
        return handleError(req, res, error);
      }
    },
  );

  // Delete a task
  app.delete('/tasks/:id', validate({ params: TaskParamsSchema }), async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.task.delete({ where: { id } });
      return res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
      return handleError(req, res, error);
    }
  });

  return app;
}
```

_Note:_ Make sure you handle type conversions if your route parameters (like `id`) need to be numbers. Depending on your Prisma schema, you might need to convert `id` from string to number (e.g., using `Number(id)`).
