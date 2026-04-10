---
title: Generate a tRPC Service with Prisma
modified: 2026-03-17
description: >-
  Learn to create a tRPC service using Prisma with the prisma-trpc-generator.
  Explore setup options and integrate with Zod, all detailed in this guide.
date: 2025-03-20
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
