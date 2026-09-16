---
title: User Preference Variants
description: >-
  Create adaptive interfaces with Tailwind variants for dark mode, reduced
  motion, contrast preferences, and more
---

Tailwind provides variants for responding to user preferences and system settings, keeping adaptive styles right in your HTML.

## Dark Mode

**Basic usage:**

```html tailwind height=160
<div class="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">Adapts to dark mode</div>
```

```css playground=manual-dark
@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));
```

**Manual theme switching:**
Configure dark mode to use a selector instead of system preference:

```html tailwind height=160 css=manual-dark
<div data-theme="dark">
  <div class="dark:bg-gray-800 dark:text-white">Controlled by data-theme</div>
</div>
```

## Motion Preferences

**Reduce animations for accessibility:**

```html tailwind height=160
<!-- Disable animation when reduced motion preferred -->
<div class="inline-block animate-spin motion-reduce:animate-none">Loading...</div>

<!-- Only animate when motion is safe -->
<button class="motion-safe:transition motion-safe:hover:scale-105">Hover me</button>
```

## Contrast and Colors

**High contrast modes:**

```html tailwind height=160
<button class="border-gray-300 contrast-more:border-black contrast-less:border-gray-200">
  Adapts to contrast preference
</button>
```

**Forced colors (Windows High Contrast):**

```html tailwind height=160
<div class="bg-blue-500 forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]">
  Uses system colors in forced-colors mode
</div>
```

## Input Methods

**Adapt to pointing devices:**

```html tailwind height=160
<!-- Larger targets for touch -->
<button class="p-2 pointer-coarse:p-4">Touch-friendly button</button>

<!-- Fine interactions for mouse users -->
<div class="pointer-fine:hover:underline">Hover only with mouse</div>
```

**Note:** In Tailwind 4, `hover:` only applies when primary device supports hover.

## Other Preferences

**Orientation:**

```html tailwind height=160
<div class="grid grid-cols-1 gap-2 landscape:grid-cols-2">
  <div class="rounded bg-blue-100 p-2">First column</div>
  <div class="rounded bg-blue-100 p-2">Second column</div>
</div>
```

**Print styling:**

```html tailwind height=160
<nav class="print:hidden">Navigation</nav>
<article class="print:bg-white print:text-black">Print-friendly content</article>
```

**JavaScript detection:**

```html tailwind height=160
<noscript class="hidden noscript:block"> Please enable JavaScript </noscript>
```

## Feature Detection

**CSS feature support:**

```html tailwind height=160
<!-- Basic support check -->
<div class="supports-[display:grid]:grid">Uses grid if supported</div>

<!-- Complex queries -->
<div class="supports-[(display:grid)_and_(gap:1rem)]:grid-flow-col">Advanced grid features</div>
```

**Custom feature shortcuts:**

```css
@theme {
  --supports-container-queries: [(container-type: inline-size)];
}
```

## Starting Styles (v4)

Animate elements when they first appear:

```html tailwind height=160
<div class="transition-opacity duration-300 starting:opacity-0">Fades in on appearance</div>
```

## Best Practices

1. **Always provide fallbacks** - Don't rely solely on preference variants
2. **Test all modes** - Check dark mode, reduced motion, etc.
3. **Use semantic system colors** for forced-colors mode
4. **Remember class detection** - Complete class names must exist in source
