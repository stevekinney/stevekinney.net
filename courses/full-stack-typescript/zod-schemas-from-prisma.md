---
title: Generate Zod Schemas from Prisma
description: >-
  Learn to generate Zod schemas from Prisma using `zod-prisma-types`. Simplify
  validation by integrating Zod with your Prisma setup effortlessly.
modified: 2026-03-17
date: 2025-03-20
---

Now that we have Prisma set up, the next part is easy. We're going to use an aptly-named tool called [`zod-prisma-types`](https://www.npmjs.com/package/zod-prisma-types).

In your Prisma configuration add the following.

```prisma
generator zod {
  provider       = "zod-prisma-types"
}
```

And now run: `npx prisma generate zod`.

**Boom.** That's all there is to it. But, like what if we could also generate a [tRPC schema](prisma-trpc.md) as well?
