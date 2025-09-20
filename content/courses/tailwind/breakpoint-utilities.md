---
title: Breakpoint Utilities
description: >-
  Build responsive designs with Tailwind's mobile-first breakpoint system and
  viewport-based conditional styling.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

Tailwind uses a mobile-first approach: un-prefixed utilities apply to all sizes, prefixed utilities apply from that breakpoint up.

## Default Breakpoints

- `sm`: 640px and up
- `md`: 768px and up
- `lg`: 1024px and up
- `xl`: 1280px and up
- `2xl`: 1536px and up

## Basic Usage

```html tailwind
<!-- Mobile-first design -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <!-- 1 column on mobile, 2 on medium, 3 on large -->
</div>

<!-- Show/hide at breakpoints -->
<div class="hidden lg:block">Only visible on large screens</div>
<div class="block lg:hidden">Hidden on large screens</div>
```

## Targeting Ranges

### Maximum Width Variants

Use `max-*` to apply styles below a breakpoint:

```html tailwind
<!-- Only on mobile -->
<div class="block max-sm:hidden">Hidden on mobile only</div>

<!-- Medium screens only -->
<div class="hidden max-lg:hidden md:block">Visible between 768px-1024px</div>
```

### Stacking for Ranges

```html tailwind
<!-- Apply only between md and lg -->
<div class="md:max-lg:bg-blue-500">Blue background on medium screens only</div>
```

## Arbitrary Breakpoints

One-off custom breakpoints:

```html tailwind
<!-- Min width -->
<div class="min-[850px]:flex">Flex at 850px+</div>

<!-- Max width -->
<div class="max-[1200px]:hidden">Hidden below 1200px</div>

<!-- Range -->
<div class="min-[600px]:max-[900px]:bg-gray-100">Gray between 600-900px</div>
```

## Customizing Breakpoints

Define custom breakpoints in `@theme`:

```css
@import 'tailwindcss';

@theme {
  /* Add new breakpoints */
  --breakpoint-xs: 475px;
  --breakpoint-3xl: 1920px;

  /* Override defaults */
  --breakpoint-md: 850px;

  /* Remove a default */
  --breakpoint-2xl: initial;
}
```

## Container Queries

Style based on parent container size, not viewport:

### Basic Container Queries

```html tailwind
<!-- Mark parent as container -->
<div class="@container">
  <!-- Style children based on container size -->
  <div class="grid @md:grid-cols-2 @lg:grid-cols-3">
    <!-- Responsive to container, not viewport -->
  </div>
</div>
```

### Named Containers

```html tailwind
<!-- Named container -->
<div class="@container/sidebar">
  <nav class="@sm/sidebar:flex">...</nav>
</div>

<!-- Another named container -->
<div class="@container/main">
  <article class="@lg/main:prose-lg">...</article>
</div>
```

### Container Sizes

Default container breakpoints match viewport ones:

- `@sm`: 640px container
- `@md`: 768px container
- etc.

Customize in `@theme`:

```css
@theme {
  --container-xs: 320px;
  --container-3xl: 1600px;
}
```

### Arbitrary Container Queries

```html tailwind
<div class="@container">
  <div class="@max-[600px]:block @min-[400px]:flex">Custom container breakpoints</div>
</div>
```

## Complex Responsive Patterns

### Combining with Other Variants

```html tailwind
<!-- Dark mode + responsive + hover -->
<button
  class="bg-gray-100 hover:bg-gray-200 md:bg-white md:hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 dark:md:bg-gray-950 dark:md:hover:bg-gray-900"
>
  Complex responsive button
</button>
```

### Responsive Typography

```html tailwind
<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">Scales with viewport</h1>

<div class="@container">
  <h2 class="text-xl @sm:text-2xl @md:text-3xl">Scales with container</h2>
</div>
```

## Best Practices

1. **Start mobile-first** - Build for small screens, enhance for larger
2. **Use semantic breakpoints** - Match your design's natural break points
3. **Container queries for components** - More portable than viewport queries
4. **Test at all sizes** - Don't just test at exact breakpoints
5. **Avoid too many breakpoints** - Usually 3-4 is enough
