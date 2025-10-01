---
title: Has Utility
description: >-
  Style parent elements based on their descendants' state or content using
  Tailwind's has-* variant
modified: '2025-07-29T15:11:25-06:00'
date: '2025-06-11T19:05:33-06:00'
---

The `has-*` utilities in Tailwind CSS are based on the CSS `:has()` pseudo-class, allowing parent elements to style themselves based on their children's state. Think of it as "if this container has a child that matches `$condition` condition, then style the container like this."

Let's start with our basic HTML structure to explore these powerful utilities.

```html tailwind
<div>
  <input type="checkbox" id="terms-0" />
  <label for="terms-0">I agree to the terms</label>
</div>
```

It's a basic checkbox and label, but with `has-*` utilities, we can make the entire container respond intelligently to the checkbox state.

## Basic Container Response

First, let's make the container respond to its checkbox child's state.

```html tailwind
<div
  class="flex items-center gap-3 rounded-lg border p-4 has-[input:checked]:border-green-500 has-[input:checked]:bg-green-50"
>
  <input type="checkbox" id="terms-1" class="h-4 w-4" />
  <label for="terms-1" class="text-slate-900">I agree to the terms</label>
</div>
```

Basic `has-*` implementation:

- `has-[input:checked]:border-green-500`: When container has a checked input, border turns green
- `has-[input:checked]:bg-green-50`: When container has a checked input, background turns light green
- The entire container responds automatically to the checkbox state.

This is fundamentally different from `peer-*` utilities—instead of siblings affecting each other, parents respond to children.

## Form Validation Containers

```html tailwind
<div class="space-y-4">
  <div
    class="rounded-lg border p-4 transition-colors has-[input:invalid]:border-red-500 has-[input:invalid]:bg-red-50 has-[input:valid]:border-green-500 has-[input:valid]:bg-green-50"
  >
    <label class="block text-sm font-medium">Email</label>
    <input
      type="email"
      required
      class="mt-1 block w-full rounded border-2 border-slate-300 bg-white px-3 py-2 invalid:border-red-600 focus:border-blue-500 focus:outline-none"
    />
  </div>

  <div class="rounded-lg border p-4 has-[input:focus]:border-blue-500 has-[input:focus]:bg-blue-50">
    <label class="block text-sm font-medium">Password</label>
    <input
      type="password"
      class="mt-1 block w-full rounded border-2 border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
    />
  </div>
</div>
```

Form validation features:

- `has-[input:valid]:border-green-500`: Container turns green when input is valid
- `has-[input:invalid]:border-red-500`: Container turns red when input is invalid
- `has-[input:focus]:border-blue-500`: Container highlights when input is focused
- `transition-colors`: Smooth state transitions.

The entire form field container provides visual feedback, not just the input itself.

## Card Selection Patterns

Let's build interactive cards that respond to nested form controls, perfect for pricing tables or option selection.

```html tailwind
<div class="grid gap-4 md:grid-cols-3">
  <div
    class="rounded-lg border-2 p-4 transition-all has-[input:checked]:border-blue-500 has-[input:checked]:bg-blue-50 has-[input:checked]:shadow-md"
  >
    <input type="radio" name="plan" id="basic" class="mb-3 h-4 w-4" />
    <label for="basic" class="cursor-pointer">
      <h3 class="font-semibold">Basic Plan</h3>
      <p class="text-sm text-slate-600">For individuals</p>
      <div class="mt-2 text-xl font-bold">$9/month</div>
    </label>
  </div>

  <div
    class="rounded-lg border-2 p-4 transition-all has-[input:checked]:border-blue-500 has-[input:checked]:bg-blue-50 has-[input:checked]:shadow-md"
  >
    <input type="radio" name="plan" id="pro" class="mb-3 h-4 w-4" />
    <label for="pro" class="cursor-pointer">
      <h3 class="font-semibold">Pro Plan</h3>
      <p class="text-sm text-slate-600">For teams</p>
      <div class="mt-2 text-xl font-bold">$29/month</div>
    </label>
  </div>

  <div
    class="rounded-lg border-2 p-4 transition-all has-[input:checked]:border-blue-500 has-[input:checked]:bg-blue-50 has-[input:checked]:shadow-md"
  >
    <input type="radio" name="plan" id="enterprise" class="mb-3 h-4 w-4" />
    <label for="enterprise" class="cursor-pointer">
      <h3 class="font-semibold">Enterprise</h3>
      <p class="text-sm text-slate-600">For organizations</p>
      <div class="mt-2 text-xl font-bold">$99/month</div>
    </label>
  </div>
</div>
```

