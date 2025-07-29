---
title: Grid Arbitrary Column Counts
description: >-
  Define custom grid column structures using arbitrary values and CSS variables
  for maximum layout flexibility.

modified: 2025-06-11T19:05:33-06:00
---

CSS Grid in Tailwind CSS allows building complex, responsive layouts in HTML. Tailwind translates native CSS features like `grid-template-columns` into concise classes.

## Defining Grid Columns

Tailwind provides utilities for grid column structure. Classes like `grid-cols-1` to `grid-cols-12` (and beyond via configuration) create grids with a fixed number of equal columns. `grid-cols-none` specifies no grid columns.

Utilities like `grid-cols-4` generate CSS like `grid-template-columns: repeat(4, minmax(0, 1fr));`, creating flexible, equal-width columns.

### Implementing a Subgrid for Columns

For nested grid items needing alignment with parent column tracks, Tailwind supports CSS `subgrid`. The `grid-cols-subgrid` utility makes a grid item adopt its parent's column tracks, ensuring alignment across nesting levels.

### Using Arbitrary Column Definitions

For custom column definitions not covered by standard patterns, Tailwind's arbitrary value support is useful. Use `grid-cols-[<value>]` to set `grid-template-columns` to any valid CSS value.

This syntax `[]` allows custom track sizes, repeat functions, or CSS variables, breaking from predefined theme constraints.

#### Defining Custom Track Lists

Provide a custom track list string within square brackets.

```html tailwind
<div class="grid grid-cols-[200px_1fr_1fr] gap-4 rounded-lg bg-gray-100 p-4">
  <div class="flex min-h-[80px] items-center justify-center rounded bg-blue-200 p-4">
    Fixed 200px
  </div>
  <div class="flex min-h-[80px] items-center justify-center rounded bg-red-200 p-4">
    Flexible 1fr
  </div>
  <div class="flex min-h-[80px] items-center justify-center rounded bg-green-200 p-4">
    Flexible 1fr
  </div>
</div>
```

This gives granular control, allowing combined fixed, flexible, and content-based track sizes (`min-content`, `max-content`, `auto`).

#### Using `repeat()` with Arbitrary Values

Use the CSS `repeat()` function within arbitrary values for patterns, like a dynamic number of columns or repeating, non-equal width columns.

Example: Variable number of equal-width columns.

```html tailwind
<div
  class="grid grid-cols-[repeat(var(--col-count),_1fr)] gap-4 rounded-lg bg-gray-100 p-4"
  style="--col-count: 4;"
>
  <div class="flex min-h-[80px] items-center justify-center rounded bg-blue-200 p-4">Item 1</div>
  <div class="flex min-h-[80px] items-center justify-center rounded bg-red-200 p-4">Item 2</div>
  <div class="flex min-h-[80px] items-center justify-center rounded bg-green-200 p-4">Item 3</div>
  <div class="flex min-h-[80px] items-center justify-center rounded bg-yellow-200 p-4">Item 4</div>
</div>
```

`--col-count` can be controlled by CSS variables (potentially set by JavaScript or other CSS). For CSS variables as arbitrary values, Tailwind also supports `grid-cols-(--col-definition)`.

#### Dynamic Column Counts via Arbitrary Values

Combining arbitrary values with CSS variables enables dynamic column counts. Define a CSS variable (e.g., via `@theme` or standard CSS) holding the `grid-template-columns` value, then reference it with `grid-cols-(<custom-property>)`.

If `--dynamic-cols: repeat(3, auto) 1fr;`, use `class="grid grid-cols-(--dynamic-cols)"`. This allows flexible grid definitions responsive to CSS variable changes.

`grid-cols-[<value>]` and `grid-cols-(<custom-property>)` provide ways to define any grid column structure with standard CSS syntax, enabling custom or dynamic grid layouts in Tailwind. This differs from `grid-cols-subgrid`, which inherits parent tracks.
