---
title: Tailwind Masks
description: Apply CSS masks with Tailwind utilities for creative visual effects using images and gradients.
---

CSS masking partially or fully hides parts of an element's content. Unlike opacity or `overflow: hidden`, masking uses another image or gradient to define visible portions based on transparency or luminance. Tailwind 4 provides utilities for implementing CSS masks directly in markup.

## Understanding CSS Masking

CSS masking uses the `mask-image` property to apply a mask to an element. The mask shape determines element visibility. Think of it as a stencil: cut-out areas show the underlying element, solid areas hide it. The "stencil" can be an image, SVG, or CSS gradient.

Tailwind 4 uses CSS-first configuration. Custom styles, including masking, are defined using CSS variables and directives within your main CSS file, typically in the `@theme` block.

## Applying Masks with Tailwind Utilities

Tailwind provides `mask-` utilities that map to CSS masking properties.

### Mask Image (`mask-image`)

The `mask-image` property specifies the mask layer image. Use `mask-[<value>]` arbitrary value syntax for any valid CSS `mask-image` value.

To use an SVG image as a mask:

```html tailwind
<div class="mask-[url('/path/to/your-mask.svg')]">
  <!-- Content to be masked -->
</div>
```

#### Gradient Masks

Tailwind provides utilities for linear, radial, and conic gradients as masks:

- **Linear Gradients:** Use `mask-linear-<angle>` for angled gradients. Mask specific edges with `mask-b-from-<value>` (bottom) or `mask-t-to-<value>` (top). Use `mask-x-from-70%` and `mask-y-to-90%` for two sides. Customize colors with `mask-<side>-from-<color>` and `mask-<side>-to-<color>`.
- **Radial Gradients:** Use `mask-radial-from-<value>` and `mask-radial-to-<value>`. Set position with `mask-radial-at-bottom-left` or `mask-radial-at-[35%_35%]`. Control size with `mask-radial-closest-corner`. Customize colors with `mask-radial-from-<color>` and `mask-radial-to-<color>`.
- **Conic Gradients:** Use `mask-conic-from-<value>`, `mask-conic-to-<value>`, and `mask-conic-<angle>`. Customize colors with `mask-conic-from-<color>` and `mask-conic-to-<color>`.

Linear gradient mask example:

```html tailwind
<img src="/img/keyboard-dark.png" alt="Keyboard" class="mask-b-from-transparent mask-b-to-black" />
```

This applies a linear gradient mask to the bottom edge, transitioning from transparent to black.

#### Removing Mask Images

Remove an existing mask image with `mask-none`:

```html tailwind
<div class="mask-[url('/path/to/mask.svg')] hover:mask-none">
  <!-- Content -->
</div>
```

### Mask Size (`mask-size`)

Controls mask image size:

- `mask-auto`: Default mask image size.
- `mask-cover`: Scales to cover element, potentially cropping.
- `mask-contain`: Scales to fit within element without cropping.

Use `mask-size-[<value>]` for custom sizes:

```html tailwind
<div class="mask-size-cover md:mask-size-contain mask-[url('/path/to/mask.svg')]">
  <!-- Content -->
</div>
```

### Mask Repeat (`mask-repeat`)

Controls mask image repetition:

- `mask-repeat`: Repeats vertically and horizontally.
- `mask-no-repeat`: Prevents repetition.
- `mask-repeat-x`: Repeats horizontally only.
- `mask-repeat-y`: Repeats vertically only.
- `mask-repeat-space`: Repeats without clipping, distributing space evenly.
- `mask-repeat-round`: Repeats without clipping, stretching if needed.

```html tailwind
<div class="mask-[url('/path/to/pattern.svg')] mask-repeat">
  <!-- Content -->
</div>
```

### Mask Position (`mask-position`)

Controls initial mask image position. Use utilities like `mask-top-left`, `mask-center`, `mask-bottom-right`, or `mask-position-[<value>]`:

