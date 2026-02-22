---
title: Built-In Animations
description: >-
  Apply CSS transforms like rotate, scale, and translate with Tailwind's
  comprehensive transform utility classes.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

CSS transforms (rotate, scale, skew, translate) add visual impact to UIs. Tailwind CSS provides utility classes for these properties, allowing you to apply them directly in HTML.

## Core Transform Properties

Understanding these CSS properties is key to using transforms:

### The `transform` Property

This property applies transform functions (e.g., `rotate()`, `scale()`). Tailwind utilities set this, often using CSS variables to combine multiple effects.

### The `transform-origin` Property

Transforms originate from an element's center by default. `transform-origin` changes this point. Tailwind offers utilities to control this.

### The `transform-style` Property

For 3D transforms, `transform-style` on a parent element determines if children are in 3D space (`preserve-3d`) or flattened (`flat`). Tailwind provides utilities for this.

### The `perspective` Property

For 3D effects, `perspective` on a parent sets a perspective view for children, influencing perceived depth. Tailwind has utilities for this.

### The `perspective-origin` Property

`perspective-origin` sets the vanishing point for the `perspective` effect, defaulting to center. Tailwind utilities adjust this.

## Tailwind's Transform Utilities

Tailwind offers utility classes for various transformations, often combined using CSS variables.

### Enabling Transforms

Applying any transform utility (e.g., `translate-x-*`, `rotate-*`) automatically sets the necessary CSS variables and the `transform` property.

### Translating Elements

Translation moves an element along an axis.

#### 2D Translation

- `translate-x-<number>`: Horizontal movement.
- `translate-y-<number>`: Vertical movement.
- `translate-<number>`: Equal horizontal and vertical movement.

Use spacing scale values (e.g., `translate-4`), percentages (e.g., `translate-1/2`), negative values (e.g., `-translate-x-2`), or custom values (`translate-x-[10px]`).

#### 3D Translation

- `translate-z-<number>`: Moves along Z-axis. Usually needs `transform-3d` on the parent.

### Rotating Elements

Rotation spins an element.

#### 2D Rotation

- `rotate-<number>`: Rotates in 2D plane (degrees). Negative values rotate counterclockwise (e.g., `-rotate-45`). Custom values: `rotate-[10deg]`.

#### 3D Rotation

- `rotate-x-<number>`: Rotates around X-axis.
- `rotate-y-<number>`: Rotates around Y-axis.
- `rotate-z-<number>`: Rotates around Z-axis.

Combine for complex 3D rotations. Custom values: `rotate-x-[20deg]`.

### Scaling Elements

Scaling changes element size.

#### 2D Scaling

- `scale-x-<number>`: Scales horizontally.
- `scale-y-<number>`: Scales vertically.
- `scale-<number>`: Scales uniformly.

Values are percentages (e.g., `scale-75` for 75%). Negative values mirror (e.g., `-scale-x-100`). Custom values: `scale-[1.5]`.

#### 3D Scaling

- `scale-z-<number>`: Scales along Z-axis.

### Skewing Elements

Skewing tilts an element.

- `skew-x-<number>`: Skews horizontally.
- `skew-y-<number>`: Skews vertically.
- `skew-<number>`: Skews on both axes.

Values are degrees (e.g., `skew-6`). Negative values: `-skew-y-3`. Custom values: `skew-x-[10deg]`.

## Setting the Transform Origin

Change the default center origin with `origin-*` utilities:

- `origin-center`, `origin-top`, `origin-top-right`, `origin-right`, `origin-bottom-right`, `origin-bottom`, `origin-bottom-left`, `origin-left`, `origin-top-left`.

Custom values: `origin-[25%_75%]`.

## Working with 3D Transforms

Tailwind supports 3D transforms with utilities for `transform-style`, `perspective`, and `perspective-origin`, plus 3D transform functions.

- `transform-3d`: Sets `transform-style: preserve-3d;` on parent for 3D children.
- `transform-flat`: Sets `transform-style: flat;`.
- `perspective-<value>`: Sets `perspective` on parent (e.g., `perspective-normal`, or custom).
- `perspective-origin-<position>`: Sets `perspective-origin` (e.g., `perspective-origin-top`, or custom).
- `translate-z-<number>`, `rotate-x-<number>`, `rotate-y-<number>`, `rotate-z-<number>`, `scale-z-<number>`: Specific 3D transformations.

## Combining Transforms

Easily combine transform utilities (e.g., `translate-x-4 rotate-45 scale-110`). Tailwind uses CSS variables (`--tw-translate-x`, `--tw-rotate`) so multiple transforms apply simultaneously.

## Conditional Transforms

Apply transforms conditionally with variants.

### Responsive Variants

Use responsive prefixes (`md:`, `lg:`) or container query variants (`@md:`) for breakpoint-specific transforms (e.g., `md:rotate-90`).

### State Variants

Use state variants (`hover:`, `focus:`, `group-hover:`) for interaction-based transforms (e.g., `hover:scale-110`).

### Other Variants

Apply transforms based on dark mode (`dark:`), motion preference (`motion-reduce:`), or data attributes (`data-[state=active]:`).

## Customizing Transforms

Customize transform utilities in Tailwind 4 using the `@theme` directive in CSS.

### Customizing Theme Values

Define custom values for rotate, scale, etc., in `@theme`.

```css
@import 'tailwindcss';

@theme {
  --perspective-custom: 2000px;
  --transform-origin-fancy: top left;
}
```

This enables classes like `perspective-custom` and `origin-fancy`.
Use `@theme inline` for values referencing other variables.

### Using Arbitrary Values

For one-off values, use square brackets:
`rotate-[30deg]`, `scale-[1.7]`, `translate-y-[50px]`, `perspective-[100px]`, `origin-[25%_75%]`. In Tailwind 4, reference CSS variables like `w-(--sidebar-width)`.

### Using Theme Variables in Custom CSS

Customized theme values are available as CSS variables (e.g., `--perspective-custom`) for use in your own CSS.

```css
.custom-element {
  transform-origin: var(--transform-origin-fancy);
}
```

## Performance Optimization

CSS transforms are generally performant. For specific issues:

- `transform-gpu`: May force hardware acceleration (`translateZ(0)`).
- `transform-cpu`: Reverts to CPU rendering.

Use these sparingly. `will-change-transform` can hint to browsers about upcoming changes.

## Removing Transforms

Use `transform-none` to remove transforms, useful for responsive changes.

Mastering Tailwind's transform utilities allows for dynamic visual effects directly in HTML.
