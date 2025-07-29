---
title: Colors and CSS Variables
description: >-
  Define custom colors and theme values using CSS variables with Tailwind 4's
  @theme directive for better integration.

modified: 2025-06-11T19:05:33-06:00
---

Tailwind moves configuration from JavaScript to CSS using the `@theme` directive and CSS variables.

## Defining Custom Colors

Add colors in your CSS file using `@theme`:

```css
@import 'tailwindcss';

@theme {
  --color-brand: #5b21b6;
  --color-neon-pink: oklch(71.7% 0.25 360);
  --color-neon-lime: oklch(91.5% 0.258 129);
}
```

This generates utilities like `bg-brand`, `text-neon-pink`, etc.

## Overriding Default Colors

Replace specific colors:

```css
@theme {
  --color-blue-500: #1e40af; /* Override default blue-500 */
}
```

Clear entire color groups:

```css
@theme {
  --color-gray-*: initial; /* Remove all default grays */
  --color-gray-50: #f8fafc;
  --color-gray-100: #f1f5f9;
  /* Define your custom grays */
}
```

Start from scratch:

```css
@import 'tailwindcss/preflight';
@import 'tailwindcss/utilities';

@theme {
  --color-*: initial; /* Remove ALL defaults */
  /* Define your entire palette */
}
```

## Using Colors as CSS Variables

Theme colors are exposed as CSS variables:

### In Custom CSS

```css
.custom-element {
  background: var(--color-brand);
  border-color: var(--color-neon-pink);
}
```

### In Arbitrary Values

```html tailwind
<!-- Long form -->
<div class="bg-[var(--color-neon-pink)]">...</div>

<!-- Shorthand (v4) -->
<div class="text-(--color-brand)">...</div>
```

## Opacity Modifiers

Works with all color definitions:

```html tailwind
<div class="bg-brand/50">50% opacity</div>
<div class="text-neon-pink/75">75% opacity</div>
<div class="border-[var(--color-custom)]/20">20% opacity</div>
```

## Important Tailwind 4 Changes

### Border Color Default

```html tailwind
<!-- v3: defaulted to gray-200 -->
<div class="border">...</div>

<!--Tailwind 4: defaults to currentColor -->
<div class="border border-gray-200">Explicit color needed</div>
```

### Ring Color Default

```html tailwind
<!-- v3: 3px blue ring -->
<div class="ring">...</div>

<!--Tailwind 4: 1px currentColor -->
<div class="ring-3 ring-blue-500">Explicit width and color</div>
```

## Dynamic Theming

CSS variables enable runtime theme switching:

```css
@theme {
  --color-surface: white;
  --color-text: black;
}

[data-theme='dark'] {
  --color-surface: #1a1a1a;
  --color-text: white;
}
```

```html tailwind
<body data-theme="dark">
  <div class="bg-surface text-text">Automatically themed</div>
</body>
```

## Best Practices

1. **Use semantic names** for brand colors: `--color-primary`, `--color-accent`
2. **Group related colors**: `--color-gray-*`, `--color-brand-*`
3. **Leverage OKLCH** for consistent palettes
4. **Document your colors** with comments in `@theme`
5. **Test opacity modifiers** with your custom colors
