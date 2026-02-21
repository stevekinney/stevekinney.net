---
title: Grid Subgrids
description: >-
  Use CSS subgrids in Tailwind to inherit parent grid tracks for aligned nested
  grid structures.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

Tailwind CSS uses utility classes to build complex, responsive UIs in HTML. Version 4.0 improves performance and embraces modern CSS.

## Working with Grid Layouts

Tailwind CSS provides utilities for CSS Grid to create complex layouts. Define grid columns and rows, control auto-placement, and position grid items.

### Grid Columns

Define grid column numbers with utilities like `grid-cols-<number>` (e.g., `grid-cols-2`, `grid-cols-4`) for equally sized columns. Use `grid-cols-none` for no grid columns.

#### Implementing a Subgrid for Columns

Tailwind CSS supports subgrids for columns. Use `grid-cols-subgrid` to adopt column tracks from the parent item. This aligns nested grid items with their parent grid container.

```html tailwind
<div class="grid grid-cols-12 gap-4 rounded-lg bg-gray-100 p-4">
  <!-- Parent container: 12-column grid -->
  <div class="col-span-full grid grid-cols-subgrid gap-4">
    <!-- Child item: spans all parent columns, becomes a subgrid -->
    <div class="col-span-4 flex min-h-[80px] items-center justify-center rounded bg-blue-200 p-4">
      Item 1
    </div>
    <div class="col-span-4 flex min-h-[80px] items-center justify-center rounded bg-red-200 p-4">
      Item 2
    </div>
    <div class="col-span-4 flex min-h-[80px] items-center justify-center rounded bg-green-200 p-4">
      Item 3
    </div>
  </div>
</div>
```

A child element with `grid-cols-subgrid` inherits its parent's column structure.

### Grid Rows

Specify grid rows with utilities like `grid-rows-<number>` (e.g., `grid-rows-2`, `grid-rows-4`) for equally sized rows. Use `grid-rows-none` to remove grid rows.

#### Implementing a Subgrid for Rows

Use `grid-rows-subgrid` for a grid item to adopt row tracks from its parent. This maintains vertical alignment in nested grid structures.

```html tailwind
<div class="grid h-64 grid-rows-6 gap-4 rounded-lg bg-gray-100 p-4">
  <!-- Parent container: 6-row grid, fixed height -->
  <div class="row-span-full grid grid-rows-subgrid gap-4">
    <!-- Child item: spans all parent rows, becomes a subgrid -->
    <div class="row-span-2 flex items-center justify-center rounded bg-blue-200 p-4">
      Row Item 1
    </div>
    <div class="row-span-2 flex items-center justify-center rounded bg-red-200 p-4">Row Item 2</div>
    <div class="row-span-2 flex items-center justify-center rounded bg-green-200 p-4">
      Row Item 3
    </div>
  </div>
</div>
```

The child element with `grid-rows-subgrid` aligns its rows with the parent grid's row tracks.

Subgrid utilities mirror native CSS Grid capabilities, offering a utility-based approach for this layout feature in Tailwind.
