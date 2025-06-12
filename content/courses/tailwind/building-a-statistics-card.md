---
title: Building a Stat Card Container Grid
description: Let's build a responsive stat card grid that adapts based on container size using Tailwind's container query utilities.
---

Let's start with our basic HTML structure for a collection of stat cards.

```html tailwind
<div>
  <div>
    <div>
      <h3>Total Users</h3>
      <p>1,234</p>
    </div>
    <div>
      <h3>Revenue</h3>
      <p>$45,678</p>
    </div>
    <div>
      <h3>Growth Rate</h3>
      <p>12.5%</p>
    </div>
  </div>
</div>
```

We have three stat cards in a container, but they're stacked vertically and completely unstyled. Let's transform this into a smart grid that adapts based on how much space the parent container has available—not the viewport size.

## Adding Container Query Context

First, let's establish our container as a "containment context" and add basic card styling using patterns from our [card tutorial](building-a-card.md).

```html tailwind
<div class="@container p-4">
  <div class="grid gap-4">
    <div class="rounded-lg bg-white p-6 shadow-md">
      <h3 class="text-sm font-medium text-slate-600">Total Users</h3>
      <p class="text-2xl font-bold text-slate-900">1,234</p>
    </div>
    <div class="rounded-lg bg-white p-6 shadow-md">
      <h3 class="text-sm font-medium text-slate-600">Revenue</h3>
      <p class="text-2xl font-bold text-slate-900">$45,678</p>
    </div>
    <div class="rounded-lg bg-white p-6 shadow-md">
      <h3 class="text-sm font-medium text-slate-600">Growth Rate</h3>
      <p class="text-2xl font-bold text-slate-900">12.5%</p>
    </div>
  </div>
</div>
```

Key additions:

- `@container`: Establishes this element as a container query context—child elements can now respond to this container's size, not the viewport
- `grid gap-4`: Creates a CSS Grid layout with 16px gaps between items
- Card styling with `rounded-lg bg-white p-6 shadow-md` for professional appearance
- Typography hierarchy with small labels and large values

This is fundamentally different from responsive design with media queries—these cards will adapt based on their parent's width, not the browser window's width.

## Creating Container-Based Responsive Behavior

Now let's add the magic: making the grid responsive to the container's size using container query utilities.

```html tailwind
<div class="@container p-4">
  <div class="grid gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
    <div class="rounded-lg bg-white p-6 shadow-md">
      <h3 class="text-sm font-medium text-slate-600">Total Users</h3>
      <p class="text-2xl font-bold text-slate-900">1,234</p>
    </div>
    <div class="rounded-lg bg-white p-6 shadow-md">
      <h3 class="text-sm font-medium text-slate-600">Revenue</h3>
      <p class="text-2xl font-bold text-slate-900">$45,678</p>
    </div>
    <div class="rounded-lg bg-white p-6 shadow-md">
      <h3 class="text-sm font-medium text-slate-600">Growth Rate</h3>
      <p class="text-2xl font-bold text-slate-900">12.5%</p>
    </div>
  </div>
</div>
```

Container query responsive behavior:

- `@sm:grid-cols-2`: When the container is at least 384px wide, show 2 columns
- `@lg:grid-cols-3`: When the container is at least 512px wide, show 3 columns
- Default (no prefix): Single column when container is narrow

The `@` prefix indicates these are container queries, not media queries. The cards respond to their immediate parent's size, making them perfectly modular for sidebars, dashboards, or any constrained layout.

## Why Container Queries Matter

Traditional responsive design uses media queries that respond to viewport size. But what if you want to place this stat grid in a narrow sidebar? Media queries would still show the desktop layout even though the container is narrow.

Container queries solve this by making components **truly reusable**. This same stat grid component will:

- Show 1 column in a narrow sidebar (even on desktop)
- Show 2-3 columns in the main content area
- Adapt automatically to any parent container size

This is the future of responsive component design—components that adapt to their context, not just the screen size.

## Challenges

Try building these variations:

1. **Enhanced Stats**: Add trend indicators (↗️ icons) that only appear in multi-column layouts using `@sm:block hidden`
2. **Nested Container**: Place this stat grid inside a card container and watch how it adapts to the card's width instead of the page width
