---
title: Nanostores
description: >-
  A tiny, framework-agnostic reactive state library that works across React,
  Vue, Svelte, Angular, and vanilla JS—which makes it unusually useful for
  cross-boundary state in microfrontend architectures.
modified: 2026-03-17
date: 2026-03-01
---

[Nanostores](https://github.com/nanostores/nanostores) is a state management library that's small enough to almost not exist. The core package is under 1 KB. It has no framework dependency, no provider components, no context wrappers, no boilerplate setup. You create a store, read from it, write to it, and subscribe to changes. That's the entire programming model.

That simplicity is the whole point. In a world where your frontend might be React in one place, Vue in another, and a vanilla Web Component in a third—or where Module Federation remotes need to share state across separate builds—a state library that _doesn't_ care about your framework is genuinely valuable. Nanostores doesn't care. It's plain JavaScript objects with a subscription mechanism, and everything else is a thin binding that adapts those subscriptions to whatever framework you're using.

## The Core Primitives

Nanostores has four main store types. Each one is a reactive container with `.get()`, `.set()` (or `.setKey()`), `.subscribe()`, and `.listen()`. The differences are in what they hold and how they notify subscribers.

### `atom`

An **atom** holds a single value. Any value—a string, a number, a boolean, an object, `null`. Calling `.set()` replaces the value and notifies all subscribers.

```typescript
import { atom } from 'nanostores';

const counter = atom(0);

counter.get(); // 0
counter.set(1); // notifies subscribers
counter.get(); // 1
```

Atoms are the right choice for simple, single-value state: a user object, an auth token, a theme preference, a loading flag. If you're reaching for `useState` in React but need the value to be shared across components without prop-drilling or context, an atom is the nanostores equivalent.

Subscribing to an atom:

```typescript
const unsubscribe = counter.subscribe((value) => {
  console.log('Counter is now:', value);
});

// Later
unsubscribe();
```

`.subscribe()` calls the callback immediately with the current value, then again on every change. `.listen()` is the same but skips the initial call—it only fires on changes. That distinction matters when you're wiring up UI that needs the current value on mount versus side effects that should only run on updates.

### `map`

A **map** holds a key-value object and lets you update individual keys without replacing the whole object.

```typescript
import { map } from 'nanostores';

const profile = map({
  name: 'Grace Hopper',
  role: 'admin',
  theme: 'dark',
});

profile.get(); // { name: 'Grace Hopper', role: 'admin', theme: 'dark' }
profile.setKey('theme', 'light'); // notifies subscribers, only 'theme' changed
```

`.setKey()` is the important part. If you used an atom holding an object, every `.set()` would replace the entire object and notify subscribers regardless of which key changed. A map is smarter—it tracks key-level changes and can notify subscribers about which key was modified. Framework bindings can use this to avoid unnecessary re-renders.

Maps are the right choice for structured state with independently updatable fields: user profiles, form state, settings objects, feature flags.

### `deepMap`

A **deep map** extends map with support for nested paths.

```typescript
import { deepMap } from 'nanostores';

const settings = deepMap({
  notifications: {
    email: true,
    push: false,
  },
  display: {
    fontSize: 14,
  },
});

settings.setKey('notifications.push', true);
settings.get().notifications.push; // true
```

Deep maps use dot-notation paths for nested updates. They're useful for deeply structured state where you want to update a leaf without replacing the entire tree. That said, if your state is deeply nested enough to need `deepMap`, consider whether the nesting is the real problem. Flat atoms or multiple maps are often clearer.

### `computed`

A **computed** store derives its value from one or more other stores. It recalculates when any dependency changes.

```typescript
import { atom, computed } from 'nanostores';

const firstName = atom('Grace');
const lastName = atom('Hopper');

const fullName = computed([firstName, lastName], (first, last) => {
  return `${first} ${last}`;
});

fullName.get(); // 'Grace Hopper'

firstName.set('Ada');
fullName.get(); // 'Ada Hopper'
```

Computed stores are read-only—you can't call `.set()` on them. They update automatically when their inputs change. This is the nanostores equivalent of derived state, selectors, or memoized computations in other libraries.

You can depend on any combination of atoms, maps, and other computed stores. The dependency graph is resolved lazily—a computed store only recalculates when someone is actively subscribed to it. If nobody is listening, it skips the work.

## How Stores Work Under the Hood

An atom is a remarkably small data structure. If you strip away the edge-case handling and lifecycle hooks, the entire implementation is a value, a `Set` of listener functions, and a few methods that read, write, and notify. Something roughly like this:

```typescript
function atom(initialValue) {
  let value = initialValue;
  const listeners = new Set();

  return {
    get() {
      return value;
    },
    set(newValue) {
      value = newValue;
      for (const fn of listeners) fn(value);
    },
    subscribe(fn) {
      listeners.add(fn);
      fn(value); // call immediately with current value
      return () => listeners.delete(fn);
    },
    listen(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
```

That's the whole idea. `.set()` replaces the value and iterates through the listener set. `.subscribe()` adds a callback, calls it immediately with the current value, and returns a function that removes it. `.listen()` is identical but skips the initial call. The real nanostores implementation adds lifecycle hooks, batching, and some safety checks, but the shape above is the essential machinery you're working with.

Computed stores are atoms that subscribe to other stores. When any dependency fires, the computed store recalculates its value and—if it actually changed—notifies its own subscribers.

```typescript
function computed(dependencies, derive) {
  const store = atom(derive(...dependencies.map((d) => d.get())));

  for (const dep of dependencies) {
    dep.listen(() => {
      store.set(derive(...dependencies.map((d) => d.get())));
    });
  }

  return { get: store.get, subscribe: store.subscribe, listen: store.listen };
}
```

The real implementation is lazier than this—a computed store only subscribes to its dependencies when someone subscribes to _it_. If nobody is listening to the computed store, the dependency subscriptions don't exist, and no recalculation happens. That lazy evaluation is what makes it safe to define a lot of computed stores without worrying about wasted work.

Maps use the same listener set, but `.setKey()` includes information about _which_ key changed when it notifies subscribers. That's what lets framework bindings like `@nanostores/react` skip re-renders for components that only depend on one key of a map. An atom holding an object would fire on every `.set()` regardless of what changed—a map is smarter because it gives subscribers enough information to decide whether they care.

The subscriber count is also what drives the lifecycle model covered in the next section. When the listener set goes from empty to non-empty, `onMount` fires. When the last listener unsubscribes and the set empties again, the cleanup function runs. The entire lifecycle system is just a counter on a `Set`.

Now that you can see the machinery is just callbacks in a set, the framework bindings start to look almost trivially simple—because they are.

## Framework Bindings

Nanostores itself is pure JavaScript. The framework bindings are separate packages that turn store subscriptions into idiomatic reactive state for each framework.

### React

```typescript
import { useStore } from '@nanostores/react';
import { counter } from './stores';

function Counter() {
  const count = useStore(counter);
  return <button onClick={() => counter.set(count + 1)}>{count}</button>;
}
```

`useStore` subscribes to the store on mount, unsubscribes on unmount, and re-renders the component on every change. It returns the current value. That's it—no provider, no context, no `useSelector`. The store is imported directly, and the hook handles the subscription lifecycle.

### Vue

```typescript
import { useStore } from '@nanostores/vue';
import { counter } from './stores';

const count = useStore(counter);
```

Same pattern, different framework. `useStore` returns a Vue `ref` that tracks the store's value.

### Svelte

Svelte is the easiest case because Svelte's reactive `$` syntax works with any object that has a `.subscribe()` method—which nanostores already provides. No binding package needed.

```svelte
<script>
  import { counter } from './stores';
</script>

<button on:click={() => counter.set($counter + 1)}>
  {$counter}
</button>
```

The `$counter` syntax auto-subscribes and auto-unsubscribes. Nanostores was designed with this compatibility in mind—the `.subscribe()` contract matches Svelte's store contract exactly.

### Angular

```typescript
import { NanostoresService } from '@nicobachner/nanostores-angular';
import { counter } from './stores';

@Component({
  template: `<button (click)="increment()">{{ count$ | async }}</button>`,
})
export class CounterComponent {
  count$ = this.nanostores.useStore(counter);
  constructor(private nanostores: NanostoresService) {}

  increment() {
    counter.set(counter.get() + 1);
  }
}
```

The Angular binding returns an Observable, which means it works with the `async` pipe and Angular's change detection. The community-maintained binding is less official than the React and Vue ones, but the pattern is the same.

### Vanilla JavaScript

No binding needed. Just subscribe directly.

```typescript
import { counter } from './stores';

const display = document.getElementById('count');

counter.subscribe((value) => {
  display.textContent = String(value);
});
```

This is useful for Web Components, legacy jQuery code, or any context where a framework binding doesn't exist. The store doesn't know or care what's consuming it.

## Why Framework-Agnostic Matters

Most state libraries are married to a framework. Redux assumes React (or at least a React-like subscription model). Pinia assumes Vue. Svelte stores assume Svelte's `$` syntax. That's fine when your entire app is one framework, but it becomes a real problem in three situations.

**Microfrontends with mixed frameworks.** If the host shell is React and one remote is Vue, any React-specific state library is useless for cross-boundary communication. Nanostores works in both because the core is plain JavaScript and each side uses its own framework binding.

**Incremental migrations.** If you're strangler-figging a legacy app from one framework to another, shared state between the old and new code is a real problem. A framework-agnostic store lets both sides read and write the same state during the migration, without maintaining two parallel state systems.

**Web Components and custom elements.** Web Components don't have a framework. They're just classes that extend `HTMLElement`. A framework-agnostic store is the only state management option that works inside a Web Component _and_ in the framework components that consume it.

Nanostores is not the only framework-agnostic option—you could use a plain `EventTarget`, an RxJS `BehaviorSubject`, or even a shared JavaScript object with manual subscriptions. But nanostores gives you a clean API, computed stores, key-level change tracking, and maintained framework bindings in a package so small it barely registers in your bundle.

## Lifecycle and Memory

Nanostores has a concept called **lifecycle events** that controls when stores start and stop doing expensive work. A store's `onMount` callback runs when the first subscriber appears, and the cleanup function runs when the last subscriber disappears.

```typescript
import { atom, onMount } from 'nanostores';

const currentTime = atom<string>('');

onMount(currentTime, () => {
  const interval = setInterval(() => {
    currentTime.set(new Date().toISOString());
  }, 1000);

  return () => clearInterval(interval);
});
```

The timer only runs while something is actually subscribed to `currentTime`. If every component that uses it unmounts, the timer stops. When a new subscriber appears, it starts again. This is the nanostores equivalent of lazy initialization—the store's expensive side effects only run when someone is listening.

This lifecycle model is particularly useful for stores that fetch data, open WebSocket connections, or set up polling. The work starts on first subscribe and cleans up on last unsubscribe, which prevents resource leaks without requiring manual lifecycle management.

## Nanostores in a Federation Context

This is where nanostores earns its place in an enterprise UI course. In the [runtime composition exercise](/courses/enterprise-ui/runtime-composition-exercise), we used nanostores to solve a problem that React Context couldn't: sharing auth state between a host shell and a federated remote.

The reason it works is that nanostores stores are plain JavaScript objects. An `atom` created by `atom(initialValue)` is just an object with `.get()`, `.set()`, and `.subscribe()`. It doesn't depend on React's reconciler, Vue's reactivity system, or any framework internals. If two pieces of code—regardless of how they were built or bundled—have a reference to the same atom object, they can read and write shared state through it.

The catch is the word "same." In a Module Federation setup, "same" means the module that creates the atom must be a singleton shared dependency. If `@pulse/shared` creates the atom and both the host and remote import from `@pulse/shared`, the federation runtime needs to ensure both sides get the _same module instance_. That's what `singleton: true` in the shared config does. Without it, each side evaluates the module independently, creates its own atom, and the two atoms are unrelated objects that happen to have the same initial value.

```typescript
// shared/src/auth-store.ts
import { atom } from 'nanostores';

export const authStore = atom({
  user: null,
  isAuthenticated: false,
  token: null,
});
```

```typescript
// host writes
import { authStore } from '@pulse/shared';
authStore.set({ user: data, isAuthenticated: true, token: 'jwt-...' });

// remote reads
import { useStore } from '@nanostores/react';
import { authStore } from '@pulse/shared';

const auth = useStore(authStore);
```

Both `nanostores` and `@nanostores/react` also need to be singletons. If the store library itself is duplicated, the subscription mechanism in one copy is invisible to the other. All three packages—the shared package, nanostores, and the framework binding—form a singleton chain. Break any link and state stops flowing, silently.

For cross-boundary communication that doesn't depend on singleton shared modules, [`BroadcastChannel`](/courses/enterprise-ui/broadcast-channel) is the alternative. It trades synchronous reads and reactive subscriptions for origin-scoped messaging that works regardless of how modules are bundled. Many teams use both: nanostores for in-page reactivity, `BroadcastChannel` for cross-tab sync.

## Nanostores versus the Alternatives

| Alternative            | Framework coupling | Bundle size  | Cross-boundary use | Key tradeoff                                     |
| ---------------------- | ------------------ | ------------ | ------------------ | ------------------------------------------------ |
| Nanostores             | None               | ~1 KB        | Excellent          | No middleware, devtools, or opinionated patterns |
| Redux / Zustand        | React-first        | Medium–large | Poor               | Rich ecosystem but framework-locked              |
| Jotai / Recoil         | React-only         | Small–medium | Poor               | Suspense integration but no cross-framework use  |
| RxJS `BehaviorSubject` | None               | Large (RxJS) | Good               | Full reactive toolkit but heavy for simple state |
| Plain `EventTarget`    | None               | Zero         | Good               | No computed stores, no framework bindings, DIY   |

**Versus Redux/Zustand**: Both are React-first. Redux has middleware, time-travel debugging, and a massive ecosystem. Zustand is smaller and simpler but still React-specific. Nanostores is dramatically smaller than both and works across frameworks, but it doesn't have middleware, devtools, or the opinionated patterns (actions, reducers, slices) that Redux provides. If you need those patterns, nanostores is not a replacement. If you need cross-framework portability, Redux and Zustand can't provide it.

**Versus Jotai/Recoil**: Jotai's atoms are conceptually similar to nanostores atoms, but Jotai is deeply integrated with React's concurrent features and Suspense. Nanostores atoms are simpler—no React-specific behavior, no Suspense integration, no provider required. Jotai is the better choice for complex React-specific derived state. Nanostores is the better choice when the consumer might not be React.

**Versus RxJS `BehaviorSubject`**: A `BehaviorSubject` is functionally similar to a nanostores atom—it holds a current value and notifies subscribers on change. RxJS gives you operators, pipelines, and the full reactive programming toolkit. Nanostores gives you a much simpler API with a much smaller bundle. If you're already using RxJS, a `BehaviorSubject` works fine as cross-boundary state. If you're not, adding RxJS just for state management is a lot of machinery.

**Versus plain `EventTarget`**: You can build the same subscription pattern with `new EventTarget()` and `CustomEvent`. It works, and it has zero dependencies. The downside is that you're reimplementing `.get()`, `.set()`, computed stores, key-level change tracking, and framework bindings yourself. Nanostores is the "someone already did that correctly" version.

## When Nanostores Is the Right Call

Use nanostores when you need reactive state that's shared across framework boundaries, Module Federation boundaries, or migration boundaries. Use it when the state is simple enough that Redux's patterns would be overhead. Use it when bundle size matters and you can't justify a larger state library for a few shared values.

Don't use nanostores when you need middleware, devtools, time-travel debugging, or the structural patterns that Redux or Zustand provide. Don't use it as a wholesale replacement for framework-native state management in a single-framework app—React's `useState` and `useReducer` are perfectly fine for component-local state, and adding a library for that is just adding a library.

The sweet spot is shared, cross-boundary, framework-agnostic state in architectures where the assumption of "one framework, one bundle, one memory space" doesn't hold. That's exactly the situation Module Federation creates—and it's why nanostores keeps showing up in microfrontend conversations.
