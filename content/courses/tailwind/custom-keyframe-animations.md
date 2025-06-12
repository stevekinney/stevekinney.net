---
title: Custom Keyframe Animations
description: Create custom CSS animations with Tailwind 4's @theme directive for pulse effects and loading indicators.
---

Engaging interfaces often use dynamic elements for visual feedback or to indicate activity, like pulsing effects or loading indicators. Tailwind 4's CSS-first configuration simplifies integrating custom animations.

CSS animation defines key styling moments over time. The `@keyframes` rule establishes these waypoints, and the `animation` property applies the sequence. Tailwind's built-in utilities like `animate-spin` and `animate-pulse` are shorthands for predefined `animation` values.

Define custom animations and design tokens within the `@theme` directive in your main CSS file. This CSS-first approach centralizes your design system.

## Defining Custom Animations with @theme

To create a custom animation in Tailwind 4 within your `@theme` block:

1.  Define a CSS variable in the `--animate-*` namespace (e.g., `--animate-your-animation-name`). This name becomes your utility class. The variable's value is the standard CSS `animation` property value (keyframes name, duration, timing function, iteration count, etc.).
2.  Define the `@keyframes` rule specifying the animation sequence. Nest this rule inside `@theme`. The `@keyframes` name must match the one used in your `--animate-*` variable.

Tailwind 4's build process (Oxide engine) reads the `@theme` block. When it finds a class like `animate-your-animation-name` in HTML, it generates the CSS rule using your `--animate-your-animation-name` variable and includes the corresponding `@keyframes` rule.

## Implementing a Custom Pulse Animation

A pulse animation, often a gentle fade or scale, draws attention or indicates a passive update. Let's create a custom `gentle-pulse` animation, distinct from Tailwind's `animate-pulse`.

Define `gentle-pulse` in `main.css` using `@theme`:

```css
@import 'tailwindcss';

@theme {
  /* Define CSS variable for the animation utility */
  /* Format: animation-name duration timing-function iteration-count */
  --animate-gentle-pulse: gentle-pulse 1.5s ease-in-out infinite;

  /* Define keyframes */
  @keyframes gentle-pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(0.95);
    }
  }
}
```

- `--animate-gentle-pulse` maps to the `animate-gentle-pulse` utility.
- `gentle-pulse 1.5s ease-in-out infinite` is the `animation` property value: references `@keyframes gentle-pulse`, duration 1.5s, `ease-in-out` timing, infinite repetition.
- `@keyframes gentle-pulse` defines `opacity` and `transform` changes.

Apply with the utility class in HTML:

```html tailwind
<div class="animate-gentle-pulse">New message!</div>
```

Tailwind generates the `.animate-gentle-pulse` rule and includes `@keyframes gentle-pulse`.

## Implementing a Custom Loading Indicator Pattern

A common loading indicator is a spinning element. Let's create a custom `slow-spin` animation, varying from Tailwind's `animate-spin`.

Define `slow-spin` in `main.css` within `@theme`:

```css
@import 'tailwindcss';

@theme {
  /* Define CSS variable for the animation utility */
  /* Format: animation-name duration timing-function iteration-count direction */
  --animate-slow-spin: slow-spin 3s linear infinite normal;

  /* Define keyframes */
  @keyframes slow-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
}
```

- `--animate-slow-spin` defines the `animate-slow-spin` utility.
- `slow-spin 3s linear infinite normal` specifies: `slow-spin` keyframes, 3s duration, `linear` timing, infinite repetition, normal direction.
- `@keyframes slow-spin` defines rotation from 0 to 360 degrees.

Use for a loading spinner:

```html tailwind
<svg
  class="animate-slow-spin h-8 w-8 text-blue-500"
  fill="none"
  viewBox="0 0 24 24"
  stroke="currentColor"
>
  <!-- Spinner SVG path -->
</svg>
```

This applies `animate-slow-spin` with size and color utilities. (In Tailwind 4, `size-8` sets width/height; `text-blue-500` uses theme variables).

## Customizing and Extending Animations

The `@theme` directive offers flexibility for managing animations.

### Overriding Default Animations

Override Tailwind's default animations (`spin`, `ping`, `pulse`, `bounce`) by redefining their `--animate-*` variables and `@keyframes` rules in your `@theme` block. To make `animate-pulse` slower:

```css
@import 'tailwindcss';

@theme {
  /* Override default pulse properties */
  --animate-pulse: pulse 2s ease-in-out infinite;

  /* Redefine keyframes if needed, or rely on original if only properties change */
  /* @keyframes pulse { ... } */
}
```

### Using Theme Variables in Custom CSS

Defined theme variables, including `--animate-*`, are available as native CSS variables in compiled CSS, useful for custom CSS rules outside utilities.

### Combining with Variants

Custom animation utilities work with Tailwind's variants:

- **Responsive Variants:** Apply animations at specific breakpoints (e.g., `md:animate-slide-in-left`).
- **State Variants:** Trigger animations on hover, focus (e.g., `hover:animate-pulse`).
- **Motion Preferences:** Use `motion-safe` or `motion-reduce` for accessibility.

```html tailwind
<div class="motion-safe:animate-gentle-pulse md:animate-slow-spin">
  Content animates based on motion preference and breakpoint.
</div>
```

This applies `gentle-pulse` for motion-safe users and `slow-spin` from medium breakpoint up.

## The Role of the CSS-First Approach

Tailwind 4's CSS-first configuration with `@theme` simplifies customization by keeping design tokens and implementations in CSS. Defining `@keyframes` within `@theme` links them to the theme system, ensuring they're included only if their utility is used. This contrasts with older versions where separate `@keyframes` could lead to unused CSS.

The Oxide engine ensures fast build times despite extensive custom definitions. Zero-configuration content detection streamlines development.

Defining custom keyframe animations in Tailwind is a natural extension of its utility-first approach, enhanced by CSS-first configuration and `@theme`. This allows fine-grained control over motion, applied consistently via utility classes.
