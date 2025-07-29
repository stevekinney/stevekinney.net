---
title: Flexbox Direction and Wrapping
description: >-
  Control the flow and wrapping of flex items with Tailwind utilities for
  flex-direction and flex-wrap properties
modified: 2025-06-11T19:05:33-06:00
---

Use `flex` to create a flex container. Control layout direction and wrapping with Tailwind's flexbox utilities.

## Direction Utilities

- `flex-row` - Items flow horizontally (default)
- `flex-row-reverse` - Items flow horizontally, reversed
- `flex-col` - Items stack vertically
- `flex-col-reverse` - Items stack vertically, reversed

## Wrapping Utilities

- `flex-nowrap` - Items stay on one line (default)
- `flex-wrap` - Items wrap to new lines
- `flex-wrap-reverse` - Items wrap upward

## Responsive Patterns

```html tailwind
<!-- Mobile column, desktop row -->
<div class="flex flex-col gap-4 md:flex-row">
  <div class="min-h-[100px] rounded-lg bg-blue-500 p-4 text-white">Item 1</div>
  <div class="min-h-[100px] rounded-lg bg-green-500 p-4 text-white">Item 2</div>
  <div class="min-h-[100px] rounded-lg bg-purple-500 p-4 text-white">Item 3</div>
</div>

<!-- Wrap on mobile, no wrap on desktop -->
<div class="flex flex-wrap gap-4 lg:flex-nowrap">
  <div class="min-h-[100px] min-w-[200px] rounded-lg bg-red-500 p-4 text-white">Item 1</div>
  <div class="min-h-[100px] min-w-[200px] rounded-lg bg-orange-500 p-4 text-white">Item 2</div>
  <div class="min-h-[100px] min-w-[200px] rounded-lg bg-yellow-500 p-4 text-white">Item 3</div>
</div>
```

## Container Queries

Style based on parent container size instead of viewport:

```html tailwind
<div class="@container">
  <div class="flex flex-col gap-4 @md:flex-row">
    <div class="min-h-[100px] rounded-lg bg-indigo-500 p-4 text-white">Responsive Item 1</div>
    <div class="min-h-[100px] rounded-lg bg-pink-500 p-4 text-white">Responsive Item 2</div>
    <div class="min-h-[100px] rounded-lg bg-teal-500 p-4 text-white">Responsive Item 3</div>
  </div>
</div>
```

Use `@min-[400px]:` for custom container breakpoints or `@container/{name}` for named containers.
