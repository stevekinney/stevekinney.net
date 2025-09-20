---
title: Result/Either Patterns for React
description: >-
  Model errors without exceptions—neverthrow/Either, action error unions, and
  ergonomic component APIs.
date: 2025-09-14T18:00:00.000Z
modified: '2025-09-14T23:11:40.852Z'
published: true
tags:
  - react
  - typescript
  - errors
  - result
  - either
  - neverthrow
---

Exceptions are hard to type and harder to test. Result/Either types make failures explicit and components simpler.

## neverthrow Basics

```ts
import { ok, err, Result } from 'neverthrow';

type User = { id: string; name: string };
type UserError = 'NotFound' | 'Network';

async function getUser(id: string): Promise<Result<User, UserError>> {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) return err('NotFound');
    return ok(await res.json());
  } catch {
    return err('Network');
  }
}
```

## Component Ergonomics

```tsx
function UserCard({ result }: { result: Result<User, UserError> }) {
  return result.match({
    ok: (user) => <div>{user.name}</div>,
    err: (e) => <ErrorView code={e} />,
  });
}
```

## Action Error Unions

Model server action outcomes with discriminated unions to simplify UI branches and ensure exhaustiveness.

```ts
type CreateUserResult =
  | { status: 'success'; userId: string }
  | { status: 'validation-error'; issues: string[] }
  | { status: 'network-error' };

export async function createUserAction(fd: FormData): Promise<CreateUserResult> {
  try {
    const res = await fetch('/api/users', { method: 'POST', body: fd });
    if (res.status === 400) {
      const issues = (await res.json()).issues as string[];
      return { status: 'validation-error', issues };
    }
    if (!res.ok) return { status: 'network-error' };
    const { id } = await res.json();
    return { status: 'success', userId: id };
  } catch {
    return { status: 'network-error' };
  }
}
```

```tsx
function CreateUserForm() {
  const action = async (formData: FormData) => createUserAction(formData);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = await action(new FormData(e.currentTarget));
    switch (result.status) {
      case 'success':
        // navigate
        break;
      case 'validation-error':
        // show issues
        break;
      case 'network-error':
        // retry UI
        break;
      default:
        const never: never = result; // exhaustiveness
        return never;
    }
  };
  return <form onSubmit={onSubmit}>{/* fields */}</form>;
}
```

## Converting Exceptions to Results

```ts
import { Result, err, ok } from 'neverthrow';

export async function wrap<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err(e as Error);
  }
}
```

## Mapping and Chaining

```ts
const res = await getUser('123')
  .andThen((u) => (u ? ok(u) : err<'NotFound'>('NotFound')))
  .map((u) => u.name)
  .mapErr((e) => (e === 'NotFound' ? 'UserMissing' : 'Unknown')); // re-map domain errors
```

## See Also

- [Error Boundaries and Suspense Boundaries](error-boundaries-and-suspense-boundaries.md)
- [Forms, Actions, and useActionState](forms-actions-and-useactionstate.md)
- [Data Fetching and Runtime Validation](data-fetching-and-runtime-validation.md)
