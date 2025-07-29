---
title: Solutions for `has-*` Challenges
description: A solution for some challenges from Steve's Tailwind course.
modified: 2025-06-11T19:05:33-06:00
---

## Challenge 1: Checkbox Container

Let's start with something like this:

```html
<div>
  <input type="checkbox" id="agree" />
  <label for="agree">I agree to the terms</label>
</div>
```

**Step 1**: Add basic layout classes to the container

```html
<div class="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
  <input type="checkbox" id="agree" class="h-4 w-4" />
  <label for="agree">I agree to the terms</label>
</div>
```

**Step 2**: Add the `has-*` utility to change background when checkbox is checked

```html
<div
  class="flex items-center gap-3 rounded-lg border border-slate-200 p-4 has-[input:checked]:bg-green-50"
>
  <input type="checkbox" id="agree" class="h-4 w-4" />
  <label for="agree">I agree to the terms</label>
</div>
```

**Step 3**: Add border color change for complete feedback

```html
<div
  class="flex items-center gap-3 rounded-lg border border-slate-200 p-4 has-[input:checked]:border-green-500 has-[input:checked]:bg-green-50"
>
  <input type="checkbox" id="agree" class="h-4 w-4" />
  <label for="agree">I agree to the terms</label>
</div>
```

The `has-[input:checked]:` prefix targets when the container has a checked input child. You can apply multiple `has-*` utilities for different visual changes.

## Challenge 2: Form Validation Feedback

**Goal**: Create a form field container that shows green for valid input, red for invalid input.

Let's start with something like this:

```html
<div>
  <label for="email">Email Address</label>
  <input type="email" id="email" required />
</div>
```

**Step 1**: Add container styling and layout

```html
<div class="rounded-lg border border-slate-200 p-4">
  <label for="email" class="block text-sm font-medium text-slate-900">Email Address</label>
  <input
    type="email"
    id="email"
    required
    class="mt-2 block w-full rounded border-slate-300 px-3 py-2"
  />
</div>
```

**Step 2**: Add valid state styling using `has-[input:valid]`

```html
<div
  class="rounded-lg border border-slate-200 p-4 has-[input:valid]:border-green-500 has-[input:valid]:bg-green-50"
>
  <label for="email" class="block text-sm font-medium text-slate-900">Email Address</label>
  <input
    type="email"
    id="email"
    required
    class="mt-2 block w-full rounded border-slate-300 px-3 py-2"
  />
</div>
```

**Step 3**: Add invalid state styling and smooth transitions

```html
<div
  class="rounded-lg border border-slate-200 p-4 transition-colors has-[input:invalid]:border-red-500 has-[input:invalid]:bg-red-50 has-[input:valid]:border-green-500 has-[input:valid]:bg-green-50"
>
  <label for="email" class="block text-sm font-medium text-slate-900">Email Address</label>
  <input
    type="email"
    id="email"
    required
    class="mt-2 block w-full rounded border-slate-300 px-3 py-2"
  />
</div>
```

HTML5 validation states (`:valid` and `:invalid`) work automatically with `required` and `type="email"`. The container responds to the input's validation state without JavaScript.

## Challenge 3: Conditional Content

**Goal**: Build a survey question that reveals a text area when "Poor" is selected.

Let's start with something like this:

```html
<div>
  <h3>How was your experience?</h3>
  <label><input type="radio" name="rating" value="good" /> Good</label>
  <label><input type="radio" name="rating" value="poor" /> Poor</label>
  <div>Please tell us what went wrong:</div>
</div>
```

**Step 1**: Add structure and hide the follow-up by default

```html
<div class="rounded-lg border border-slate-200 p-4">
  <h3 class="font-semibold text-slate-900">How was your experience?</h3>
  <div class="mt-3 space-y-2">
    <label class="flex items-center gap-2"
      ><input type="radio" name="rating" value="good" /> Good</label
    >
    <label class="flex items-center gap-2"
      ><input type="radio" name="rating" value="poor" /> Poor</label
    >
  </div>
  <div class="mt-4 hidden">Please tell us what went wrong:</div>
</div>
```

**Step 2**: Target the specific radio button value to show content

```html
<div class="rounded-lg border border-slate-200 p-4">
  <h3 class="font-semibold text-slate-900">How was your experience?</h3>
  <div class="mt-3 space-y-2">
    <label class="flex items-center gap-2"
      ><input type="radio" name="rating" value="good" /> Good</label
    >
    <label class="flex items-center gap-2"
      ><input type="radio" name="rating" value="poor" /> Poor</label
    >
  </div>
  <div class="mt-4 hidden has-[input[value='poor']:checked]:block">
    Please tell us what went wrong:
  </div>
</div>
```

