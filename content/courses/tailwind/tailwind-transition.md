---
title: Transitions
description: Create smooth animations with Tailwind's transition utilities for duration, timing, delay, and property-specific transitions
---

CSS transitions animate changes to CSS properties over time, creating smooth effects like fading elements, color changes, or layout shifts. Tailwind provides utility classes for implementing transitions directly in HTML.

## Applying CSS Transitions

Apply transitions using the `transition` utility class. This tells the browser to animate property changes rather than change them instantly.

The base `transition` utility enables transitions for common properties: color, background color, border color, text decoration color, fill, stroke, gradient stops, opacity, box shadow, transform, translate, scale, rotate, and filter. It sets a default timing function (`cubic-bezier(0.4, 0, 0.2, 1)`) and duration (`150ms`).

Tailwind offers utilities for specific property groups:

- `transition-all`: Transitions all animatable properties
- `transition-colors`: Transitions color-related properties (`color`, `background-color`, `border-color`, etc.)
- `transition-opacity`: Transitions only `opacity`
- `transition-shadow`: Transitions only `box-shadow`
- `transition-transform`: Transitions transform properties (`transform`, `translate`, `scale`, `rotate`)
- `transition-none`: Prevents any transitions

Example:

```html tailwind
<div class="bg-blue-500 transition hover:bg-red-500">Hover over me</div>
```

Here, `transition` animates property changes, and `hover:bg-red-500` specifies the target background color on hover.

## Controlling Transition Properties

For granular control, use `transition-*` utilities like `transition-colors` or `transition-transform` to target specific property sets.

For properties not in predefined sets, use arbitrary values with `transition-[<value>]` syntax:

```html tailwind
<div class="h-10 w-10 transition-[width,height] hover:h-20 hover:w-20">Resize me</div>
```

Reference CSS variables using `transition-(<custom-property>)` syntax.

## Duration, Timing, and Delay

Control how long, how, and when transitions occur.

### Duration

Duration determines animation length:

- `duration-<number>`: Sets duration in milliseconds (`duration-150`, `duration-700`)
- `duration-initial`: Sets to initial value
- `duration-(<custom-property>)`: Uses CSS variable
- `duration-[<value>]`: Uses arbitrary CSS value

```html tailwind
<div class="bg-blue-500 transition duration-500 hover:bg-red-500">
  Hover over me (500ms transition)
</div>
```

### Timing Function (Easing)

Controls acceleration curve:

- `ease-linear`: Constant speed
- `ease-in`: Starts slowly, speeds up (`cubic-bezier(0.4, 0, 1, 1)`)
- `ease-out`: Starts quickly, slows down (`cubic-bezier(0, 0, 0.2, 1)`)
- `ease-in-out`: Starts slowly, speeds up, ends slowly (`cubic-bezier(0.4, 0, 0.2, 1)`) - default for `transition`
- `ease-initial`: Sets to initial value
- `ease-(<custom-property>)`: Uses CSS variable
- `ease-[<value>]`: Uses arbitrary value for custom `cubic-bezier` functions

```html tailwind
<div class="bg-green-500 transition duration-300 ease-in-out hover:bg-yellow-500">
  Hover over me (ease-in-out)
</div>
```

### Delay

Specifies waiting period before transition begins:

- `delay-<number>`: Sets delay in milliseconds (`delay-150`, `delay-700`)
- `delay-(<custom-property>)`: Uses CSS variable
- `delay-[<value>]`: Uses arbitrary CSS value

```html tailwind
<div class="bg-purple-500 transition delay-150 duration-300 hover:bg-orange-500">
  Hover over me (150ms delay)
</div>
```

## Specific Properties and Features

Tailwind provides utilities for transitioning particular CSS features:

- **Transforms**: Use `transition-transform` for `rotate-*`, `scale-*`, `translate-*`, `skew-*`. Force hardware acceleration with `transform-gpu` or revert with `transform-cpu`. Set `transform-origin` and `transform-style` for 3D transforms.
- **Filters**: Transition filters like `blur-*`, `brightness-*`, `contrast-*`, `drop-shadow-*`, etc. The base `transition` includes filter properties. Remove with `filter-none`.
- **Box Shadows**: Handled by `transition-shadow` or base `transition`.
- **Gradients**: Supported in base `transition` and `transition-colors`. In Tailwind 4, gradients interpolate in `oklab` color space by default.
- **Discrete Properties**: Use `transition-discrete` for properties that normally change instantly (`display`, `visibility`).

## Styling Inert Elements

The HTML `inert` attribute marks elements as non-interactive. Use the `inert` variant to style these elements and transition their state changes.

```html tailwind
<div class="opacity-100 transition-opacity duration-300 inert:opacity-50" inert>
  Content that fades when inert
</div>
```

The transition smoothly animates opacity changes when the `inert` attribute is toggled.

```html tailwind
<button class="cursor-pointer transition-all duration-200 inert:cursor-not-allowed" inert>
  Inert Button
</button>
```

## Transitions with Other Variants

Combine transition utilities with state variants (`hover`, `focus`, `active`, `disabled`, `checked`, `group-hover`, `peer-focus`) and responsive variants (`sm:`, `md:`, `@container`).

Apply transition only on hover:

```html tailwind
<div class="bg-blue-500 hover:bg-red-500 hover:transition-colors hover:duration-300">
  Transitions only on hover
</div>
```

More commonly, apply `transition` in default state for enter and exit animations:

```html tailwind
<div class="bg-blue-500 transition-colors duration-300 hover:bg-red-500">
  Transitions on hover in and out
</div>
```

Stack variants for conditional transitions:

```html tailwind
<div class="transition-colors duration-300 md:hover:bg-red-500">
  Background changes on hover from medium screens up
</div>
```

## Performance Considerations

The `will-change` CSS property hints to browsers that an element will change, allowing optimization. Tailwind provides utilities:

- `will-change-auto`
- `will-change-scroll`
- `will-change-contents`
- `will-change-transform`
- `will-change-(<custom-property>)`
- `will-change-[<value>]`

Apply just before animation begins and remove after completion. Overuse can harm performance.

For transforms and opacity, hardware acceleration can improve performance. Use `transform-gpu` to force hardware acceleration or `transform-cpu` to revert.

## Customizing Transition Values

Customize transition values using CSS variables in the `@theme` directive:

```css
@import 'tailwindcss';

@theme {
  --duration-long: 1000ms;
  --ease-custom: cubic-bezier(0.25, 1, 0.5, 1);
}
```

This enables utilities like `duration-long` and `ease-custom`. Override defaults by redefining variables with the same name.

This CSS-first configuration approach aligns design tokens with their usage location, making Tailwind feel more native to CSS.
