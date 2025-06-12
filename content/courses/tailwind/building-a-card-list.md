---
title: Building a Card List with Top Border
description: Let's build a card list with separator borders using Tailwind's not-first selector to avoid borders on the first item.
---

Let's start with our basic HTML structure for a simple list of notification cards.

```html tailwind
<div>
  <div>
    <h3>New message from Sarah</h3>
    <p>Hey! Are we still on for lunch tomorrow?</p>
    <span>2 minutes ago</span>
  </div>
  <div>
    <h3>Calendar reminder</h3>
    <p>Team standup meeting starts in 15 minutes</p>
    <span>12 minutes ago</span>
  </div>
  <div>
    <h3>System update</h3>
    <p>Your password will expire in 3 days. Update it now to avoid interruption.</p>
    <span>1 hour ago</span>
  </div>
</div>
```

We have three notification cards stacked vertically, but they're completely unstyled and blend together. Let's transform this into a polished list where each item is visually separated from the others—except the first one.

## Adding Card Structure and Styling

First, let's apply professional card styling using patterns from our [card tutorial](building-a-card.md) to establish a proper foundation.

```html tailwind
<div class="mx-auto max-w-md rounded-lg bg-white shadow-sm">
  <div class="p-4">
    <h3 class="font-semibold text-slate-900">New message from Sarah</h3>
    <p class="mt-1 text-sm text-slate-600">Hey! Are we still on for lunch tomorrow?</p>
    <span class="mt-2 block text-xs text-slate-400">2 minutes ago</span>
  </div>
  <div class="p-4">
    <h3 class="font-semibold text-slate-900">Calendar reminder</h3>
    <p class="mt-1 text-sm text-slate-600">Team standup meeting starts in 15 minutes</p>
    <span class="mt-2 block text-xs text-slate-400">12 minutes ago</span>
  </div>
  <div class="p-4">
    <h3 class="font-semibold text-slate-900">System update</h3>
    <p class="mt-1 text-sm text-slate-600">
      Your password will expire in 3 days. Update it now to avoid interruption.
    </p>
    <span class="mt-2 block text-xs text-slate-400">1 hour ago</span>
  </div>
</div>
```

Container and card improvements:

- `max-w-md mx-auto`: Constrains width to 448px and centers the container
- `bg-white rounded-lg shadow-sm`: White background with soft corners and subtle shadow
- `p-4`: 16px padding on each card for comfortable spacing
- Typography hierarchy with `font-semibold`, `text-sm`, and `text-xs` for clear information architecture
- `text-slate-600` and `text-slate-400`: Muted colors for secondary content

Now the cards look professional, but they still blend together—there's no visual separation between individual notifications.

## Why Space-Y Won't Work Here

You might think to use `space-y-4` to add spacing between cards, and that would work for separated cards. But what if we want the cards to feel connected as a cohesive list while still being visually distinct? This is where border separators shine.

Let's try adding borders to every card and see the problem:

```html tailwind
<div class="mx-auto max-w-md rounded-lg bg-white shadow-sm">
  <div class="border-t border-slate-200 p-4">
    <h3 class="font-semibold text-slate-900">New message from Sarah</h3>
    <p class="mt-1 text-sm text-slate-600">Hey! Are we still on for lunch tomorrow?</p>
    <span class="mt-2 block text-xs text-slate-400">2 minutes ago</span>
  </div>
  <div class="border-t border-slate-200 p-4">
    <h3 class="font-semibold text-slate-900">Calendar reminder</h3>
    <p class="mt-1 text-sm text-slate-600">Team standup meeting starts in 15 minutes</p>
    <span class="mt-2 block text-xs text-slate-400">12 minutes ago</span>
  </div>
  <div class="border-t border-slate-200 p-4">
    <h3 class="font-semibold text-slate-900">System update</h3>
    <p class="mt-1 text-sm text-slate-600">
      Your password will expire in 3 days. Update it now to avoid interruption.
    </p>
    <span class="mt-2 block text-xs text-slate-400">1 hour ago</span>
  </div>
</div>
```

There's an issue: the first card has a border at the top of the container, creating an awkward visual gap between the container's rounded corner and the content. We want borders as separators between items, not as a border around the entire container.

## Introducing the not-first Selector

This is exactly what Tailwind's `not-first:*` utilities solve. Let's remove the unwanted top border from the first item only.

```html tailwind
<div class="mx-auto max-w-md rounded-lg bg-white shadow-sm">
  <div class="p-4 not-first:border-t not-first:border-slate-200">
    <h3 class="font-semibold text-slate-900">New message from Sarah</h3>
    <p class="mt-1 text-sm text-slate-600">Hey! Are we still on for lunch tomorrow?</p>
    <span class="mt-2 block text-xs text-slate-400">2 minutes ago</span>
  </div>
  <div class="p-4 not-first:border-t not-first:border-slate-200">
    <h3 class="font-semibold text-slate-900">Calendar reminder</h3>
    <p class="mt-1 text-sm text-slate-600">Team standup meeting starts in 15 minutes</p>
    <span class="mt-2 block text-xs text-slate-400">12 minutes ago</span>
  </div>
  <div class="p-4 not-first:border-t not-first:border-slate-200">
    <h3 class="font-semibold text-slate-900">System update</h3>
    <p class="mt-1 text-sm text-slate-600">
      Your password will expire in 3 days. Update it now to avoid interruption.
    </p>
    <span class="mt-2 block text-xs text-slate-400">1 hour ago</span>
  </div>
</div>
```

