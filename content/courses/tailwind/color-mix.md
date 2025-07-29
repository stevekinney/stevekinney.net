---
title: color-mix()
description: >-
  Learn how Tailwind 4 uses the native color-mix() CSS function for opacity
  modifiers and color blending.
modified: 2025-06-11T19:05:33-06:00
---

`color-mix()` is a CSS function for blending colors. Tailwind 4 uses it internally for all opacity modifiers.

## How It Works

Basic syntax:

```css
color-mix(in srgb, red 50%, blue 50%)
/* Results in purple */
```

## Tailwind's Opacity Modifiers

When you use opacity syntax like `/50`:

```html tailwind
<div class="bg-blue-500/50"></div>
```

Tailwind generates:

```css
background-color: color-mix(in srgb, var(--color-blue-500) 50%, transparent);
```

- Works with any color value
- Supports CSS variables
- Handles `currentColor`
- Better performance

## All Color Properties Support It

```html tailwind
<!-- Text with opacity -->
<p class="text-red-600/75">75% opacity text</p>

<!-- Border with opacity -->
<div class="border-2 border-green-500/30">30% opacity border</div>

<!-- Shadow with opacity -->
<div class="shadow-lg shadow-purple-500/40">40% opacity shadow</div>

<!-- CurrentColor with opacity -->
<div class="border border-current/50 text-blue-600">50% current color</div>
```

## Direct Usage in Custom CSS

Use `color-mix()` in your own styles:

```css
.custom-bg {
  /* Mix brand colors */
  background: color-mix(in oklch, var(--color-primary) 70%, var(--color-secondary) 30%);
}

.hover-state {
  /* Lighten on hover */
  background: color-mix(in srgb, var(--color-brand) 80%, white 20%);
}
```

## In Arbitrary Values

```html tailwind
<!-- Custom color mixing -->
<div class="bg-[color-mix(in_srgb,theme(colors.blue.500)_60%,white)]">Custom mixed background</div>
```

## Color Spaces

`color-mix()` supports different color spaces:

```css
/* sRGB - Standard */
color-mix(in srgb, red, blue)

/* OKLCH - Perceptually uniform */
color-mix(in oklch, red, blue)

/* HSL - Hue based */
color-mix(in hsl, red, blue)
```

Tailwind uses `srgb` by default for compatibility.

## Practical Examples

### Tinted Backgrounds

```html tailwind
<div class="bg-blue-500/10">Very light blue tint</div>
```

### Hover States

```html tailwind
<button class="bg-purple-600 hover:bg-purple-600/80">Hover for transparency</button>
```

### Layered Effects

```html tailwind
<div class="bg-gradient-to-r from-red-500/50 to-blue-500/50">Semi-transparent gradient</div>
```

## Browser Support

- Chrome 111+
- Safari 16.4+
- Firefox 113+
