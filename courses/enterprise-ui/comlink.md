---
title: Comlink
description: >-
  A tiny library that turns postMessage-style communication into an RPC-like API
  built on ES6 Proxy—making Web Workers feel like normal function calls instead
  of message-passing ceremonies.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

[Comlink][1] is a tiny library that turns `postMessage`-style communication into an RPC-like API built on ES6 `Proxy`. Instead of manually serializing requests, wiring message IDs, and pairing responses to callbacks like some kind of ritual punishment, you `expose()` a value on one side and `wrap()` it on the other. The [Comlink docs][1] describe it exactly that way: an RPC implementation for `postMessage` and proxies, built to make Web Workers easier to use. It also depends on `Proxy`; browsers without native `Proxy` support need a polyfill.

The reason this exists is simple. The [Web Workers API][2] lets you run JavaScript off the main thread, which keeps the UI more responsive, but workers communicate through `postMessage`, where data is serialized with the structured clone algorithm. Workers also cannot directly manipulate the DOM, so the boundary between "UI work" and "background work" is real, not philosophical. Comlink does not remove that boundary. It just makes crossing it less miserable.

## What Problem Comlink Actually Solves

Raw worker code is fundamentally message passing. You send an object, the other side receives it, does something, and sends another object back. That works, but the minute you want a rich API surface, error propagation, callbacks, or several methods on one worker, you start hand-rolling a mini RPC protocol. Comlink replaces that boilerplate with a proxy so the worker API feels like a normal object or function from the caller's point of view. Under the hood it is still `postMessage`; it just stops making you live at that level all day.

The key phrase in the [docs][1] is "just like local values," but you should not take that too literally. Comlink makes remote values _feel_ local, not _be_ local. Every property read, method call, and returned value still crosses a thread boundary, and Comlink's API docs are explicit that proxy access and invocation are inherently asynchronous. If you are using a Comlink proxy, the working rule is still "put `await` in front of it."

## The Core Mental Model

Comlink has two verbs that matter most: `expose()` and `wrap()`. On the worker side, you expose a function or object. On the main-thread side, you wrap the worker endpoint and get back a proxy. That proxy mirrors the exposed API, but every interaction is async and promise-based, including property reads. If the worker throws, Comlink catches the exception on one side and re-throws it on the other.

A minimal example looks like this:

```js
// math.worker.js
import * as Comlink from 'comlink';

const api = {
  fib(n) {
    if (n < 2) return n;
    return api.fib(n - 1) + api.fib(n - 2);
  },
  version: '1.0.0',
};

Comlink.expose(api);
```

```js
// main.js
import * as Comlink from 'comlink';

const worker = new Worker(new URL('./math.worker.js', import.meta.url), {
  type: 'module',
});

const math = Comlink.wrap(worker);

console.log(await math.version);
console.log(await math.fib(40));
```

That is the Comlink story in one screen. Expose an object. Wrap the endpoint. `await` everything. The illusion is intentionally simple because the underlying mechanism is not.

## What Actually Crosses the Boundary

By default, Comlink sends function arguments, return values, and object-property values using structured cloning. The [Comlink README][1] says this directly, and MDN's [structured clone docs][3] explain what that means: it deep-copies many ordinary JavaScript values, handles cycles, and is the mechanism used for worker messaging. It is not a perfect clone of JavaScript semantics, though. Functions cannot be cloned, DOM nodes cannot be cloned, property descriptors and getters/setters are not preserved, and prototype chains are not faithfully reproduced. Plain data works best. Clever object graphs work until they don't.

That has an immediate design consequence: your worker API should usually speak in plain objects, arrays, typed arrays, maps, sets, strings, numbers, booleans, and ordinary errors, not in DOM types, class-heavy models, or custom instances whose behavior depends on prototype methods or accessors. Workers are great for computation, parsing, indexing, search, transforms, compression, and similar off-main-thread work. They are bad homes for DOM-coupled logic because workers do not get [direct DOM access][2] in the first place.

## `transfer()` Versus `proxy()`

Comlink gives you two important escape hatches: `Comlink.transfer()` and `Comlink.proxy()`. They solve very different problems, and mixing them up is how people end up either copying too much data or accidentally sharing the wrong abstraction. The [docs][1] present them together because they are both alternatives to the default structured-clone path.

