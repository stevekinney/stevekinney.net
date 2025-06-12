---
title: Flexbox Growing and Shrinking
description: Master flex-grow and flex-shrink utilities to control how flex items expand and contract in available space
modified: 2025-06-07T16:13:04-06:00
---

Control how flex items grow to fill available space or shrink when space is limited.

## Flex Grow

Use `grow` utilities to control how items expand:

- `grow-0` - Item won't grow (default)
- `grow` - Item can grow to fill space (flex-grow: 1)
- `grow-[2]` - Custom grow factor

```html tailwind
<!-- Middle item takes up remaining space -->
<div class="flex gap-4 rounded-lg bg-gray-100 p-4">
  <div class="w-20 rounded bg-blue-500 p-3 text-center text-white">Fixed</div>
  <div class="grow rounded bg-green-500 p-3 text-center text-white">Flexible</div>
  <div class="w-20 rounded bg-blue-500 p-3 text-center text-white">Fixed</div>
</div>
```

## Flex Shrink

Use `shrink` utilities to control how items contract:

- `shrink-0` - Item won't shrink below natural size
- `shrink` - Item can shrink if needed (flex-shrink: 1)
- `shrink-[2]` - Custom shrink factor

```html tailwind
<!-- Prevent logo from shrinking -->
<div class="flex gap-4 rounded-lg bg-gray-100 p-4">
  <div
    class="flex h-12 w-24 shrink-0 items-center justify-center rounded bg-indigo-600 font-bold text-white"
  >
    LOGO
  </div>
  <nav class="flex shrink items-center gap-3 rounded bg-gray-200 p-3">
    <span class="text-gray-700">Home</span>
    <span class="text-gray-700">About</span>
    <span class="text-gray-700">Contact</span>
  </nav>
</div>
```

## Common Patterns

```html tailwind
<!-- Equal width columns -->
<div class="flex gap-4 rounded-lg bg-gray-100 p-4">
  <div class="grow rounded bg-purple-500 p-4 text-center text-white">Column 1</div>
  <div class="grow rounded bg-pink-500 p-4 text-center text-white">Column 2</div>
  <div class="grow rounded bg-orange-500 p-4 text-center text-white">Column 3</div>
</div>

<!-- Sidebar layout -->
<div class="flex min-h-[200px] gap-4 rounded-lg bg-gray-100 p-4">
  <aside class="w-64 shrink-0 rounded bg-gray-700 p-4 text-white">
    <h3 class="mb-2 font-bold">Sidebar</h3>
    <p class="text-sm">Fixed width sidebar content</p>
  </aside>
  <main class="grow rounded bg-white p-4 shadow">
    <h2 class="mb-2 font-bold">Main Content</h2>
    <p class="text-gray-700">This content area grows to fill the remaining space</p>
  </main>
</div>
```

Combine with responsive modifiers: `md:grow-0`, `lg:shrink-0`, etc.
