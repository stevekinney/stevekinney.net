---
title: React Hook Form With Zod Types
description: >-
  React Hook Form (RHF) pairs beautifully with Zod. Use zodResolver to make your
  schema the single source of truth and preserve inference across inputs,
  controllers, and field arrays.
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T18:35:03.187Z'
---

React Hook Form (RHF) pairs beautifully with Zod. Use `zodResolver` to make your schema the single source of truth and preserve inference across inputs, controllers, and field arrays.

## Setup and Resolver Typing

```ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const ProfileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  tags: z.array(z.string()).default([]),
});

type Profile = z.infer<typeof ProfileSchema>;

const form = useForm<Profile>({
  resolver: zodResolver(ProfileSchema),
  defaultValues: { name: '', email: '', tags: [] },
});
```

## Controller Generics and Custom Inputs

```tsx
import { Controller } from 'react-hook-form';

<Controller
  control={form.control}
  name="name"
  render={({ field, fieldState }) => <TextInput {...field} error={fieldState.error?.message} />}
/>;
```

## Field Arrays with Inference

```tsx
import { useFieldArray } from 'react-hook-form';

const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: 'tags',
});
```

## Schema Migrations

- Use Zod `.transform()`/`.refine()` to migrate legacy shapes.
- Normalize inputs (e.g., number strings) at the boundary for cleaner components.

## Nested Objects and Optional Fields

```ts
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zip: z.string().regex(/^\d{5}$/),
});

const ExtendedProfileSchema = ProfileSchema.extend({
  address: AddressSchema.optional(),
});

type ExtendedProfile = z.infer<typeof ExtendedProfileSchema>;

const form2 = useForm<ExtendedProfile>({ resolver: zodResolver(ExtendedProfileSchema) });
```

## Number Inputs with Transform

```ts
const ProductSchema = z.object({
  price: z
    .string()
    .transform((val) => Number(val))
    .pipe(z.number().min(0)),
});

type Product = z.infer<typeof ProductSchema>;

const form = useForm<Product>({
  resolver: zodResolver(ProductSchema),
  defaultValues: { price: '0' },
});
```

## Inferring Form Values from Schema

Let the schema drive the form values for stronger guarantees.

```ts
type Values<T extends z.ZodTypeAny> = z.infer<T>;
const createForm = <T extends z.ZodTypeAny>(schema: T, defaults: Values<T>) =>
  useForm<Values<T>>({ resolver: zodResolver(schema), defaultValues: defaults });

const form = createForm(ProfileSchema, { name: '', email: '', tags: [] });
```

## Error Messages and Helper Types

```tsx
type FieldErrorOf<T> = Partial<Record<keyof T, string>>;

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-red-600">
      {message}
    </p>
  );
}

<Controller
  control={form.control}
  name="email"
  render={({ field, fieldState }) => (
    <>
      <input type="email" {...field} />
      <ErrorText message={fieldState.error?.message} />
    </>
  )}
/>;
```

## Dynamic Fields and Unions

```ts
const PaymentSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('card'), cardNumber: z.string().min(12) }),
  z.object({ method: z.literal('paypal'), email: z.string().email() }),
]);

type Payment = z.infer<typeof PaymentSchema>;

const form = useForm<Payment>({
  resolver: zodResolver(PaymentSchema),
  defaultValues: { method: 'card' } as any,
});
```

Render conditionally based on `watch('method')` and keep full type safety.

## See Also

- [Forms, Events, and Number Inputs](forms-events-and-number-inputs.md)
- [Forms: File Inputs and Validation](forms-file-uploads-typing.md)
- [Forms, Actions, and useActionState](forms-actions-and-useactionstate.md)
- [Data Fetching and Runtime Validation](data-fetching-and-runtime-validation.md)
