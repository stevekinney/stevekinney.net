---
title: Sizing and Spacing
description: >-
  Learn how to control the size and spacing of elements using Tailwind's
  foundational utility classes.'
date: 2024-07-26
tags:
  - tailwind
  - css
  - sizing
  - spacing
published: true
modified: 2025-06-11T19:05:33-06:00
---

In this lesson, we will explore one of the most fundamental aspects of Tailwind CSS: the sizing and spacing system. Mastering these utilities is the key to building well-proportioned and responsive layouts.

## The Spacing Scale

Tailwind's default theme includes a comprehensive and numeric spacing scale. This scale is used for `width`, `height`, `padding`, `margin`, and more. Instead of writing arbitrary pixel values, you use classes that correspond to predefined values on this scale.

For example, to add padding to an element, you can use the `p-{amount}` utility.

```html
<!-- Padding on all sides -->
<div class="bg-blue-200 p-4">p-4</div>

<!-- Padding on the y-axis -->
<div class="bg-blue-300 py-6">py-6</div>

<!-- Padding on the left side -->
<div class="bg-blue-400 pl-8">pl-8</div>
```

> [!TIP]
> The numbers in the spacing scale are not arbitrary. For the most part, `1` unit corresponds to `0.25rem` (or `4px`, assuming a default browser font size of `16px`). So, `p-4` translates to `padding: 1rem;` or `16px`.

## Width and Height

You can set the width and height of elements using the `w-{amount}` and `h-{amount}` utilities. These also use the same spacing scale, with additional helpers for percentages and viewport units.

Here is how you can set the width of an element:

```html
<!-- Fixed width -->
<div class="w-64 bg-green-200">w-64</div>

<!-- Percentage width -->
<div class="w-1/2 bg-green-300">w-1/2</div>

<!-- Full width -->
<div class="w-full bg-green-400">w-full</div>

<!-- Screen width -->
<div class="w-screen bg-green-500">w-screen</div>
```

## Arbitrary Values

Sometimes, the default scale may not have the exact value you need. In these cases, you can use square brackets `[]` to provide an arbitrary value.

```html
<!-- An arbitrary margin value -->
<div class="mt-[22px] bg-red-200">margin-top: 22px</div>

<!-- An arbitrary width -->
<div class="w-[300px] bg-red-300">width: 300px</div>
```

While this is very powerful, it's a good practice to stick to the predefined scale as much as possible to maintain consistency. Customize your `tailwind.config.js` if you find yourself using the same arbitrary values repeatedly.

## Exercises

Now it's your turn to practice.

1. **Build a simple card:**
   - Create a `div` with a width of `w-80`.
   - Give it a background color (e.g., `bg-gray-100`) and rounded corners (`rounded-lg`).
   - Add `p-6` of padding inside the card.
   - Inside the card, add a heading and a paragraph. Use `mb-4` (margin-bottom) to add space between them.

2. **Create a responsive container:**
   - Create a `div` that is `w-full` on small screens and `w-1/2` on medium screens and larger.
   - Hint: You will need to use responsive prefixes like `md:`.
