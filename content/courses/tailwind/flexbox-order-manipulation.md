---
title: Flexbox Order Manipulation
description: >-
  Reorder flex items visually without changing HTML structure using Tailwind's
  order utilities.
modified: 2025-06-11T19:05:33-06:00
---

Controlling the visual order of elements in Flexbox or Grid containers is common. CSS's `order` property allows adjusting this without altering HTML structure. Tailwind CSS provides utilities to manipulate this property directly in your markup.

## Core Order Utilities

Tailwind offers utilities corresponding to the CSS `order` property, enabling you to define item stacking context in Flex or Grid containers. You can set an item's order explicitly or use special values like `first`, `last`, or `none`.

### Explicit Ordering

Assign numerical order values with `order-<number>` (e.g., `order-1`, `order-3`). This sets the `order` CSS property to the specified number, rendering items in a sequence different from the HTML.
CSS: `order: <number>;`

```html tailwind
<div class="flex gap-4 rounded-lg bg-gray-100 p-6">
  <div class="order-3 min-w-[100px] rounded-lg bg-blue-500 p-4 text-white">Item 1 (order-3)</div>
  <div class="order-1 min-w-[100px] rounded-lg bg-green-500 p-4 text-white">Item 2 (order-1)</div>
  <div class="order-2 min-w-[100px] rounded-lg bg-purple-500 p-4 text-white">Item 3 (order-2)</div>
</div>
```

### Negative Ordering

Use negative order values by prefixing the class with a dash (e.g., `-order-<number>`).
CSS: `order: calc(<number> * -1);`

```html tailwind
<div class="flex gap-4 rounded-lg bg-gray-100 p-6">
  <div class="min-w-[100px] rounded-lg bg-blue-500 p-4 text-white">Item 1 (default)</div>
  <div class="-order-1 min-w-[100px] rounded-lg bg-green-500 p-4 text-white">Item 2 (-order-1)</div>
  <div class="min-w-[100px] rounded-lg bg-purple-500 p-4 text-white">Item 3 (default)</div>
</div>
```

### Special Order Values

#### Rendering First or Last

- `order-first`: Renders items at the beginning.
  CSS: `order: calc(-infinity);`
- `order-last`: Renders items at the end.
  CSS: `order: calc(infinity);`

```html tailwind
<div class="flex gap-4 rounded-lg bg-gray-100 p-6">
  <div class="order-last min-w-[100px] rounded-lg bg-blue-500 p-4 text-white">
    Item 1 (order-last)
  </div>
  <div class="min-w-[100px] rounded-lg bg-green-500 p-4 text-white">Item 2 (default)</div>
  <div class="order-first min-w-[100px] rounded-lg bg-purple-500 p-4 text-white">
    Item 3 (order-first)
  </div>
</div>
```

#### Resetting Order

- `order-none`: Resets `order` to its default (`0`). Items are ordered by source code position relative to others with `order: 0` or greater.
  CSS: `order: 0;`

```html tailwind
<div class="flex gap-4 rounded-lg bg-gray-100 p-6">
  <div class="order-2 min-w-[100px] rounded-lg bg-blue-500 p-4 text-white">Item 1 (order-2)</div>
  <div class="order-none min-w-[100px] rounded-lg bg-green-500 p-4 text-white">
    Item 2 (order-none)
  </div>
  <div class="order-1 min-w-[100px] rounded-lg bg-purple-500 p-4 text-white">Item 3 (order-1)</div>
</div>
```

## Custom Order Values

If predefined utilities are insufficient, use arbitrary values with `order-[<value>]` to set `order` to any valid CSS value.

Alternatively, reference a CSS variable with `order-(<custom-property>)` for dynamic or externally managed order values.

```html tailwind
<div class="flex gap-4 rounded-lg bg-gray-100 p-6">
  <div class="order-[5] min-w-[100px] rounded-lg bg-blue-500 p-4 text-white">
    Item 1 (order-[5])
  </div>
  <div class="order-[10] min-w-[100px] rounded-lg bg-green-500 p-4 text-white">
    Item 2 (order-[10])
  </div>
  <div class="order-[2] min-w-[100px] rounded-lg bg-purple-500 p-4 text-white">
    Item 3 (order-[2])
  </div>
</div>
```

## Responsive Order Manipulation

Like most Tailwind utilities, `order` utilities can be applied conditionally at breakpoints (e.g., `sm:order-1`, `md:order-last`). This changes element order responsively. Unprefixed utilities apply to all screen sizes; prefixed utilities apply at the specified breakpoint and larger.

```html tailwind
<div class="flex flex-col gap-4 rounded-lg bg-gray-100 p-6 md:flex-row">
  <div class="order-3 min-w-[100px] rounded-lg bg-blue-500 p-4 text-white md:order-1">
    Item 1 (mobile: 3rd, desktop: 1st)
  </div>
  <div class="order-1 min-w-[100px] rounded-lg bg-green-500 p-4 text-white md:order-2">
    Item 2 (mobile: 1st, desktop: 2nd)
  </div>
  <div class="order-2 min-w-[100px] rounded-lg bg-purple-500 p-4 text-white md:order-3">
    Item 3 (mobile: 2nd, desktop: 3rd)
  </div>
</div>
```
