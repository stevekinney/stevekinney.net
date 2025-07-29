---
title: 'Placing Grid Items: Spanning and Positioning'
description: >-
  Control grid item placement with Tailwind's spanning and positioning utilities
  for CSS Grid.

modified: 2025-06-11T19:05:33-06:00
---

This guide covers placing items within a grid using Tailwind CSS, focusing on spanning and positioning.

## Placing Grid Items: Spanning

After defining grid columns and rows (e.g., `grid-cols-4`, `grid-rows-3`), place items by making them span multiple columns or rows.

### Spanning a Fixed Number of Columns

Use `col-span-<number>` to make an item span columns (e.g., `col-span-2` spans two columns). This applies `grid-column: span <number> / span <number>`.

Use `col-span-full` to span all columns (`grid-column: 1 / -1`).

### Spanning a Fixed Number of Rows

Use `row-span-<number>` to make an item span rows (e.g., `row-span-2` spans two rows). This applies `grid-row: span <number> / span <number>`.

Use `row-span-full` to span all rows (`grid-row: 1 / -1`).

### Spanning with Custom Values

For custom spanning, use `col-span-[<value>]` and `row-span-[<value>]`. Reference CSS variables with `col-span-(<custom-property>)` or `row-span-(<custom-property>)`.

## Placing Grid Items: Positioning

Position grid items by specifying their start or end grid lines.

### Starting and Ending Columns

Use `col-start-<number>` to set the start column line (e.g., `col-start-3`). Use `col-end-<number>` for the end column line (e.g., `col-end-5`). These set `grid-column-start` and `grid-column-end`.

Use `col-start-auto` and `col-end-auto` for auto-placement.

### Starting and Ending Rows

Use `row-start-<number>` for the start row line (e.g., `row-start-2`). Use `row-end-<number>` for the end row line (e.g., `row-end-4`). These set `grid-row-start` and `grid-row-end`.

Use `row-start-auto` and `row-end-auto` for auto-placement.

### Using Negative Values for Positioning

Prefix positioning utilities with a dash for negative values (e.g., `-col-start-2`, `-row-end-3`). These translate to negative values for `grid-column-start` and `grid-row-end`.

### Combining Spanning and Positioning

Combine start/end utilities with span utilities (e.g., `col-start-2 col-span-3` starts at column line 2 and spans 3 columns).

### Shorthand Positioning Utilities

Use `col-<number>` and `row-<number>` as shorthand. These set `grid-column` and `grid-row` to the specified grid line (e.g., `col-3` starts at column line 3, ends at 4). Negative values are supported (e.g., `-col-2`).

### Positioning with Custom Values

Use arbitrary values: `col-start-[<value>]`, `col-end-[<value>]`, `row-start-[<value>]`, `row-end-[<value>]`, `col-[<value>]`, and `row-[<value>]`. Reference CSS variables with parentheses (e.g., `row-start-(<custom-property>)`).

## Responsive Grid Item Placement

All grid placement utilities are responsive. Apply them conditionally at breakpoints (`md:`, `lg:`) or with container query variants (`@md:`).

Example: `col-span-1 md:col-span-3`.

Tailwind 4 allows container queries (`@md:`) for placement based on parent container size.

## Customizing Grid Item Values

In Tailwind 4, define custom grid placement values using CSS variables with `@theme`. Reference these variables in arbitrary value syntax (e.g., `col-span-(layout)` if `--grid-column-span-layout: 3` is defined).

## Interaction with Auto-Placement

Explicit placement overrides default auto-placement. Unplaced items or those creating implicit tracks follow auto-placement rules. Control implicit track sizes with `grid-auto-columns` and `grid-auto-rows`, and flow with `grid-auto-flow` (e.g., `grid-flow-row-dense`).
