---
title: ARIA Integration
description: >-
  Style elements based on ARIA attributes for better accessibility with
  Tailwind's ARIA variants and utilities

modified: 2025-06-11T19:05:33-06:00
---

You can conditionally style elements using the `aria-*` variant, which targets elements based on their ARIA attributes. For instance, you can change the background color of an element when the `aria-checked` attribute is set to `true` using a class like `aria-checked:bg-sky-700`. This variant applies styles only when the specified ARIA condition is met.

Tailwind includes built-in variants for common boolean ARIA attributes. These are:

- `aria-checked`
- `aria-disabled`
- `aria-expanded`
- `aria-hidden`
- `aria-invalid`
- `aria-pressed`
- `aria-readonly`
- `aria-required`
- `aria-selected`

Using these utilities means the browser handles applying the right styles based on the element's state, reducing the need for complex conditional logic in your templates.

### Arbitrary Values with `aria-*`

For ARIA attributes that aren't simple boolean states or for attributes not included by default, you can use arbitrary values within the `aria-*` variant. This is particularly useful for attributes with specific values, like `aria-sort`. You can generate a property on the fly using any arbitrary value within square brackets.

For example, to rotate an icon based on the value of the `aria-sort` attribute, you might use classes like `aria-[sort=ascending]:rotate-0` and `aria-[sort=descending]:rotate-180`.

## Styling Parent or Sibling Elements

Sometimes you need to style an element based on the ARIA state of a related element, such as a parent or a sibling. Tailwind provides `group-aria-*` and `peer-aria-*` variants for these scenarios.

### The `group-aria-*` Variant

Similar to the `group-hover` variant, the `group-aria-*` variant allows you to style an element when a parent element (marked with the `group` class) has a specific ARIA attribute or value. For instance, if a table header (`<th>`) is marked as a `group` and has `aria-sort="ascending"`, you can style a child SVG icon using `group-aria-[sort=ascending]:rotate-0`.

### The `peer-aria-*` Variant

The `peer-aria-*` variant enables styling an element based on the ARIA state of a sibling element. You mark the sibling element with the `peer` class, and then use `peer-aria-*` variants on the target element. This is useful for patterns like styling an input's label based on the input's `aria-invalid` state, or styling a message based on an input's `aria-disabled` state. An example might be `peer-aria-[disabled]:opacity-50` to make a hint text semi-transparent when its associated input peer is disabled.

## Customizing ARIA Variants

You can customize which `aria-*` variants are available or add new ones that map to specific ARIA attributes or values by creating a new variant. This can be done using the `@custom-variant` directive in your CSS.

## Enhancing Accessibility with Other Utilities

Beyond explicit ARIA variants, Tailwind provides several other utilities and features that contribute to the overall accessibility of your web interfaces.

## Visually Hiding Elements

For elements that need to be present in the DOM for screen readers but should be visually hidden, Tailwind offers the `sr-only` utility. This utility applies styles that position the element off-screen while keeping it accessible to assistive technologies. The `not-sr-only` utility reverses this, making the element visible again.

## Focus Indicators

Proper focus styling is essential for keyboard navigation and accessibility. While browsers provide default outlines on focused elements, you often need custom styling for design purposes.

- **Using `outline-*` Utilities**: Tailwind provides utilities like `outline-2` and `outline-blue-500` to set the width and color of an element's outline. You can apply these using the `focus:` variant.
- **The `outline-hidden` Utility**: If you hide the default browser outline, it's highly recommended to apply your own focus styling for accessibility. The `outline-hidden` utility is provided to hide the default outline while preserving it in forced colors mode for accessibility reasons. Previously, `outline-none` had this behavior, but in Tailwind 4, `outline-none` explicitly sets `outline-style: none`.

## Reduced Motion and Forced Colors

Tailwind includes variants that respond to user preferences set in their operating system, contributing to a more inclusive experience.

- **Reduced Motion**: The `prefers-reduced-motion` media query indicates if the user wants minimal non-essential motion. You can use the `motion-reduce` variant to conditionally apply styles when this preference is active. Conversely, `motion-safe` applies styles only when the user has _not_ requested reduced motion. These are useful for controlling animations and transitions.
- **Forced Colors**: The `prefers-contrast` media query tells you if the user has requested more or less contrast. The `contrast-more` variant lets you add styles conditionally in this case. Tailwind also includes `forced-color-adjust-auto` and `forced-color-adjust-none` utilities for opting in and out of forced colors. The `inverted-colors` variant can be used when the user has enabled an inverted color scheme.

## Text Selection and Readability

Utilities for controlling text selection (`user-select-none`, `select-text`, etc.) and text wrapping (`text-balance`, `text-pretty`) can also impact readability and user interaction, contributing to accessibility. Additionally, font smoothing utilities (`antialiased`, `subpixel-antialiased`) can affect text rendering.