Use `Comlink.transfer(value, transferables)` when the value is or contains transferable resources and you want ownership moved instead of copied. MDN's [transferable-object docs][4] explain the semantics precisely: after transfer, the original object is no longer usable in the sending context, and `ArrayBuffer` transfer can be a fast zero-copy operation. For large typed arrays or binary blobs, that difference is not cosmetic. It is the difference between "background work feels fine" and "we copied 64 MB twice because nobody was paying attention."

```js
const bytes = new Uint8Array(1024 * 1024 * 8);

await workerApi.processBuffer(Comlink.transfer(bytes, [bytes.buffer]));
```

Use `Comlink.proxy(value)` when you do _not_ want clone-or-transfer semantics at all and instead want Comlink to send a proxy for the value. The canonical use case is callbacks, because functions are not structured-cloneable and are not transferable. The Comlink [examples][1] use `proxy()` exactly this way.

```js
await workerApi.runJob(
  Comlink.proxy((progress) => {
    console.log('progress', progress);
  }),
);
```

That distinction is the important one. `transfer()` is for moving ownership of transferable data. `proxy()` is for sharing a callable or object through another remote boundary. One is about bytes. The other is about behavior.

## Transfer Handlers

Some values are neither cloneable nor transferable in the shape you want. `Event` is the classic example. The [Comlink docs][1] call out the common failure mode explicitly: you try to pass an event listener across the boundary, nothing obvious throws, and then the callback never fires because `Event` is not structured-cloneable or transferable. The library's answer is transfer handlers.

A **transfer handler** is a custom serializer/deserializer pair registered on both sides of the channel. Comlink sends each argument or return value through registered handlers; if one says it can handle the value, that handler becomes responsible for turning the value into cloneable data and reconstructing it on the other side. The docs show this with an `Event` handler that serializes a tiny subset of `event.target`. It does _not_ recreate a real DOM `Event`; it recreates only the data you chose to preserve. That is usually the right mindset. Treat transfer handlers as controlled adapters, not as excuses to smuggle entire live DOM-ish objects across a worker boundary.

## The Rest of the API That Matters

`Comlink.wrap(endpoint)` works with the "other end" of a `postMessage`-like endpoint. `Comlink.expose(value, endpoint?, allowedOrigins?)` exposes a value on an endpoint, and its optional `allowedOrigins` parameter lets you restrict which origins can access it when origin matters. Comlink defaults this permissively for the general case, which is fine for simple dedicated workers and less fine when you start talking to windows or frames. If an origin boundary exists, be deliberate. A wildcard is convenient right up until it isn't.

Every proxy also gets some extra capabilities. `[Comlink.releaseProxy]()` detaches the proxy and exposed object from the message channel so both ends can be garbage-collected. If the runtime supports `WeakRef`, Comlink can call this automatically when the wrapped proxy is GC'd, but when you know the lifetime is over, explicit release is still the clearer habit. `[Comlink.finalizer]` lets the exposed object run cleanup logic when the proxy is released. `[Comlink.createEndpoint]()` returns a new `MessagePort` attached to the same exposed object, which is useful when you need to hand another endpoint to another consumer without exposing the original worker directly.

## Shared Workers, Windows, Iframes, and Node

Comlink is not limited to the basic `new Worker()` case. The [README][1] documents SharedWorker support explicitly, but the rule changes slightly: you wrap `worker.port`, not the `SharedWorker` object itself, and you call `Comlink.expose()` inside `onconnect`, using the connection port from `event.ports[0]`. That is because SharedWorkers communicate through ports, not through the worker object directly.

Comlink also supports talking to windows and iframes through `Comlink.windowEndpoint(window, context = self, targetOrigin = "*")`. The [README][1] explains that windows and workers have slightly different `postMessage` behavior, so `windowEndpoint()` adapts a window into the shape Comlink expects. This is useful when the real boundary is `window.postMessage` rather than a worker. Just remember that once you are crossing window boundaries, `targetOrigin` and `allowedOrigins` stop being optional hygiene and start being actual security controls.

The [Comlink README][1] also says it works with Node's `worker_threads` module. So the abstraction is broader than "browser workers only." The real contract is "something `postMessage`-like on one side, something `postMessage`-like on the other, and both ends agree to the Comlink protocol."

## TypeScript

Comlink ships TypeScript types, and the important one is `Comlink.Remote<T>`. The [docs][1] say that if you `expose()` something of type `T`, the matching `wrap()` call gives you a `Comlink.Remote<T>`. The README also warns that this is best-effort typing and that some shapes are hard or impossible to represent perfectly in TypeScript, so you may occasionally need an assertion. That is a refreshingly honest thing for a type-heavy JavaScript library to admit.

