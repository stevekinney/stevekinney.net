---
title: 'Edge, SSR, and Runtime Types'
description: >-
  Target multiple runtimes—align DOM vs Node types, edge constraints, and SSR
  data contracts with TypeScript.
date: 2025-09-06T22:04:45.055Z
modified: '2025-10-01T00:19:35-05:00'
published: true
tags:
  - react
  - typescript
  - ssr
  - runtime
  - edge
---

Modern React applications run in multiple JavaScript environments: browsers, Node.js servers, edge runtimes like Cloudflare Workers or Vercel Edge Functions, and everything in between. Each runtime has its own APIs, constraints, and type definitions—but your TypeScript code needs to work across all of them. Let's explore how to navigate these differences, write runtime-aware code, and ensure your SSR data contracts stay bulletproof (even when your API decides to send you `null` instead of that nice user object you were expecting).

## The Runtime Multiverse Problem

When you write React components, you're often targeting multiple JavaScript runtimes simultaneously:

- **Browser**: Full DOM APIs, client-side rendering, user interactions
- **Node.js**: Server-side rendering, file system access, full Node APIs
- **Edge Runtime**: Lightweight V8 isolates with Web APIs but no Node.js APIs
- **Build Time**: Static generation during your build process

Each runtime has different global objects, different APIs, and crucially—different TypeScript definitions. Your component might render perfectly in the browser but throw type errors when you try to SSR it, or work great on your Node.js server but fail mysteriously when deployed to an edge function.

Here's a common example of this pain:

```ts
// ❌ This works in browser but breaks in Node.js
function MyComponent() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,  // ReferenceError: window is not defined
    height: window.innerHeight
  });

  return <div>Window size: {windowSize.width}x{windowSize.height}</div>;
}
```