Card selection styling:

- `has-[input:checked]:border-blue-500`: Selected card gets blue border
- `has-[input:checked]:bg-blue-50`: Selected card gets light background
- `has-[input:checked]:shadow-md`: Selected card gets elevated shadow

Perfect for pricing tables, feature comparisons, or any multi-option selection interface.

## Complex Selectors and Targeting

The `has-*` utilities support complex CSS selectors for sophisticated parent-child relationships.

```html tailwind
<div class="space-y-4">
  <!-- Multiple checkbox detection -->
  <div class="rounded-lg border p-4 has-[input:checked]:bg-slate-50">
    <h3 class="font-semibold has-[input:checked]:text-green-700">Project Settings</h3>
    <div class="mt-3 space-y-2">
      <label class="flex items-center gap-2">
        <input type="checkbox" class="h-4 w-4" />
        <span class="text-sm">Enable notifications</span>
      </label>
      <label class="flex items-center gap-2">
        <input type="checkbox" class="h-4 w-4" />
        <span class="text-sm">Auto-save drafts</span>
      </label>
    </div>
  </div>

  <!-- Element-specific targeting -->
  <div
    class="rounded-lg border p-4 has-[select:focus]:border-pink-500 has-[textarea:focus]:border-green-500"
  >
    <div class="space-y-3">
      <select
        class="block w-full rounded border-2 border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
      >
        <option disabled>Choose department</option>
        <option>Engineering</option>
        <option>Design</option>
        <option>Product</option>
      </select>
      <textarea
        class="block w-full rounded border-2 border-slate-300 bg-white px-3 py-2 focus:border-green-500 focus:outline-none"
        rows="2"
      ></textarea>
    </div>
  </div>

  <!-- Attribute-based targeting -->
  <div class="rounded-lg border p-4 has-[input[type='file']]:border-dashed">
    <input type="file" class="block w-full text-sm" />
  </div>
</div>
```

Complex selector examples:

- `has-[input:checked]:bg-slate-50`: Responds to any checked input descendant
- `has-[select:focus]:border-blue-500`: Different colors for different element types
- `has-[input[type='file']]:border-dashed`: Targets specific input types using attributes

This shows how you can create contextually aware containers that respond to different child elements differently.

## Navigation State Detection

`has-*` utilities excel at creating intelligent navigation systems that respond to user interaction.

```html tailwind
<nav class="rounded-lg bg-white shadow-sm">
  <!-- Dropdown state detection -->
  <div class="has-[details[open]]:bg-pink-400">
    <details>
      <summary class="cursor-pointer px-4 py-3 text-sm font-medium">More Options</summary>
      <div class="border-t px-4 py-2">
        <a href="#" class="block py-1 text-sm text-slate-700">Help</a>
        <a href="#" class="block py-1 text-sm text-slate-700">Support</a>
      </div>
    </details>
  </div>

  <!-- Search focus detection -->
  <div class="border-t p-4 has-[input:focus]:bg-blue-50">
    <input
      type="search"
      placeholder="Search…"
      class="w-full rounded border-2 border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
    />
  </div>
</nav>
```

Navigation enhancements:

- `has-[a.active]:bg-blue-50`: Navigation highlights when it contains an active link
- `has-[details[open]]:bg-slate-50`: Dropdown container changes when opened
- `has-[input:focus]:bg-blue-50`: Search area highlights when input is focused

Creates navigation where entire sections respond to user interaction states.

## Data Table Row Selection

Perfect for admin interfaces where entire rows need to respond to selection states.

```html tailwind
<div class="overflow-hidden rounded-lg border bg-white">
  <div class="divide-y">
    <div
      class="flex items-center gap-4 px-4 py-3 transition-colors has-[input:checked]:border-l-4 has-[input:checked]:border-l-blue-500 has-[input:checked]:bg-blue-50"
    >
      <input type="checkbox" class="h-4 w-4" />
      <div class="flex-1">
        <div class="font-medium">Sarah Chen</div>
        <div class="text-sm text-slate-500">sarah@example.com</div>
      </div>
      <span class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800"
        >Active</span
      >
    </div>

    <div
      class="flex items-center gap-4 px-4 py-3 transition-colors has-[input:checked]:border-l-4 has-[input:checked]:border-l-blue-500 has-[input:checked]:bg-blue-50"
    >
      <input type="checkbox" class="h-4 w-4" />
      <div class="flex-1">
        <div class="font-medium">Mike Rodriguez</div>
        <div class="text-sm text-slate-500">mike@example.com</div>
      </div>
      <span class="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800"
        >Pending</span
      >
    </div>
  </div>
</div>
```

