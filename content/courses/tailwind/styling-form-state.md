---
title: Styling Form State
description: >-
  Use Tailwind's form state variants to style inputs, textareas, and buttons
  based on validation, focus, and disabled states
modified: 2025-06-11T19:05:33-06:00
---

You can form elements based on their state without conditional logic.

```html tailwind
<input
  class="bg-white px-3 py-1.5 outline-2 outline-slate-400 invalid:outline-red-500 focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100"
/>
```

### Available Variants

- `required:`
- `invalid:` / `valid:`: Input validation state.
- `user-invalid:` and `user-valid:`: Checks validity _after_ the user has interacted with the input.
- `in-range:` and `out-of-range:`: For use with number inputs
- `disabled:` and `enabled:`
- `read-only:`: Inputs that are… read only.
- `checked:`: Checkboxes/radios
- `indeterminate:`: Partial selection with checkboxes.
- `optional:`: Non-required fields.
- `placeholder-shown:`: Styles for when the placeholder is visible.
- `autofill:`: Inputs that the browser has automattically filled.
- `focus:` / `focus-visible:` / `focus-within:`: [Focus states](focus-states.md)

## Styling Form Elements

### Placeholders

```html tailwind
<input placeholder="Email" class="placeholder:italic" />
```

### File Inputs

```html tailwind
<input
  type="file"
  class="file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-600 dark:file:text-indigo-100 dark:hover:file:bg-indigo-500"
/>
```

### Text Cursor

```html tailwind
<input class="bg-white px-3 py-1.5 caret-pink-500 outline-2 outline-slate-400" />
```

## Form Utilities

### Reset browser styles

```html tailwind
<select
  class="appearance-none rounded border border-gray-300 bg-white px-3 py-2 pr-8 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
>
  <option value="">Choose an option</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
  <option value="option3">Option 3</option>
</select>
```

### Control text selection

```html tailwind
<div class="space-y-4">
  <textarea
    class="rounded border border-gray-300 bg-white px-3 py-2 select-all focus:ring-2 focus:ring-blue-500 focus:outline-none"
  >
This text will be selected when clicked</textarea
  >
  <textarea
    class="rounded border border-gray-300 bg-white px-3 py-2 select-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
  >
This text cannot be selected</textarea
  >
  <textarea
    class="rounded border border-gray-300 bg-white px-3 py-2 select-text focus:ring-2 focus:ring-blue-500 focus:outline-none"
  >
This text can be selected normally</textarea
  >
</div>
```

### Resize behavior

```html tailwind
<div class="space-y-4">
  <textarea
    class="resize-none rounded border border-gray-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
    placeholder="Cannot be resized"
  >
This textarea cannot be resized</textarea
  >
  <textarea
    class="resize-y rounded border border-gray-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
    placeholder="Resize vertically only"
  >
This textarea can only be resized vertically</textarea
  >
  <textarea
    class="resize-x rounded border border-gray-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
    placeholder="Resize horizontally only"
  >
This textarea can only be resized horizontally</textarea
  >
  <textarea
    class="resize rounded border border-gray-300 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
    placeholder="Resize in both directions"
  >
This textarea can be resized in both directions</textarea
  >
</div>
```

## Tailwind 4 Updates

- **Field sizing:** `field-sizing-content` (auto-grow) or `field-sizing-fixed`
- **Placeholder color:** Now 50% opacity of text color (was gray-400)
- **Button cursor:** Default is `cursor-default` (was pointer)
- **Outline:** `outline-hidden` preserves outline in forced-colors mode

## Combining with Other Variants

We'll get to this shortly, but I wanted to include it just in case you're reading these notes later.

```html tailwind
<input class="peer" type="email" />
<span class="hidden text-red-500 peer-invalid:block"> Invalid email </span>
```
