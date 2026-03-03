---
title: BroadcastChannel for Cross-Boundary Communication
description: >-
  The BroadcastChannel API is a browser-native way to send messages across
  browsing contexts—tabs, iframes, workers, and Module Federation
  boundaries—without shared module singletons or framework-specific state.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

Most frontend state management assumes a single page with a single JavaScript context. React Context, Zustand, nanostores, Redux—they all live in one memory space, one component tree, one bundle. That assumption breaks in at least three common situations: when you open the same app in multiple tabs, when you compose an app from iframes or Module Federation remotes, and when you need to coordinate between the main thread and a Service Worker or Shared Worker.

[`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) is the browser's built-in answer to all three. It's a named message bus scoped to the origin, and any browsing context—tabs, iframes, workers, federation remotes—can post to it and listen on it without importing a single dependency.

## The API

The whole API fits on an index card. You create a channel by name, post structured messages, listen for them, and close when you're done.

### Creating a channel

```typescript
const channel = new BroadcastChannel('auth');
```

That's it. Any other code running on the same origin that creates `new BroadcastChannel('auth')` is now part of the same channel. There's no registration step, no handshake, no server. The browser manages the routing internally.

**Origin-scoped** means the channel is bound to the combination of scheme, host, and port. `https://example.com` and `http://example.com` are different origins. `localhost:3000` and `localhost:3001` are different origins. Code from one origin cannot listen on or post to another origin's channels. That scoping is a security boundary, not a configuration option.

### Posting messages

```typescript
channel.postMessage({
  type: 'AUTH_UPDATE',
  payload: { user: { name: 'Grace Hopper' }, isAuthenticated: true },
});
```

The argument to `postMessage` can be any value that survives the [structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)—objects, arrays, `Map`, `Set`, `Date`, `ArrayBuffer`, `Blob`, `File`, `RegExp`, nested combinations of all of those, and more. What it _can't_ clone: functions, DOM nodes, `Symbol`, `WeakMap`, `WeakSet`, and anything with a prototype chain the algorithm doesn't recognize. If your message contains something uncloneable, the post throws a `DataCloneError` synchronously.

One detail that surprises people: the sender does _not_ receive its own messages. Only other `BroadcastChannel` instances with the same name—in other contexts—get the `message` event. If you have two channels named `'auth'` in the same page, the second one receives messages posted by the first, and vice versa. But a single channel instance never echoes its own posts back to itself.

### Listening for messages

```typescript
channel.addEventListener('message', (event) => {
  console.log(event.data); // whatever was passed to postMessage
});
```

The `event` is a [`MessageEvent`](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent). The `data` property contains the cloned message. There's also `event.origin`, which is the origin of the posting context (always your own origin for `BroadcastChannel`, since cross-origin channels don't exist), and `event.source`, which is `null` for `BroadcastChannel` (unlike `window.postMessage`, which gives you a reference to the sender).

You can also use the `onmessage` property instead of `addEventListener`. Same behavior, but limited to one handler.

### Handling errors

```typescript
channel.addEventListener('messageerror', (event) => {
  console.error('Failed to deserialize message:', event);
});
```

The `messageerror` event fires when the browser receives a message but can't deserialize it. In practice this is rare with `BroadcastChannel` because both sides are on the same origin and usually running similar code, but it can happen if a Service Worker or Worker sends data using a transfer that the receiver can't reconstruct.

### Closing a channel

```typescript
channel.close();
```

