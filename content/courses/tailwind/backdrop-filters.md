---
title: Backdrop Filters
description: >-
  Apply graphical effects like blur and brightness to content behind elements
  using Tailwind's backdrop filter utilities.

modified: 2025-06-11T19:05:33-06:00
---

Backdrop filters in CSS let you apply visual effects like blur or brightness to the area _behind_ an element. Regular filters change the element itself, but backdrop filters change what's underneath. This is great for effects like frosted glass. Tailwind includes utility classes to easily use these modern CSS features directly in your HTML.

## Backdrop Filters

Tailwind provides utilities to control the `backdrop-filter` CSS property, letting you apply effects to the content behind an element. This is similar to how the `filter` property affects the element itself. You start with the `backdrop-filter` utility and add specific filter utilities for effects like blur, brightness, contrast, and more, all using simple classes.

## Available Backdrop Filter Utilities

Tailwind's backdrop filter utilities match the CSS filter functions they control:

- Blur (`backdrop-blur`)
- Brightness (`backdrop-brightness`)
- Contrast (`backdrop-contrast`)
- Grayscale (`backdrop-grayscale`)
- Hue Rotate (`backdrop-hue-rotate`)
- Invert (`backdrop-invert`)
- Opacity (`backdrop-opacity`)
- Saturate (`backdrop-saturate`)
- Sepia (`backdrop-sepia`)

Each utility type has predefined values and also supports custom values or CSS variables.

## Using Specific Backdrop Filter Utilities

To use a backdrop filter, add the utility class to the element. The filter will affect what's _behind_ this element.

### Applying Blur (`backdrop-blur`)

Use `backdrop-blur` utilities to blur the content behind an element, often for frosted glass effects. Tailwind offers blur sizes from `xs` to `3xl`, plus `none` to remove blur.

- `backdrop-blur-xs`
- `backdrop-blur-sm`
- `backdrop-blur-md`
- `backdrop-blur-lg`
- `backdrop-blur-xl`
- `backdrop-blur-2xl`
- `backdrop-blur-3xl`
- `backdrop-blur-none`

#### Basic example

For a small blur, use `backdrop-blur-sm`.

```html tailwind
<div class="bg-white/30 backdrop-blur-sm">
  <!-- Content -->
</div>
```

#### Using a custom value

For custom blur amounts, use `backdrop-blur-[<value>]` (e.g., `backdrop-blur-[5px]`). You can also use CSS variables like `backdrop-blur-(--my-blur-value)`.

```html tailwind
<div class="bg-white/30 backdrop-blur-[5px]">
  <!-- Content -->
</div>
```

```html tailwind
<div class="bg-white/30 backdrop-blur-(--my-blur-value)">
  <!-- Content -->
</div>
```

#### Responsive design

Apply `backdrop-blur` at different screen sizes using responsive prefixes like `md:`.

```html tailwind
<div class="bg-white/30 backdrop-blur-none md:backdrop-blur-lg">
  <!-- No blur by default, large blur on medium screens and up -->
</div>
```

#### Customizing your theme

Customize the `backdrop-blur` scale by defining `--blur-*` variables in your CSS `@theme` block.

### Adjusting Brightness (`backdrop-brightness`)

Use `backdrop-brightness` to change the brightness of content behind an element. Values below 100% darken it, above 100% lighten it. Tailwind offers utilities like `backdrop-brightness-50` (50%) and `backdrop-brightness-150` (150%).

#### Basic example

To make the backdrop brighter, use `backdrop-brightness-150`.

```html tailwind
<div class="bg-black/30 backdrop-brightness-150">
  <!-- Content -->
</div>
```

#### Using a custom value

For custom brightness, use `backdrop-brightness-[<value>]` (e.g., `backdrop-brightness-[175%]`) or a CSS variable like `backdrop-brightness-(--my-brightness)`.

```html tailwind
<div class="bg-black/30 backdrop-brightness-[175%]">
  <!-- Content -->
</div>
```

```html tailwind
<div class="bg-black/30 backdrop-brightness-(--my-brightness)">
  <!-- Content -->
</div>
```

