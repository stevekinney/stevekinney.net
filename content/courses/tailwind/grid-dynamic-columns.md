---
title: Grid Dynamic Columns
description: Implement dynamic grid columns with subgrids for perfectly aligned nested layouts in CSS Grid.
---

Tailwind CSS simplifies working with dynamic columns, especially with subgrids, using its grid utilities.

Modern CSS features like `subgrid` enable intricate, responsive designs in HTML. Tailwind's utility-first approach makes complex CSS Grid concepts easy to use.

## Implementing Subgrids for Columns

The `subgrid` value for `grid-template-columns` is key for aligned nested layouts. Tailwind exposes this via `grid-cols-subgrid`.

Applying `grid-cols-subgrid` to a grid item (that is also a grid container) tells the child grid to adopt its parent's column tracks instead of defining its own. This is vital for maintaining alignment across nested elements.

### How `grid-cols-subgrid` Works

Consider a main layout with a specific column grid. An element within a cell of this main grid needs its own columns to align precisely with the parent's. Without `subgrid`, manually matching child grid columns to the parent is error-prone, especially with responsive designs.

`grid-cols-subgrid` makes the child grid container inherit its parent's column structure. Children of this subgrid container can then use the parent grid's column lines for placement and spanning.

Example:

```html tailwind
<div class="grid grid-cols-12 gap-4 rounded-lg bg-gray-100 p-4">
  <!-- Parent container: 12-column grid -->
  <div class="col-span-full grid grid-cols-subgrid gap-4">
    <!-- Child item: spans all parent columns, becomes a subgrid -->
    <div class="col-span-4 flex min-h-[80px] items-center justify-center rounded bg-blue-200 p-4">
      Item 1 (spans parent cols 1-4)
    </div>
    <div class="col-span-4 flex min-h-[80px] items-center justify-center rounded bg-red-200 p-4">
      Item 2 (spans parent cols 5-8)
    </div>
    <div class="col-span-4 flex min-h-[80px] items-center justify-center rounded bg-green-200 p-4">
      Item 3 (spans parent cols 9-12)
    </div>
  </div>
  <div class="col-span-4 flex min-h-[80px] items-center justify-center rounded bg-yellow-200 p-4">
    Another parent grid item (spans cols 1-4)
  </div>
  <div class="col-span-8 flex min-h-[80px] items-center justify-center rounded bg-purple-200 p-4">
    Another parent grid item (spans cols 5-12)
  </div>
</div>
```

The `div` with `col-span-full grid grid-cols-subgrid gap-4` is a child of the main `grid grid-cols-12`. It spans all 12 parent columns. Because of `grid grid-cols-subgrid`, its internal layout uses the parent's 12 column tracks and gap. Its children (`Item 1`, `Item 2`, `Item 3`) use `col-span-4` relative to the inherited 12-column structure, ensuring perfect alignment with the parent grid. This is useful for nested components needing visual alignment with the overall page grid.

### Subgrids and Dynamic Content

The "dynamic" aspect often refers to the subgrid's content, not its definition. If items within the subgrid are dynamic (e.g., from an API, conditionally rendered), `grid-cols-subgrid` ensures they align to the parent's column tracks. The layout structure (column lines) remains stable and inherited, simplifying dynamic interface management.

While `grid-cols-subgrid` inherits parent tracks, Tailwind also allows defining dynamic column tracks on a grid container using arbitrary values: `grid-cols-[<value>]` or `grid-cols-(<custom-property>)`. For example, `grid-cols-[200px_1fr_200px]` or `grid-cols-(--my-layout-cols)`. This offers flexibility for dynamic grid definitions when `subgrid` isn't needed (i.e., not inheriting, but needing non-standard or dynamic track sizes). However, for strict nested alignment, `grid-cols-subgrid` is the choice.

In summary, `grid-cols-subgrid` is Tailwind's utility for CSS `subgrid` on `grid-template-columns`, enabling nested grids to inherit parent column tracks for precise alignment. This is crucial for complex layouts with dynamic content while maintaining a consistent grid structure.
