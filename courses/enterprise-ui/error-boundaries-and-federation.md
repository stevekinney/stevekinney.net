---
title: Error Boundaries and Module Federation
description: >-
  React error boundaries can't catch what happens before React mounts—and Module
  Federation's runtime negotiation happens before React mounts, which means a
  dead remote produces a blank page, not a fallback UI.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

If you stop the remote dev server in the [runtime composition exercise](/courses/enterprise-ui/runtime-composition-exercise) and reload the host, you'll see a blank white page. Not the `<Suspense>` fallback. Not the error boundary's fallback UI. Just nothing. The console tells you what happened: `ERR_CONNECTION_REFUSED` on `mf-manifest.json`, followed by a `Federation Runtime` error. The error boundary never had a chance.

This isn't a bug in your error boundary setup. It's a fundamental timing problem with how Module Federation and React interact.

## Why the Error Boundary Doesn't Fire

React error boundaries catch errors that happen _during rendering_. They wrap a component tree and intercept exceptions thrown by `render()`, lifecycle methods, or constructors of descendant components. That's the contract—error boundaries catch render-time errors from components below them in the tree.

Module Federation's manifest fetch doesn't happen during rendering. It happens _before_ rendering. When the host application starts, the federation runtime fetches `mf-manifest.json` from every configured remote as part of shared module negotiation. This negotiation is what the async boundary in `index.tsx` exists to support—the `import("./bootstrap")` pattern defers application code until the federation runtime has contacted all remotes and resolved shared dependencies.

When a remote is completely unreachable, the manifest fetch fails. The federation runtime throws before `createRoot` is ever called. React hasn't mounted yet. The error boundary component exists in your source code, but it's never been instantiated in the DOM. You can't catch errors in a component tree that doesn't exist yet.

## The Timeline

Here's what happens when the remote is down:

1. Browser loads the host's HTML and JavaScript
2. `index.tsx` runs `import("./bootstrap")`
3. The federation runtime intercepts this and starts shared module negotiation
4. Federation runtime fetches `mf-manifest.json` from `localhost:3001`
5. The fetch fails with `ERR_CONNECTION_REFUSED`
6. Federation runtime throws an error
7. The dynamic `import("./bootstrap")` rejects
8. Nothing else happens—`bootstrap.tsx` never runs, `createRoot` never executes, React never mounts

Your `<ErrorBoundary>` lives inside `<App>`, which lives inside `bootstrap.tsx`. Step 8 never happens, so the error boundary never exists.

## What Actually Works

There are a few strategies for handling this, and they operate at different levels.

### Catch the bootstrap failure

The most direct fix is wrapping the dynamic import in `index.tsx` itself with a `try/catch` or `.catch()` handler. This is plain JavaScript error handling, not React—it happens before React exists.

```typescript
// index.tsx
import('./bootstrap').catch((error) => {
  console.error('Application failed to start:', error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 2rem; font-family: system-ui;">
        <h1>Something went wrong</h1>
        <p>The application failed to load. Please try refreshing the page.</p>
        <pre style="color: red;">${error.message}</pre>
      </div>
    `;
  }
});
```

This is ugly—you're writing raw DOM manipulation in a React app. But it's also the only thing that can run at this point in the lifecycle, because React doesn't exist yet.

### Make the remote optional

A more architectural approach is to make the federation runtime treat the remote as optional rather than required. Module Federation supports this through error handling in the `remotes` configuration or by wrapping the lazy import with proper error recovery.

Instead of letting the manifest failure crash the entire application, you can catch the failure at the `React.lazy` boundary:

```typescript
const AnalyticsDashboard = React.lazy(() =>
  import('remoteAnalytics/analytics-dashboard').catch(() => {
    return { default: () => <div>Analytics dashboard is unavailable.</div> };
  }),
);
```

This works because `React.lazy` expects a promise that resolves to a module with a `default` export. If the remote import fails, you return a fallback component instead of letting the error propagate. The `<Suspense>` boundary still handles the loading state, and the fallback component renders if the remote is down.

But, this only works if the federation runtime doesn't throw _during negotiation_ before the lazy import even runs. If the remote is listed in `remotes` and the manifest fetch fails during the eager negotiation phase, you're back to the blank page. The fix for that is either removing the remote from `remotes` entirely (making it truly dynamic) or configuring the federation runtime's error handling.

### Dynamic remote registration

The cleanest solution for truly optional remotes is to skip the static `remotes` configuration and register remotes dynamically at runtime. Module Federation supports this through its runtime API—you can register a remote only when you're ready to load it, and handle the failure gracefully.

```typescript
import { registerRemotes } from '@module-federation/runtime';

async function loadAnalytics() {
  try {
    registerRemotes([
      {
        name: 'remoteAnalytics',
        entry: 'http://localhost:3001/mf-manifest.json',
      },
    ]);
    const module = await import('remoteAnalytics/analytics-dashboard');
    return module;
  } catch (error) {
    console.warn('Analytics remote unavailable:', error);
    return { default: () => <div>Analytics is currently offline.</div> };
  }
}
```

Now the manifest fetch happens inside a `try/catch` that you control, not during the global negotiation phase. If the remote is down, the app still boots, React still mounts, and the error boundary can handle whatever else goes wrong.

## The Lesson

The broader lesson isn't just about Module Federation. It's about the gap between "error handling in React" and "error handling in the application bootstrap." React error boundaries are excellent at catching render-time failures. They're useless for anything that happens before React exists—failed network requests during module negotiation, broken script tags, CDN outages, or any initialization error that prevents the component tree from mounting in the first place.

In a traditional single-build application, this gap barely matters because there's very little that can go wrong between "JavaScript loads" and "React mounts." Module Federation makes that gap much wider by inserting a whole negotiation phase—manifest fetches, shared dependency resolution, remote module loading—into the space between script execution and application rendering.

So, the rule of thumb: error boundaries handle runtime rendering failures. Everything before that needs plain JavaScript error handling at the bootstrap level. If your architecture depends on external resources being available before React can mount, you need a fallback strategy that doesn't depend on React.