A typical pattern is:

```ts
import * as Comlink from 'comlink';

type MathApi = {
  fib(n: number): number;
  processBuffer(data: Uint8Array): Promise<number>;
};

const worker = new Worker(new URL('./math.worker.ts', import.meta.url), {
  type: 'module',
});

const api = Comlink.wrap<MathApi>(worker);

const result = await api.fib(42);
```

The useful mental model is that `wrap<T>()` gives you a remote facade for `T`, not a local instance of `T`. The types help, but the async boundary is still real.

## Designing a Good Comlink API

The best Comlink APIs are coarse-grained and data-oriented. Because every property access and method call becomes async RPC over `postMessage`, a chatty design is a bad design. If you expose ten tiny getters and setters and call them in loops from the main thread, you have recreated distributed-systems latency inside one browser tab. The [Comlink docs][1] already tell you that every proxy access is asynchronous; the obvious design inference is to batch work into fewer, larger operations.

That means worker APIs should usually look like `analyze(document)`, `search(index, query)`, `transform(image)`, `parse(csvText)`, or `compress(blob)` rather than `getRow()`, `getCell()`, `setFoo()`, `setBar()`, `readOneFieldAtATime()`. Treat the worker like a service boundary, because for performance purposes, it is one. The fact that it lives in the same origin does not make round-trips free.

If large binary payloads are involved, prefer `transfer()` over plain cloning when ownership transfer is acceptable. If callbacks are involved, use `proxy()`. If the payload is weird or DOM-ish, map it into plain data or create a transfer handler. If the API needs synchronous semantics, it probably should not be a worker API in the first place.

## Common Mistakes

The first common mistake is forgetting that everything is async. A remote property access returning a simple number is still a promise. The [Comlink docs][1] say this directly, but people still write `const x = workerApi.counter` and then act offended when the universe returns a promise.

The second is trying to pass functions, DOM nodes, or raw browser events as if the [structured clone algorithm][3] were a magical deep-copy of all JavaScript reality. It is not. Functions and DOM nodes do not clone, and Comlink's own event-listener example is there because `Event` is a common failure case. Use `proxy()` for callbacks. Use transfer handlers or plain DTOs for weird types.

The third is copying large buffers when transfer was the right choice. If you are moving `ArrayBuffer`-backed data around at size, use [transfer semantics][4] and accept that the sender loses ownership. That is how the platform is designed to make worker communication efficient.

The fourth is exposing an object, keeping proxies alive forever, and never releasing them when the lifetime is actually over. Comlink has `releaseProxy` and `finalizer` for a reason. Use them when object lifetime is explicit.

## When Comlink Is the Wrong Tool

Comlink is the wrong tool when the work is trivial, infrequent, or tightly coupled to the DOM. [Workers][2] cannot manipulate the DOM directly, and every Comlink interaction is asynchronous over messaging, so if your code mostly tweaks UI state or needs synchronous, high-frequency object access, Comlink is solving the wrong problem. Raw local code will be simpler. Raw `postMessage` may even be simpler if the worker API surface is tiny enough.

It is also the wrong tool for hyper-chatty object models where the caller wants constant fine-grained reads and writes. Comlink makes worker boundaries pleasant, not free. If you need extremely frequent shared-memory-style coordination, you are in different territory entirely. The Web Workers API does have [`SharedArrayBuffer`][5], but that is a different model with its own security and determinism concerns, not something Comlink magically turns into a normal object graph.

## The Practical Bottom Line

Comlink is the cleanest way to make workers feel like normal APIs instead of message buses. Use `expose()` on one side and `wrap()` on the other. Assume everything is async. Let structured cloning handle ordinary data. Use `transfer()` for big transferable payloads. Use `proxy()` for callbacks. Reach for transfer handlers only when plain data is not enough. And design the worker API as a coarse-grained background service, not as a remote object you plan to poke fifty times per animation frame. That way lies disappointment, and JavaScript already provides plenty of that for free.

[1]: https://github.com/GoogleChromeLabs/comlink 'GoogleChromeLabs/comlink'
[2]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API 'Web Workers API | MDN'
[3]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm 'The structured clone algorithm | MDN'
[4]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects 'Transferable objects | MDN'
[5]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers 'Using Web Workers | MDN'
