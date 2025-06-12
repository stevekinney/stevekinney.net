---
title: Flexbox Aligning Individual Items
description: "Override container alignment for specific flex items using Tailwind's align-self utilities."
modified: 2025-06-07T16:11:25-06:00
---

While `align-items` controls the alignment of all direct children in a flex container, `align-self` allows fine-tuning the alignment of a single item. Tailwind provides `self-*` utilities for this.

The `align-self` property overrides the container's `align-items` value for a specific flex item. For instance, if a container uses `align-items: center`, `align-self: flex-start` on a child aligns it to the start of the cross axis, while other items remain centered.

Tailwind's `self-*` utilities manage the `align-self` property.

## Controlling Individual Alignment with `align-self`

The `align-self` property sets a flex or grid item's alignment within its flex line or grid area, overriding the container's `align-items`.

Tailwind offers these `align-self` utilities:

- `self-auto`: Resets to the container's `align-items` value, or defaults to `stretch` if `align-items: normal`.
- `self-start`: Aligns item to the start of the container's cross axis.
- `self-end`: Aligns item to the end of the container's cross axis.
- `self-center`: Aligns item along the center of the container's cross axis.
- `self-stretch`: Stretches item to fill the container's cross axis, ignoring its dimensions unless constrained.
- `self-baseline`: Aligns item's baseline with other items in the same flex line or grid row.
- `self-baseline-last`: Aligns item's baseline with the last baseline in the container.
- `self-end-safe`: Aligns item to the end, but to the start if overflow would occur.
- `self-center-safe`: Aligns item to the center, but to the start if overflow would occur.

### Examples

Assume the container has `display: flex` or `display: inline-flex`.

#### Resetting to Container's Alignment

By default, `align-self` is `auto`, inheriting the container's `align-items`. `self-auto` makes this explicit.

```html tailwind
<div class="flex min-h-[200px] items-center gap-4 rounded-lg bg-gray-100 p-6">
  <div class="self-auto rounded-lg bg-blue-500 p-4 text-white">Item 1 (inherits center)</div>
  <div class="rounded-lg bg-green-500 p-4 text-white">Item 2 (inherits center)</div>
  <div class="rounded-lg bg-purple-500 p-4 text-white">Item 3 (inherits center)</div>
</div>
```

#### Aligning to the Start

`self-start` aligns an item to the beginning of the cross axis, regardless of `align-items`.

```html tailwind
<div class="flex min-h-[200px] items-center gap-4 rounded-lg bg-gray-100 p-6">
  <div class="self-start rounded-lg bg-blue-500 p-4 text-white">Item 1 (aligns to start)</div>
  <div class="rounded-lg bg-green-500 p-4 text-white">Item 2 (aligns to center)</div>
  <div class="rounded-lg bg-purple-500 p-4 text-white">Item 3 (aligns to center)</div>
</div>
```

#### Aligning to the End

`self-end` aligns an item to the end of the cross axis.

```html tailwind
<div class="flex min-h-[200px] items-center gap-4 rounded-lg bg-gray-100 p-6">
  <div class="rounded-lg bg-blue-500 p-4 text-white">Item 1 (aligns to center)</div>
  <div class="rounded-lg bg-green-500 p-4 text-white">Item 2 (aligns to center)</div>
  <div class="self-end rounded-lg bg-purple-500 p-4 text-white">Item 3 (aligns to end)</div>
</div>
```

#### Centering a Single Item

`self-center` centers a specific item when others have different alignments.

```html tailwind
<div class="flex min-h-[200px] items-start gap-4 rounded-lg bg-gray-100 p-6">
  <div class="rounded-lg bg-blue-500 p-4 text-white">Item 1 (aligns to start)</div>
  <div class="self-center rounded-lg bg-green-500 p-4 text-white">Item 2 (aligns to center)</div>
  <div class="rounded-lg bg-purple-500 p-4 text-white">Item 3 (aligns to start)</div>
</div>
```

`self-center-safe` is a safer alternative, avoiding overflow.

#### Stretching a Single Item

`self-stretch` makes an item fill the cross axis, overriding its size or `align-items`.

```html tailwind
<div class="flex min-h-[200px] items-start gap-4 rounded-lg bg-gray-100 p-6">
  <div class="rounded-lg bg-blue-500 p-4 text-white">Item 1 (aligns to start)</div>
  <div class="self-stretch rounded-lg bg-green-500 p-4 text-white">Item 2 (stretches)</div>
  <div class="rounded-lg bg-purple-500 p-4 text-white">Item 3 (aligns to start)</div>
</div>
```

#### Aligning Baselines

`self-baseline` aligns text baselines of items, even with different content heights. `self-baseline-last` aligns to the last baseline.

```html tailwind
<div class="flex min-h-[200px] items-stretch gap-4 rounded-lg bg-gray-100 p-6">
  <div class="rounded-lg bg-blue-500 p-4 text-white">Item 1 (stretches)</div>
  <div class="self-baseline rounded-lg bg-green-500 p-4 text-white">
    Item 2 (aligns to baseline)
  </div>
  <div class="rounded-lg bg-purple-500 p-4 text-white">Item 3 (stretches)</div>
</div>
```

### Arbitrary Values and Custom Properties

For values not covered by predefined utilities or for using CSS variables, Tailwind supports `self-[]` (arbitrary values) and `self-()` (custom properties).

For example, `self-[flex-start]` is like `self-start`. `self-(--my-custom-alignment)` sets `align-self` to the value of `--my-custom-alignment`.

## Responsive Alignment

Individual item alignment can change with viewport or container size. Tailwind's `self-*` utilities support responsive design via prefixes.

### Viewport Breakpoints

Apply `self-*` utilities conditionally with breakpoint prefixes (e.g., `sm:`, `md:`, `lg:`).

```html tailwind
<div class="flex min-h-[200px] items-start gap-4 rounded-lg bg-gray-100 p-6 md:items-center">
  <div class="self-end rounded-lg bg-blue-500 p-4 text-white md:self-auto">Item 1</div>
  <div class="rounded-lg bg-green-500 p-4 text-white">Item 2</div>
  <div class="rounded-lg bg-purple-500 p-4 text-white">Item 3</div>
</div>
```

Item 1 aligns to `end` by default. On medium screens (`md`) and up, the container centers items (`md:items-center`), and Item 1 inherits this (`md:self-auto`), also centering.

### Container Queries

Adjust item alignment based on parent container size using `@container` and variants like `@sm:`, `@md:`.

```html tailwind
<div class="@container flex min-h-[200px] items-center gap-4 rounded-lg bg-gray-100 p-6">
  <div class="self-start rounded-lg bg-blue-500 p-4 text-white @md:self-end">Item 1</div>
  <div class="rounded-lg bg-green-500 p-4 text-white">Item 2</div>
</div>
```

Item 1 aligns `start` by default. When the parent `@container` reaches the `@md` breakpoint, Item 1 aligns `end` (`@md:self-end`).

Combining `align-self` utilities with responsive features and arbitrary values enables nuanced, responsive layouts.