#### Responsive design

Apply `backdrop-brightness` conditionally with responsive prefixes (e.g., `lg:backdrop-brightness-125`).

```html tailwind
<div class="bg-black/30 backdrop-brightness-100 lg:backdrop-brightness-125">
  <!-- Default brightness, 125% on large screens -->
</div>
```

### Controlling Contrast (`backdrop-contrast`)

Use `backdrop-contrast` to adjust the contrast of content behind an element. Values below 100% decrease contrast, above 100% increase it. Utilities like `backdrop-contrast-50` (50%) or `backdrop-contrast-150` (150%) are available.

#### Basic example

To increase backdrop contrast, use `backdrop-contrast-125`.

```html tailwind
<div class="bg-white/30 backdrop-contrast-125">
  <!-- Content -->
</div>
```

#### Using a custom value

For custom contrast, use `backdrop-contrast-[<value>]` (e.g., `backdrop-contrast-[175%]`) or a CSS variable like `backdrop-contrast-(--my-contrast)`.

```html tailwind
<div class="bg-white/30 backdrop-contrast-[175%]">
  <!-- Content -->
</div>
```

```html tailwind
<div class="bg-white/30 backdrop-contrast-(--my-contrast)">
  <!-- Content -->
</div>
```

#### Responsive design

Apply `backdrop-contrast` conditionally with responsive prefixes (e.g., `sm:backdrop-contrast-150`).

```html tailwind
<div class="bg-white/30 backdrop-contrast-100 sm:backdrop-contrast-150">
  <!-- Default contrast, 150% on small screens -->
</div>
```

### Applying Grayscale (`backdrop-grayscale`)

Use `backdrop-grayscale` to convert content behind an element to grayscale. `backdrop-grayscale` applies a full (100%) effect. Use `backdrop-grayscale-<number>` for specific percentages.

#### Basic example

For a full grayscale backdrop, use `backdrop-grayscale`.

```html tailwind
<div class="bg-white/30 backdrop-grayscale">
  <!-- Content -->
</div>
```

For a 50% grayscale effect, use `backdrop-grayscale-50`.

```html tailwind
<div class="bg-white/30 backdrop-grayscale-50">
  <!-- Content -->
</div>
```

#### Using a custom value

For custom grayscale, use `backdrop-grayscale-[<value>]` (e.g., `backdrop-grayscale-[75%]`) or a CSS variable like `backdrop-grayscale-(--my-grayscale)`.

```html tailwind
<div class="bg-white/30 backdrop-grayscale-[75%]">
  <!-- Content -->
</div>
```

```html tailwind
<div class="bg-white/30 backdrop-grayscale-(--my-grayscale)">
  <!-- Content -->
</div>
```

#### Responsive design

Apply `backdrop-grayscale` conditionally with responsive prefixes (e.g., `lg:backdrop-grayscale-0`).

```html tailwind
<div class="bg-white/30 backdrop-grayscale lg:backdrop-grayscale-0">
  <!-- Full grayscale by default, none on large screens -->
</div>
```

### Rotating Hue (`backdrop-hue-rotate`)

Use `backdrop-hue-rotate` to shift hues of content behind an element by a degree value. Tailwind provides utilities like `backdrop-hue-rotate-90` (90deg).

#### Basic example

To rotate backdrop hue by 90 degrees, use `backdrop-hue-rotate-90`.

```html tailwind
<div class="bg-white/30 backdrop-hue-rotate-90">
  <!-- Content -->
</div>
```

#### Using negative values

Negative values are supported, e.g., `-backdrop-hue-rotate-90`.

```html tailwind
<div class="bg-white/30 -backdrop-hue-rotate-90">
  <!-- Content -->
</div>
```

#### Using a custom value

For custom angles, use `backdrop-hue-rotate-[<value>]` (e.g., `backdrop-hue-rotate-[45deg]`) or a CSS variable like `backdrop-hue-rotate-(--my-hue-rotation)`. Supports `deg`, `grad`, `rad`, or `turn`.

