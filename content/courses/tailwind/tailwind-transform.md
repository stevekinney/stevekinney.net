---
title: Tailwind Transform
description: >-
  Apply 2D and 3D transforms with Tailwind utilities for rotating, scaling,
  skewing, and translating elements

modified: 2025-06-11T19:05:33-06:00
---

CSS transforms allow you to rotate, scale, skew, and translate elements in 2D or 3D space. Tailwind provides utility classes that map directly to these properties, making it fast and intuitive to apply complex visual effects in your HTML markup.

## Core Transform Properties

### The `transform` Property

The `transform` property applies one or more transform functions (`rotate()`, `scale()`, `translate()`, `skew()`, and 3D counterparts). Tailwind uses CSS variables under the hood to allow multiple transform effects on a single element.

### The `transform-origin` Property

By default, transforms apply from the center of an element. The `transform-origin` property changes this point. Tailwind provides utilities to control this origin point.

### The `transform-style` Property

For 3D transforms, `transform-style` determines whether children are positioned in 3D space (`preserve-3d`) or flattened to 2D (`flat`).

### The `perspective` Property

For 3D effects, `perspective` establishes a perspective view for child elements. Applied to a parent, it defines how far the z-plane is from the viewer.

### The `perspective-origin` Property

Like `transform-origin`, `perspective-origin` sets the vanishing point for the `perspective` effect. By default, this is centered.

## Tailwind's Transform Utilities

Tailwind offers utility classes for various transformations. These utilities work together on a single element using CSS variables.

### Translating Elements

Translation moves an element along the X, Y, or Z axis.

#### 2D Translation

- `translate-x-<number>`: Moves an element horizontally.
- `translate-y-<number>`: Moves an element vertically.
- `translate-<number>`: Moves an element horizontally and vertically by the same amount.

Use values from your spacing scale (`translate-4`) or percentages (`translate-1/2`). Negative values are supported (`-translate-x-2`). Custom values use square brackets (`translate-x-[10px]`).

#### 3D Translation

- `translate-z-<number>`: Moves an element along the Z axis. Usually requires `transform-3d` on the parent.

### Rotating Elements

Rotation spins an element around the X, Y, or Z axis.

#### 2D Rotation

- `rotate-<number>`: Rotates an element by specified degrees. Negative values rotate counterclockwise (`-rotate-45`). Custom values use square brackets (`rotate-[10deg]`).

#### 3D Rotation

- `rotate-x-<number>`: Rotates around the X axis.
- `rotate-y-<number>`: Rotates around the Y axis.
- `rotate-z-<number>`: Rotates around the Z axis.

These utilities can be combined for complex 3D rotations. Custom values are supported (`rotate-x-[20deg]`).

### Scaling Elements

Scaling changes the size of an element.

#### 2D Scaling

- `scale-x-<number>`: Scales horizontally.
- `scale-y-<number>`: Scales vertically.
- `scale-<number>`: Scales uniformly on both axes.

Values represent percentage of original size (`scale-75` for 75%, `scale-150` for 150%). Negative values mirror the element (`-scale-x-100`). Custom values use square brackets (`scale-[1.5]`).

#### 3D Scaling

- `scale-z-<number>`: Scales along the Z axis.

### Skewing Elements

Skewing tilts an element.

- `skew-x-<number>`: Skews horizontally.
- `skew-y-<number>`: Skews vertically.
- `skew-<number>`: Skews on both axes by the same amount.

Values represent degrees of tilt (`skew-6`). Negative values are supported (`-skew-y-3`). Custom values use square brackets (`skew-x-[10deg]`).

## Combining Transforms

Tailwind allows easy combination of transform effects on a single element. Multiple transform utilities don't overwrite the `transform` property. Instead, CSS variables (`--tw-translate-x`, `--tw-rotate`) manage each transformation. The final `transform` property combines these variables.

For example, `translate-x-4 rotate-45 scale-110` applies all three effects simultaneously.

## Working with 3D Transforms

Tailwind provides enhanced support for 3D transforms with dedicated utilities for CSS properties like `transform-style`, `perspective`, and `perspective-origin`.

- `transform-3d`: Sets `transform-style: preserve-3d;` on the parent.
- `transform-flat`: Sets `transform-style: flat;`.
- `perspective-<value>`: Sets the `perspective` property on a parent. Provides preset values (`perspective-normal`, `perspective-distant`) or allows custom values.
- `perspective-origin-<position>`: Sets the `perspective-origin` property. Covers common positions (`perspective-origin-top`, `perspective-origin-bottom-left`) or allows custom values.
- `translate-z-<number>`, `rotate-x-<number>`, `rotate-y-<number>`, `rotate-z-<number>`, `scale-z-<number>`: Enable specific 3D transformations.

## Applying Transforms Conditionally

Transform classes can be applied conditionally using variants.

### Responsive Variants

Combine transform utilities with responsive prefixes (`md:`, `lg:`) to apply transformations at specific breakpoints. For example, `md:rotate-90` rotates an element 90 degrees on medium screens and larger. Container query variants (`@md:`) apply transforms based on parent container size.

### State Variants

Use state variants (`hover:`, `focus:`, `active:`) to apply transforms based on user interaction. For instance, `hover:scale-110` makes an element larger when hovered.

### Other Variants

Transforms can be applied based on dark mode (`dark:`), reduced motion preference (`motion-reduce:`, `motion-safe:`), or specific data attributes (`data-[state=active]:`).

## Customizing Transforms

### Customizing Theme Values

Customize default values for transform-related properties using the `@theme` directive.

```css
@import 'tailwindcss';

@theme {
  --perspective-custom: 2000px; /* [!code highlight] */
  --transform-origin-fancy: top left; /* [!code highlight] */
}
```

This allows classes like `perspective-custom` and `origin-fancy`.

When customizing values that reference other variables, use `@theme inline`.

### Using Arbitrary Values

For one-off transform values, use Tailwind's arbitrary value syntax with square brackets.

- `rotate-[30deg]`
- `scale-[1.7]`
- `skew-x-[15deg]`
- `translate-y-[50px]`
- `perspective-[100px]`
- `origin-[25%_75%]`

### Using Theme Variables in Custom CSS

Customized transform theme values are available as CSS variables in compiled CSS (`--perspective-custom`, `--transform-origin-fancy`). Reference them in custom CSS or other arbitrary values, particularly with `calc()`.

## Performance Considerations

CSS transforms are generally well-optimized by browsers. For specific performance issues, you can force hardware acceleration.

- `transform-gpu`: Forces hardware acceleration (using `translateZ(0)`).
- `transform-cpu`: Reverts to CPU rendering.

Use these utilities judiciously, only when you identify specific performance issues.

## Removing Transforms

Remove previously applied transforms using the `transform-none` utility. This is useful when you've applied a transform at a smaller breakpoint and want to remove it at a larger one.
