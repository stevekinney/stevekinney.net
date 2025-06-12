---
title: Dark Mode
description: Implement dark mode with Tailwind's dark variant, supporting system preferences and manual toggles.
---

Dark mode is a popular feature that reduces eye strain and allows users to customize their browsing experience. Tailwind CSS provides a flexible way to implement dark mode using its utility-first approach and variant system.

## Leveraging the `dark:` Variant

Tailwind's `dark:` variant is the foundation for implementing dark mode. It allows you to apply styles conditionally when dark mode is active. By default, `dark:` uses the `prefers-color-scheme: dark` CSS media query, automatically applying styles if the user's system or browser prefers a dark color scheme.

To use it, prepend `dark:` to any utility class. For example, to change an element's background to dark gray and text to white in dark mode:

```html tailwind
<div class="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">
  Content that adapts to light and dark mode.
</div>
```

Here, `bg-white` and `text-gray-900` are default styles (for light mode), while `dark:bg-gray-800` and `dark:text-white` override them when `prefers-color-scheme: dark` matches. This keeps styles for different modes co-located with their element.

Unlike traditional CSS where a class might have different styles in a media query, Tailwind's `dark:bg-gray-800` _only_ defines styles for the dark state. This separation simplifies reasoning about styles.

The `dark:` variant works with nearly all utility classes, including colors, typography, spacing, borders, transforms, and filters.

## Implementing Manual Dark Mode Toggling

Many applications offer a manual dark mode toggle. Tailwind supports this by letting you override the `dark:` variant's default behavior.

Instead of `prefers-color-scheme`, you can configure `dark:` to use a CSS selector, like a class or data attribute on a top-level element (often `<html>`).

Override the `dark` variant in your main stylesheet:

```css
@import 'tailwindcss';

@theme {
  /* ... other theme variables */
}

/* Override dark variant to use a class */
@custom-variant dark {
  :where(.dark)&;
}
```

Or use a data attribute:

```css
@import 'tailwindcss';

@theme {
  /* ... other theme variables */
}

/* Override dark variant to use a data attribute */
@custom-variant dark {
  :where([data-theme="dark"])&;
}
```

Now, `dark:` styles apply when `.dark` or `data-theme="dark"` is on an ancestor element.

Implementing the toggle requires JavaScript to add/remove the class or attribute on `<html>`. Store the user's preference (e.g., in `localStorage`) to persist the chosen mode.

### Supporting System Preference Alongside Manual Toggle

To offer a light, dark, and system preference toggle:

1.  Check for a saved preference ("light", "dark", or "system").
2.  If a preference exists, apply it to `<html>` on page load.
3.  If no preference or "system" is set, check `window.matchMedia('(prefers-color-scheme: dark)').matches`.
4.  Apply "light" or "dark" based on the system theme.
5.  Listen to `window.matchMedia('(prefers-color-scheme: dark)')` for system theme changes. If preference is "system", update `<html>` accordingly.
6.  Update the toggle logic for three states, saving the user's choice.

This gives users full control while respecting system settings by default.

## Dark Mode and Color Palettes

Tailwind's default color palette has many shades. For dark mode, typically use lighter backgrounds and darker text/accents in light mode, and reverse this for dark mode. The `dark:` variant easily switches shades:

```html tailwind
<div class="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">Content</div>
```

Tailwind supports wide gamut colors and defaults to OKLCH, improving color interpolation for gradients. You can transition properties like background gradients using `@property` for internal custom properties.

Customize the color palette with the `@theme` directive. Custom colors will also work with `dark:`.

## Stacking Variants with `dark:`

The `dark:` variant can be stacked with other variants for more specific conditions, like a hover effect only in dark mode or a dark mode style at a specific breakpoint.

```html tailwind
<button
  class="bg-blue-500 text-white hover:bg-blue-600 dark:bg-purple-500 dark:text-white dark:hover:bg-purple-600 md:dark:bg-green-500 md:dark:hover:bg-green-600"
>
  Button
</button>
```

This button is blue by default, darker blue on hover. In dark mode, it's purple, darker purple on hover. At the `md` breakpoint in dark mode, it's green, darker green on hover. This shows the flexibility of stacking variants.

## Related Concepts

Other utilities can complement dark mode:

- **`color-mix()`:** Tailwind uses `color-mix()` for opacity modifiers, simplifying opacity adjustments for colors, CSS variables, and `currentColor`.
- **`forced-colors` variant:** This media query applies styles when forced colors mode is enabled, crucial for accessibility. Tailwind includes `forced-color-adjust` utilities to manage forced colors for specific elements.

Understanding the `dark:` variant, manual toggling, and combining dark mode with other Tailwind features allows you to build user-friendly dark mode experiences.
