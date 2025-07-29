---
title: Backface Visibility
description: >-
  Control the visibility of element back faces in 3D transformations with
  Tailwind's backface visibility utilities.

modified: 2025-06-11T19:05:33-06:00
---

The `backface-visibility` CSS property determines if an element's back face is visible during 3D transformations. When an element rotates in 3D, its back side might face the user. This property lets you show or hide that back side.

It's useful for effects like flipping cards or rotating cubes, helping prevent visual clutter from the element's reverse side.

## Tailwind CSS Utilities for Backface Visibility

Tailwind provides utility classes to manage `backface-visibility` directly in your HTML.

### The `backface-hidden` Utility

`backface-hidden` sets `backface-visibility: hidden;`. The element's back face won't be visible when rotated. This is good for effects like a card that flips to show a different back.

### The `backface-visible` Utility

`backface-visible` sets `backface-visibility: visible;`. This is the default. The element's back face will be visible when rotated, useful for seeing all sides of a rotating object like a cube.

Utilities and their CSS:

- `backface-hidden` maps to `backface-visibility: hidden;`.
- `backface-visible` maps to `backface-visibility: visible;`.

## Applying Backface Visibility Responsively

Like other Tailwind utilities, `backface-visibility` classes can be applied conditionally at different responsive breakpoints (e.g., `sm:`, `md:`, `lg:`).

For example, use `sm:backface-hidden` to hide the back face on small screens and `lg:backface-visible` to show it on large screens. Prefix the utility with the breakpoint and a colon.