```html tailwind
<div class="mask-position-center mask-[url('/path/to/spotlight.svg')] mask-no-repeat">
  <!-- Content -->
</div>
```

### Mask Origin (`mask-origin`)

Specifies mask image positioning origin. Utilities include `mask-origin-border`, `mask-origin-padding`, `mask-origin-content`, `mask-origin-fill`, `mask-origin-stroke`, and `mask-origin-view`:

```html tailwind
<div class="mask-[url('/path/to/mask.svg')] mask-origin-content">
  <!-- Content -->
</div>
```

### Mask Clip (`mask-clip`)

Specifies mask bounding box. Utilities include `mask-clip-border`, `mask-clip-padding`, `mask-clip-content`, `mask-clip-fill`, `mask-clip-stroke`, `mask-clip-view`, and `mask-no-clip`:

```html tailwind
<div class="mask-clip-text mask-[url('/path/to/text-mask.svg')]">Masked Text</div>
```

### Mask Composite (`mask-composite`)

Determines how multiple mask layers combine. Utilities: `mask-add`, `mask-subtract`, `mask-intersect`, `mask-exclude`. Default is `intersect` for gradient masks. Use `isolate` on parent for blending with background content.

```html tailwind
<div class="mask-composite-add mask-[url('/mask1.svg'),_url('/mask2.svg')]">
  <!-- Content combined from two masks -->
</div>
```

### Mask Mode (`mask-mode`)

Specifies how mask image is treated:

- `mask-alpha`: Mask opacity determines visibility.
- `mask-luminance`: Mask luminance determines visibility.
- `mask-match`: Matches `mask-type` property.

```html tailwind
<div class="mask-mode-luminance mask-[url('/path/to/grayscale-mask.svg')]">
  <!-- Content visibility based on mask brightness -->
</div>
```

### Mask Type (`mask-type`)

For SVG masks within SVG elements:

- `mask-type-alpha`: Mask opacity determines visibility.
- `mask-type-luminance`: Mask luminance determines visibility.

```html tailwind
<svg>
  <mask id="myMask" class="mask-type-luminance">
    <!-- Mask shape content -->
  </mask>
  <!-- Element to be masked -->
</svg>
```

## Customizing Mask Values

Tailwind 4's CSS-first approach uses the `@theme` directive for customization. Define custom CSS variables and reference them with arbitrary value syntax.

Custom color palette for gradient masks:

```css
@import 'tailwindcss';

@theme {
  --color-custom-start: oklch(80% 0.15 240);
  --color-custom-end: oklch(50% 0.2 300);
}
```

Use custom colors in gradient masks:

```html tailwind
<div class="mask-linear-to-b mask-linear-from-custom-start mask-linear-to-custom-end">
  <!-- Content with gradient mask using custom colors -->
</div>
```

For non-color custom values:

```css
@import 'tailwindcss';

:root {
  --my-custom-mask-image: url('/path/to/special-mask.svg');
  --my-custom-mask-size: 75%;
}
```

```html tailwind
<div class="mask-[var(--my-custom-mask-image)] mask-size-[var(--my-custom-mask-size)]">
  <!-- Content -->
</div>
```

## Combining Mask Properties and Variants

Combine multiple mask utilities on a single element for complex effects. Use with responsive (`@md:`, `@lg:`), state (`hover:`, `focus:`), and media query (`dark:`, `motion-reduce:`) variants:

```html tailwind
<div
  class="mask-size-contain md:mask-size-cover hover:mask-position-top-left mask-[url('/mask.svg')] motion-safe:animate-pulse"
>
  <!-- Content with responsive and interactive masking -->
</div>
```

This applies an SVG mask that changes size at medium breakpoint, pulses for users without reduced motion preference, and repositions on hover.

Tailwind provides comprehensive CSS masking utilities, leveraging this web platform feature with utility-first efficiency. CSS-first configuration and `@theme` directive make customization straightforward, integrating mask definitions into your design system.
