# `@stevekinney/components`

Svelte 5 components shared across the website. Each component ships as its own `.svelte` file, grouped by shape (badge, button, card, etc.) under a subdirectory; simpler single-file components sit at the package root.

## Using a component

Every file is exported under `./*`, so SvelteKit imports them via the path alias:

```ts
import Badge from '$lib/components/badge/badge.svelte';
import ContentEnhancements from '$lib/components/content-enhancements.svelte';
```

(`$lib/components` resolves to `packages/components` — see the alias block in `applications/website/svelte.config.ts`.)

## What's in here

- **Content components** — `content-enhancements.svelte` injects the `/generated/content-enhancements/content-enhancements.js` bundle into a page's `<head>`. `open-in-obsidian.svelte` and `pull-request.svelte` render author-side utilities for lessons and posts.
- **Navigation & page chrome** — `navigation.svelte`, `seo.svelte`, `post-link.svelte`, `writing-post-list.svelte`, `pagination/`.
- **Primitive UI** — `badge/`, `button/`, `card/`, `callout/`, `count/`, `input/`, `label/`, `select/`, `link.svelte`, `social-link.svelte`, `linkedin-icon.svelte`.

## Best practices

- **Svelte 5 runes throughout.** Use `$state`, `$derived`, `$props`, `$effect` — not `$:` or the legacy `export let`. Follow the rules in `.claude/rules/` (the project-wide Svelte guidance lives in the user-global `svelte.md` rule).
- **Class composition uses the clsx-style array form.** `<div class={['card', isActive && 'active', size]}>` beats the legacy `class:` directive.
- **Bridge JS values into CSS via CSS custom properties.** `style:--color={color}` plus `var(--color)` in the style block. Don't inline `style:color={color}` when you can help it.
- **Attachments, not actions.** New components should use `{@attach ...}` for DOM integrations (tooltips, drag-and-drop, imperative libraries). Legacy `use:` actions are deprecated in Svelte 5.
- **Treat props as though they change.** Values derived from props use `$derived`; assignment-on-first-render leaks stale values.
