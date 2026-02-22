---
title: Caret and Accent Color
description: >-
  Customize cursor and form control colors using Tailwind's caret and accent
  color utilities for brand consistency.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

Tailwind 4.0 provides utilities to control `caret-color` (text input cursor) and `accent-color` (form controls like checkboxes, radio buttons) directly in your HTML.

## Caret Color

`caret-color` styles the blinking cursor in inputs and textareas. Tailwind utilities map to this CSS property, using your theme's colors or custom values.

### Setting Caret Color with Utilities

Use `caret-*` utilities (e.g., `caret-blue-600`, `caret-sky-400`) to set the cursor color.

Example:

```html tailwind
<input type="text" class="border caret-rose-500" />
```

This generates CSS like `caret-color: var(--color-rose-500);`. Utilities like `caret-inherit`, `caret-current`, and `caret-transparent` are also available.

### Using Custom Values

For specific colors not in your theme, use arbitrary value syntax: `caret-[<value>]`.

Example:

```html tailwind
<input type="text" class="border caret-[#123456]" />
<input type="text" class="border caret-[var(--custom-cursor-color)]" />
```

### Responsive Caret Color

Apply `caret-*` utilities conditionally at different breakpoints using responsive prefixes (e.g., `md:caret-lime-600`).

Example:

```html tailwind
<input type="text" class="border caret-rose-500 md:caret-lime-600" />
```

### Customizing the Caret Color Scale

Extend or override the default color scale in your main CSS file using the `@theme` directive and `--color-*` namespace.

```css
@import 'tailwindcss';

@theme {
  --color-midnight: #1a1a2e;
  --color-tahiti: #3b82f6; /* Overrides blue-500 */
}
```

This makes `caret-midnight` and `caret-tahiti` available. These become CSS variables (e.g., `--color-midnight: #1a1a2e;`).
To replace the default scale, use `--color-*: initial;` before defining custom values.

## Accent Color

`accent-color` customizes the color of browser-generated form controls.

### Setting Accent Color with Utilities

Use `accent-*` utilities (e.g., `accent-indigo-500`) derived from your theme's color palette.

Example:

```html tailwind
<input type="checkbox" class="accent-rose-500" />
```

This generates `accent-color: var(--color-rose-500);`. `accent-inherit`, `accent-current`, and `accent-transparent` are also available.

### Changing Opacity

Adjust accent color opacity with `/<number>` (e.g., `accent-blue-500/50`). Browser support for accent color opacity is limited (mainly Firefox).

```html tailwind
<input type="checkbox" class="accent-blue-500/50" />
```

### Using Custom Values

Use arbitrary value syntax `accent-[<value>]` for custom accent colors.

```html tailwind
<input type="checkbox" class="accent-[#abcdef]" />
<input type="checkbox" class="accent-[var(--brand-color)]" />
```

### Responsive Accent Color

Apply `accent-*` utilities conditionally at different breakpoints (e.g., `lg:accent-pink-500`).

```html tailwind
<input type="checkbox" class="accent-blue-500 lg:accent-pink-500" />
```

### Customizing the Accent Color Scale

Customize your color scale for accent colors using `@theme` and the `--color-*` namespace in your CSS.

```css
@import 'tailwindcss';

@theme {
  --color-primary-brand: oklch(70% 0.15 150);
}
```

Defining `--color-primary-brand` makes `accent-primary-brand` available. The CSS variable `--color-primary-brand: oklch(70% 0.15 150);` is generated.
Override defaults or clear the namespace (`--color-*: initial;`) as needed.
