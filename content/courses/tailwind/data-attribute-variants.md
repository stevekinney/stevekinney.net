---
title: Data Attribute Variants
description: >-
  Style elements based on HTML data attributes using Tailwind's data-* variant
  for semantic state management

modified: 2025-06-11T19:05:33-06:00
---

Style elements based on their data attributes - perfect for state managed by JavaScript frameworks.

## Basic Usage

### Presence Check (v4 simplified)

```html tailwind
<!-- Styles apply when data-active exists -->
<div data-active class="opacity-50 data-active:opacity-100">Active content</div>

<!-- Common boolean attributes -->
<li data-current class="data-current:font-bold">Current item</li>
<button data-loading class="data-loading:animate-pulse">Submit</button>
```

### Value Check

```html tailwind
<!-- Styles apply when attribute has specific value -->
<div data-theme="dark" class="bg-white data-[theme=dark]:bg-gray-900">Theme-aware container</div>

<div data-state="expanded" class="h-12 data-[state=expanded]:h-auto">Expandable content</div>
```

## With Group and Peer

```html tailwind
<!-- Style based on parent's data attribute -->
<div class="group" data-status="error">
  <input class="group-data-[status=error]:border-red-500" />
  <span class="hidden group-data-[status=error]:block">Error!</span>
</div>

<!-- Style based on sibling's data attribute -->
<div data-visible class="peer">Toggle</div>
<div class="hidden peer-data-visible:block">Shown when sibling has data-visible</div>
```

## Custom Shortcuts

Define reusable data attribute variants in your CSS:

```css
@import 'tailwindcss';

@theme {
  --data-state-active: [data-state= 'active'];
  --data-state-loading: [data-state= 'loading'];
  --data-orientation-vertical: [data-orientation= 'vertical'];
}
```

Then use them:

```html tailwind
<button data-state="loading" class="data-state-loading:opacity-50">Save</button>
```

## Common Patterns

**Tab interfaces:**

```html tailwind
<button data-selected class="data-selected:border-b-2">Tab 1</button>
```

**Accordion items:**

```html tailwind
<div data-expanded class="data-expanded:pb-4">Content</div>
```

**Loading states:**

```html tailwind
<div data-loading class="data-loading:pointer-events-none">...</div>
```

**Form validation:**

```html tailwind
<input data-invalid class="data-invalid:ring-red-500" />
```

## Best Practices

- Use data attributes for JavaScript-managed state
- Keep attribute names semantic and consistent
- Define custom variants for frequently used patterns
- Remember: Tailwind needs complete class names in source files
