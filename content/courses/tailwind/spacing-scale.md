---
title: Spacing Scale
description: How Tailwind's spacing scale powers utilities for margin, padding, gap, and sizing with the --spacing CSS variable.
---

The **spacing scale** in Tailwind CSS is a predefined set of values for utilities that control space: `margin`, `padding`, `gap`, `width`, `height`, and others. In Tailwind 4, the numeric spacing scale is driven by the `--spacing` CSS variable.

## How the Spacing Scale Works

1. **Based on `var(--spacing)`:** The core of the numeric spacing scale is the `--spacing` CSS variable. Utility classes with numbers (like `p-4`, `m-8`, `w-12`, `gap-6`) are generated using `calc(var(--spacing) * <number>)`. For example, `w-4` results in `width: calc(var(--spacing) * 4);`. The base unit `var(--spacing)` is typically `0.25rem`.

2. **Utilities That Use the Spacing Scale:** The numeric spacing scale is used by:

   - **`margin`**: `m-<number>`, `mx-<number>`, `my-<number>`, `mt-<number>`, `mr-<number>`, `mb-<number>`, `ml-<number>`, `ms-<number>`, `me-<number>`
   - **`padding`**: `p-<number>`, `px-<number>`, `py-<number>`, `pt-<number>`, `pr-<number>`, `pb-<number>`, `pl-<number>`, `ps-<number>`, `pe-<number>`
   - **`gap`**: `gap-<number>`, `gap-x-<number>`, `gap-y-<number>`
   - **`space-between`**: `space-x-<number>`, `space-y-<number>`
   - **`width`**: `w-<number>`
   - **`height`**: `h-<number>`
   - **`size` (width & height)**: `size-<number>`
   - **`flex-basis`**: `basis-<number>` (integer numbers use `var(--spacing)`)
   - **`line-height`**: `leading-<number>`
   - **`text-indent`**: `indent-<number>`
   - **`scroll-margin`**: `scroll-m-<number>`, `scroll-mx-<number>`, etc.
   - **`scroll-padding`**: `scroll-p-<number>`, `scroll-px-<number>`, etc.
   - **`positioning`**: `inset-<number>`, `top-<number>`, `right-<number>`, `bottom-<number>`, `left-<number>`, `inset-x-<number>`, `inset-y-<number>`, `start-<number>`, `end-<number>`
   - **`translate`**: `translate-<number>`, `translate-x-<number>`, `translate-y-<number>`, `translate-z-<number>`

3. **Distinction from Container Scale:** Numeric utilities use the spacing scale (e.g., `w-16`, `basis-20`). Named size utilities (e.g., `w-sm`, `max-w-xl`, `basis-md`) use the **container scale** defined by `--container-*` CSS variables.

## Customization in Tailwind 4

Customize the spacing scale using CSS-first configuration with the `@theme` directive:

- Define or override values in the `--spacing` namespace within `@theme`
- Customizing base `var(--spacing)` affects all utilities using `calc(var(--spacing) * <number>)`
- All theme values are exposed as native CSS variables for use in custom CSS

## Using Arbitrary Values

Use square bracket notation for custom values (e.g., `p-[17px]`). Combine with `calc()` and `var(--spacing)` for calculations tied to the base spacing unit: `p-[calc(var(--spacing)*5 + 2px)]`.

The spacing scale, rooted in `var(--spacing)`, powers numeric utilities for controlling space and size in Tailwind. This is distinct from named sizes provided by the container scale (`var(--container-*)`) used in utilities like `width`, `max-width`, `min-width`, `flex-basis`, and `columns`.
