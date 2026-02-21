---
title: Custom Data Transformers with tRPC
description: >-
  Learn how to use data transformers like SuperJSON to properly serialize
  complex data types in tRPC applications.
modified: '2025-09-14T23:11:40.805Z'
date: '2025-09-14T18:05:51.833Z'
---

### Custom Data Transformers

When you need to serialize `Date`, `Map`, or `BigInt` fields, consider [SuperJSON](https://github.com/blitz-js/superjson). Install `superjson` and register it in both server and client:

```ts
import superjson from 'superjson';

const t = initTRPC.create({
  transformer: superjson,
});
```

And on the client:

```ts
createTRPCClient<AppRouter>({
  transformer: superjson,
  links: [
    /* ... */
  ],
});
```

Now your date objects will remain actual `Date` objects on the client, not random strings.
