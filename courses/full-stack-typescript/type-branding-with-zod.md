---
title: Type Branding with Zod
description: >-
  Use Zod for type branding to create nominal type relationships while
  maintaining runtime type safety.
modified: 2026-03-17
date: 2025-03-16
---

You can “brand” your types so that TypeScript sees them as unique, even if they're plain strings or numbers at runtime.

```ts
import { z } from 'zod';

const emailSchema = z.string().email().brand<'EmailAddress'>();

type EmailAddress = z.infer<typeof emailSchema>;
// => string & { __brand: "EmailAddress" }

const email = emailSchema.parse('test@example.com');
// Type is EmailAddress

function sendEmail(to: EmailAddress) {
  console.log('Sending email to', to);
}

sendEmail(email);
// Works

sendEmail('unbranded string');
// Type error: not EmailAddress
```

> [!NOTE] Zod v4
>
> In Zod v4, `z.string().email()` is preferably written as `z.email()`. The `.brand()` method also accepts an optional second argument (`"in"`, `"out"`, or `"inout"`) to control where the brand appears in the inferred type.

Branding is purely a TypeScript compile-time trick, but it helps you avoid passing, for example, a plain string where an `EmailAddress` is required. You can brand objects, too.