Table row features:

- `has-[input:checked]:bg-blue-50`: Selected rows get highlighted.
- `has-[input:checked]:border-l-4`: Selected rows get prominent left border.
- `transition-colors`: Smooth state transitions.

Creates intuitive selection interfaces where entire rows provide visual feedback.

## Bulk Actions Panel

Create action panels that appear when items are selected.

```html tailwind
<div class="space-y-4">
  <!-- Product grid -->
  <div class="grid gap-4 md:grid-cols-3">
    <div
      class="rounded border p-3 has-[input:checked]:border-green-500 has-[input:checked]:bg-green-50"
    >
      <input type="checkbox" class="mb-2 h-4 w-4" />
      <h4 class="font-medium">Wireless Headphones</h4>
      <p class="text-xl font-bold">$199</p>
    </div>

    <div
      class="rounded border p-3 has-[input:checked]:border-green-500 has-[input:checked]:bg-green-50"
    >
      <input type="checkbox" class="mb-2 h-4 w-4" />
      <h4 class="font-medium">Smart Watch</h4>
      <p class="text-xl font-bold">$299</p>
    </div>

    <div
      class="rounded border p-3 has-[input:checked]:border-green-500 has-[input:checked]:bg-green-50"
    >
      <input type="checkbox" class="mb-2 h-4 w-4" />
      <h4 class="font-medium">Laptop Stand</h4>
      <p class="text-xl font-bold">$79</p>
    </div>
  </div>

  <!-- Bulk actions (appears when any item selected) -->
  <div class="hidden rounded bg-slate-50 p-4 has-[input:checked]:block">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">Items selected</span>
      <div class="flex gap-2">
        <button class="rounded border px-3 py-1 text-sm hover:bg-white">Compare</button>
        <button class="rounded bg-green-600 px-3 py-1 text-sm text-white">Add to Cart</button>
      </div>
    </div>
  </div>
</div>
```

Bulk actions features:

- `has-[input:checked]:block hidden`: Panel appears when any checkbox is selected
- Works across multiple child elements automatically
- Perfect for e-commerce and admin interfaces

## Why This is Kind of a Big Deal™

The `has-*` utilities represent a fundamental shift in CSS capabilities:

- **Before `:has()`**: Parent-child state relationships required JavaScript event handling and manual class management.
- **With `has-*`**: Sophisticated interactive patterns work with pure CSS.

### Key Advantages

- **Performance**: No JavaScript overhead required
- **Accessibility**: Works seamlessly with native form controls
- **Maintainability**: State relationships expressed directly in markup
- **Progressive enhancement**: Works even if CSS fails to load

**Browser support**: Supported in all modern browsers (Chrome 105+, Firefox 121+, Safari 15.4+).

### Challenges

Try building these variations:

1. **Multi-step Form**: Create a 3-step form where each step's container responds to input completion using `has-[input:valid]` conditions
2. **Dashboard Metrics**: Build metric cards that can be selected for comparison, with a comparison panel that appears when multiple cards are selected

The `has-*` utilities unlock powerful new possibilities for creating intelligent, responsive interfaces while maintaining semantic HTML and excellent performance.

## Examples

### Based on Content

```html tailwind
<article class="gap-4 rounded-lg border bg-white p-4 has-[img]:flex">
  <img src="https://picsum.photos/seed/picsum/600/400" class="h-64 w-64 rounded object-cover" />
  <div>
    Meow ipsum dolor sit amet, consectetur adipiscing kitty, sed do eiusmod tempor purr purr ut
    labore et dolore magna whiskers. Ut enim ad minim veniam, quis nostrud exercitation ullamco
    laboris nisi ut aliquip ex ea commodo tuna treats.
  </div>
</article>
```

## Common Patterns

**Form validation indicators:**

```html tailwind
<label class="mb-2 block text-sm font-medium has-[:invalid]:text-red-500">
  Email
  <input
    type="email"
    placeholder="Enter your email address"
    required
    class="w-full rounded border-2 border-slate-300 bg-white px-3 py-2 invalid:border-red-500 focus:border-blue-500 focus:outline-none"
  />
</label>
```

## Key Differences

- **`has-*`** - Styles the element containing the target
- **`group-has-*`** - Styles descendant when ancestor contains target
- **`peer-has-*`** - Styles sibling when previous sibling contains target
