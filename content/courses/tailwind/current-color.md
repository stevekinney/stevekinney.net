---
title: Current Color
description: >-
  Use currentColor utilities to create contextually adaptive styles that inherit
  text color for borders, fills, and more
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

`currentColor` is a CSS keyword that just means "use the element's text color." Tailwind provides utilities to apply this adaptive coloring across various properties.

## Available Utilities

All `currentColor` utilities use the `-current` suffix:

- `bg-current` - Background color
- `border-current` - Border color (all sides)
- `border-{side}-current` - Individual border sides
- `divide-current` - Divider between children
- `outline-current` - Outline color
- `decoration-current` - Text decoration color
- `fill-current` - SVG fill color
- `stroke-current` - SVG stroke color
- `caret-current` - Input cursor color
- `shadow-current` - Box shadow color
- `ring-current` - Ring (focus) color
- `text-shadow-current` - Text shadow color
- `accent-current` - Form control accent

## Basic Usage

```html tailwind
<!-- Border inherits text color -->
<div class="border-2 border-current text-blue-500">Blue text with blue border</div>

<!-- SVG icon matches text -->
<button class="text-green-600">
  <svg class="h-4 w-4 fill-current">...</svg>
  Green text with green icon
</button>
```

## Tailwind 4 Default Changes

Tailwind 4 embraces `currentColor` for several defaults:

### Border Color

```html tailwind
<!-- v3: gray-200 by default -->
<div class="border"></div>

<!--Tailwind 4: currentColor by default -->
<div class="border border-gray-200">Explicit color needed</div>
```

### Ring Color

```html tailwind
<!-- v3: 3px blue ring -->
<div class="ring"></div>

<!--Tailwind 4: 1px currentColor -->
<div class="ring-3 ring-blue-500">Explicit width/color</div>
```

### Placeholder Text

```css
/* v3: gray-400 */
/*Tailwind 4: currentColor at 50% opacity */
```

## Practical Patterns

### Adaptive Components

```html tailwind
<!-- Button adapts to parent context -->
<div class="text-indigo-600">
  <button class="border-2 border-current px-4 py-2">Indigo bordered button</button>
</div>

<div class="text-red-600">
  <button class="border-2 border-current px-4 py-2">Red bordered button</button>
</div>
```

### Icon Libraries

```html tailwind
<!-- Icons automatically match text color -->
<span class="text-gray-600">
  <svg class="inline h-5 w-5 fill-current">...</svg>
  Gray icon matches text
</span>
```

### Focus States

```html tailwind
<input class="text-blue-600 focus:ring-2 focus:ring-current focus:outline-current" />
```

## With Opacity

Combine with opacity modifiers:

```html tailwind
<div class="border-2 border-current/50 text-purple-600">50% opacity purple border</div>
```

## In Custom CSS

Use in your own styles:

```css
.custom-quote {
  border-left: 4px solid currentColor;
  color: var(--color-gray-700);
}
```

## Arbitrary Values

Use `currentColor` in arbitrary value syntax:

```html tailwind
<div class="shadow-[0_2px_8px_currentColor/20]">Shadow using text color at 20% opacity</div>
```

## Best Practices

1. **Use for contextual adaptation** - Let components inherit color from context
2. **Great for icons** - SVGs that should match surrounding text
3. **Reduce repetition** - Set text color once, apply everywhere
4. **Mind the defaults** -Tailwind 4 uses currentColor more extensively
5. **Test inheritance** - Ensure color cascades as expected
