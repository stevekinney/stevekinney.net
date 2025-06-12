---
title: Starting Style
description: Using the starting variant in Tailwind 4 for smooth entry animations and transitions from display:none to visible states
modified: 2025-06-07T16:02:30-06:00
---

The `starting` variant (new in Tailwind 4) enables smooth animations when elements first appear or transition from `display: none`.

## The Problem

CSS transitions don't work on initial render or when toggling from `display: none` because the browser needs two states to animate between.

```css
/* Won't animate on first appearance */
.modal {
  opacity: 1;
  transition: opacity 0.3s;
}
```

## The Solution

The `@starting-style` CSS rule defines initial styles for first render:

```css
.modal {
  opacity: 1;
  transition: opacity 0.3s;
}

@starting-style {
  .modal {
    opacity: 0; /* Starting state */
  }
}
```

## Using the `starting` Variant

Tailwind wraps utilities in `@starting-style` automatically:

```html tailwind
<!-- Fade in on appearance -->
<div class="opacity-100 transition-opacity duration-300 starting:opacity-0">Fades in smoothly</div>

<!-- Slide and fade -->
<div
  class="translate-y-0 opacity-100 transition-all duration-300 starting:translate-y-4 starting:opacity-0"
>
  Slides up while fading in
</div>
```

## Common Patterns

**Modal dialogs:**

```html tailwind
<dialog
  class="scale-100 opacity-100 transition-all duration-200 starting:scale-95 starting:opacity-0"
>
  Modal content
</dialog>
```

**Toast notifications:**

```html tailwind
<div class="translate-x-0 transition-transform duration-300 starting:translate-x-full">
  Slides in from right
</div>
```

**Dropdown menus:**

```html tailwind
<ul
  class="translate-y-0 opacity-100 transition-all duration-150 starting:-translate-y-2 starting:opacity-0"
>
  <li>Menu item</li>
</ul>
```

## With Display Transitions

Enable transitions on `display` property changes:

```html tailwind
<div class="hidden transition-[display,opacity] duration-300 open:block starting:opacity-0">
  Animates when toggled to visible
</div>
```

**Note:** Requires `transition-behavior: allow-discrete` (included when you use `transition-[display]`).

## Browser Support

- Chrome/Edge 117+
- Firefox 129+
- Safari 17.5+

Always provide non-animated fallbacks for unsupported browsers.

## Best Practices

1. Keep animations subtle and fast (150-300ms)
2. Use with `motion-reduce:` variants for accessibility
3. Test in browsers without support
4. Combine with JavaScript for exit animations (not yet supported in CSS)
