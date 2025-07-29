---
title: Grid Alignment and Justification
description: >-
  Master CSS Grid alignment with Tailwind utilities for aligning and justifying
  content, items, and self positioning.

modified: 2025-06-11T19:05:33-06:00
---

Controlling alignment and justification of items within grid areas and content within the grid container is fundamental to CSS Grid. Tailwind CSS provides utility classes for managing these properties directly in HTML.

## Setting Up a Grid Container

First, define an element as a grid container using `grid` or `inline-grid` display utilities.

```html tailwind
<div class="grid gap-4 rounded-lg bg-gray-100 p-4">
  <div class="rounded bg-blue-200 p-4">Grid item 1</div>
  <div class="rounded bg-red-200 p-4">Grid item 2</div>
</div>

<div class="inline-grid gap-4 rounded-lg bg-gray-100 p-4">
  <div class="rounded bg-green-200 p-4">Inline grid item 1</div>
  <div class="rounded bg-yellow-200 p-4">Inline grid item 2</div>
</div>
```

Direct children of a grid container become grid items. Define grid structure with `grid-cols-<number>` (columns) and `grid-rows-<number>` (rows), and spacing with `gap-<number>`. Alignment and justification utilities position these items and tracks.

## Aligning and Justifying Items Within Their Areas

These utilities apply to the grid container (affecting all direct children) or individual grid items (overriding container settings), controlling item placement within their assigned grid area.

### Aligning Items on the Cross Axis

The `align-items` property controls grid item alignment along the container's cross axis (typically vertical in `grid-flow-row`). Apply to the grid container.

Utilities:

- `items-start`: Aligns items to the cross axis start.
- `items-end`: Aligns items to the cross axis end. (`items-end-safe` aligns to start if space is insufficient).
- `items-center`: Aligns items to the cross axis center. (`items-center-safe` aligns to start if space is insufficient).
- `items-stretch`: Stretches items to fill the cross axis.
- `items-baseline`: Aligns items along their baselines. (`items-baseline-last` for last baseline).

```html tailwind
<div class="grid h-32 grid-cols-3 items-center gap-4 rounded-lg bg-gray-100 p-4">
  <div class="rounded bg-blue-200 p-4">Item 1</div>
  <div class="rounded bg-red-200 p-4">Item 2</div>
  <div class="rounded bg-green-200 p-4">Item 3</div>
</div>
```

### Justifying Items on the Inline Axis

The `justify-items` property controls grid item alignment along their inline axis (typically horizontal in `grid-flow-row`). Apply to the grid container.

Utilities:

- `justify-items-start`: Justifies items against their inline axis start.
- `justify-items-end`: Justifies items against their inline axis end. (`justify-items-end-safe` aligns to start if space is insufficient).
- `justify-items-center`: Justifies items against their inline axis center. (`justify-items-center-safe` aligns to start if space is insufficient).
- `justify-items-stretch`: Stretches items along their inline axis.
- `justify-items-normal`: Default item packing.

```html tailwind
<div class="grid grid-cols-3 justify-items-center gap-4 rounded-lg bg-gray-100 p-4">
  <div class="w-16 rounded bg-blue-200 p-4">Item 1</div>
  <div class="w-20 rounded bg-red-200 p-4">Item 2</div>
  <div class="w-12 rounded bg-green-200 p-4">Item 3</div>
</div>
```

### Aligning and Justifying Items Simultaneously

The `place-items` property is a shorthand for `align-items` and `justify-items`. Applied to the grid container. One value applies to both axes; two values apply to `align-items` (cross) then `justify-items` (inline).

Utilities:

- `place-items-start`: `align-items: start`, `justify-items: start`.
- `place-items-end`: `align-items: end`, `justify-items: end`. (`place-items-end-safe` available).
- `place-items-center`: `align-items: center`, `justify-items: center`. (`place-items-center-safe` available).
- `place-items-baseline`: `align-items: baseline`, `justify-items: baseline`.
- `place-items-stretch`: `align-items: stretch`, `justify-items: stretch`.

```html tailwind
<div class="grid h-32 grid-cols-3 place-items-center gap-4 rounded-lg bg-gray-100 p-4">
  <div class="rounded bg-blue-200 p-3">Item 1</div>
  <div class="rounded bg-red-200 p-3">Item 2</div>
  <div class="rounded bg-green-200 p-3">Item 3</div>
</div>
```

### Aligning and Justifying Individual Items

Override container-level settings for individual items using `align-self`, `justify-self`, and `place-self`. Apply directly to the grid item.

