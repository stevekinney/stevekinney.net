---
title: OKLCH Colors
description: >-
  Understanding Tailwind 4's perceptually uniform OKLCH color space for better
  gradients, accessibility, and P3 gamut support
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

Tailwind uses OKLCH colors for its default palette - a perceptually uniform color space that aligns with human vision.

## OKLCH Components

- **L (Lightness):** 0 (black) to 1 (white) - perceptually uniform
- **C (Chroma):** 0 (gray) upwards - color intensity
- **H (Hue):** 0-360 degrees - position on color wheel
- **A (Alpha):** 0-1 or 0%-100% - opacity

Syntax: `oklch(L C H)` or `oklch(L C H / alpha)`

## Why OKLCH?

1. **Perceptual uniformity** - Predictable lightness changes
2. **P3 gamut support** - More vivid colors on modern displays
3. **Better accessibility** - Reliable contrast calculations
4. **Smoother gradients** - No muddy middle colors

## Using OKLCH in Tailwind

### Default Palette

All default colors (red, blue, gray, etc.) use OKLCH internally:

```html tailwind
<div class="bg-sky-500 text-neutral-900">
  <!-- Tailwind handles OKLCH conversion -->
</div>
```

### Custom Colors

Define OKLCH colors in `@theme`:

```css
@import 'tailwindcss';

@theme {
  /* Single color */
  --color-midnight: oklch(15% 0.05 270);

  /* Full palette */
  --color-brand-100: oklch(0.99 0 0);
  --color-brand-500: oklch(0.64 0.18 260);
  --color-brand-900: oklch(0.28 0.05 265);
}
```

Use like any Tailwind color:

```html tailwind
<div class="bg-brand-500 text-midnight">...</div>
```

## OKLCH and Gradients

Better interpolation with OKLCH:

```html tailwind
<!-- Standard gradient -->
<div class="bg-linear-to-r from-purple-500 to-pink-500">Smooth OKLCH interpolation</div>

<!-- Explicit OKLCH interpolation -->
<div class="bg-linear-to-r/oklch from-indigo-500 to-teal-400">Vibrant color transitions</div>
```

## Dark Mode with OKLCH

Predictable lightness makes dark mode easier:

```css
@theme {
  --color-surface: oklch(0.98 0 0); /* Light mode */
  --color-text: oklch(0.15 0 0); /* Light mode */
}

.dark {
  --color-surface: oklch(0.12 0 0); /* Dark mode */
  --color-text: oklch(0.95 0 0); /* Dark mode */
}
```

## Accessibility Tips

1. **Use L values for contrast** - Bigger L differences = better contrast
2. **Always verify with tools** - L difference alone isn't enough
3. **Test both themes** - Dark and light modes need separate checks

## Browser Support

OKLCH requires modern browsers:

- Chrome 111+
- Safari 15.4+
- Firefox 113+

> [!WARNING] Tailwind 4.1+ includes fallbacks for older browsers, but expect differences.

## Practical Examples

**High contrast button:**

```html tailwind
<button class="bg-[oklch(0.2_0.1_250)] text-[oklch(0.95_0_0)]">
  High Contrast (L: 0.2 vs 0.95)
</button>
```

**Vibrant accent:**

```html tailwind
<div class="bg-[oklch(0.7_0.25_160)]">High chroma for vivid color</div>
```

**Accessible palette:**

```css
@theme {
  /* Ensure 0.4+ lightness difference */
  --color-bg: oklch(0.98 0 0);
  --color-text: oklch(0.25 0 0);
  --color-primary: oklch(0.55 0.2 250);
}
```