**Step 3**: Complete the follow-up section with proper styling

```html
<div class="rounded-lg border border-slate-200 p-4">
  <h3 class="font-semibold text-slate-900">How was your experience?</h3>
  <div class="mt-3 space-y-2">
    <label class="flex items-center gap-2"
      ><input type="radio" name="rating" value="good" /> Good</label
    >
    <label class="flex items-center gap-2"
      ><input type="radio" name="rating" value="poor" /> Poor</label
    >
  </div>
  <div class="mt-4 hidden rounded bg-yellow-50 p-3 has-[input[value='poor']:checked]:block">
    <label class="block text-sm font-medium">Please tell us what went wrong:</label>
    <textarea class="mt-1 block w-full rounded border-yellow-300 text-sm" rows="2"></textarea>
  </div>
</div>
```

You can target specific form values using attribute selectors like `input[value='poor']`. The `hidden` class combined with `has-*:block` creates show/hide behavior without JavaScript.

## Challenge 4: Multi-Element Response

**Goal**: Design a contact form container that responds with blue for text input focus, green for textarea focus.

Let's start with something like this:

```html
<div>
  <label>Subject</label>
  <input type="text" />
  <label>Message</label>
  <textarea></textarea>
</div>
```

**Step 1**: Add basic form structure and styling

```html
<div class="rounded-lg border border-slate-200 p-4">
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium">Subject</label>
      <input type="text" class="mt-1 block w-full rounded border-slate-300 px-3 py-2" />
    </div>
    <div>
      <label class="block text-sm font-medium">Message</label>
      <textarea class="mt-1 block w-full rounded border-slate-300 px-3 py-2" rows="3"></textarea>
    </div>
  </div>
</div>
```

**Step 2**: Add different responses for input vs textarea focus

```html
<div
  class="rounded-lg border border-slate-200 p-4 transition-colors has-[input:focus]:border-blue-500 has-[input:focus]:bg-blue-50 has-[textarea:focus]:border-green-500 has-[textarea:focus]:bg-green-50"
>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium">Subject</label>
      <input type="text" class="mt-1 block w-full rounded border-slate-300 px-3 py-2" />
    </div>
    <div>
      <label class="block text-sm font-medium">Message</label>
      <textarea class="mt-1 block w-full rounded border-slate-300 px-3 py-2" rows="3"></textarea>
    </div>
  </div>
</div>
```

You can target different element types (`input` vs `textarea`) with different `has-*` utilities. The container will respond differently depending on which child element is focused.

## Challenge 5: Complex Attribute Targeting

**Goal**: Create a file upload zone that responds to focus states _and_ shows dashed border for file inputs.

Let's start with something like this:

```html
<div>
  <input type="text" placeholder="Enter URL" />
  <span>or</span>
  <input type="file" />
</div>
```

**Step 1**: Create the upload zone structure

```html
<div class="rounded-lg border-2 border-slate-300 p-6 text-center">
  <div class="space-y-3">
    <input
      type="text"
      placeholder="Enter URL"
      class="block w-full rounded border-slate-300 px-3 py-2 text-sm"
    />
    <div class="text-sm text-slate-500">or</div>
    <input type="file" class="block w-full text-sm" />
  </div>
</div>
```

**Step 2**: Add file input detection with dashed border

```html
<div
  class="rounded-lg border-2 border-slate-300 p-6 text-center has-[input[type='file']]:border-dashed"
>
  <div class="space-y-3">
    <input
      type="text"
      placeholder="Enter URL"
      class="block w-full rounded border-slate-300 px-3 py-2 text-sm"
    />
    <div class="text-sm text-slate-500">or</div>
    <input type="file" class="block w-full text-sm" />
  </div>
</div>
```

**Step 3**: Add different focus states for different input types

```html
<div
  class="rounded-lg border-2 border-slate-300 p-6 text-center transition-all has-[input[type='file']]:border-dashed has-[input[type='file']:focus]:border-green-500 has-[input[type='file']:focus]:bg-green-50 has-[input[type='text']:focus]:border-blue-500 has-[input[type='text']:focus]:bg-blue-50"
>
  <div class="space-y-3">
    <input
      type="text"
      placeholder="Enter URL"
      class="block w-full rounded border-slate-300 px-3 py-2 text-sm"
    />
    <div class="text-sm text-slate-500">or</div>
    <input type="file" class="block w-full text-sm" />
  </div>
</div>
```

You can combine multiple complex selectors like `input[type='file']:focus` to target specific element types in specific states. The `transition-all` class smoothly animates between all the different state combinations.
