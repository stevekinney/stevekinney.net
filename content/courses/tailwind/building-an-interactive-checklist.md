---
title: Building a Checklist Item
description: >-
  Let's build an interactive checklist item that strikes through when completed
  using Tailwind's :has() selector utilities.

modified: 2025-06-11T19:05:33-06:00
---

Let's start with our basic HTML structure for a simple checklist item.

```html tailwind
<div>
  <input type="checkbox" id="task-1" />
  <label for="task-1">Complete the project documentation</label>
</div>
```

It's a basic checkbox and label, but there's no visual feedback when the task is completed. Let's transform it into a smart checklist item that automatically strikes through the text when the checkbox is checked.

## Adding Structure and Layout

First, let's establish proper layout and spacing using flexbox to align our checkbox and text.

```html tailwind
<div class="flex items-center gap-3 p-3">
  <input type="checkbox" id="task-1" class="h-4 w-4 rounded border-slate-300" />
  <label for="task-1" class="text-slate-900">Complete the project documentation</label>
</div>
```

Layout improvements:

- `flex items-center gap-3`: Aligns checkbox and label horizontally with 12px spacing
- `p-3`: Adds 12px padding around the entire item for comfortable touch targets
- `h-4 w-4`: Sets checkbox to 16px square for proper proportions
- `rounded border-slate-300`: Softens checkbox corners and adds subtle border
- `text-slate-900`: High contrast text color for readability

This creates a clean, accessible foundation with proper spacing and alignment.

## Introducing the :has() Selector

Now comes the magic—let's use Tailwind's `:has()` selector to automatically strike through the text when the checkbox is checked.

```html tailwind
<div
  class="flex items-center gap-3 p-3 has-[input:checked]:text-slate-500 has-[input:checked]:line-through"
>
  <input type="checkbox" id="task-1" class="h-4 w-4 rounded border-slate-300" />
  <label for="task-1" class="text-slate-900">Complete the project documentation</label>
</div>
```

The `:has()` selector magic:

- `has-[input:checked]:text-slate-500`: Changes text color to muted gray when the container has a checked input child
- `has-[input:checked]:line-through`: Adds strikethrough decoration when the container has a checked input child

The `has-[input:checked]:*` utilities are Tailwind's way of using CSS's `:has()` pseudo-class. This means "apply these styles to the container when it contains a checked input element." No JavaScript needed!

## Adding Smooth Transitions

Let's add transitions to make the completion state feel polished and satisfying.

```html tailwind
<div
  class="flex items-center gap-3 p-3 transition-all duration-300 has-[input:checked]:text-slate-500 has-[input:checked]:line-through"
>
  <input type="checkbox" id="task-1" class="h-4 w-4 rounded border-slate-300" />
  <label for="task-1" class="text-slate-900">Complete the project documentation</label>
</div>
```

Animation improvements:

- `transition-all duration-300`: Smoothly animates both color and text-decoration changes over 300ms
- The transition makes checking/unchecking feel more responsive and delightful

The 300ms duration provides a nice balance—fast enough to feel immediate but slow enough to see the visual change happen.

## Enhanced Styling and Polish

Finally, let's add some refinements to make our checklist item feel more premium and interactive.

```html tailwind
<div
  class="flex items-center gap-3 rounded-md p-3 transition-all duration-300 hover:bg-slate-50 has-[input:checked]:text-slate-500 has-[input:checked]:line-through"
>
  <input type="checkbox" id="task-1" class="h-4 w-4 rounded border-slate-300 text-blue-600" />
  <label for="task-1" class="cursor-pointer text-slate-900"
    >Complete the project documentation</label
  >
</div>
```

Polish improvements:

- `rounded-md`: Soft corners make the item feel more modern
- `hover:bg-slate-50`: Subtle background change on hover provides interactive feedback
- `text-blue-600` on checkbox: Brand color when checked (browser-dependent support)
- `cursor-pointer` on label: Makes it clear the text is clickable
- The `transition-all` now also animates the background color change

These small touches transform a basic form control into a polished interface element that feels cohesive and professional.

## Why the :has() Selector is Powerful

The `:has()` selector represents a fundamental shift in CSS—it allows parent elements to style themselves based on their children's state. This creates more intuitive component behavior where the entire checklist item responds to the checkbox state, not just the checkbox itself.

**Traditional approach**: You'd need JavaScript to add/remove classes when the checkbox changes.

**With :has()**: The styling happens automatically through pure CSS, making the component more performant and easier to maintain.

**Accessibility**: Since we're using a real checkbox and label, screen readers and keyboard navigation work perfectly—the visual enhancements don't compromise the semantic foundation.

## Challenges

Try building these variations:

1. **Multi-item Checklist**: Create a vertical list of 3-4 checklist items using the patterns above, with proper spacing between items
2. **Priority Indicators**: Add colored dots or badges before the text that also fade out when the item is completed using `has-[input:checked]:opacity-30`