- `align-self`: Overrides `align-items` for an item. Utilities: `self-auto`, `self-start`, `self-end`, `self-center`, `self-stretch`, `self-baseline`, `self-baseline-last`.
- `justify-self`: Overrides `justify-items` for an item. Utilities: `justify-self-auto`, `justify-self-start`, `justify-self-center`, `justify-self-end`, `justify-self-stretch`. (Safe variants available).
- `place-self`: Shorthand for `align-self` and `justify-self`. Utilities: `place-self-auto`, `place-self-start`, `place-self-end`, `place-self-center`, `place-self-stretch`. (Safe variants available).

```html tailwind
<div class="grid h-32 grid-cols-3 items-start justify-items-start gap-4 rounded-lg bg-gray-100 p-4">
  <div class="rounded bg-blue-200 p-4">Item 1</div>
  <div class="self-center justify-self-end rounded bg-red-200 p-4">Item 2</div>
  <div class="rounded bg-green-200 p-4">Item 3</div>
</div>
```

## Aligning and Justifying Content Within the Container

These utilities distribute grid tracks (rows/columns) within the grid container, used when there's extra space. Apply to the grid container.

### Aligning Content on the Cross Axis

The `align-content` property positions rows along the cross axis when total row height is less than container height.

Utilities:

- `content-start`, `content-end`, `content-center`
- `content-between`: Equal space between rows.
- `content-around`: Equal space around rows.
- `content-evenly`: Equal space around each row, including ends.
- `content-stretch`: Rows fill available cross-axis space.
- `content-baseline`, `content-normal`

```html tailwind
<div class="grid h-64 grid-rows-3 content-center gap-2 rounded-lg bg-gray-100 p-4">
  <div class="rounded bg-blue-200 p-4">Row 1</div>
  <div class="rounded bg-red-200 p-4">Row 2</div>
  <div class="rounded bg-green-200 p-4">Row 3</div>
</div>
```

### Justifying Content on the Main Axis

The `justify-content` property positions columns (or the grid) along the main axis when total column width is less than container width.

Utilities:

- `justify-start`, `justify-end` (`justify-end-safe` available).
- `justify-center` (`justify-center-safe` available).
- `justify-between`: Equal space between tracks.
- `justify-around`: Equal space around tracks.
- `justify-evenly`: Equal space around each track, including ends.
- `justify-stretch`: Tracks fill available main-axis space.
- `justify-normal`, `justify-baseline`

```html tailwind
<div class="grid w-64 grid-cols-3 justify-center gap-2 rounded-lg bg-gray-100 p-4">
  <div class="col-span-1 rounded bg-blue-200 p-4">Item 1</div>
  <div class="col-span-1 rounded bg-red-200 p-4">Item 2</div>
</div>
```

### Aligning and Justifying Content Simultaneously

The `place-content` property is a shorthand for `align-content` and `justify-content`. Applied to the grid container. One value for both axes; two values for `align-content` (cross) then `justify-content` (main).

Utilities:

- `place-content-start`, `place-content-end` (`place-content-end-safe` available).
- `place-content-center` (`place-content-center-safe` available).
- `place-content-baseline`, `place-content-stretch`
- `place-content-between`, `place-content-around`, `place-content-evenly`

```html tailwind
<div class="grid h-64 w-64 grid-cols-3 place-content-center gap-2 rounded-lg bg-gray-100 p-4">
  <div class="col-span-1 rounded bg-blue-200 p-4">Item 1</div>
  <div class="col-span-1 rounded bg-red-200 p-4">Item 2</div>
</div>
```

## Examples and Usage Tips

### Responsive Design

All Grid alignment utilities support responsive variants (e.g., `md:justify-items-start`) for adaptive layouts. Unprefixed utilities apply to all screen sizes; prefixed utilities apply at the specified breakpoint and above.

```html tailwind
<div
  class="grid grid-cols-1 justify-items-center gap-4 rounded-lg bg-gray-100 p-4 md:grid-cols-2 md:justify-items-start lg:grid-cols-3"
>
  <div class="min-h-[80px] rounded bg-blue-200 p-4">Grid item 1</div>
  <div class="min-h-[80px] rounded bg-red-200 p-4">Grid item 2</div>
  <div class="min-h-[80px] rounded bg-green-200 p-4">Grid item 3</div>
  <div class="min-h-[80px] rounded bg-yellow-200 p-4">Grid item 4</div>
  <div class="min-h-[80px] rounded bg-purple-200 p-4">Grid item 5</div>
  <div class="min-h-[80px] rounded bg-pink-200 p-4">Grid item 6</div>
</div>
```

Items are centered by default, then `justify-items-start` on medium screens and up.

### Arbitrary Values

Use arbitrary values `[]` for specific CSS values not in the default theme, though less common for alignment than for colors or spacing.

### CSS-First Configuration in Tailwind 4

Tailwind 4 emphasizes CSS-first configuration via `@theme` in your CSS file. While alignment utilities are used in HTML, their underlying values (like spacing for `gap-<number>`) are defined by CSS variables customizable in `@theme`.
