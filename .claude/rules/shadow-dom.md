---
paths:
  - '**/shadow*'
  - '**/*playground*'
---

# Shadow DOM in SvelteKit

When using Shadow DOM with SvelteKit:

- **Avoid declarative shadow DOM with Svelte**: `<template shadowrootmode="open">` causes hydration errors because Svelte can't find elements that were moved into the shadow root during HTML parsing. Create shadow roots entirely on the client instead.

- **Client-only pattern**: Render an empty container on the server, then use `onMount` to call `attachShadow()` and populate content. This works reliably across all browsers.

- **Loading states**: Since content is client-rendered, add a skeleton/loading placeholder that shows until `onMount` runs.

- **Height animations**: Use `grid-template-rows: 0fr` → `1fr` for smooth height transitions when shadow DOM content appears.