```html tailwind
<div class="bg-white/30 backdrop-hue-rotate-[45deg]">
  <!-- Content -->
</div>
```

```html tailwind
<div class="bg-white/30 backdrop-hue-rotate-(--my-hue-rotation)">
  <!-- Content -->
</div>
```

#### Responsive design

Apply `backdrop-hue-rotate` conditionally with responsive prefixes (e.g., `md:backdrop-hue-rotate-60`).

```html tailwind
<div class="bg-white/30 backdrop-hue-rotate-0 md:backdrop-hue-rotate-60">
  <!-- No rotation by default, 60deg on medium screens -->
</div>
```

### Inverting Colors (`backdrop-invert`)

Use `backdrop-invert` to invert colors of content behind an element. `backdrop-invert` applies a full (100%) inversion. Use `backdrop-invert-<number>` for specific percentages.

#### Basic example

For full color inversion, use `backdrop-invert`.

```html tailwind
<div class="bg-white/30 backdrop-invert">
  <!-- Content -->
</div>
```

For a 65% inversion, use `backdrop-invert-65`.

```html tailwind
<div class="bg-white/30 backdrop-invert-65">
  <!-- Content -->
</div>
```

#### Using a custom value

For custom inversion, use `backdrop-invert-[<value>]` (e.g., `backdrop-invert-[75%]`) or a CSS variable like `backdrop-invert-(--my-inversion)`.

```html tailwind
<div class="bg-white/30 backdrop-invert-[75%]">
  <!-- Content -->
</div>
```

```html tailwind
<div class="bg-white/30 backdrop-invert-(--my-inversion)">
  <!-- Content -->
</div>
```

#### Responsive design

Apply `backdrop-invert` conditionally with responsive prefixes (e.g., `lg:backdrop-invert`).

```html tailwind
<div class="bg-white/30 backdrop-invert-0 lg:backdrop-invert">
  <!-- No inversion by default, full inversion on large screens -->
</div>
```

### Setting Opacity (`backdrop-opacity`)

Use `backdrop-opacity` to adjust the opacity of backdrop filter effects (not the element or content opacity). Utilities like `backdrop-opacity-50` (50%) are available.

#### Basic example

To make backdrop filters 50% opaque, use `backdrop-opacity-50`.

```html tailwind
<div class="bg-white/30 backdrop-blur-sm backdrop-opacity-50">
  <!-- Content -->
</div>
```

#### Using a custom value

For custom opacity, use `backdrop-opacity-[<value>]` (e.g., `backdrop-opacity-[25%]`) or a CSS variable like `backdrop-opacity-(--my-filter-opacity)`.

```html tailwind
<div class="bg-white/30 backdrop-blur-sm backdrop-opacity-[25%]">
  <!-- Content -->
</div>
```

```html tailwind
<div class="bg-white/30 backdrop-blur-sm backdrop-opacity-(--my-filter-opacity)">
  <!-- Content -->
</div>
```

#### Responsive design

Apply `backdrop-opacity` conditionally with responsive prefixes (e.g., `sm:backdrop-opacity-60`).

```html tailwind
<div class="bg-white/30 backdrop-blur-sm backdrop-opacity-100 sm:backdrop-opacity-60">
  <!-- Full opacity by default, 60% on small screens -->
</div>
```

### Controlling Saturation (`backdrop-saturate`)

Use `backdrop-saturate` to adjust saturation of content behind an element. Values below 100% desaturate, above 100% oversaturate. Utilities like `backdrop-saturate-50` (50%) or `backdrop-saturate-150` (150%) are available.

#### Basic example

To increase backdrop saturation, use `backdrop-saturate-150`.

```html tailwind
<div class="bg-white/30 backdrop-saturate-150">
  <!-- Content -->
</div>
```

#### Using a custom value

For custom saturation, use `backdrop-saturate-[<value>]` (e.g., `backdrop-saturate-[175%]`) or a CSS variable like `backdrop-saturate-(--my-saturation)`.

