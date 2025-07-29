---
title: Gradients
description: >-
  Create stunning gradients with Tailwind 4's enhanced utilities for linear,
  radial, and conic gradients with OKLCH interpolation

modified: 2025-06-11T19:05:33-06:00
---

Tailwind 4 enhances gradients with OKLCH interpolation for smoother transitions and the ability to animate gradient stops.

## Linear Gradients

Direction-based gradients:

```html tailwind
<!-- Cardinal directions -->
<div class="bg-linear-to-r from-purple-500 to-pink-500">Left to right</div>

<div class="bg-linear-to-br from-sky-400 to-blue-600">Top-left to bottom-right</div>

<!-- Custom angles -->
<div class="bg-linear-45 from-green-400 to-blue-500">45-degree angle</div>
```

Directions: `to-t`, `to-tr`, `to-r`, `to-br`, `to-b`, `to-bl`, `to-l`, `to-tl`

## Radial Gradients

Circular/elliptical gradients from center:

```html tailwind
<!-- Basic radial -->
<div class="bg-radial from-yellow-400 to-orange-500">Center to edge</div>

<!-- Custom shape/position -->
<div class="bg-radial-[circle_at_top_left] from-pink-300 to-purple-400">Circle from top-left</div>
```

## Conic Gradients

Color sweep around center:

```html tailwind
<!-- Basic conic -->
<div class="bg-conic from-red-500 via-yellow-500 to-green-500">Color wheel</div>

<!-- Starting angle -->
<div class="bg-conic-90 from-blue-500 to-purple-500">Start at 90 degrees</div>
```

## Gradient Stops

### Two-color gradients

```html tailwind
<div class="bg-linear-to-r from-indigo-500 to-purple-500">Simple gradient</div>
```

### Three-color with via

```html tailwind
<div class="bg-linear-to-r from-red-500 via-yellow-500 to-green-500">Rainbow effect</div>
```

### Custom positions

```html tailwind
<div class="bg-linear-to-r from-blue-500 from-10% via-purple-500 via-30% to-pink-500 to-90%">
  Controlled color stops
</div>
```

## OKLCH Interpolation

v4 uses OKLCH by default for vibrant, smooth gradients:

```html tailwind
<!-- Smooth interpolation between complementary colors -->
<div class="bg-linear-to-r from-purple-500 to-yellow-500">No muddy middle colors</div>
```

Compare with explicit interpolation:

```html tailwind
<!-- Force OKLCH -->
<div class="bg-linear-to-r/oklch from-red-500 to-blue-500">Vibrant purple middle</div>

<!-- Force sRGB (older behavior) -->
<div class="bg-linear-to-r/srgb from-red-500 to-blue-500">Duller purple middle</div>
```

## Animated Gradients

New in Tailwind 4 - animate gradient stops:

```html tailwind
<button
  class="bg-linear-to-r from-blue-500 to-purple-500 transition-all duration-300 hover:from-purple-500 hover:to-pink-500"
>
  Hover to animate
</button>
```

This works because Tailwind 4 uses `@property` to register gradient variables as animatable.

## Complex Examples

### Mesh gradient effect

```html tailwind
<div class="relative bg-radial from-purple-500/30 via-transparent to-transparent">
  <div
    class="absolute inset-0 bg-radial-[at_bottom_right] from-pink-500/30 via-transparent to-transparent"
  ></div>
</div>
```

### Text gradients

```html tailwind
<h1 class="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
  Gradient Text
</h1>
```

### Gradient borders

```html tailwind
<div class="rounded-lg bg-linear-to-r from-pink-500 to-violet-500 p-1">
  <div class="rounded-lg bg-white p-4">Gradient border effect</div>
</div>
```

## With Opacity

Combine with opacity modifiers:

```html tailwind
<div class="bg-linear-to-r from-red-500/50 to-blue-500/50">Semi-transparent gradient</div>
```

## Best Practices

1. **Use OKLCH interpolation** for vibrant gradients
2. **Limit color stops** - 2-3 colors usually work best
3. **Test on different screens** - P3 displays show more vibrant colors
4. **Consider performance** - Animated gradients use GPU
5. **Provide fallbacks** for older browsers if needed
