---
title: Line Spacing and Letter Spacing
description: >-
  Control typography with Tailwind's leading (line height) and tracking (letter
  spacing) utilities.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

Tailwind manages line spacing (leading) and letter spacing (tracking) with utility classes in your HTML.

Line spacing (`line-height` in CSS) is the vertical space between text lines, managed by `leading-*` utilities. Letter spacing (`letter-spacing` in CSS) is the horizontal space between characters, managed by `tracking-*` utilities.

## Line Spacing (Leading)

Line spacing affects readability. Tailwind utilities set `line-height` with predefined theme values.

### Setting Line Height with Font Size

Tailwind combines `font-size` and `line-height` for consistency using `text-<size>/<number>` (e.g., `text-sm/6`). `<size>` is a predefined font size (sm, base, lg), and `<number>` is a `line-height` from the spacing scale. `text-<size>` alone applies a default `line-height`.

### Setting Line Height Independently

Control `line-height` with `leading-*` utilities (e.g., `leading-6`, `leading-7`). `leading-none` sets `line-height` to `1`.

### Responsive Line Height

Apply line height utilities conditionally with responsive variants (e.g., `md:leading-relaxed`) or container query variants (e.g., `@md:leading-relaxed`).

### Customizing the Line Height Scale

Extend or override the default line height scale in your main CSS file using the `@theme` directive with `--leading-*` variables.

```css
@import 'tailwindcss';

@theme {
  --leading-extra-tight: 1.1;
  --leading-loose: 2;
}
```

This creates `leading-extra-tight` and `leading-loose` utilities. Clear defaults with `--leading-*: initial;` before defining custom values.

## Letter Spacing (Tracking)

Letter spacing (`letter-spacing`) is controlled by `tracking-*` utilities.

### Setting Letter Spacing with Utilities

Predefined `tracking-*` utilities include `tracking-tighter`, `tracking-tight`, `tracking-normal`, `tracking-wide`, `tracking-wider`, and `tracking-widest`. `tracking-tight` reduces space; `tracking-wide` increases it. `tracking-normal` resets to browser default.

### Using Negative Letter Spacing

Achieve negative letter spacing with custom values in the theme. If a custom scale includes negative values, prefix the utility with a dash (e.g., `-tracking-tightest`) for numerically-based custom scales.

### Responsive Letter Spacing

Make letter spacing responsive with breakpoint or container query variants (e.g., `tracking-tight md:tracking-normal`).

### Customizing the Letter Spacing Scale

Customize the `tracking-*` scale using the `@theme` directive with `--tracking-*` variables.

```css
@import 'tailwindcss';

@theme {
  --tracking-tightest: -0.075em;
  --tracking-extra-wide: 0.2em;
}
```

This creates `tracking-tightest` and `tracking-extra-wide` utilities. Clear defaults with `--tracking-*: initial;`.

## Using Custom Values

Use arbitrary values for line height and letter spacing with square bracket notation.

For line height: `leading-[<value>]` (e.g., `leading-[1.7]`) or `text-<size>/[<value>]`.

For letter spacing: `tracking-[<value>]` (e.g., `tracking-[0.1em]`).

CSS variables can be used: `leading-[var(--custom-line-height)]`.

## Applying Responsive Design

All utilities, including line spacing and letter spacing, can be applied conditionally at breakpoints (e.g., `sm:`, `md:`) or based on container queries (e.g., `@sm:`, `@md:`).

## Customizing Theme Variables

Tailwind 4 uses CSS-first configuration with the `@theme` directive. Define custom scales in your main CSS file.

Theme variables (e.g., `--leading-loose`, `--tracking-tightest`) become standard CSS variables, usable in custom CSS or inline styles. This simplifies integration with other tools.