```html tailwind
<div class="bg-white/30 backdrop-saturate-[175%]">
  <!-- Content -->
</div>
```

```html tailwind
<div class="bg-white/30 backdrop-saturate-(--my-saturation)">
  <!-- Content -->
</div>
```

#### Responsive design

Apply `backdrop-saturate` conditionally with responsive prefixes (e.g., `md:backdrop-saturate-50`).

```html tailwind
<div class="bg-white/30 backdrop-saturate-100 md:backdrop-saturate-50">
  <!-- Default saturation, 50% on medium screens -->
</div>
```

### Applying Sepia (`backdrop-sepia`)

Use `backdrop-sepia` to apply a sepia tone to content behind an element. `backdrop-sepia` applies a full (100%) effect. Use `backdrop-sepia-<number>` for specific percentages.

#### Basic example

For a full sepia backdrop, use `backdrop-sepia`.

```html tailwind
<div class="bg-white/30 backdrop-sepia">
  <!-- Content -->
</div>
```

To apply a 50% sepia effect, use `backdrop-sepia-50`.

```html tailwind
<div class="bg-white/30 backdrop-sepia-50">
  <!-- Content -->
</div>
```

#### Using a custom value

For custom sepia, use `backdrop-sepia-[<value>]` (e.g., `backdrop-sepia-[75%]`) or a CSS variable like `backdrop-sepia-(--my-sepia-amount)`.

```html tailwind
<div class="bg-white/30 backdrop-sepia-[75%]">
  <!-- Content -->
</div>
```

```html tailwind
<div class="bg-white/30 backdrop-sepia-(--my-sepia-amount)">
  <!-- Content -->
</div>
```

#### Responsive design

Apply `backdrop-sepia` conditionally with responsive prefixes (e.g., `lg:backdrop-sepia-0`).

```html tailwind
<div class="bg-white/30 backdrop-sepia lg:backdrop-sepia-0">
  <!-- Full sepia by default, none on large screens -->
</div>
```

## Combining and Removing Backdrop Filters

### Combining Filters

Combine multiple backdrop filter utilities on one element for layered effects. For example, use `backdrop-blur-sm` and `backdrop-brightness-125` together. Tailwind uses CSS variables for each filter type, and `backdrop-filter` applies them all.

```html tailwind
<div class="bg-white/30 backdrop-blur-sm backdrop-brightness-125">
  <!-- Backdrop is blurred and brighter -->
</div>
```

### Removing Filters

To remove all backdrop filters, use `backdrop-filter-none`. This is handy for changing filters at different breakpoints or states.

```html tailwind
<div class="bg-white/30 backdrop-blur-sm md:backdrop-filter-none">
  <!-- Filters applied by default, removed on medium screens -->
</div>
```

## Applying Backdrop Filters Conditionally

### Responsive Design

Use responsive prefixes (`sm:`, `md:`, `lg:`) to apply backdrop filters at different screen sizes for adaptive designs.

```html tailwind
<div class="bg-white/30 backdrop-blur-xs lg:backdrop-blur-md">
  <!-- Small blur on mobile, medium blur on large screens -->
</div>
```

### Targeting Specific States

Apply backdrop filters based on states like `hover:`, `focus:`, or `active:` for interactive effects. This works with all Tailwind state variants.

```html tailwind
<div class="bg-white/30 backdrop-blur-none hover:backdrop-blur-sm">
  <!-- No blur by default, blurs on hover -->
</div>
```

## Customizing Your Backdrop Filter Theme

You can customize backdrop filter scales, like `backdrop-blur`, in your theme. Define custom values using the `@theme` directive in your CSS. For instance, to customize blur:

```css
@import 'tailwindcss';

@theme {
  --blur-2xs: 2px; /* New size */
  --blur-sm: 6px; /* Override existing */
}
```

This makes `backdrop-blur-2xs` and your new `backdrop-blur-sm` available. This pattern should apply to other backdrop filter types for customizing their scales.

In summary, Tailwind offers a simple and powerful way to use backdrop filters. Its utility-first approach lets you easily add complex visual effects to your designs with modern CSS.
