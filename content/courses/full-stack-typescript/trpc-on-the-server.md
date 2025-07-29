---
modified: 2025-04-16T12:27:20-06:00
title: tRPC on the Server
description: >-
  Learn how to set up a tRPC server with Express to create type-safe API
  endpoints with routers, procedures, and contexts.
---

## Install Dependencies

```bash
npm install express @trpc/server zod sqlite3
npm install -D typescript ts-node nodemon @types/node @types/express
```

- [`express`](https://npm.im/express): For our HTTP server.
- [`@trpc/server`](https://npm.im/@trpc/server): For tRPC core & its Express integration.
- [`zod`](https://npm.im/zod): Schema validation library (the unstoppable input-validation sidekick).
- [`sqlite3`](https://npm.im/sqlite3): Our sample DB driver (because “SQLite or bust” for quick examples).
- [`typescript`](https://npm.im/typescript): You know why.

## Defining the tRPC API

tRPC works around **routers** (collections of procedures) and **procedures** (functions that can be queries, mutations, or subscriptions).

### Create the tRPC Base

Create a `trpc.ts` file that sets up the core tRPC functionality:

```typescript
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import {
  NewTaskSchema,
  TaskParamsSchema,
  TaskQuerySchema,
  UpdateTaskSchema,
} from 'busy-bee-schema';
import type { Context } from './trpc-context.js';

// Initialize tRPC with context
const t = initTRPC.context<Context>().create();

// Create router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Create the task router with procedures
export const taskRouter = router({
  // Get all tasks with optional filtering by completion status
  getTasks: publicProcedure
    .input(TaskQuerySchema) // Use Zod schema for input validation
    .query(async ({ input, ctx }) => {
      return await ctx.taskClient.getTasks(input);
    }),

  // Get a single task by ID
  getTask: publicProcedure.input(TaskParamsSchema).query(async ({ input, ctx }) => {
    const task = await ctx.taskClient.getTask(input.id);
    return task;
  }),

  // Create a new task
  createTask: publicProcedure.input(NewTaskSchema).mutation(async ({ input, ctx }) => {
    await ctx.taskClient.createTask({ task: input });
    return { success: true };
  }),

  // Update an existing task
  updateTask: publicProcedure
    .input(
      z.object({
        id: z.coerce.number().int(),
        task: UpdateTaskSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.taskClient.updateTask(input.id, input.task);
      return { success: true };
    }),

  // Delete a task
  deleteTask: publicProcedure.input(TaskParamsSchema).mutation(async ({ input, ctx }) => {
    await ctx.taskClient.deleteTask(input.id);
    return { success: true };
  }),
});

// Create the app router
export const appRouter = router({
  task: taskRouter,
});

// Export type definition of API for client usage
export type AppRouter = typeof appRouter;
```

### Set Up Context

Create a `trpc-context.ts` file to provide the necessary context to all tRPC procedures:

```typescript
import { inferAsyncReturnType } from '@trpc/server';
import { TaskClient } from './client.js';
import { getDatabase } from './database.js';

/**
 * Creates context for tRPC procedures
 * Initializes database connection and task client
 */
export async function createContext() {
  const database = await getDatabase();
  const taskClient = new TaskClient(database);

  return {
    taskClient,
  };
}

// Export the context type for use in tRPC setup
export type Context = inferAsyncReturnType<typeof createContext>;
```

### Create an Express Adapter

Create a `trpc-adapter.ts` file to integrate tRPC with Express:

```typescript
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import { createContext } from './trpc-context.js';
import { appRouter } from './trpc.js';

/**
 * Creates an Express router with tRPC endpoints
 * @returns Express router with tRPC middleware
 */
export function createTRPCRouter() {
  const router = express.Router();

  router.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return router;
}
```

### Add tRPC to Your Express App

Update your main `server.ts` file to include the tRPC router:

```typescript
import { createTRPCRouter } from './trpc-adapter.js';

export async function createServer(database: Database) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Add tRPC router
  app.use('/api', createTRPCRouter());

  // ... rest of your Express setup
}
```

## Using tRPC

After implementing these steps, your tRPC API will be available at:

```ts
/api/cprt / [procedure - path];
```

For example:

- `GET /api/trpc/task.getTasks` - Get all tasks
- `GET /api/trpc/task.getTask` - Get a specific task
- `POST /api/trpc/task.createTask` - Create a task
- `POST /api/trpc/task.updateTask` - Update a task
- `POST /api/trpc/task.deleteTask` - Delete a task

## Benefits of tRPC

1. **Type Safety**: Full end-to-end type safety between your client and server
2. **Schema Validation**: Automatic validation of inputs using Zod schemas
3. **Developer Experience**: Better autocomplete and type checking in your editor
4. **API Documentation**: Type definitions serve as documentation for your API
5. **Performance**: tRPC uses WebSockets for subscriptions and efficient data transfer

## Next Steps

- Create a tRPC client in your frontend application to consume these endpoints
- Add middleware for authentication/authorization
- Implement error handling strategies
- Add more complex procedures with nested routers
