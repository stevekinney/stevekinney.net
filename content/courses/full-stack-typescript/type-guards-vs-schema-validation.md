---
title: Type Guards vs Schema Validation
description: 'Compare traditional TypeScript type guards with schema validation libraries like Zod for runtime data validation.'
modified: 2025-03-15T15:22:36-06:00
---

Type guards are way to use runtime logic to help put TypeScript at ease that a given object is actually the type you think it ought to be. Here is a quick example.

```typescript
interface Circle {
  kind: 'circle';
  radius: number;
}

interface Square {
  kind: 'square';
  side: number;
}

type Shape = Circle | Square;

function isCircle(shape: Shape): shape is Circle {
  return shape.kind === 'circle';
}

function calculateArea(shape: Shape) {
  if (isCircle(shape)) {
    return Math.PI * shape.radius ** 2;
  }
  return shape.side ** 2;
}
```

A previous iteration of me might have thought he was was _really_ smart when he made a type guard like this.

```typescript
// Define a type guard for User objects
function isUser(obj: any): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.username === 'string' &&
    typeof obj.email === 'string'
  );
}
```

Alternatively, you could do something like this.

```typescript
// Runtime type checking can impact performance
function validateUser(data: unknown): User {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('username' in data) ||
    !('email' in data) ||
    typeof data.username !== 'string' ||
    typeof data.email !== 'string'
  ) {
    throw new ValidationError('Invalid user data');
  }

  return data as User;
}
```

Schema validation libraries are optimized for performance, making them better than hand-rolled validation. Let's look at the same idea, but using Zod.

```ts
// More efficient with schema validation libraries
const userSchema = z.object({
  username: z.string(),
  email: z.string().email(),
});

function validateUser(data: unknown): User {
  return userSchema.parse(data);
}
```
