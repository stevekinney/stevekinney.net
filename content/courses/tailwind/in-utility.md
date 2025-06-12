---
title: In Utility
description: Apply styles based on ancestor element states without explicit group classes using Tailwind's in-* variant
---

The `in-*` variant (new in Tailwind 4) styles elements based on _any_ ancestor's state. No `group` class required!

## Basic Usage

```html tailwind
<div>
  <!-- No group class needed -->
  <button>
    <span class="in-[:hover]:text-blue-500"> Changes when <em>any</em> ancestor is hovered</span>
  </button>
</div>
```

## Common Patterns

### Nested hover effects

```html tailwind
<article>
  <h2 class="in-[:hover]:underline">Title</h2>
  <p class="in-[:hover]:text-gray-600">Description</p>
</article>
```

## Form field focus states

```html tailwind
<label>
  <span class="in-[:focus]:text-blue-600">Email</span>
  <input type="email" />
</label>
```

## Key Differences from `group`

| Feature                | `group`          | `in-*`          |
| ---------------------- | ---------------- | --------------- |
| Parent class needed    | Yes              | No              |
| Target specific parent | Yes (with names) | No (any parent) |
| Fine control           | More precise     | Less precise    |

## When to Use Each

Use `in-*` when:

- You want simple parent state reactions
- You don't need to differentiate between parents
- You want cleaner markup

Use `group` when:

- You need to target a specific parent
- You have nested interactive elements
- You need named groups for clarity

## Composability

Combine with other variants:

```html tailwind
<div class="in-[:focus]:not-[:disabled]:ring-2">...</div>
```