After `close()`, the channel stops receiving messages and can't send them. It's not reusable—if you need the channel again, create a new instance. Always close channels in cleanup code (React's `useEffect` return, component teardown, worker shutdown) to avoid leaking listeners.

## What `BroadcastChannel` Is Not

`BroadcastChannel` is not a persistent store. It has no memory. There's no "current value" you can read when you subscribe—you only receive messages posted _after_ you start listening. If you create a channel and nobody has posted anything yet, you get nothing. If the sender posted five seconds ago and you just opened a new tab, you missed it.

It's also not cross-origin. Unlike `window.postMessage`, which can target specific windows across origins, `BroadcastChannel` is locked to the current origin. You can't use it to communicate between `app.example.com` and `api.example.com`.

And it's not ordered across contexts in any guaranteed way. Messages from a single sender arrive in order at a single receiver, but if multiple senders post simultaneously, receivers may see them in different orders. For most use cases—auth sync, theme changes, notifications—this doesn't matter. For anything that needs causal ordering, you'd need sequence numbers or timestamps in the message payload.

## Use Cases Beyond Federation

`BroadcastChannel` is useful anywhere you need lightweight, fire-and-forget coordination across browsing contexts. Here are the patterns that come up most often.

### Cross-tab session sync

The most common production use. When a user logs in on one tab, every other tab should reflect that immediately. When they log out, same thing. Without `BroadcastChannel`, tabs are islands—each one has to poll the server or wait for a page refresh to discover session changes.

```typescript
// On login
const sessionChannel = new BroadcastChannel('session');
sessionChannel.postMessage({ type: 'LOGIN', user: currentUser });

// On logout
sessionChannel.postMessage({ type: 'LOGOUT' });
```

Every other tab listens and updates its own UI accordingly. The user sees instant consistency across tabs without any server round-trips.

This also handles the awkward "logged out in one tab, still interacting in another" problem. A well-wired logout broadcast can redirect all tabs to the login page, clear local caches, and prevent stale-session API calls.

### Theme and preference propagation

If a user toggles dark mode in one tab, every other tab should switch too. Same for language, font size, reduced motion, or any other user preference that affects the UI globally.

```typescript
const prefsChannel = new BroadcastChannel('preferences');

// When user changes theme
prefsChannel.postMessage({ type: 'THEME_CHANGE', theme: 'dark' });
```

You'd typically pair this with `localStorage` so the preference persists across sessions, and use `BroadcastChannel` only to notify already-open tabs of the change. `localStorage` has its own `storage` event that fires cross-tab, but it only works for `localStorage` mutations—`BroadcastChannel` gives you a more general messaging pattern.

### Cache invalidation

When one tab fetches fresh data and writes it to `IndexedDB` or a local cache, other tabs are now stale. `BroadcastChannel` can notify them to refetch or read from the updated cache.

```typescript
const cacheChannel = new BroadcastChannel('cache-updates');

// After writing fresh data to IndexedDB
cacheChannel.postMessage({
  type: 'CACHE_INVALIDATED',
  keys: ['user-profile', 'notifications'],
});
```

This is the same pattern Service Workers use internally. The [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) doesn't have built-in change notifications, so `BroadcastChannel` fills that gap.

### Service Worker coordination

Service Workers can create `BroadcastChannel` instances, which means they can notify clients about push notifications, background sync completions, cache updates, or offline-to-online transitions. The alternative is `postMessage` through the `ServiceWorkerRegistration` API, which is more explicit but also more verbose and requires managing the client list.

```typescript
// In the Service Worker
const updateChannel = new BroadcastChannel('sw-updates');

self.addEventListener('push', (event) => {
  const data = event.data.json();
  updateChannel.postMessage({ type: 'PUSH_RECEIVED', notification: data });
});
```

```typescript
// In the main thread
const updateChannel = new BroadcastChannel('sw-updates');
updateChannel.addEventListener('message', (event) => {
  if (event.data.type === 'PUSH_RECEIVED') {
    showInAppNotification(event.data.notification);
  }
});
```

### Shared Worker fallback

[Shared Workers](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) can communicate with multiple tabs, but they require explicit port management and have weaker browser support than `BroadcastChannel`. For simple coordination—"tell all tabs about X"—`BroadcastChannel` is almost always the simpler choice. Shared Workers are the better tool when you need a persistent computation running across tabs (e.g., a shared WebSocket connection), but for pure messaging, `BroadcastChannel` wins on simplicity.

### Collaborative features

If you're building collaborative editing, live cursors, or shared selections across views of the same document open in multiple tabs, `BroadcastChannel` gives you instant local propagation before any server round-trip. The server-backed collaboration (WebSocket, SSE) handles cross-user sync, while `BroadcastChannel` handles same-user, multi-tab sync.

## Why This Matters for Module Federation

Now, back to the [runtime composition exercise](/courses/enterprise-ui/runtime-composition-exercise). We solved cross-boundary auth with [nanostores](/courses/enterprise-ui/nanostores) and singleton shared dependencies. That works, but it relies on Module Federation's singleton negotiation to guarantee both sides see the same store object. Three packages—`@pulse/shared`, `nanostores`, and `@nanostores/react`—all have to be declared as singleton shared dependencies. If any of those declarations are missing, the host and remote get separate atom instances and state never flows between them. The failure mode is silent: no errors, just "Not authenticated" forever.

`BroadcastChannel` sidesteps that entire problem. It doesn't care whether modules are shared or duplicated. It doesn't depend on Module Federation's runtime negotiation. Two completely independent builds, with zero shared dependencies between them, can still communicate over a named channel as long as they're on the same origin. That's a fundamentally different trust model.

The tradeoff is that `BroadcastChannel` is asynchronous and loosely coupled. With nanostores, the remote reads the current value synchronously on first render via `authStore.get()`. With `BroadcastChannel`, the remote has to wait for a message—so there's a timing gap between when the host sends and when the remote receives. If the remote renders before the host posts the auth update, it'll briefly show "Not authenticated" until the message arrives.

## The Pattern in Practice

The exercise repo already has a starting point in [`shared/src/auth.ts`](https://github.com/stevekinney/enterprise-ui-federation/blob/main/shared/src/auth.ts), which defines `AUTH_CHANNEL` and an `AuthEvent` interface. Here's how the full pattern works.

On the host side, you broadcast auth state whenever it changes:

```typescript
const authChannel = new BroadcastChannel('auth');

// After fetching user data
authChannel.postMessage({
  type: 'AUTH_UPDATE',
  payload: {
    user: data,
    isAuthenticated: true,
    token: 'mock-jwt-token-' + data.id,
  },
});
```

On the remote side, you listen for those messages and update local state:

```typescript
const [auth, setAuth] = useState({ user: null, isAuthenticated: false, token: null });

useEffect(() => {
  const channel = new BroadcastChannel('auth');

  channel.addEventListener('message', (event) => {
    if (event.data.type === 'AUTH_UPDATE') {
      setAuth(event.data.payload);
    }
  });

  return () => channel.close();
}, []);
```

Notice that the remote doesn't import anything from the host or from a shared singleton. The contract is just the channel name and the message shape. That makes `BroadcastChannel` especially useful when you can't guarantee singleton sharing—for example, when remotes are loaded from different origins or when you're composing applications that weren't built with Module Federation at all.

## The Initial State Problem

`BroadcastChannel`'s biggest gap for this use case is the lack of a "current value." When the remote subscribes, it doesn't get whatever was last posted—it only receives future messages. If the host already posted the auth update before the remote's `useEffect` ran, the remote missed it.

A common pattern for solving this is a request/response handshake:

```typescript
// Remote: request current auth state on mount
const channel = new BroadcastChannel('auth');
channel.postMessage({ type: 'AUTH_REQUEST' });

// Host: respond to requests
channel.addEventListener('message', (event) => {
  if (event.data.type === 'AUTH_REQUEST') {
    channel.postMessage({ type: 'AUTH_UPDATE', payload: currentAuthState });
  }
});
```

That adds complexity, but it also makes the contract explicit. You know exactly what messages flow, in what direction, and when.

Another approach is to pair `BroadcastChannel` with `localStorage`. Write the current auth state to `localStorage` on every update, and read it on mount as the initial value. Use `BroadcastChannel` only for real-time change notifications. This gives you the best of both worlds: a synchronous initial read and reactive cross-context updates.

```typescript
useEffect(() => {
  // Read initial state from localStorage
  const stored = localStorage.getItem('auth');
  if (stored) setAuth(JSON.parse(stored));

  // Listen for live updates via BroadcastChannel
  const channel = new BroadcastChannel('auth');
  channel.addEventListener('message', (event) => {
    if (event.data.type === 'AUTH_UPDATE') {
      setAuth(event.data.payload);
    }
  });

  return () => channel.close();
}, []);
```

## `BroadcastChannel` versus Nanostores

Both solve the cross-boundary communication problem, but with different tradeoffs.

**Nanostores** gives you synchronous reads, reactive subscriptions, and a familiar store-based mental model. The downside is the singleton dependency chain—if any link in that chain breaks, state silently stops flowing. It also only works within a single page. If you open the app in two tabs, each tab has its own nanostore instances.

**`BroadcastChannel`** gives you origin-scoped messaging that works across tabs, iframes, and independently bundled code without any shared dependencies. The downside is the async timing gap on initial load and the need to manage initial state yourself.

In practice, many teams use both. Nanostores for in-page reactivity, `BroadcastChannel` for cross-tab sync. That's not over-engineering. That's using each tool where it's actually strong.

## When to Reach for `BroadcastChannel`

Use `BroadcastChannel` when you need cross-boundary communication that doesn't depend on Module Federation's singleton machinery—or when you need cross-tab communication, which nanostores can't give you at all. It's also the right choice when the communicating parties might not share a build system. If you're composing an app from an iframe, a federated remote, and a Service Worker, `BroadcastChannel` is the one primitive that works across all three.

Use nanostores (or any shared-singleton store) when you want synchronous state access, reactive subscriptions with no timing gaps, and a simpler programming model. Just remember that the singleton requirement is load-bearing—if it breaks, everything looks fine except the part where state doesn't flow.

`BroadcastChannel` is one of those APIs that's been in browsers for years, has universal support, and still doesn't get the attention it deserves. Most teams reach for WebSocket or polling when they need cross-tab coordination, or lean on framework-specific state when they need cross-boundary communication. `BroadcastChannel` is the boring, zero-dependency answer that already works—and in frontend architecture, boring answers that already work are the ones you should start with.
