---
title: Defining Grid Columns and Rows
description: >-
  Create grid layouts with precise column and row definitions using Tailwind's
  grid template utilities.
modified: 2025-06-11T19:05:33-06:00
---

Defining grid structure, including columns and rows, is essential for complex layouts. Tailwind CSS provides utilities to do this directly in your markup.

## Defining Grid Columns

Tailwind offers utilities for specifying grid columns, allowing for fixed numbers of equally sized columns or more complex structures.

### Specifying a Fixed Number of Columns

The `grid-cols-<number>` utility (e.g., `grid-cols-2`, `grid-cols-4`) creates a grid with the specified number of columns. These columns will equally share the available space using `minmax(0, 1fr)`.

### Removing Grid Columns

To remove grid columns, such as at a breakpoint for a stacked layout, use `grid-cols-none`. This sets `grid-template-columns` to `none`.

### Implementing a Subgrid

The `grid-cols-subgrid` utility allows a grid item to adopt the column tracks of its parent grid. This is useful for aligning nested grid items with the parent structure.

### Using Custom Column Values

For advanced column definitions not covered by default utilities, use arbitrary values with `grid-cols-[<value>]`. This sets `grid-template-columns` to any valid CSS value (e.g., `grid-cols-[200px_1fr_200px]`). You can also use CSS variables: `grid-cols-(<custom-property>)`, which sets the property to `var(<custom-property>)`. This is helpful for custom column tracks defined in your theme.

### Responsive Grid Columns

Grid column utilities can be applied conditionally at different breakpoints (e.g., `md:grid-cols-3`) or using container query variants (e.g., `@md:grid-cols-3`) to change column numbers based on viewport or container size.

## Defining Grid Rows

Similar to columns, Tailwind provides utilities for specifying grid rows.

### Specifying a Fixed Number of Rows

Use `grid-rows-<number>` (e.g., `grid-rows-2`) to create a grid with a set number of rows. These rows will equally share available space using `minmax(0, 1fr)`.

### Removing Grid Rows

The `grid-rows-none` utility removes grid rows by setting `grid-template-rows` to `none`.

### Implementing a Subgrid

`grid-rows-subgrid` allows a grid item to adopt its parent grid's row tracks, similar to `grid-cols-subgrid`.

### Using Custom Row Values

Use `grid-rows-[<value>]` for specific row definitions. CSS variables can be referenced with `grid-rows-(<custom-property>)`.

### Responsive Grid Rows

Grid row utilities are responsive and can be combined with breakpoint variants (e.g., `md:grid-rows-2`) and container query variants (e.g., `@md:grid-rows-2`).

## Implicit Grid Tracks

CSS Grid can automatically create columns or rows for items not explicitly placed. Tailwind provides utilities to control the size of these implicitly-created tracks.

### Controlling Implicit Columns

Use `grid-auto-columns` utilities (`auto-cols-auto`, `auto-cols-min`, `auto-cols-max`, `auto-cols-fr`) to control the size of implicitly created columns. For example, `auto-cols-min` sets implicit column size to `min-content`. Arbitrary values `auto-cols-[<value>]` and CSS variables `auto-cols-(<custom-property>)` are also supported.

### Controlling Implicit Rows

Similarly, `grid-auto-rows` utilities (`auto-rows-auto`, `auto-rows-min`, `auto-rows-max`, `auto-rows-fr`) control the size of implicitly created rows. `auto-rows-max` sets implicit row size to `max-content`. Custom values are supported via `auto-rows-[<value>]` and `auto-rows-(<custom-property>)`.

## Grid Auto-Placement

The `grid-auto-flow` property controls how items are automatically placed. Tailwind provides utilities for this.

Use `grid-flow-row` (default) to fill rows, adding new rows as needed. Use `grid-flow-col` to fill columns, adding new columns as needed. `grid-flow-dense` attempts to fill earlier grid holes, potentially disrupting visual order but optimizing space. Combine with directional keywords using `grid-flow-row-dense` or `grid-flow-col-dense`.

## Customizing Grid Templates

In Tailwind, customize grid templates using CSS variables and the `@theme` directive in your main CSS file. Define `--grid-template-columns-*` and `--grid-template-rows-*` variables within an `@theme` block.

Example:

```css
@import 'tailwindcss';

@theme {
  --grid-template-columns-layout: 200px 1fr 200px;
  --grid-template-rows-header: auto;
}
```

These become utility classes like `grid-cols-layout` and `grid-rows-header`. Adding new variables is like `extend` in previous versions. To override defaults, clear the namespace (e.g., `--grid-template-columns-*: initial`) before defining custom values. To start without defaults, import `tailwindcss/preflight` and `tailwindcss/utilities` directly.

Theme values, including grid templates, are available as native CSS variables, usable in arbitrary values with `var()` or custom CSS. When defining theme variables that reference others, use the `inline` option with `@theme`.

This CSS-first approach offers a native way to define and use design tokens.
