---
title: Building a Button
description: Let's build a button from scratch using Tailwind.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

When last we spoke, we had a button that worked like this.

```html tailwind
<button class="bg-blue-600 px-3 py-2 text-white">Button</button>
```

It definitely looks like a button now, but I suspect we can do a little better.

## Add Border Radius

```html tailwind
<button class="rounded-md bg-blue-600 px-3 py-2 text-white">Button</button>
```

Here we added a `rounded-md` class. That's basically adding the following CSS to the element.

```css
border-radius: var(--radius-md); /* 0.375rem (6px) */
```

You can see all of the different options [here](https://tailwindcss.com/docs/border-radius). The `rounded-md` gives the button soft, rounded corners. This creates a more modern, approachable appearance compared to sharp rectangular edges. Unless you're into that.

Some other options to try:

- `rounded-sm` (2px) for subtle rounding
- `rounded-lg` (8px) for more pronounced curves
- `rounded-full` for pill-shaped buttons

## Adjusting the Typography

```html tailwind
<button class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Button</button>
```

- `text-sm`: Sets font size to 14px with appropriate line height. Buttons typically use slightly smaller text than body copy for better proportions.
- `font-semibold`: Adds font weight of 600, making the text more prominent and easier to read against the colored background.

## Add Subtle Depth with a Shadow

We can also easily add a subtle shadow to the button using `shadow-xs`. This utility class is effectively the same as adding the following CSS.

```css
box-shadow: 0 1px rgb(0 0 0 / 0.05);
```

Maybe you're a better person that me, but I can never remember the syntax for box shadows without looking it up. But, I _can_ remember `shadow-xs`.

- `shadow-xs`: Most subtle, perfect for buttons
- `shadow-sm`: Slightly more pronounced
- `shadow-md`, `shadow-lg`: For cards and modals

## Adding Styles for Interactive States

Where things _really_ start to get magical is when you see how easy it is to style psuedo-classes using **variants**. Let's say we wanted to add a style for when the user hovers over the button—a completely reasonable thing to do—right?

```html tailwind
<button
  class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500"
>
  Button
</button>
```

The `hover:` variant prefix means this style only applies when the user hovers over the button. We're using `blue-500` (lighter than our default `blue-600`) to create a brightening effect.

Under the hood, it's effectively generating this CSS class:

```css
.hover\:bg-blue-500:hover {
  background-color: var(--color-blue-500);
}
```

### Adding Focus Styles

We can also add styles for various [focus states](focus-states.md). These focus styles are crucial for:

- Keyboard navigation users
- Screen reader users
- Users with motor disabilities who rely on keyboard navigation
- Meeting WCAG accessibility guidelines

```html tailwind
<button
  type="button"
  class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
>
  Button
</button>
```

- `focus-visible:outline-2`: Creates a 2px outline when focused via keyboard
- `focus-visible:outline-offset-2`: Adds 2px of space between the button and outline
- `focus-visible:outline-blue-600`: Makes the outline match the button's blue color

We'll talk a little bit more about this later, but here is the quick version of `focus:` vs. `focus-visible:`:

- `focus`: applies to both mouse clicks and keyboard navigation
- `focus-visible`: only applies to keyboard navigation, providing a better user experience

## Challenges

See if you create one or both of the following buttons:

- A secondary button.
- A button for destructive actions.

You can find some possible solutions [here](button-solutions.md).
