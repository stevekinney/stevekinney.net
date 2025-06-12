---
title: Before & After Pseudo-Selectors
description: "Style ::before and ::after pseudo-elements with Tailwind's before: and after: variants for decorative content."
modified: 2025-06-11T15:24:40-06:00
---

## Basic Usage

Prefix any utility with `before:` or `after:` to style pseudo-elements:

```html tailwind
<div class="before:block before:h-px before:bg-gray-300 before:content-['']">Decorated text</div>
```

### Automatic Empty Content

Tailwind adds `content: ''` by default when using these variants.

## Setting Content

### Text Content

```html tailwind
<span class="before:mr-2 before:content-['→']">Next</span>
<span class="after:text-red-500 after:content-['*']">Required</span>
```

### Spaces

Use underscores (converted to spaces):

```html tailwind
<div class="before:content-['Hello_world']"></div>
```

### Literal Underscore

Escape with backslash:

```html tailwind
<div class="before:content-['snake\_case']"></div>
```

### Attribute Values

```html tailwind
<div data-label="Status" class="before:content-[attr(data-label)]">...</div>
```

### CSS Variables

```html tailwind
<div class="before:content-[var(--label)]">...</div>
```

## When to Use Pseudo-Elements

**Prefer real elements** for most cases:

```html tailwind
<!-- Better -->
<span class="inline-block h-px w-full bg-gray-300"></span>

<!-- Only when semantic markup matters -->
<div class="before:block before:h-px before:bg-gray-300 before:content-['']">...</div>
```

Use pseudo-elements when:

- Content shouldn't be selectable
- Content is purely decorative
- You need to avoid affecting document flow

## Composability

Stack with other variants:

```html tailwind
<button class="before:opacity-0 before:content-['→'] hover:before:opacity-100">Hover me</button>
```
