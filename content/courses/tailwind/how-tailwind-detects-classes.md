---
title: How Tailwind Detects Classes
description: >-
  Learn how Tailwind automatically detects utility classes and manages content
  detection without configuration.
modified: 2025-06-11T19:05:33-06:00
---

Tailwind scans your project for utility classes to generate minimal CSS. It basically tries to strip out everything that you're not using and only include what you _are_ using.

- Treats files as plain text (no code parsing)
- Looks for tokens resembling class names
- Generates CSS for recognized utilities

Tailwind scans all files except the usual suspects:

- `.gitignore` entries
- Binary files (images, videos, zips)
- CSS files
- Package manager lock files

> [!WARNING] Dynamic class names aren't detected
>
> - `text-${color}-600` won't work
> - Use complete static class names
> - Map props to full class names, don't build dynamically

## Explicit Source Registration

For files missed by automatic detection (e.g., external libraries), use `@source` to register paths:

```css
@import 'tailwindcss';
@source "../node_modules/my-library/src/components";
```

Set base path with `source()`:

```css
@import 'tailwindcss' source('./src');
```

Ignore paths with `@source not`:

```css
@import 'tailwindcss';
@source not "../legacy";
```

Disable automatic detection: `source(none)`.

## Inline Safelisting

Force generation of specific classes with `@source inline()` (replaces Tailwind 3's `safelist` array):

```css
@import 'tailwindcss';
@source inline("inline-block");
```

Include variants:

```css
@import 'tailwindcss';
@source inline("underline", "hover:underline", "focus:underline");
```

Or use brace expansion:

```css
@import 'tailwindcss';
@source inline("{hover:,focus:,}underline");
```

Generate ranges:

```css
@import 'tailwindcss';
@source inline("{hover:,}bg-red-{100..900 by 100,50,950}");
```

Exclude classes with `@source not inline()`:

```css
@import 'tailwindcss';
@source not inline("{hover:,focus:,}bg-red-{100..900,50,950}");
```
