---
title: Grid Multi-column Layouts Columns Utility
description: >-
  Create magazine-style layouts with CSS multi-column using Tailwind's columns
  utilities.

modified: 2025-06-11T19:05:33-06:00
---

CSS multi-column layouts are useful for text-heavy content like articles. The CSS `columns` property distributes content into a specified number of columns or columns of a minimum width. Tailwind CSS provides utilities that map to this property.

## Defining Multi-column Layouts

Tailwind's utilities for the CSS `columns` property create multi-column containers. You can specify the number of columns or an ideal column width.

### Setting the Number of Columns

Use `columns-<number>` utilities for a fixed number of columns. For example, `columns-3` divides content into three columns. The browser calculates column width to fit the container.

```html tailwind
<div class="columns-3 gap-4 rounded-lg bg-gray-100 p-4">
  <p class="mb-4 rounded bg-blue-200 p-3">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
    labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
    laboris nisi ut aliquip ex ea commodo consequat.
  </p>
  <p class="mb-4 rounded bg-red-200 p-3">
    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
    pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
    mollit anim id est laborum.
  </p>
  <p class="mb-4 rounded bg-green-200 p-3">
    Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
    laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto
    beatae vitae dicta sunt explicabo.
  </p>
  <p class="mb-4 rounded bg-yellow-200 p-3">
    Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
    consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
  </p>
</div>
```

This is useful for consistent design across screen sizes.

### Setting the Width of Columns

Alternatively, specify an ideal column width, and the browser creates as many columns of that approximate width as fit. Tailwind offers utilities like `columns-xs` to `columns-7xl`, corresponding to predefined widths (e.g., `columns-sm` is `24rem`).

```html tailwind
<div class="columns-sm gap-4 rounded-lg bg-gray-100 p-4">
  <p class="mb-4 rounded bg-blue-200 p-3">
    This content flows into columns roughly 24rem wide. The number of columns adjusts based on
    container width.
  </p>
  <p class="mb-4 rounded bg-red-200 p-3">
    Wider containers get more columns. Narrower containers may reduce column count to maintain
    minimum width.
  </p>
  <p class="mb-4 rounded bg-green-200 p-3">
    Each paragraph represents content that will flow naturally across the available columns,
    creating a balanced layout.
  </p>
</div>
```

Width-based columns are good for responsive designs where content dictates column count.

### Controlling the Gap Between Columns

Browsers add a small default gap between columns. Control this with `gap-*` utilities alongside `columns-*`.

```html tailwind
<div class="columns-2 gap-8 rounded-lg bg-gray-100 p-4">
  <p class="mb-4 rounded bg-blue-200 p-3">Content for the first column with a larger gap.</p>
  <p class="mb-4 rounded bg-red-200 p-3">Content for the second column.</p>
  <p class="mb-4 rounded bg-green-200 p-3">
    Additional content that will flow across columns naturally.
  </p>
</div>
```

The `gap-*` utilities apply `column-gap`. In multi-column layouts, `gap` or `gap-x` utilities control `column-gap`.

## Flexibility with Arbitrary Values

Tailwind's arbitrary value syntax allows any CSS value in utility classes. This is useful if predefined `columns` values don't fit or for dynamic values like CSS variables.

### Arbitrary Column Count

Specify a custom column count with `columns-[<number>]`.

```html tailwind
<div class="columns-[5] gap-4 rounded-lg bg-gray-100 p-4">
  <div class="mb-4 rounded bg-blue-200 p-3">Column content 1</div>
  <div class="mb-4 rounded bg-red-200 p-3">Column content 2</div>
  <div class="mb-4 rounded bg-green-200 p-3">Column content 3</div>
  <div class="mb-4 rounded bg-yellow-200 p-3">Column content 4</div>
  <div class="mb-4 rounded bg-purple-200 p-3">Column content 5</div>
</div>
```

### Arbitrary Column Width

