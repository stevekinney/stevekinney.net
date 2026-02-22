---
title: Styling Form State
description: >-
  Use Tailwind's form state variants to style inputs, textareas, and buttons
  based on validation, focus, and disabled states
modified: '2025-07-29T15:11:25-06:00'
date: '2025-06-11T19:05:33-06:00'
---

You can form elements based on their state without conditional logic.

```html tailwind
<input
  class="rounded-md bg-white px-3 py-1.5 outline-2 outline-slate-400 invalid:outline-red-500 disabled:cursor-not-allowed disabled:bg-gray-100"
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
<input
  placeholder="Email"
  class="rounded-md bg-white px-3 py-1.5 outline-2 outline-slate-400 placeholder:italic"
/>
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
<input class="rounded-md bg-white px-3 py-1.5 caret-pink-500 outline-2 outline-slate-400" />
```

## Form Utilities

### Reset browser styles

```html tailwind
<select
  class="b w-fullg-white block appearance-none rounded-md px-3 py-2 pr-8 outline-2 outline-slate-400 focus:border-blue-500 focus:outline-pink-400"
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
  <div
    class="b w-fullg-white block rounded-md px-3 py-2 outline-2 outline-slate-400 select-all focus:outline-pink-400"
  >
    This text will be selected when clicked
  </div>
  <div
    class="b w-fullg-white block rounded-md px-3 py-2 outline-2 outline-slate-400 select-none focus:outline-pink-400"
  >
    This text cannot be selected
  </div>
  <div
    class="b w-fullg-white block rounded-md px-3 py-2 outline-2 outline-slate-400 select-text focus:outline-pink-400"
  >
    This text can be selected normally
  </div>
</div>
```

### Resize behavior

```html tailwind
<div class="space-y-4">
  <textarea
    class="block w-full resize-none rounded-md bg-white px-3 py-2 outline-2 outline-slate-400 focus:outline-pink-400"
    placeholder="Cannot be resized"
  ></textarea>
  <textarea
    class="block w-full resize-y rounded-md bg-white px-3 py-2 outline-2 outline-slate-400 focus:outline-pink-400"
    placeholder="Resize vertically only"
  ></textarea>
  <textarea
    class="block w-full resize-x rounded-md bg-white px-3 py-2 outline-2 outline-slate-400 focus:outline-pink-400"
    placeholder="Resize horizontally only"
  ></textarea>
  <textarea
    class="block w-full resize rounded-md bg-white px-3 py-2 outline-2 outline-slate-400 focus:outline-pink-400"
    placeholder="Resize in both directions"
  ></textarea>
</div>
```

## Tailwind 4 Updates

- **Field sizing:** `field-sizing-content` (auto-grow) or `field-sizing-fixed`
- **Placeholder color:** Now 50% opacity of text color (was gray-400)
- **Button cursor:** Default is `cursor-default` (was pointer)
- **Outline:** `outline-hidden` preserves outline in forced-colors mode
