---
title: Inert Utility
description: Style non-interactive elements with Tailwind's inert variant for accessibility and visual communication.
---

Clear communication of element state and interactivity is vital for user experience, especially for keyboard and assistive technology users. Tailwind CSS helps by providing variants to style elements based on state, including `inert`.

## Understanding the `inert` Variant

Tailwind's `inert` variant applies styles when an element has the HTML `inert` attribute. This attribute marks an element and its descendants as non-interactive, possibly because content is off-screen, disabled, or irrelevant.

The `inert` attribute makes parts of the DOM non-interactive and hidden from assistive technologies, improving accessibility by focusing users on relevant page parts. The `inert` variant in Tailwind visually represents this non-interactive state.

### How to Use the `inert` Variant

Prefix utility classes with `inert:` to conditionally apply styles when the element has the `inert` attribute.

For example, visually indicate a non-interactive section by reducing opacity or changing the cursor.

```html tailwind
<div inert class="opacity-100 inert:opacity-50">
  <!-- Content that might become inert -->
</div>

<button inert class="cursor-pointer inert:cursor-not-allowed">This button might be inert</button>
```

The `div` normally has full opacity (`opacity-100`). With the `inert` attribute, `inert:opacity-50` reduces opacity to 50%. The button normally has a pointer cursor; when `inert`, `inert:cursor-not-allowed` applies a "not-allowed" cursor.

This provides visual cues for non-interactive content, crucial for accessibility, helping sighted users understand interactable page parts.

The `inert` variant can combine with other variants, like responsive breakpoints (e.g., `md:inert:opacity-75` applies styles on medium screens and above when inert).

Leveraging the `inert` variant aligns visual presentation with the actual state of non-interactive content, enhancing UI clarity and accessibility.
