---
title: Generating Types from an Open API specification
modified: 2025-03-20T05:49:31-05:00
---

Once you have an OpenAPI specification, you can use [`openapi-typescript`](https://npm.im/openapi-typescript) to generate types.

```sh
npx openapi-typescript ./openapi.json -o src/api.types.ts
```

The results are big and gnarly. You can take a look at the output [here](https://gist.github.com/stevekinney/a43731e45e8822bc0b7b7d814938ab27).

## Generating a Client from OpenAPI Types

Now that we have the types, we can generate a client automatically. We don't even need Zod anymore!

Let's start by generating type definitions from your OpenAPI specification:

```bash
npx openapi-typescript openapi.json -o src/api.types.ts
```

This creates a TypeScript file with type definitions that match your API's structure.

### Create a Type-Safe API Client

Now let's implement the API client using the generated types:

```typescript
// src/api.ts
import createClient from 'openapi-fetch';
import type { paths } from './api.types';

// Set your API base URL

const API_URL = 'http://localhost:4001';

// Create the client with type information

const { GET, POST, PUT, DELETE } = createClient<paths>({ baseUrl: API_URL });
```

## Implement Type-Safe API Methods

Let's replace traditional fetch calls with typed API methods:

### Fetching a Collection (GET)

```typescript
export const fetchTasks = async (showCompleted: boolean) => {
  const { data, error } = await GET('/tasks', {
    params: {
      query: showCompleted ? { completed: true } : {},
    },
  });

  if (error) throw new Error('Failed to fetch tasks');

  return data || [];
};
```

### Fetching a Single Resource (GET with path param)

```typescript
export const getTask = async (id: string) => {
  const { data, error } = await GET('/tasks/{id}', {
    params: {
      path: { id: Number(id) },
    },
  });

  if (error) throw new Error('Failed to fetch task');

  return data;
};
```

### Creating a Resource (POST)

```typescript
export const createTask = async (task: { title: string; description?: string }) => {
  const { error } = await POST('/tasks', {
    body: task,
  });

  if (error) throw new Error('Failed to create task');
};
```

### Updating a Resource (PUT)

```typescript
export const updateTask = async (
  id: string,

  task: { title?: string; description?: string; completed?: boolean },
) => {
  const { error } = await PUT('/tasks/{id}', {
    params: {
      path: { id: Number(id) },
    },

    body: task,
  });

  if (error) throw new Error('Failed to update task');
};
```

### Deleting a Resource (DELETE)

```typescript
export const deleteTask = async (id: string) => {
  const { error } = await DELETE('/tasks/{id}', {
    params: {
      path: { id: Number(id) },
    },
  });

  if (error) throw new Error('Failed to delete task');
};
```

## Benefits of This Approach

1. **Type Safety**: Catch errors at compile time rather than runtime
2. **Developer Experience**:

- Autocomplete for API endpoints
- Type hints for required and optional parameters
- Proper typing of request and response bodies

3. **Error Handling**: Consistent error handling pattern
4. **Maintainability**: When the API changes, update the OpenAPI spec and regenerate types

Using `openapi-fetch` with generated TypeScript types creates a super easy, type-safe API client that improves developer productivity and reduces runtime errors. As your API evolves, simply update your OpenAPI specification and regenerate the types to keep your client in sync.
