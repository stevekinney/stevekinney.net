---
title: '@property'
description: Understand how Tailwind leverages the @property CSS rule for modern features and performance improvements.
---

Tailwind 4 uses the CSS `@property` rule internally to enable modern features and performance improvements.

## What is `@property`?

The `@property` rule registers custom CSS properties with:

- **Type definition** (length, color, number, etc.)
- **Initial value**
- **Inheritance behavior**

```scss
@property --my-color {
  syntax: '<color>';
  initial-value: black;
  inherits: false;
}
```

## How Tailwind Uses It

Tailwind leverages `@property` internally for:

1. **Gradient animations** - Smooth transitions between gradient stops
2. **Performance optimization** - Especially on large pages
3. **Type-safe custom properties** - Better browser optimizations

You don't write `@property` rules directly - Tailwind handles this behind the scenes.

## Browser Requirements

This dependency means Tailwind 4 requires:

- Safari 16.4+
- Chrome 111+
- Firefox 128+

**No support for older browsers.**

## Key Distinctions

### `@theme` (You use this)

Define design tokens that generate utilities:

```scss
@theme {
  --color-primary: #3b82f6;
  --spacing-lg: 2rem;
}
```

### `@property` (Tailwind uses this)

Internal framework implementation for modern CSS features.

### `:root` variables

Still useful for non-utility CSS variables:

```css
:root {
  --header-height: 64px; /* Won't generate utilities */
}
```

## Impact on Your Code

While `@property` works behind the scenes, you benefit from:

- Smoother animations
- Better performance
- Access to theme values as CSS variables
- Modern CSS features that weren't possible before

The trade-off: Modern browser requirement, no IE11 or legacy browser support.
