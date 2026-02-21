---
title: Flexbox Alignment
description: >-
  Master flexbox alignment utilities in Tailwind CSS including justify-content,
  align-items, and align-self for perfect layouts
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

Flexbox provides powerful alignment options along both the main and cross axes.

## Main Axis Alignment

Control distribution along the main axis with `justify-*` utilities:

- `justify-start` - Pack items at start (default)
- `justify-end` - Pack items at end
- `justify-center` - Center items
- `justify-between` - Equal space between items
- `justify-around` - Equal space around items
- `justify-evenly` - Equal space between items and edges

```html tailwind
<!-- Center navigation items -->
<nav class="flex justify-center gap-4">
  <a href="#" class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">Home</a>
  <a href="#" class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">About</a>
  <a href="#" class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">Contact</a>
</nav>

<!-- Space between items -->
<div class="flex justify-between rounded-lg bg-gray-100 p-4">
  <button class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Previous</button>
  <span class="self-center font-medium text-gray-700">Page 1 of 10</span>
  <button class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Next</button>
</div>
```

## Cross Axis Alignment

Align items perpendicular to the main axis:

- `items-start` - Align to start of cross axis
- `items-end` - Align to end of cross axis
- `items-center` - Center on cross axis
- `items-baseline` - Align text baselines
- `items-stretch` - Stretch to fill (default)

```html tailwind
<!-- Vertically center items -->
<div class="flex h-20 items-center gap-3 rounded-lg bg-gray-100 px-4">
  <div class="h-8 w-8 flex-shrink-0 rounded-full bg-blue-500"></div>
  <span class="font-medium text-gray-700">Centered content</span>
</div>
```

## Individual Alignment

Override container alignment for specific items:

- `self-auto` - Use container's alignment
- `self-start` - Align item to start
- `self-end` - Align item to end
- `self-center` - Center item
- `self-stretch` - Stretch item

```html tailwind
<div class="flex h-32 items-start gap-4 rounded-lg bg-gray-100 p-4">
  <div class="rounded bg-red-500 p-3 text-white">Top aligned</div>
  <div class="self-center rounded bg-green-500 p-3 text-white">Centered</div>
  <div class="self-end rounded bg-blue-500 p-3 text-white">Bottom aligned</div>
</div>
```

## Multi-line Alignment

For wrapped flex items, align entire lines:

- `content-start` - Pack lines at start
- `content-end` - Pack lines at end
- `content-center` - Center lines
- `content-between` - Space between lines
- `content-around` - Space around lines
- `content-evenly` - Even spacing

```html tailwind
<div class="flex h-64 flex-wrap content-center gap-4 rounded-lg bg-gray-100 p-4">
  <div class="h-20 w-32 rounded bg-purple-500 p-4 text-white">Item 1</div>
  <div class="h-20 w-32 rounded bg-pink-500 p-4 text-white">Item 2</div>
  <div class="h-20 w-32 rounded bg-indigo-500 p-4 text-white">Item 3</div>
  <div class="h-20 w-32 rounded bg-blue-500 p-4 text-white">Item 4</div>
  <div class="h-20 w-32 rounded bg-green-500 p-4 text-white">Item 5</div>
</div>
```
