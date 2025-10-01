---
title: Realtime Typing Websockets And Sse
description: >-
  Design a real-time layer that stays type-safe across reconnects and protocol
  evolution—validate messages at the edge and keep UI state predictable.
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T18:37:15.729Z'
---

Design a real-time layer that stays type-safe across reconnects and protocol evolution—validate messages at the edge and keep UI state predictable.

## Message Schemas and Versioning

```ts
import { z } from 'zod';

const MessageV1 = z.discriminatedUnion('type', [
  z.object({ type: z.literal('welcome'), session: z.string() }),
  z.object({ type: z.literal('update'), id: z.string(), value: z.number() }),
]);

type Message = z.infer<typeof MessageV1>;
```

## WebSocket Client with Validation

```ts
const ws = new WebSocket('wss://example.com');
ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  const msg = MessageV1.parse(data);
  // Route by msg.type with exhaustiveness
};
```

## SSE and Backoff

- Use EventSource for low-overhead streams.
- Reconnect with exponential backoff and jitter.
- Buffer updates for React transitions.

## tRPC Subscriptions

Leverage tRPC’s subscription support to keep end‑to‑end types while pushing updates over WS.

## `useWebSocket` Hook with Typed Messages

```ts
type OnMessage<M> = (msg: M) => void;

function useWebSocket<M extends object>(
  url: string,
  schema: z.ZodSchema<M>,
  onMessage: OnMessage<M>,
) {
  useEffect(() => {
    let stop = false;
    let retry = 0;
    let ws: WebSocket | null = null;

    const connect = () => {
      ws = new WebSocket(url);
      ws.onopen = () => (retry = 0);
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        const parsed = schema.safeParse(data);
        if (parsed.success) onMessage(parsed.data);
      };
      ws.onclose = () => {
        if (stop) return;
        retry++;
        const delay = Math.min(30_000, 500 * 2 ** retry) + Math.random() * 250;
        setTimeout(connect, delay);
      };
    };
    connect();
    return () => {
      stop = true;
      ws?.close();
    };
  }, [url, schema, onMessage]);
}
```

## Schema Evolution Strategy

- Keep old variants in the union and handle gracefully; introduce new fields as optional.
- Add `version` field and branch by version for breaking changes.

```ts
const MessageV2 = z.discriminatedUnion('type', [
  ...MessageV1.options,
  z.object({ type: z.literal('goodbye'), reason: z.string().optional() }),
]);
```

## React 19 Transitions for Burst Updates

```tsx
function LiveView() {
  const [items, setItems] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  useWebSocket('wss://example', MessageV1, (msg) => {
    startTransition(() => {
      if (msg.type === 'update') setItems((prev) => [...prev, msg]);
    });
  });

  return <List pending={isPending} items={items} />;
}
```

