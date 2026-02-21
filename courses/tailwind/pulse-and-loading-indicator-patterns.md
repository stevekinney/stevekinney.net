---
title: Pulse and Loading Indicator Patterns
description: >-
  Create loading states and skeleton screens in Tailwind CSS using animate-pulse
  and custom animations.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

Providing immediate feedback during data fetching or content loading is crucial. Tailwind CSS offers utilities to create loading indicators, from pulse animations to complex patterns.

## Using `animate-pulse` for Skeleton Screens

Tailwind's `animate-pulse` utility creates skeleton screens—placeholder previews that reduce perceived load time. The class applies a pulsing animation by fading opacity in and out.

Apply it to any element to suggest loading. Use placeholder shapes that mimic the eventual content structure.

```html tailwind
<div class="mx-auto w-full max-w-sm rounded-md border border-blue-300 p-4 shadow">
  <div class="flex animate-pulse space-x-4">
    <div class="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700"></div>
    <div class="flex-1 space-y-6 py-1">
      <div class="h-2 rounded bg-slate-200 dark:bg-slate-700"></div>
      <div class="space-y-3">
        <div class="grid grid-cols-3 gap-4">
          <div class="col-span-2 h-2 rounded bg-slate-200 dark:bg-slate-700"></div>
          <div class="col-span-1 h-2 rounded bg-slate-200 dark:bg-slate-700"></div>
        </div>
        <div class="h-2 rounded bg-slate-200 dark:bg-slate-700"></div>
      </div>
    </div>
  </div>
</div>
```

Elements with `bg-slate-200` (or `dark:bg-slate-700`) create content card shapes. The `animate-pulse` class on the parent makes all child placeholders pulse together.

### Customizing Pulse Animation

`animate-pulse` provides a default animation. Customize speed or opacity by defining custom keyframes in `tailwind.config.js`, though the default usually suffices.

## Creating Spinners with `animate-spin`

For traditional loading indicators, use `animate-spin`. This applies circular spinning animation, commonly used for icons or geometric shapes.

```html tailwind
<div class="flex items-center justify-center space-x-2">
  <div
    class="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent"
  ></div>
  <p class="text-slate-600 dark:text-slate-300">Loading...</p>
</div>
```

A `div` styled as a circle with transparent top border. `animate-spin` makes it rotate, creating a classic spinner. Adjust border color, size, and speed through Tailwind configuration.

## Custom Loading Animations

For complex animations, define custom keyframes in `tailwind.config.js`.

Example "dots" loading animation:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'bounce-dots': 'bounce-dots 1.4s infinite ease-in-out both',
      },
      keyframes: {
        'bounce-dots': {
          '0%, 80%, 100%': { transform: 'scale(0)', opacity: '0' },
          '40%': { transform: 'scale(1.0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
```

Use `animate-bounce-dots` in HTML:

```html tailwind
<div class="flex items-center justify-center space-x-2">
  <span class="sr-only">Loading...</span>
  <div class="animate-bounce-dots h-3 w-3 rounded-full bg-blue-600 [animation-delay:-0.3s]"></div>
  <div class="animate-bounce-dots h-3 w-3 rounded-full bg-blue-600 [animation-delay:-0.15s]"></div>
  <div class="animate-bounce-dots h-3 w-3 rounded-full bg-blue-600"></div>
</div>
```

Three dots bounce in sequence. `animation-delay` (using arbitrary values) staggers animation for dynamic effect.

## SVG-Based Loading Indicators

SVGs offer custom or intricate loading animations. Embed directly in HTML and use Tailwind utilities for styling and animation control.

SVG spinner with `animate-spin`:

```html tailwind
<svg
  class="h-5 w-5 animate-spin text-blue-500"
  xmlns="http://www.w3.org/2000/svg"
  fill="none"
  viewBox="0 0 24 24"
>
  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
  <path
    class="opacity-75"
    fill="currentColor"
    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
  ></path>
</svg>
```

Two parts: faint circle track and opaque spinning arc. `animate-spin` handles rotation; `h-5 w-5 text-blue-500` control size and color.

## Accessibility Considerations

Consider accessibility when implementing loading indicators:

1. **`aria-live` Regions**: Use `aria-live="polite"` or `aria-live="assertive"` for dynamic content updates.
2. **`aria-busy`**: Apply `aria-busy="true"` to loading regions. Set to `false` when complete.
3. **Screen Reader Text**: Include `sr-only` text for visual-only indicators (`<span class="sr-only">Loading content...</span>`).
4. **Reduce Motion**: Use `motion-safe` and `motion-reduce` variants to respect user preferences.

```html tailwind
<div role="status" aria-live="polite" class="flex items-center justify-center space-x-2">
  <div
    class="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent motion-safe:animate-spin motion-reduce:hidden"
  ></div>
  <span class="sr-only">Loading...</span>
  <p class="text-slate-600 motion-reduce:hidden dark:text-slate-300">Loading...</p>
  <p class="hidden text-slate-600 motion-reduce:block dark:text-slate-300">
    Please wait, content is loading.
  </p>
</div>
```

Spinner is hidden for reduced motion; alternative text is shown.

## Best Practices

- **Be Informative**: Clearly communicate system is working.
- **Match Perceived Performance**: Avoid indicators for very quick operations (under 1 second).
- **Consistency**: Use consistent loading styles throughout your application.
- **Avoid "Jank"**: Ensure smooth animations. CSS animations are performant.
- **Contextual Indicators**: Show loading within specific updating components.
- **Provide Progress**: Use progress bars for long operations when possible.

Tailwind's animation utilities and accessibility considerations create effective, user-friendly loading patterns.
