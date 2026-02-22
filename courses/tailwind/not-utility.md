---
title: Not Utility
description: >-
  Apply styles when conditions are NOT met using Tailwind 4's powerful not-*
  variant for negating states
modified: '2025-07-29T15:11:25-06:00'
date: '2025-06-11T19:05:33-06:00'
---

> [!INFO] This is new in Tailwind 4!

The `not-*` variant applies styles when a condition is NOT true, simplifying conditional styling and reducing the need for default styles that get overridden.

## Basic Usage

```html tailwind
<!-- Subtle opacity when not hovered, full opacity on hover -->
<button
  class="rounded bg-blue-500 px-4 py-2 text-white transition-opacity duration-200 not-hover:opacity-80 hover:opacity-100"
>
  Hover me
</button>

<!-- Muted border when not focused, accent border on focus -->
<input
  class="rounded-md border px-3 py-2 transition-colors not-focus:border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
  placeholder="Focus to see border change"
/>
```

## Common Patterns

### Interactive Button States

```html tailwind
<!-- Button that's interactive when enabled, muted when disabled -->
<button
  class="rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-all not-disabled:cursor-pointer not-disabled:hover:bg-blue-600 not-disabled:active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
  disabled
>
  Submit Form
</button>
```

### Responsive Visibility

```html tailwind
<!-- Hide on mobile when not expanded, always show on desktop -->
<nav class="transition-all not-open:hidden not-open:md:block">
  <ul class="space-y-2">
    <li><a href="#" class="block rounded p-2 hover:bg-gray-100">Home</a></li>
    <li><a href="#" class="block rounded p-2 hover:bg-gray-100">About</a></li>
  </ul>
</nav>
```

## Advanced Compositions

### Group Interactions

```html tailwind
<!-- Card that dims its content when parent is not hovered -->
<div class="group rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
  <h3
    class="group-not-hover:opacity-60 mb-2 text-xl font-bold transition-opacity group-hover:opacity-100"
  >
    Interactive Card
  </h3>
  <p class="group-not-hover:opacity-50 text-gray-600 transition-opacity group-hover:opacity-100">
    Hover the card to see the content brighten
  </p>
</div>
```

### Peer-Based Styling

```html tailwind
<!-- Toggle switch with dependent text styling -->
<div class="flex items-center space-x-3">
  <input type="checkbox" id="notifications" class="peer sr-only" />
  <label
    for="notifications"
    class="relative h-6 w-11 cursor-pointer rounded-full bg-gray-200 peer-checked:bg-blue-600 before:absolute before:top-0.5 before:left-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:transition-transform peer-checked:before:translate-x-5"
  ></label>
  <span
    class="font-medium transition-colors peer-not-checked:text-gray-500 peer-checked:text-blue-600"
  >
    Notifications enabled
  </span>
</div>
```

### Complex State Management

```html tailwind
<!-- Input with dynamic validation feedback -->
<div class="space-y-2">
  <input
    type="password"
    class="w-full rounded-md border px-3 py-2 transition-colors not-has-[:valid]:border-red-300 not-has-[:valid]:focus:ring-red-100 has-[:valid]:border-green-300 has-[:valid]:focus:ring-green-100"
    minlength="8"
    placeholder="Enter password (min 8 characters)"
  />
  <p
    class="text-sm transition-colors not-has-[input:valid]:text-red-600 has-[input:valid]:text-green-600"
  >
    Password must be at least 8 characters long
  </p>
</div>
```

## Practical Examples

### Form Field Validation

```html tailwind
<!-- Email field with real-time validation -->
<div class="space-y-2">
  <label
    class="block font-medium transition-colors not-has-[:valid]:text-red-700 has-[:valid]:text-green-700"
  >
    <span class="mb-1 block">Email Address</span>
    <input
      type="email"
      required
      class="w-full rounded-md border px-3 py-2 transition-colors not-valid:border-red-300 valid:border-green-300 not-valid:focus:ring-red-100 valid:focus:ring-green-100"
      placeholder="your@email.com"
    />
  </label>
  <div class="text-sm text-red-600 not-has-[:valid]:block has-[:valid]:hidden">
    Please enter a valid email address
  </div>
</div>
```

### Dynamic List Styling

```html tailwind
<!-- List with smart borders and hover effects -->
<ul class="divide-y divide-gray-200 rounded-lg bg-white shadow">
  <li class="transition-colors not-last:border-b not-last:border-gray-100 hover:bg-gray-50">
    <a href="#" class="block px-6 py-4">First item</a>
  </li>
  <li class="transition-colors not-last:border-b not-last:border-gray-100 hover:bg-gray-50">
    <a href="#" class="block px-6 py-4">Second item</a>
  </li>
  <li class="transition-colors hover:bg-gray-50">
    <a href="#" class="block px-6 py-4">Last item (no border)</a>
  </li>
</ul>
```

### Feature Detection Fallbacks

```html tailwind
<!-- Grid layout with flexbox fallback -->
<div
  class="p-6 not-supports-[display:grid]:flex not-supports-[display:grid]:flex-wrap not-supports-[display:grid]:gap-4 supports-[display:grid]:grid supports-[display:grid]:grid-cols-3 supports-[display:grid]:gap-6"
>
  <div class="rounded-lg bg-blue-100 p-4">Item 1</div>
  <div class="rounded-lg bg-green-100 p-4">Item 2</div>
  <div class="rounded-lg bg-purple-100 p-4">Item 3</div>
</div>

<!-- Modern backdrop-blur with solid background fallback -->
<div
  class="rounded-lg p-6 shadow-lg not-supports-[backdrop-filter:blur(10px)]:border not-supports-[backdrop-filter:blur(10px)]:bg-white supports-[backdrop-filter:blur(10px)]:bg-white/80 supports-[backdrop-filter:blur(10px)]:backdrop-blur-lg"
>
  Content with smart background
</div>
```

## Benefits

- **Cleaner Logic**: Express negative conditions directly instead of overriding defaults
- **Better Performance**: Avoid unnecessary style recalculations from overrides
- **Improved Readability**: Makes conditional styling intent immediately clear
- **Universal Compatibility**: Works with all Tailwind variants (hover, focus, group, peer, etc.)
- **Reduced Specificity Issues**: Less reliance on cascade order for conditional styles
