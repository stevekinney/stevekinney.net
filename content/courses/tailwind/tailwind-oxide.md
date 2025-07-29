---
title: Tailwind Oxide
description: >-
  Exploring Oxide - Tailwind's high-performance engine built with Rust and
  Lightning CSS for blazing fast builds
modified: 2025-06-11T19:05:33-06:00
---

[Oxide](https://medium.com/@bomber.marek/whats-tailwind-oxide-engine-the-next-evolution-of-tailwind-css-32e7ef8e19a1) is Tailwind 4's high-performance engine—a ground-up rewrite initially planned for Tailwind 3.x.

- **Built with Rust:** Performance-critical parts rewritten for speed
- **Powered by Lightning CSS:** Fast Rust-based CSS parser/transformer (only dependency)
- **Custom CSS Parser:** 2x faster than PostCSS
- **Unified Toolchain:** Built-in `@import`, vendor prefixing, nesting, modern CSS transforms
- **Zero-Configuration:** Automatically finds template files
- **CSS-First Configuration:** Use `@theme` and CSS variables instead of JavaScript
- **Composable Variants:** Combine `group-*`, `peer-*`, `has-*`, `not-*`
- **Modern CSS:** Native cascade layers, `@property`, `color-mix()`, container queries
- **Removed Deprecated Utilities:** Cleaned up from v3
- **Changed Defaults:** `border` and `ring` now use `currentColor`
- **Safelisting:** Use `@source inline()` in CSS (not JavaScript)
- **Explicit Exclusion:** `@source not inline()`

## As Compared to the Older Method

- **Performance:** 10x faster full builds (105ms vs 960ms), 100x faster incremental builds
- **Developer Experience:** Zero-config detection, CSS-first configuration (no `tailwind.config.js`)
- **Toolchain:** Built-in CSS processing (no need for `postcss-import`, `autoprefixer`); separate PostCSS/CLI packages
- **Modern CSS:** Native `@layer`, `@property`, `color-mix()`, container queries (no plugin needed)
- **Flexibility:** Composable variants for complex selectors
- **Class Detection:** Same plain-text scanning, still requires static classes, but automatic
- **Removed/Changed:** No `corePlugins`, `theme()` deprecated, `@apply` requires `@reference`, `@layer` → `@utility`, variant order left-to-right (was right-to-left)
- **Browser Support:** Requires Safari 16.4+, Chrome 111+, Firefox 128+ (v3 had broader support)
