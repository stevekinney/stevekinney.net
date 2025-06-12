---
title: Spacing and Dividing Utilities
description: Master the space and divide utilities in Tailwind for managing spacing and borders between child elements
modified: 2025-06-11T11:56:08-06:00
---

## Space

The `space-` utility adds fixed margins between child elements.

> [!TIP] It's Just a Shorthand
> `space` adds margins to all children except the last.

- **Direction**: `space-x-{n}` (horizontal), `space-y-{n}` (vertical)
- **No outer edges**: Doesn't affect first/last element margins

### Vertical Spacing

```html tailwind
<div class="space-y-4 bg-sky-100 px-4">
  <div class="border-2 border-fuchsia-600 bg-fuchsia-500 text-center">First</div>
  <div class="border-2 border-fuchsia-600 bg-fuchsia-500 text-center">Second</div>
  <div class="border-2 border-fuchsia-600 bg-fuchsia-500 text-center">Third</div>
  <div class="border-2 border-fuchsia-600 bg-fuchsia-500 text-center">Fourth</div>
</div>
```

### Horizontal Spacing

```html tailwind
<div class="space-x-8">
  <button class="rounded border-2 border-sky-700 bg-sky-500 px-4 py-2 text-white shadow-md">
    Button
  </button>
  <button class="rounded border-2 border-sky-700 bg-sky-500 px-4 py-2 text-white shadow-md">
    Button
  </button>
  <button class="rounded border-2 border-sky-700 bg-sky-500 px-4 py-2 text-white shadow-md">
    Button
  </button>
</div>
```

This is what it _really_ does under the hood:

```css
.space-y-4 > * + * {
  margin-top: 1rem;
}
```

- **Use for:** Lists, row and column layouts with equal spacing.
- **Limitations:** Fixed spacing only, no outer margins.

> [!QUESTION] Why not just use flexbox?
> `space-y-*` maintains normal document flow while flexbox creates a flex formatting context. With Flexbox, everything becomes a flex item, which can affect how text flows, how lists behave, etc.
>
> But, honestly, it probably doesn't matter.

## Divide

The `divide` utility adds borders between child elements as separators.

```html tailwind
<div class="divide-y-4 bg-sky-100 px-4">
  <div class="bg-fuchsia-500 text-center">First</div>
  <div class="bg-fuchsia-500 text-center">Second</div>
  <div class="bg-fuchsia-500 text-center">Third</div>
  <div class="bg-fuchsia-500 text-center">Fourth</div>
</div>
```

Customize thickness and color:

```html tailwind
<div class="divide-y-4 divide-cyan-400 bg-sky-100 px-4">
  <div class="bg-fuchsia-500 text-center">First</div>
  <div class="bg-fuchsia-500 text-center">Second</div>
  <div class="bg-fuchsia-500 text-center">Third</div>
  <div class="bg-fuchsia-500 text-center">Fourth</div>
</div>
```

## Compare and Contrast

### Both Space _and_ Divide

- Manage spacing between children
- Support responsive variants
- Have `-x` and `-y` directions
- Customizable via `@theme`

### Space

- Adds **margins** between elements
- Affects all children (including first/last)
- Example: `space-x-4`

### Divide

- Adds **borders** as dividers
- Skips first/last edges automatically
- Customizable color and style
- Example: `divide-x-2 divide-gray-300`
