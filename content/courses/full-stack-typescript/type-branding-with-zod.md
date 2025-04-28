---
title: Type Branding with Zod
description: 'Use Zod for type branding to create nominal type relationships while maintaining runtime type safety.'
modified: 2025-03-15T16:15:00-06:00
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

Branding is purely a TypeScript compile-time trick, but it helps you avoid passing, for example, a plain string where an `EmailAddress` is required. You can brand objects, too.