Specify custom column width with `columns-[<value>]`, where `<value>` is any CSS length.

```html tailwind
<div class="columns-[300px] gap-4 rounded-lg bg-gray-100 p-4">
  <div class="mb-4 rounded bg-blue-200 p-3">Content flows into columns ~300px wide</div>
  <div class="mb-4 rounded bg-red-200 p-3">Each column will be approximately 300 pixels wide</div>
  <div class="mb-4 rounded bg-green-200 p-3">
    The number of columns adjusts based on container width
  </div>
</div>
```

### Using CSS Variables with Arbitrary Values

Reference CSS variables with `columns-[var(--my-column-width)]` or the shorthand `columns-(<custom-property>)`.

```html tailwind
<div class="mb-4 columns-[var(--article-column-width)] gap-4 rounded-lg bg-gray-100 p-4">
  <div class="mb-4 rounded bg-blue-200 p-3">Column width controlled by a CSS variable</div>
  <div class="mb-4 rounded bg-red-200 p-3">
    Dynamic column sizing based on CSS custom properties
  </div>
</div>

<div class="columns-(--another-width-var) gap-4 rounded-lg bg-gray-100 p-4">
  <div class="mb-4 rounded bg-green-200 p-3">Another way to use a CSS variable</div>
  <div class="mb-4 rounded bg-yellow-200 p-3">Shorthand syntax for custom properties</div>
</div>
```

This allows advanced control, like setting column widths based on theme values.

## Responsive Multi-column Layouts

Tailwind's responsive design capabilities work with multi-column utilities using variants for specific breakpoints.

Apply different `columns-*` utilities at various breakpoints.

```html tailwind
<div class="columns-1 gap-4 rounded-lg bg-gray-100 p-4 sm:columns-2 md:columns-3 lg:columns-4">
  <!-- 1 column on small, 2 on medium, 3 on large, 4 on extra large screens -->
  <p class="mb-4 rounded bg-blue-200 p-3">This article layout adjusts columns by screen size.</p>
  <p class="mb-4 rounded bg-red-200 p-3">Single column on small mobile devices for readability.</p>
  <p class="mb-4 rounded bg-green-200 p-3">Transitions to multiple columns as screen widens.</p>
  <p class="mb-4 rounded bg-yellow-200 p-3">Ensures optimal reading experience across devices.</p>
  <p class="mb-4 rounded bg-purple-200 p-3">Content flows naturally across available columns.</p>
</div>
```

This example shows a mobile-first single column, overridden at `sm`, `md`, and `lg` breakpoints.

## Customizing Multi-column Settings

Tailwind uses a CSS-first configuration with the `@theme` directive. Customize predefined column widths (`columns-xs` to `columns-7xl`) or add new ones by defining CSS variables in `@theme`. These map to the `--container-*` namespace.

```css
/* In your main CSS file */
@import 'tailwindcss';

@theme {
  /* Extend default container widths */
  --container-8xl: 90rem; /* New larger width */

  /* Override default container widths */
  --container-sm: 20rem; /* Make 'sm' columns narrower */

  /* Define a custom column width */
  --article-column-width: 350px;
}
```

The new `columns-8xl` utility will be available, and `columns-sm` will use the updated value. Use `--article-column-width` with `columns-[var(--article-column-width)]`.

Override or disable defaults by setting them to `initial` in `@theme`.

## Tailwind 4 Enhancements

Multi-column utilities benefit from Tailwind 4 improvements:

- The Rust-based Oxide engine offers faster builds.
- Zero-configuration content detection simplifies setup.
- CSS-first configuration via `@theme` is more native.
- Arbitrary values for CSS variables sometimes use `-(...)` syntax, though `[<value>]` remains primary.

## Conclusion

Tailwind CSS simplifies responsive multi-column layouts with utilities for `columns` and `gap`. It supports fixed or width-based columns and responsive adjustments. Arbitrary values and CSS-first configuration in Tailwind 4 provide further flexibility.