The `not-first:*` magic:

- `not-first:border-t`: Adds a top border to every element that is NOT the first child
- `not-first:border-slate-200`: Light gray border color for subtle separation

Perfect! Now we have clean separators between items without an awkward border above the first item. This is equivalent to the CSS selector `:not(:first-child)` but much more readable and maintainable.

## Enhancing Visual Hierarchy

Let's add some polish to make the list feel more interactive and organized.

```html tailwind
<div class="mx-auto max-w-md overflow-hidden rounded-lg bg-white shadow-sm">
  <div
    class="p-4 transition-colors not-first:border-t not-first:border-slate-200 hover:bg-slate-50"
  >
    <h3 class="font-semibold text-slate-900">New message from Sarah</h3>
    <p class="mt-1 text-sm text-slate-600">Hey! Are we still on for lunch tomorrow?</p>
    <span class="mt-2 block text-xs text-slate-400">2 minutes ago</span>
  </div>
  <div
    class="p-4 transition-colors not-first:border-t not-first:border-slate-200 hover:bg-slate-50"
  >
    <h3 class="font-semibold text-slate-900">Calendar reminder</h3>
    <p class="mt-1 text-sm text-slate-600">Team standup meeting starts in 15 minutes</p>
    <span class="mt-2 block text-xs text-slate-400">12 minutes ago</span>
  </div>
  <div
    class="p-4 transition-colors not-first:border-t not-first:border-slate-200 hover:bg-slate-50"
  >
    <h3 class="font-semibold text-slate-900">System update</h3>
    <p class="mt-1 text-sm text-slate-600">
      Your password will expire in 3 days. Update it now to avoid interruption.
    </p>
    <span class="mt-2 block text-xs text-slate-400">1 hour ago</span>
  </div>
</div>
```

Interactive enhancements:

- `overflow-hidden` on container: Ensures hover backgrounds don't extend beyond the rounded corners
- `hover:bg-slate-50`: Subtle background change indicates the items are interactive
- `transition-colors`: Smoothly animates the background color change for polished feel

Now each item feels clickable and responsive while maintaining clear visual separation.

## Adding Dark Mode Support

Let's add dark mode variants to make our list work in any theme.

```html tailwind
<div class="mx-auto max-w-md overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-800">
  <div
    class="p-4 transition-colors not-first:border-t not-first:border-slate-200 hover:bg-slate-50 not-first:dark:border-slate-700 dark:hover:bg-slate-700"
  >
    <h3 class="font-semibold text-slate-900 dark:text-slate-100">New message from Sarah</h3>
    <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
      Hey! Are we still on for lunch tomorrow?
    </p>
    <span class="mt-2 block text-xs text-slate-400 dark:text-slate-400">2 minutes ago</span>
  </div>
  <div
    class="p-4 transition-colors not-first:border-t not-first:border-slate-200 hover:bg-slate-50 not-first:dark:border-slate-700 dark:hover:bg-slate-700"
  >
    <h3 class="font-semibold text-slate-900 dark:text-slate-100">Calendar reminder</h3>
    <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
      Team standup meeting starts in 15 minutes
    </p>
    <span class="mt-2 block text-xs text-slate-400 dark:text-slate-400">12 minutes ago</span>
  </div>
  <div
    class="p-4 transition-colors not-first:border-t not-first:border-slate-200 hover:bg-slate-50 not-first:dark:border-slate-700 dark:hover:bg-slate-700"
  >
    <h3 class="font-semibold text-slate-900 dark:text-slate-100">System update</h3>
    <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
      Your password will expire in 3 days. Update it now to avoid interruption.
    </p>
    <span class="mt-2 block text-xs text-slate-400 dark:text-slate-400">1 hour ago</span>
  </div>
</div>
```

Dark mode refinements:

- `dark:bg-slate-800`: Dark background for the container
- `not-first:dark:border-slate-700`: Lighter border color for dark backgrounds
- `dark:text-slate-100`, `dark:text-slate-300`: Appropriate text contrast for dark themes
- `dark:hover:bg-slate-700`: Dark hover state that feels natural

Notice how we can combine modifiers: `not-first:dark:border-slate-700` means "apply dark border color to elements that are not first children when in dark mode."

## Why not-first is Essential

The `not-first:*` selector solves a common design pattern that `space-y` or `gap` can't handle:

**Use `space-y` when**: You want actual spacing between separate elements (cards floating apart)

**Use `not-first:border` when**: You want connected elements with visual separators (list items, menu items, table rows)

This pattern appears everywhere in modern interfaces:

- Navigation menu items with separator lines
- List items in sidebars
- Table rows with border separators
- Comment threads with dividing lines
- Settings groups with section breaks

The key insight is that the first item in a list should never have a "separator" above it because there's nothing to separate it from.

## Challenges

Try building these variations:

1. **Status Indicators**: Add colored dots before each notification title that indicate priority (red, yellow, green) using `not-first:*` to ensure consistent alignment
2. **Expandable Items**: Combine with the patterns from our [details disclosure tutorial](building-details-disclosure.md) to make each notification expandable with additional details
