---
title: Real-time Subscriptions with tRPC
description: Learn how to implement real-time updates using tRPC's subscription capabilities with Server-Sent Events or WebSockets.
modified: 2025-03-15T16:36:52-06:00
---

If you need real-time updates (like for chat or notifications), tRPC supports subscriptions (via SSE or WebSockets). You’ll set up a special link on the client and define `.subscription()` procedures on the server. Check tRPC docs for the exact approach (since it can differ between SSE and WS). Example snippet on the server:

```ts
onNewUser: publicProcedure.subscription(() => {
  // Return a subscription that emits whenever a new user is created
});
```

Then on the client:

```ts
client.user.onNewUser.subscribe(undefined, {
  next(data) {
    console.log('New user:', data);
  },
});
```
