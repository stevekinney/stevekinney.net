---
title: React Performance
description: >-
  Master React performance optimization from fundamentals to advanced techniques
  with React 19
layout: page
date: 2025-09-07T18:00:00.000Z
modified: '2025-09-22T09:27:10-06:00'
---

These are my notes for [my React Performance workshop](https://frontendmasters.com/workshops/react-performance-v2/) for [Frontend Masters](https://frontendmasters.com).

## Important Things

- [Practice Lab Repository](https://github.com/stevekinney/react-performance)
- [React Developer Tools](https://chromewebstore.google.com/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi?hl=en)

## High-Level Notes

### Performance Monitoring

**Rule #1**: Do _not_ measure the development build of your application.

Alias the following in your production build:

- `react-dom$` &rarr; `react-dom/profiling`
- `scheduler/tracing` &rarr; `scheduler/tracing-profiling`

**Rule #2**: At least pretend you're not using a very fast MacBook Pro on fiber internet.

### Web Vitals

- **Largest Contentful Paint (LCP)**: This is a measure of loading performance. It marks the point when the largest image or text block visible within the viewport is rendered. Aim for 2.5 seconds fro, then the page starts loading.
- **Interaction to Next Paint (INP)**: Measures the latency of all click, tap, and keyboard interactions on the page and reports a single value. Aim for less than 200 milliseconds.
- **Cummulative Layout Shift (CLS)**: Measures the visual stability of the page. It attempts to quantify how much unexpected layout shift occurs during the entire lifespan of the page. A goodl CLS score is less than 0.1.

#### Optimizing LCP

- LCP measures how long it takes the browser to render that big ball of JavaScript into a representation of you application on the DOM. So cheat: Render the markup on the server and it doesn't count.
- Optimize your assets. Maybe you don't need a 16mb image? How about your try a modern image format? You can also use hints like `<link rel="preload">` to just try to do it before hand so that no one notices.
- Split up your code: Do you _need_ to send them _everything_ all at once?

#### Optimizing INP

- Don't be selfish. Break up long tasks and let everyone else have a chance to slide their work in.
- Memoize stuff so that things don't need to change don't waste precious time trying to figure that out on their own.
- Debounce and throttle. Wait until the user finishes their thought before you start doing a bunch of work. It turns out that fingers have latency.
- Web Workers: Go do your expensive stuff somewhere else.

#### Optiming CLS

- Don't wait for the image to load to figure out its size.
- Choose fonts that are metrically as similar as possible to a web font. (I know. I too have worked with designers.)
- Reserve space for API responses so that the content doesn't push stuff around when it loads. Skeleton loaders are your friends.

### Anatomy of a Re-Render

Components basically re-render for one of three reasons:

1. Its state changed.
2. Its parent rendered.
3. The Context changed.

We'll talk about memoization in a bit. In that case, we can swap out the second reason with "its props changed." We'll also talk about how the React Compiler helps out in this regard. But, let's tackle one thing at a time.

Regadless of _why_ a component re-rendered, we can definitely classify renders into one of two buckets: necessary and unnecessary. Unnecessary renders are tricky because usually any given render isn't going to a problem, it's the accumulation of them over time.

### React Fiber

**Back in my day**: Rendering was entirely synchronous and uninterruptible. The previous version used the JavaScript call-stack to work its way down the component tree. In Fiber, React manages it's own call-stack-like abstraction.

> In the pre-Fiber days (React 15 and earlier), the "virtual DOM" was essentially a tree of lightweight objects that mirrored the real DOM. Every render, React would build a fresh tree from your JSX, diff it against the previous one, and then compute a patch to apply to the actual DOM. That whole process was synchronous and uninterruptible: once React started walking the tree, it had to finish before the browser could do anything else.

React Fiber is a cooperatively-scheduled rendering engine.

Effectively, we're not necessarily reducing the time it takes to render the UI, we're just trying to be a bit smarter about it.

The TL;DR here is that we're basically introducing this idea of priority as opposed to simply, dealing with requests in the order that they were received.

It's basically a bunch of plain functions, a linked-list tree, and a small scheduler in a trench coat.

The key feature is that it can stop what it's doing and throw away an in-progress render whenever it feels like it.

Basically, if something _more important_ than what it's currently doing comes along, it can turn it's focus to the more important stuff and either put the less important stuff on pause or toss it out for now and start over later.

A **Fiber** is a lightweight node that describes the work that needs to be done for a component: its props, state, pending updates, and pointers to its parent, children, and siblings.

There are always two trees:

1. The **Current** tree: What the DOM (or whatever) currently reflects.
2. The **Work in Progress** tree: The draft that's being prepared.

React does it's work on the WIP tree and if something more important comes along, it can just toss that tree—or parts of it—an starts a new pass with the higher-priority updates that come along.

Fiber didn't eliminate the virtual DOM—it just re-architected it. Each node in the tree is now a Fiber object, which is more than a virtual DOM element description:

- It holds the component type, props, and pending state.
- It has pointers to its parent, child, and sibling, forming a linked list tree.
- It carries bookkeeping info for scheduling (lanes/priority, expiration time).
- It stores effects that need to be committed (DOM mutations, callbacks).

When people say "React doesn't use the virtual DOM anymore," they usually mean: React Fiber isn't just the old naive "diff two trees of JSON" approach. But the underlying idea—a programmatic tree representation of the UI that React reconciles against the real DOM—absolutely still exists. Fiber just made that representation smart, persistent, and cooperative with the browser's event loop.

#### The Render Loop

In the Render Phase™, we process one Fiber at a time.

1. Take the next Fiber.
2. Run `beginWork(fiber, renderLanes)`. Basically, call the component function, derive the children.
3. If there are children, descend. If not, bubble up via `completeWork` to finalize the node, update the DOM, and collect any effects.
4. But, along the way—ask "Should I yield?" If yes, pause for a moment and let the browser have the wheel back for a second.
5. Pick up where you left off.

There a bunch of different lanes, but for our purposes, we're going to break this up into two categories:

- **Urgent Updates**: User input and stuff like that.
- **Transition Updates**: Stuff explicitly marked as non-urgent by _you_.

There are also stuff that React deems as even less urgent, but there isn't officially blessed way for you to tap into those things.

#### Commit

Once we've finished with our render, commit the changes to the DOM.

1. Before mutation phase (a.k.a. snapshot phase)
   - React calls any lifecycle methods or hooks that need to read the DOM before React mutates it.
   - Example: getSnapshotBeforeUpdate.
   - No DOM writes yet, just reads.

2. Mutation phase
   - React applies all the changes it decided on during the render phase.
   - Creates, updates, or deletes DOM nodes.
   - Runs ref cleanup (ref = null) for removed nodes.
   - Runs passive effect cleanups scheduled for this commit (from the previous render).

3. Layout phase (a.k.a. layout effects)
   - Now React calls useLayoutEffect callbacks (and class componentDidMount / componentDidUpdate).
   - These run after the DOM mutations but before the browser paints.
   - Perfect for measuring DOM layout or adjusting scroll positions.

4. Passive effect phase
   - After the browser has painted, React schedules useEffect callbacks.
   - These run asynchronously, so they don't block the paint.
   - Great for data fetching, subscriptions, logging, timers, etc.

#### Tasting Notes

#### Yielding Mechanics

Yielding is powered by the [`scheduler`](https://www.npmjs.com/package/scheduler) package.

- Schedule work: `unstable_scheduleCallback(priority, cb)`
- Decide whether or yield: `unstable_shouldYield()`

Here is overly simple version of how this could work:

```ts
import {
  unstable_scheduleCallback as scheduleCallback,
  unstable_NormalPriority as NormalPriority,
  unstable_shouldYield as shouldYield,
} from 'scheduler';

function workLoop(root: FiberRoot) {
  let next: Fiber | null = root.workInProgress;
  while (next) {
    next = performUnitOfWork(next);
    if (shouldYield()) {
      // Pause: reschedule continuation
      scheduleCallback(NormalPriority, () => workLoop(root));
      return; // Cooperative yield to browser
    }
  }
  commitRoot(root); // Synchronous commit
}

function performUnitOfWork(fiber: Fiber): Fiber | null {
  const child = beginWork(fiber);
  if (child) return child;
  let node: Fiber | null = fiber;
  while (node) {
    completeWork(node);
    if (node.sibling) return node.sibling;
    node = node.return;
  }
  return null;
}
```

##### When should it yield?

- Every so often. Approximately after 5ms.
- Are there any higher priority tasks waiting?

The scheduler will try to yield before the browser needs to paint. (60fps is about every 16.6ms). This means that React gets out of the way every time the UI needs to update for:

- Paint and layout operations.
- User input handling.
- Other browser stuff.

#### Understanding Lanes

Okay, let's imagine we have a search input and we type in "cat" as the beginning of our query.

_Each_ keypress would enqueue and urgent state update on discrete input lanes—and React would treat of of these as high-priority.

By deferring the work, we can let the user finish typing without immediately taking every keystroke as the highest priority thing that they've ever done.

When it gets a chance, it will pick up the work. Along the way, if the search query changes in this low priority lane—then React can yield over to that update and toss out what it's currently working on. New stuff has come to light.

Once all of the higher-priority lanes are clear. React finishes up the lower priority work and then gets ready to commit the changes to the DOM.

#### Cancellation and Restart

The various things that React needs to do are put into **lanes**.

Basically, if something comes in at a higher priority lane, then React goes ahead and turns it attention to that instead of chugging along with whatever it was doing.

The higher priority stuff goes to the top of the list.

If that other stuff didn't invalidate anything, then pick up where we left off.

If it _did_ invalidate the current work—then start over from the top.

#### Lanes and Priorities

**Lanes** are React's internal system for managing it's priorities.

It uses bitmasks because binary stuff is fast. This means that React isn't doing a bunch of expensive work trying to compare all of the priorities.

```ts
const SyncLane = 0b0000000000000000000000000000001; // Bit 1
const InputContinuousLane = 0b0000000000000000000000000000100; // Bit 3
const DefaultLane = 0b0000000000000000000000000010000; // Bit 5
const TransitionLane1 = 0b0000000000000000000000001000000; // Bit 7
```

Here is a hand-wavy look at the priorities:

- `SyncLane`: Immediate, blocking updates with (e.g. `flushSync`)
- User actions (`InputContinuousLane`): Clicks, keypresses, dragging, scrolling.
- `DefaultLane`: The normal course of business.
- `TransitionLanes`: Stuff explicitly put into a lower priority lane.
- `RetryLanes`: Failed stuff that we're waiting to retry.
- `IdleLane`: The lowest priority work.

```ts
// This gets assigned DefaultLane
setState(newValue);

// This gets assigned TransitionLane
startTransition(() => {
  setState(newValue);
});
```

When a update is trigger, React:

- Assigns the update to the appropriate lane.
- Groups updates in the same lanes together.
- Processes the lanes from the highest priority to the lowest.

And then, if something comes in later on in a higher priority lane, we can go switch over and handle that before picking up where we left off.

##### Lane Groups

React actually uses _groups of lanes_ for some priorities. For example there are _multiple_ transition lanes that can run simultaneously without interfering with one another.

##### The Idle Lane

What kind of stuff happens in the `IdleLane`? Conceptually, it's like `requestIdleCallback`.

Right now, it's pretty much just for React's internal/experimental APIs.

The primary case is any kind of offscreen content that's not current visibile.

Any kind of prefetching or pre-rendering. Stuff that might be needed in the future is obviously not as important as stuff happening _right now_.

Background effects: Analytics, telemetry, cache cleanup, background data synchronization.

#### Committing Work

Commits are never interrupted. We have a full tree of what the DOM should look like. Let's go make it look like that.

That's because we're actively changing the DOM at this point and stopping in the middle could leave us in an inconsistent state.

This means that we'll never end up with a partially-rendered UI.

### On Memoization

We have three main ways to memoize stuff in React:

1. `React.memo()` is a higher-order component that prevents a component from re-rendering if it's props have not changed.
2. `useMemo()` is a hook that memoizes the _result_ or an expensive calculation.
3. `useCallback()` is a hook that memoizes a function definition, preventing child components that receiving it as a prop from re-rendering.

#### React.memo

A higher-order component that wraps your component. This basically says, "I don't care if you parent has changed, let me look at your props. If their the same, I'm going to skip calling you and just return whatever the result was the last time you were called with these props.

1. React checks if the old and new props objects have the same number of keys.
2. It then iterates over each key in the props object and compares the previous value with the current value using the `Object.is` comparison algorithm.

- **Justification**: Use `React.memo` when the `React Profiler` shows that a component is re-rendering frequently, but the "Why did this render?" feature indicates the cause was its parent re-rendering, not a change in its own props or state. It is most effective on components that are expensive to render and are often rendered with the same props.
- **Contraindication**: Do not wrap simple components that render quickly or components whose props are almost always different on every render. The cost of the prop comparison can outweigh the benefit of skipping the render.

#### useMemo

`useMemo()` is a React hook that is desgined to memoize the _return value_ of the function. If _any_ dependency has changed, then it will run that function again. Otherwise, it will just return the cached value.

The primary use case is expensive calculations. But, it's also used for referrential stability.

- **Justification**: There are two primary, data-driven justifications for using `useMemo`:
  - **Memoizing Expensive Computations**: When the Chrome Performance tab's "Bottom-Up" view identifies a pure, computationally heavy function within a component that runs on every render, `useMemo` can be used to cache its result. This prevents the expensive calculation from being re-executed unless its inputs change.
  - **Preserving Referential Equality**: Similar to useCallback, `useMemo` should be used to memoize non-primitive values (objects or arrays) that are created during render and passed as props to memoized child components. Without `useMemo`, a new object or array reference is created on every render, breaking the shallow prop comparison in the child.
- **Contraindication**: Do not wrap simple calculations or object/array creations in `useMemo` unless they are being passed to a memoized component. The overhead is not justified.

#### useCallback

`useCallback()` is a React Hook that is syntactically and conceptually very similar to useMemo, but with one crucial difference: it memoizes a function definition itself, _not_ its return value.

It's _primary_ use case is for referential stability in callbacks.

- **Justification**: The primary use case for `useCallback` is to preserve referential equality for functions passed as props to memoized child components (i.e., components wrapped in `React.memo`). Without `useCallback`, a new function instance is created on every render of the parent component. This new reference will cause the shallow prop comparison in the memoized child to fail, defeating the purpose of `React.memo`.
- **Contraindication**: Do not use `useCallback` for functions that are not passed as props to memoized children or are not used in a dependency array. It adds unnecessary complexity and memory overhead.

### React Compiler

React Compiler is a sophisticated Babel plugin that tries to apply most of the best practices on your behalf—so that you don't need to worry about all of this craziness.

The compiler tries to drastically reduce the amount of work that the scheduler needs to consider in the first place. If everything that we said about memoization is allegedly a good thing, then having something that does it consistently is going to probably just get you better results.

**Important Tasting Note**: The React Compiler optimizes safety over everything else. If it thinks that optimizing something is risky—it _won't_.

#### In Relation to Memoization

With the React Compiler in place—we can get rid of a lot of the manual work, but it doesn't completely erase the need to for `React.memo`, `useMemo`, and `useCallback`. (Sorry.)

##### When you still need React.memo

- **Impure components**: If your component has non-pure behavior (like reading from global state, using randomness, or depending on mutable objects outside props), the compiler can't safely assume purity. `React.memo` is your explicit guarantee to React that it's safe to skip re-rendering when props are shallow-equal.
- **3rd-party interoperability**: For components from external libraries that weren't compiled with the React compiler, `React.memo` is still a tool to control their render frequency.
- **Boundary control**: Sometimes you want to force a render boundary—let's say, you know a subtree should _only_ update when a specific prop changes, not when the parent re-renders for unrelated reasons. `React.memo` lets you pin that contract in place.

### When you still need useMemo

- **Expensive computations**: The compiler doesn't magically cache arbitrary heavy calculations—it only optimizes what it can prove to be safe at the render level. If you're crunching a giant dataset, memoization around that computation is still your responsibility.
- Referential stability for dependencies: When you need to pass a stable value into `useEffect`/`useCallback` dependencies, `useMemo` is still the way to lock it down. The compiler won't rewrite your dependency arrays.
- **Custom equality logic**: Sometimes you don't want shallow equality--you want deep compare or specific heuristics. `useMemo` is still your hammer.

#### When you still need useCallback

- **Stable callback identities**: If you're passing callbacks down to deeply memoized children (compiler-compiled or not), you may still need `useCallback` to avoid churn. The compiler can inline and memoize a lot of simple closures, but it doesn't cover every inter-component relationship.
- **Dependency-driven closures**: A callback that captures changing values in tricky ways may need explicit `useCallback` to tell React when to regenerate it. The compiler won't outsmart arbitrary closure semantics.
- **Library APIs**: Some hooks or external APIs expect stable function identities (e.g., event registration, subscription management). `useCallback` remains essential in these contexts.

### Suspense

Suspense adds a twist to React Fiber's rendering process.

Suspense lets a render **throw a promise**.

When this happens, React marks that fiber as _suspended_ and continues along its way working on what it can.

When the promise resolves, React schedules a retry for affected lanes.

#### With Transitions

When promise suspends a component tree, it inherits the same priority as whatever caused it. So, if that promise was create in a transition, picking up where it left off maintains the same priority.

### useTransition

The `useTransition` hook is React's primary way for letting it know that a particular start update can be treated as lower-priority and non-urgent.

Without a transition, calling `setState` from a user input event puts it in a high-priority lane.

This could be _Not a Good Thing™_ if we're about to do something expensive.

**Without `useTransition()`**: Each keystroke would immediately trigger an update and re-render the entire list. The more you type, the worse it _could_ get.

**With `useTransition()`**: Updating the text in the search field is definitely urgent and we can immediately give the user that visual feedback that they crave. And then we buy us some time to do the expensive stuff. If we can also toss work that is no longer relevant.

`useTransition()` doesn't _actually_ make anything any faster, but it sure makes everything _feel_ faster by making sure the stuff that is important to us happens first.

### useDeferredValue

`useDefferedValue()` is a hook that accepts a value and returns a new, _deferred_ version ofn that value. This deferred version will lag behind the original value during urgent updates.

When we use `useDeferredValue`, we're basically saying:

> Hey, computing this value might take a while. So, don't wait for us. Continue what you're doing with the old value and then when the new one is ready, we can switch over to that.

Conceptually, React stores both the current and the deferred version. React will continue to use the old value until the new value is ready.

This involves a two-step process:

1. When an urgent update occurs (e.g. the user types something), React immediately initiates a re-render. During this first render, the `deferredQuery` still holds its _previous_ value.
2. After the urgent render completes React schedules a second, interruptible re-render in the background. In this second render, deferredQuery is updated to the latest value.

### Comparing useTransition and useDeferredState

- `useTransition` wraps the _action_ or _cause_ of the update. You're explicitly wrapping the state-setting function (e.g. `setState`) inside of `startTransition`. This gives you direct control over the scheduling of a specific update.
- `useDeferredValue` wraps the _result_ of an update. You hand it an existing value and it provides a deferred version of that value. This is useful when the state update itself is happening somewhere else (e.g. a parent component or a third-party library). It's useful for deferring the effect of a value that you _don't_ control.

Another difference is how we can determine if we have a pending transition.

- `useTransition()` gives you an `isPending` boolean.
- `useDeferredValue()` doesn't but it _does_ but you do have both the current value and the deferred value, so there is nothing stopping you from figuring this out yourself.

**TL;DR**: `useTransition()` says, "Mark this action as low priorty." `useDeferredValue()` says, "Let this value lag behind."

#### How to Choose

- Prefer `useTransition()` when _you_ control the state update. `useTransition()` wraps the function that updates the state.
- Prefer `useDeferredValue` when you _do not_ control the state update. `useDeferred()` wraps the value itself.

### useOptimistic

`useTransition` and `useDeferredValue` are actually dealing with our rendering performance. `useOptimistic`—on the other—deals with the fact that talking to servers over the internet can be slow. It allows us to optimisticly act like everything is gravy as we wait for the server to respond with the A-OK.

In the event that stuff didn't go as well as expected, then `useOptimistic` will help us automatically rollback and deal with the reality of the situation.

- **On Success**: Our parent component will update and we'll swap in the real value with our temporary, optimistic placeholder.
- **On Failure**: We'll revert back to the older state and let the UI handle the error and break the news to our user.

Could you do all of this by hand? _Of course_. Do you want to. Absolutely not.

### React Compiler

So, manual memoization has some fundamental problems. The first and foremost being that you have to actually do it.

## Appendix

There is a whole bunch of interesting tidbits that we _probably_ won't get to today, but I have some notes in case you want to dive in as an extension. Some of it is just supplementary material or references in case one of y'all throws me a curveball question.

### Migration Guides

- [React Compiler Migration Guide](react-compiler-migration-guide.md)

## Server-Side and Streaming

- [Optimizing Server-Side Rendering](optimizing-server-side-rendering.md)
- [Streaming SSR Optimization](streaming-ssr-optimization.md)
- [React Server Components (RSC)](react-server-components-rsc.md)
- [Selective Hydration in React 19](selective-hydration-react-19.md)

### Common Performance Patterns

- [Windowing and Virtualization](windowing-and-virtualization.md)
- [Animation Performance](animation-performance.md)
- [Skeleton Screens & Perceived Performance](skeleton-screens-perceived-performance.md)

### Advanced React Features

- [React Cache API](react-cache-api.md)
- [`flushSync` in React DOM](flushsync-in-react-dom.md)
- [`useLayoutEffect` Performance](uselayouteffect-performance.md)

### Advanced Loading Strategies

- [Resource Preloading APIs](resource-preloading-apis.md)
- [Priority Hints & Resource Loading](priority-hints-resource-loading.md)
- [CDN Caching & Immutable Assets](cdn-caching-immutable-assets.md)
- [Service Worker Strategies](service-worker-strategies.md)
- [Speculation Rules & `bfcache`](speculation-rules-bfcache.md)
- [Image & Asset Optimization](image-and-asset-optimization.md)

### Advanced Graphics & Threading

- [Web Workers with React](web-workers-with-react.md)
- [View Transitions API](view-transitions-api.md)

### Memory & Architecture

- [Memory Management](memory-management-deep-dive.md)
- [Memory Leak Detection](memory-leak-detection.md)
- [Micro-Frontend Performance](micro-frontend-performance.md)
- [SWC (Speedy Web Compiler)](swc-speedy-web-compiler.md)

### Monitoring & Testing

- [INP Optimization & Long Tasks](inp-optimization-long-tasks.md)
- [INP Production Monitoring](inp-production-monitoring.md)
- [Performance Testing Strategy](performance-testing-strategy.md)
