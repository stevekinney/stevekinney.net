---
title: Generate Zod Schemas from Prisma
modified: 2025-03-20T08:21:38-05:00
---

Now that we have Prisma set up, the next part is easy. We're going to use an aptly-named tool called [`zod-prisma-types`](https://www.npmjs.com/package/zod-prisma-types).

In your Prisma configuration add the following.

```prisma
generator zod {
  provider       = "zod-prisma-types"
}
```

And now run: `npx prisma generate zod`.

**Boom.** That's all there is to it. But, like what if we could also generate a [tRPC schema](prisma-trpc) as well?
