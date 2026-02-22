---
title: State Variants
description: >-
  Apply styles conditionally using Tailwind's state variants for pseudo-classes,
  media queries, and attribute selectors
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

State variants apply utility classes conditionally based on element state or context. Prefix any utility with a variant name and colon: `hover:bg-blue-500`, `md:text-lg`.

Key difference from CSS: Tailwind uses separate classes for each state rather than bundling multiple states in one class. The variant class only applies during that specific state.

## Types of State Variants

### Pseudo-classes

**Interactive:** `hover`, `focus`, `active`, `visited`, `focus-within`, `focus-visible`

**Structural:** `first`, `last`, `odd`, `even`, `only-child`, `first-of-type`, `last-of-type`, `only-of-type`, `nth-of-type()`

**Form:** `required`, `disabled`, `invalid`, `read-only`, `indeterminate`, `checked`

**Special:** `target`, `placeholder-shown`, `details-content`, `autofill`

### Pseudo-elements

- `before` and `after`
- `placeholder` (form inputs)
- `file` (file input buttons)
- `marker` (list items)
- `selection` (selected text)
- `first-line` and `first-letter`
- `backdrop` (dialogs)

### Media and Feature Queries

**Responsive:** `sm`, `md`, `lg`, `xl`, `2xl` (viewport widths)

**Container Queries:** `@sm`, `@md`, `@max-sm`, `@max-md` (parent container size)

- Named containers: `@sm/{name}`

**User Preferences:**

- `dark` (dark mode)
- `motion-reduce`, `motion-safe`
- `contrast-more`, `contrast-less`
- `forced-colors`, `not-forced-colors`
- `inverted-colors`
- `portrait`, `landscape`
- `print`

**Pointer:** `pointer-fine`, `pointer-coarse`, `pointer-none`

**Feature Detection:** `supports-[...]`, `not-supports-[...]`

### Attribute Selectors

- **ARIA:** `aria-*` (e.g., `aria-checked`)
- **Data:** `data-*` (e.g., `data-active`)
- **Direction:** `rtl`, `ltr`
- **State:** `open` (details/dialog), `inert`

### Child Selectors

- `*` - Direct children only
- `**` - All descendants

## Special Variant Patterns

**`group-*`** - Style based on parent state (parent needs `group` class)

```html tailwind
<div class="group">
  <button class="group-hover:bg-blue-500">...</button>
</div>
```

**`peer-*`** - Style based on previous sibling state (sibling needs `peer` class)

```html tailwind
<input class="peer" /> <span class="peer-invalid:block">Error</span>
```

**`has-*`** - Style based on descendant state

```html tailwind
<div class="has-[:focus]:ring">...</div>
```

**`in-*`** - Style based on any parent state (no class needed)

## Stacking Variants

Combine multiple conditions: `dark:md:hover:bg-blue-500`

**v4 change:** Stacking order is now left-to-right (was right-to-left in v3)

## Custom Variants

**Arbitrary:** `[&.is-dragging]:cursor-grabbing`

**Reusable:** Define with `@custom-variant` in CSS

##Tailwind 4 Changes

- `hover` only applies when device supports hover
- `nth-*` variants accept any number by default
- Boolean `data-*` attributes don't need brackets
