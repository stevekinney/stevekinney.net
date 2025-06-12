---
title: Complex Grid Templates
description: Build advanced grid layouts using Tailwind's grid template utilities for complex multi-column and row designs.
---

Tailwind CSS offers utilities for grid layouts, controlling grid structure and item placement. Defining the grid template (columns and rows) is key.

## Specifying Grid Structures

Tailwind utilities map to CSS `grid-template-columns` and `grid-template-rows` to define grid tracks (columns and rows).

### Defining Columns

Use `grid-cols-*` utilities for columns. For a fixed number of equal columns, use `grid-cols-2` (two columns) or `grid-cols-4` (four columns). This generates CSS like `grid-template-columns: repeat(<number>, minmax(0, 1fr));`, creating flexible columns that don't shrink below zero.

Use `grid-cols-none` to remove column definitions (`grid-template-columns: none;`).

### Defining Rows

Use `grid-rows-*` utilities for rows, similar to columns. `grid-rows-2` or `grid-rows-4` create a fixed number of equal rows, generating `grid-template-rows: repeat(<number>, minmax(0, 1fr));`.

Use `grid-rows-none` to remove row definitions (`grid-template-rows: none;`).

### Implementing Subgrids

For nested grids, Tailwind supports subgrids. `grid-cols-subgrid` makes a nested grid adopt its parent's column tracks (`grid-template-columns: subgrid`). Similarly, `grid-rows-subgrid` adopts parent row tracks (`grid-template-rows: subgrid`).

### Advanced Template Definitions

For precise control, Tailwind offers options for complex grid templates using arbitrary values and CSS custom properties.

#### Using Arbitrary Values

Define grid templates with arbitrary values in HTML using square brackets: `grid-cols-[<value>]` for columns and `grid-rows-[<value>]` for rows. `<value>` can be any valid CSS for `grid-template-columns` or `grid-template-rows` respectively. This allows mixing units (px, rem, fr), named grid lines, or functions like `repeat()`, `minmax()`, `fit-content()`.

Example: `grid-cols-[200px_1fr]` for a fixed sidebar and flexible content, or `grid-template-columns: [sidebar-start] 1fr [sidebar-end content-start] 2fr [content-end];` for named lines.

#### Using Custom Properties

Define complex grid templates with CSS custom properties (variables) and reference them in Tailwind classes: `grid-cols-(<custom-property>)` for columns and `grid-rows-(<custom-property>)` for rows. Manage complex grid definitions in CSS and apply them with Tailwind.

Define custom properties in your CSS (e.g., in `@theme` or `:root`) and apply with `grid-cols-(...)` or `grid-rows-(...)`.

## Responsive Grid Templates

Apply grid template utilities conditionally based on viewport width using responsive variants (`md:`, `lg:`).

Example: Start with a single column layout, then switch to multi-column at larger breakpoints. `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` creates one column by default, two on medium screens, and three on large screens.

This applies to all grid template utilities, including those with arbitrary values or custom properties, allowing different complex grid structures at various breakpoints.

After defining the grid template, position and size items using utilities like `col-span-*`, `row-span-*`, `col-start-*`, etc., and control spacing with `gap-*`. These operate within the defined grid template.
