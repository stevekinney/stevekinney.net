---
title: Building an Image Card with Hover Overlay
description: >-
  Let's build an image card with an interactive hover overlay step by step using
  Tailwind CSS group utilities.

modified: 2025-06-11T19:05:33-06:00
---

Let's start with our basic HTML structure for an image card with overlay content.

```html tailwind
<div
  class="max-w-sm overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-200 hover:shadow-lg"
>
  <img
    src="https://picsum.photos/seed/picsum/600/400"
    alt="Product"
    class="h-48 w-full object-cover"
  />
  <div class="space-y-4 p-6">
    <h3 class="text-lg font-semibold text-slate-900">Product Name</h3>
    <p class="text-slate-600">Product description goes here.</p>
    <div class="text-xl font-bold text-slate-900">$29.99</div>
  </div>
</div>
```

We have a polished product card with professional styling and subtle hover effects, building on patterns from our [card tutorial](building-a-card.md). But what if we want the product information to appear as an overlay on the image instead? Let's transform this into an engaging hover overlay effect.

## Introducing the Group System

First, let's introduce Tailwind's `group` utility, which lets us coordinate hover effects across multiple child elements.

```html tailwind
<div
  class="group max-w-sm overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-200 hover:shadow-lg"
>
  <img
    src="https://picsum.photos/seed/picsum/600/400"
    alt="Product"
    class="h-48 w-full object-cover"
  />
  <div class="space-y-4 p-6">
    <h3 class="text-lg font-semibold text-slate-900">Product Name</h3>
    <p class="text-slate-600">Product description goes here.</p>
    <div class="text-xl font-bold text-slate-900">$29.99</div>
  </div>
</div>
```

The `group` class marks this container as a "group parent." Now any child element can use `group-hover:*` utilities to style themselves based on when the parent is hovered. This is perfect for our overlay effect where multiple elements need to respond to hovering the entire card.

## Positioning the Overlay Content

Now let's move our content to sit as an overlay on top of the image. We'll need to add `relative` positioning to the container and `absolute` positioning to the content.

```html tailwind
<div
  class="group relative max-w-sm overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-200 hover:shadow-lg"
>
  <img
    src="https://picsum.photos/seed/picsum/600/400"
    alt="Product"
    class="h-48 w-full object-cover"
  />
  <div class="absolute inset-0 space-y-4 p-6">
    <h3 class="text-lg font-semibold text-white">Product Name</h3>
    <p class="text-white">Product description goes here.</p>
    <div class="text-xl font-bold text-white">$29.99</div>
  </div>
</div>
```

Overlay positioning changes:

- `relative`: Added to the container to establish positioning context for the overlay
- `absolute inset-0`: Positions the content to cover the entire image area (0px from all edges)
- `text-white`: Changed all text to white for contrast against the image background

Now our text sits directly over the image, but it's always visible and hard to read against the varying image colors.

## Adding Background and Hover Visibility

Let's add a semi-transparent background and make the overlay appear only when the card is hovered.

```html tailwind
<div
  class="group relative max-w-sm overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-200 hover:shadow-lg"
>
  <img
    src="https://picsum.photos/seed/picsum/600/400"
    alt="Product"
    class="h-48 w-full object-cover"
  />
  <div class="absolute inset-0 bg-black/60 p-6 opacity-0 group-hover:opacity-100">
    <h3 class="text-lg font-semibold text-white">Product Name</h3>
    <p class="text-white">Product description goes here.</p>
    <div class="text-xl font-bold text-white">$29.99</div>
  </div>
</div>
```

Hover effect styling:

- `bg-black/60`: Semi-transparent black background (60% opacity) creates readable contrast
- `opacity-0`: Hides the overlay by default (completely transparent)
- `group-hover:opacity-100`: Shows the overlay when the parent group is hovered
- Removed `space-y-4` since we'll position content manually

This is our first use of `group-hover:`—the overlay automatically appears when you hover anywhere on the card! The `/60` syntax is Tailwind's opacity modifier, equivalent to `rgba(0, 0, 0, 0.6)`.

## Adding Content Positioning and Animation

Let's improve the overlay layout by positioning content at the bottom and adding a smooth entrance animation.

```html tailwind
<div
  class="group relative max-w-sm overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-200 hover:shadow-lg"
>
  <img
    src="https://picsum.photos/seed/picsum/600/400"
    alt="Product"
    class="h-48 w-full object-cover"
  />
  <div
    class="absolute inset-0 flex flex-col justify-end bg-black/60 p-6 opacity-0 group-hover:opacity-100"
  >
    <div class="translate-y-4 space-y-2 group-hover:translate-y-0">
      <h3 class="text-lg font-semibold text-white">Product Name</h3>
      <p class="text-white">Product description goes here.</p>
      <div class="text-xl font-bold text-white">$29.99</div>
    </div>
  </div>
</div>
```

Layout and animation improvements:

- `flex flex-col justify-end`: Aligns content to the bottom of the overlay using Flexbox
- `space-y-2`: Restores vertical spacing between content elements
- `translate-y-4`: Moves content 16px down by default (hidden state)
- `group-hover:translate-y-0`: Slides content to normal position on hover

This creates a subtle slide-up animation where the content starts slightly below its final position and slides up when the overlay appears.

## Adding Smooth Transitions

Finally, let's add smooth transitions to make the hover effects feel polished and professional.

```html tailwind
<div
  class="group relative max-w-sm overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-200 hover:shadow-lg"
>
  <img
    src="https://picsum.photos/seed/picsum/600/400"
    alt="Product"
    class="h-48 w-full object-cover"
  />
  <div
    class="absolute inset-0 flex flex-col justify-end bg-black/60 p-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
  >
    <div
      class="translate-y-4 space-y-2 transition-transform duration-300 group-hover:translate-y-0"
    >
      <h3 class="text-lg font-semibold text-white">Product Name</h3>
      <p class="text-white">Product description goes here.</p>
      <div class="text-xl font-bold text-white">$29.99</div>
    </div>
  </div>
</div>
```

Transition improvements:

- `transition-opacity duration-300` on overlay: Smoothly fades the background in/out over 300ms
- `transition-transform duration-300` on content: Smoothly animates the slide-up motion
- Both transitions use the same duration for cohesive timing

The 300ms duration creates a smooth, professional feel—fast enough to feel responsive but slow enough to be noticeable and elegant.

## Why the Group System Works

The `group` system is perfect for complex hover effects because it coordinates multiple elements responding to a single interaction. Unlike the `peer` system that handles sibling relationships, `group` manages parent-child relationships where hovering the parent affects multiple children.

This approach provides:

- **Coordinated animations**: Multiple elements can respond to the same hover event with different effects
- **Flexible targeting**: Any descendant can use `group-hover:*` utilities regardless of nesting depth
- **Performance**: CSS-only hover effects with no JavaScript overhead
- **Intuitive behavior**: The entire card is the hover target, making it easy for users to trigger

## Common Group Patterns

The group system works great for:

- Image overlays (as shown)
- Navigation dropdowns where hovering a parent reveals child menus
- Card hover effects with multiple animated elements
- Button groups where hovering affects icons, text, and backgrounds differently
- Product cards with expanding information panels

## Challenges

Try building these variations:

1. **Bottom-aligned overlay**: Position the overlay content at the bottom with a gradient fade from transparent to black using `bg-gradient-to-t from-black/80 to-transparent`
2. **Icon overlay**: Create a play button icon that appears in the center of the image on hover, using `group-hover:` with scale and opacity effects
