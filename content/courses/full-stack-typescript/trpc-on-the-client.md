---
modified: 2025-03-20T03:58:11-05:00
title: tRPC on the Client
description: Learn how to set up and use tRPC on the client side with React and React Query integration for type-safe API calls.
---

This guide documents how we migrated the client-side API from using direct REST calls to using tRPC. Before implementing these changes, the following were set up:

- A tRPC server (in `/server/src/trpc.ts`)
- Shared schemas between client and server (in `shared/schemas.ts`)
- Existing REST API client (in `/client/src/api.ts`)

## Install Dependencies

I already did this for you, but it feels appropriate to call it out explicitly. The first step was to install the necessary client-side tRPC packages:

```bash
npm install @trpc/client
```

## Update API Client

The existing REST API client was completely refactored to use tRPC:

```typescript
import { type NewTask, type Task, type UpdateTask } from 'busy-bee-schema';

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

import type { AppRouter } from '../../server/src/trpc';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:4001/api/trpc',
    }),
  ],
});

export const fetchTasks = async (showCompleted: boolean): Promise<Task[]> => {
  return client.task.getTasks.query({ completed: showCompleted ? true : undefined });
};
```

### Key Changes Made

**Client Setup**: Created a tRPC proxy client that connects to the server endpoint:

```typescript
const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:4001/trpc',
    }),
  ],
});
```

### Fetch Tasks

Updated to use tRPC query

```typescript
export const fetchTasks = async (showCompleted: boolean): Promise<Task[]> => {
  return client.task.getTasks.query({ completed: showCompleted ? true : undefined });
};
```

### Get Single Task

Updated to use tRPC query with ID parameter

```typescript
export const getTask = async (id: string): Promise<Task> => {
  const task = await client.task.getTask.query({ id: parseInt(id, 10) });

  if (!task) throw new Error('Failed to fetch task');

  return task;
};
```

### Create Task

Updated to use tRPC mutation

```typescript
export const createTask = async (task: NewTask): Promise<void> => {
  await client.task.createTask.mutate(task);
};
```

### Update Task

Updated to use tRPC mutation with proper parameter structure

```typescript
export const updateTask = async (id: string, task: UpdateTask): Promise<void> => {
  await client.task.updateTask.mutate({
    id: parseInt(id, 10),

    task,
  });
};
```

### Delete Task

Updated to use tRPC mutation

```typescript
export const deleteTask = async (id: string): Promise<void> => {
  await client.task.deleteTask.mutate({ id: parseInt(id, 10) });
};
```

## Benefits of Using tRPC

1. **Type Safety**: Full end-to-end type safety between client and server
2. **Simplified API Calls**: No need to manually construct URLs or handle HTTP errors
3. **Automatic Type Inference**: Client automatically knows the shape of data from server
4. **Reduced Boilerplate**: No need for explicit data validation or parsing
5. **Better Developer Experience**: Autocomplete for available endpoints

## Next Steps

- Implement optimistic updates for improved user experience
- Add error handling middleware
- Consider implementing real-time updates with tRPC subscriptions
