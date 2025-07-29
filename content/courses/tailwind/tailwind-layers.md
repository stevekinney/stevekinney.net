---
title: Tailwind's Layers
description: >-
  Understanding CSS cascade layers in Tailwind 4: theme, base, components, and
  utilities.

modified: 2025-06-11T19:05:33-06:00
---

Tailwind CSS uses **layers** to control CSS order for efficient file size and specificity. This minimizes conflicts between utility classes, base styles, and component styles. Tailwind defines four CSS cascade layers: `theme`, `base`, `components`, and `utilities`. The `theme` layer contains CSS custom properties that power design tokens.

**Layers** are a CSS feature, not Tailwind-specific.

## The Short Version

Tailwind ships with four layers:

- `theme`: Design token variables (CSS custom properties) for colors, spacing, fonts, breakpoints, and design system parts.
- `base`: Basic styles for raw HTML elements (e.g. `h1`).
- `components`: Common styles for reusable components (e.g. `.btn` or `.card`).
- `utilities`: Specific one-off utilities like setting margin for particular elements.

## Cascade Layers Overview

CSS Cascade Layers let you explicitly group style rules into ordered layers. Rules in later-declared layers outrank all rules in earlier layers, regardless of selector specificity (unless `!important` is involved). This makes the cascade easier to reason about.

## How Tailwind 4 Uses Native Cascade Layers

Tailwind 4 is built on real `@layer` rules. When compiled, everything is grouped into four predefined layers:

```css
@layer theme;
@layer base;
@layer components;
@layer utilities;
```

The **utilities** layer is declared last, so its classes override **components**, which override **base**. Every layer can reference custom properties in **theme**. This clean hierarchy replaces the specificity hacks from v3.

## Adding Custom Styles in Tailwind 4

- **Base styles** — Use `@layer base { ... }` to tweak default element styling.
- **Component classes** — Use `@layer components { ... }` for patterns like `.card` or `.btn` that utilities should override.
- **Custom utilities** — Use the `@utility` directive:

  ```css
  @utility .fancy-border {
    border: 3px dashed var(--color-primary-500);
  }
  ```

  The selector lands in the **utilities** layer and automatically receives responsive and state variants.

## Key Changes from Tailwind CSS v3

- **Single import** – Replace  
  `@tailwind base`, `@tailwind components`, and `@tailwind utilities`  
  with
  ```css
  @import 'tailwindcss';
  ```
  Tailwind inserts all core styles and layers automatically.
- **Directive overhaul** – `@utility` replaces `@layer utilities { ... }` for variant-capable custom utilities. Rules in `@layer components` and `@layer base` still work but don't receive variants.

## Why This Matters

- **Predictable specificity** – Layer ordering is explicit, eliminating selector-length hacks.
- **Standards aligned** – Tailwind now mirrors the official CSS cascade model.
- **Simpler internals** – Fewer bespoke mechanisms mean faster builds and fewer edge cases.

## Browser Compatibility

Native cascade layers are supported in Safari 15.4+, Chrome 99+, Edge 99+, and Firefox 97+. Browsers without `@layer` support ignore the rules, leaving pages unstyled. For such browsers, use Tailwind CSS v3.x.

## The Longer Version

### Theme Layer (`theme`)

The **theme** layer contains CSS custom properties for design tokens. As the first layer, subsequent layers can reference these variables without increasing specificity.

```css
@layer theme {
  :root {
    --color-primary-500: oklch(63.7% 0.237 25.331);
    --spacing-4: 1rem;
  }
}
```

Don't write to `@layer theme` directly. Use the `@theme { ... }` directive; Tailwind compiles it into the **theme** layer.

### Base Layer (`base`)

The base layer contains foundational styles for raw HTML elements. These are low-specificity selectors including default browser styling.

Example:

```css
@layer base {
  h1 {
    @apply text-2xl;
  }
  p {
    @apply text-base;
  }
}
```

### Components Layer (`components`)

The components layer defines common design patterns as reusable components, typically using Tailwind's `@apply` directive. These have higher specificity than base styles but lower than utilities.

```css
@layer components {
  .btn {
    @apply rounded bg-blue-500 px-4 py-2 text-white;
  }
  .card {
    @apply rounded p-4 shadow-md;
  }
}
```

### Utilities Layer (`utilities`)

The utilities layer contains Tailwind's utility classes—highly specific, single-purpose classes. This layer has the highest specificity, overriding conflicting styles from previous layers.

Tailwind automatically generates this layer. For custom utilities in Tailwind 4, use the `@utility` directive instead of `@layer utilities { ... }`.

```css
.mt-4 {
  margin-top: 1rem;
}

.text-center {
  text-align: center;
}
```

### How They Differ

1. **Specificity**: Base styles have lowest specificity, followed by components, then utilities.
2. **Purpose**: Base styles target HTML elements; components are reusable patterns; utilities are single-purpose classes.
3. **Customization**: Base and component layers use `@apply` and `@layer` directives; utilities are generated from Tailwind config.
4. **Order**: Base styles come first in generated CSS, followed by components, then utilities.
