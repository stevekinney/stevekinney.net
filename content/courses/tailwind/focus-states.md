---
title: Focus States
description: Understanding focus, focus-visible, and focus-within utilities in Tailwind for accessible keyboard navigation
modified: 2025-06-11T12:17:33-06:00
---

## `focus`: Always Shows

`focus:` triggers on any focus event (mouse, keyboard, programmatic).

```html tailwind
<button class="bg-blue-200 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none">
  Click or tab
</button>
```

**Always** use focus for form controls where users need clear feedback regardless of input method.

```html tailwind
<input class="rounded-md bg-white px-3 py-1.5 outline-2 outline-slate-300 focus:outline-pink-400" />
```

For skip links, main navigation, or accessibility-critical elements. These elements should be immediately obvious when focused, regardless of how focus was achieved.

```html
<a href="#main-content" class="outline-offset-4 focus:outline-2 focus:outline-blue-500">
  Skip to main content
</a>
```

You also want it when you're trying to show an error state.

```html tailwind
<input
  type="email"
  placeholder="Email"
  class="focus:-outline-2 block rounded-md border-2 border-slate-300 bg-white px-3 py-1.5 placeholder:text-slate-400 valid:outline-green-500 invalid:outline-red-500"
  required
/>
```

## `focus-visible`: Smart Detection

Shows focus only when needed (keyboard navigation, not mouse clicks).

```html tailwind
<button
  class="bg-blue-200 px-3 py-2 hover:bg-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none active:bg-blue-400"
>
  Smart Focus
</button>
```

Browser heuristics determine when to show focus—typically for keyboard users only.

## `focus-within`: Parent Styling

Styles parent when any child has focus.

```html tailwind
<div
  class="space-y-4 border-2 border-gray-300 p-4 focus-within:border-blue-500 focus-within:shadow-lg"
>
  <input
    type="email"
    placeholder="Email"
    class="block rounded-md bg-white px-3 py-1.5 outline-2 placeholder:text-slate-400 focus:outline-indigo-600"
  />
  <input
    type="password"
    placeholder="password"
    class="block rounded-md bg-white px-3 py-1.5 outline-2 placeholder:text-slate-400 focus:outline-indigo-600"
  />
</div>
```

Container highlights when either input is focused.

## Browser Support

`focus-visible` has good modern browser support. For fallbacks:

```html tailwind
<button class="focus:ring-2 focus-visible:ring-2">Fallback support</button>
```

## Quick Reference

- **`focus:`** - Always shows (mouse & keyboard)
- **`focus-visible:`** - Smart detection (keyboard only)
- **`focus-within:`** - Parent styling when children focused
