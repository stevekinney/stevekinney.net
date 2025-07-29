---
title: Flexbox Initial Size
description: >-
  Control the initial size of flex items before growing or shrinking with
  Tailwind's flex-basis utilities
modified: 2025-06-11T19:05:33-06:00
---

Set the initial size of flex items before they grow or shrink using `basis-*` utilities.

## Common Values

- `basis-auto` - Size based on content
- `basis-0` - Start from zero width
- `basis-full` - 100% of container
- `basis-1/2` - 50% of container
- `basis-1/3` - 33.333% of container
- `basis-2/3` - 66.667% of container
- `basis-1/4` - 25% of container
- `basis-3/4` - 75% of container

## Spacing Scale

Use numeric values from the spacing scale:

- `basis-4` - 1rem
- `basis-8` - 2rem
- `basis-16` - 4rem
- `basis-32` - 8rem
- `basis-64` - 16rem

## Flex Shorthand

Combine grow, shrink, and basis with flex utilities:

- `flex-1` - `flex: 1 1 0%` (grow and shrink from 0)
- `flex-auto` - `flex: 1 1 auto` (grow and shrink from content size)
- `flex-initial` - `flex: 0 1 auto` (shrink only)
- `flex-none` - `flex: 0 0 auto` (fixed size)

## Common Patterns

```html tailwind
<!-- Three equal columns -->
<div class="flex gap-4 rounded-lg bg-gray-100 p-4">
  <div class="flex-1 basis-0 rounded bg-blue-500 p-4 text-center text-white">Column 1</div>
  <div class="flex-1 basis-0 rounded bg-green-500 p-4 text-center text-white">Column 2</div>
  <div class="flex-1 basis-0 rounded bg-purple-500 p-4 text-center text-white">Column 3</div>
</div>

<!-- Sidebar with flexible content -->
<div class="flex min-h-[200px] gap-4 rounded-lg bg-gray-100 p-4">
  <aside class="basis-64 rounded bg-gray-700 p-4 text-white">
    <h3 class="mb-2 font-bold">Fixed sidebar</h3>
    <p class="text-sm">Width: 16rem (256px)</p>
  </aside>
  <main class="flex-1 rounded bg-white p-4 shadow">
    <h2 class="mb-2 font-bold">Flexible content</h2>
    <p class="text-gray-700">This area expands to fill remaining space</p>
  </main>
</div>

<!-- Responsive columns -->
<div class="flex flex-wrap gap-4 rounded-lg bg-gray-100 p-4">
  <div class="basis-full rounded bg-orange-500 p-4 text-white md:basis-1/2 lg:basis-1/3">
    <h3 class="font-bold">Responsive Item 1</h3>
    <p class="text-sm">Full width on mobile, half on tablet, third on desktop</p>
  </div>
  <div class="basis-full rounded bg-pink-500 p-4 text-white md:basis-1/2 lg:basis-1/3">
    <h3 class="font-bold">Responsive Item 2</h3>
    <p class="text-sm">Full width on mobile, half on tablet, third on desktop</p>
  </div>
  <div class="basis-full rounded bg-indigo-500 p-4 text-white md:basis-1/2 lg:basis-1/3">
    <h3 class="font-bold">Responsive Item 3</h3>
    <p class="text-sm">Full width on mobile, half on tablet, third on desktop</p>
  </div>
</div>
```
