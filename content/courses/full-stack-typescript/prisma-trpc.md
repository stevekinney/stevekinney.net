---
title: Generate a tRPC Service with Prisma
modified: 2025-03-20T08:43:39-05:00
---

Alright it's time for another library! This time, we're going to go with another well-named piece of technology: [prisma-trpc-generator](https://github.com/omar-dulaimi/prisma-trpc-generator).

```prisma
generator trpc {
  provider          = "prisma-trpc-generator"
  withZod           = true
  withMiddleware    = false
  withShield        = false
  contextPath       = "../src/context"
  trpcOptionsPath   = "../src/trpcOptions"
}
```
