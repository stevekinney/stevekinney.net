---
title: Tailwind CSS 4
description: >-
  Major evolution of Tailwind with CSS-first configuration, native variables,
  modern CSS features, and the new Oxide engine
modified: '2025-07-29T15:11:25-06:00'
date: '2025-06-11T19:05:33-06:00'
---

Tailwind 4 is a ground-up rewrite of the framework.

- **[Oxide Engine](tailwind-oxide.md):** Rust-powered engine with 5x faster full builds, 100x faster incremental builds
- **CSS-First Configuration:** Configure in CSS with `@theme`, `@utility`, `@custom-variant`, `@plugin` (JavaScript config still supported via `@config`)
- **Native CSS Variables:** `@theme` tokens automatically exposed as CSS custom properties
- **Modern CSS:** Native `@layer`, [`@property`](at-property.md), [`color-mix()`](color-mix.md), [OKLCH colors](oklch-colors.md)
- **[OKLCH Colors](oklch-colors.md):** Perceptually uniform, P3 wide gamut support
- **Simplified Installation:** Single `@import "tailwindcss";` replaces three directives
- **Automatic Content Detection:** No `content` array needed, respects `.gitignore`
- **New Utilities:** [Container queries](container-queries.md), 3D transforms, gradients (radial/conic), text shadows, masks, [`not-*`](not-utility.md), [`starting:`](starting-style.md), `user-valid/invalid`, `pointer-*`, `inset-shadow/ring`, [`inert`](inert-utility.md)
- **Composable Variants:** Chain [`group-*`](group-and-peer-modifiers.md), [`peer-*`](group-and-peer-modifiers.md), [`has-*`](has-utility.md), [`not-*`](not-utility.md)
- **Breaking Changes:** Deprecated utilities removed, border defaults to `currentColor`, CSS variables use `(…)` not `[…]`, variants in `@layer components` changed
- **Browser Support:** Safari 16.4+, Chrome 111+, Firefox 128+ (use v3.x for older browsers)
- **Upgrade Tool:** `npx @tailwindcss/upgrade@next` automates v3 to Tailwind 4 migration
- **Philosophy:** Utility-first with semantic CSS variables, feels like native CSS

## Breaking Changes Checklist

When migrating from Tailwind CSS v3 to Tailwind 4, use this checklist to ensure a smooth transition:

### Configuration Changes

- [ ] **Replace CSS imports:** Change `@tailwind base; @tailwind components; @tailwind utilities;` to `@import "tailwindcss";`
- [ ] **Update config format:** Consider migrating from JavaScript config to CSS-first configuration using `@theme`, `@utility`, etc.
- [ ] **Remove content array:** Automatic content detection means you can remove the `content` configuration (but JavaScript config is still supported)
- [ ] **Update file extensions:** Ensure your build process recognizes the new CSS-first configuration syntax

### Removed/Deprecated Utilities

- [ ] **Remove deprecated utilities:** Check for and replace any utilities that were deprecated in v3 and removed in Tailwind 4
- [ ] **Update transform utilities:** Some transform utilities may have changed syntax or been consolidated
- [ ] **Check filter utilities:** Verify backdrop-filter and filter utilities work as expected

### Border and Color Changes

- [ ] **Border color defaults:** Borders now default to `currentColor` instead of gray - add explicit border colors where needed
- [ ] **Update border utilities:** Check that border styles render as expected with the new defaults
- [ ] **Verify color palette:** Ensure custom colors work with the new OKLCH color system

### CSS Variable Syntax

- [ ] **Update variable syntax:** Change CSS variables from square brackets `[…]` to parentheses `(…)`
- [ ] **Example:** `var(--my-color-[500])` becomes `var(--my-color-(500))`
- [ ] **Check custom properties:** Verify all custom CSS variables use the new syntax

### Component Layer Changes

- [ ] **Review component styles:** Variants in `@layer components` have changed behavior
- [ ] **Update component CSS:** Check that component-level styles work as expected
- [ ] **Test specificity:** Ensure component styles have correct specificity with the new layer system

## Automated Migration

Consider using the official upgrade tool to automate many of these changes. Just make sure you do it on a clean git branch. I've never seen one of these tools be perfect.

```bash
npx @tailwindcss/upgrade@next
```

> [!WARNING]
> Always backup your project before running automated migration tools and review all changes carefully before committing.
