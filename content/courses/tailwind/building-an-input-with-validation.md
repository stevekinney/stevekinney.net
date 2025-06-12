---
title: Building an Input with Inline Validation
description: Let's build an input field with real-time validation feedback step by step using Tailwind's peer utilities.
---

Let's start with our basic HTML structure for an input field with validation messaging.

```html tailwind
<div>
  <label for="email">Email address</label>
  <input type="email" name="email" id="email" placeholder="you@example.com" />
  <div>Please enter a valid email address</div>
</div>
```

It's a basic input with a label and error message, but there's no validation behavior and the styling is completely unstyled. Let's transform it into a smart input that provides real-time feedback without any JavaScript.

## Applying Base Input Styling

First, let's apply the professional input styling we learned in our [form input tutorial](building-a-form-input.md).

```html tailwind
<div>
  <label for="email" class="block text-sm font-medium text-slate-900">Email address</label>
  <div class="mt-2">
    <input
      type="email"
      name="email"
      id="email"
      class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
      placeholder="you@example.com"
    />
  </div>
  <div>Please enter a valid email address</div>
</div>
```

We're building on our established input patterns:

- Professional label typography with `text-sm font-medium`
- Proper spacing with `mt-2` between label and input
- Full-width input with consistent padding and border styling
- Focus states that provide clear visual feedback

This gives us a solid foundation to build validation functionality on top of.

## Setting Up the Peer System

Now let's introduce the peer system and HTML5 validation. We'll add the `required` attribute and set up our input as a peer element.

```html tailwind
<div>
  <label for="email" class="block text-sm font-medium text-slate-900">Email address</label>
  <div class="mt-2">
    <input
      type="email"
      name="email"
      id="email"
      required
      class="peer block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
      placeholder="you@example.com"
    />
  </div>
  <div>Please enter a valid email address</div>
</div>
```

Key additions:

- `required`: HTML5 attribute that makes the field mandatory and enables browser validation
- `peer`: Marks the input as the "peer" element that other elements can reference for styling

The `required` attribute combined with `type="email"` gives us automatic validation—the browser will consider the input invalid if it's empty or doesn't match email format.

## Adding Error State Styling

Let's make the error message appear only when the input is invalid using the `peer-invalid` utility.

```html tailwind
<div>
  <label for="email" class="block text-sm font-medium text-slate-900">Email address</label>
  <div class="mt-2">
    <input
      type="email"
      name="email"
      id="email"
      required
      class="peer block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
      placeholder="you@example.com"
    />
  </div>
  <div class="mt-2 hidden text-sm text-red-600 peer-invalid:block">
    Please enter a valid email address
  </div>
</div>
```

Error message styling:

- `hidden`: Hides the error message by default (`display: none`)
- `peer-invalid:block`: Shows the error message (`display: block`) when the peer input is invalid
- `text-sm`: 14px font size, smaller than the input text for hierarchy
- `text-red-600`: Red color clearly indicates an error state
- `mt-2`: 8px top margin provides separation from the input

This is our first use of `peer-invalid`—the error message automatically appears when the input is invalid according to HTML5 validation rules!

## Handling the Placeholder State

There's a problem: the error shows immediately on page load because an empty required field is technically invalid. Let's fix this by only showing errors after the user has started typing.

```html tailwind
<div>
  <label for="email" class="block text-sm font-medium text-slate-900">Email address</label>
  <div class="mt-2">
    <input
      type="email"
      name="email"
      id="email"
      required
      class="peer block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
      placeholder="you@example.com"
    />
  </div>
  <div
    class="mt-2 hidden text-sm text-red-600 peer-invalid:block peer-invalid:peer-placeholder-shown:hidden"
  >
    Please enter a valid email address
  </div>
</div>
```

The magic happens with this class combination:

- `hidden`: Default state (error hidden)
- `peer-invalid:block`: Show error when input is invalid
- `peer-invalid:peer-placeholder-shown:hidden`: Hide error when input is invalid AND placeholder is shown (meaning it's empty)

This creates smart behavior: the error only appears when the input has content but that content is invalid. An empty field won't show an error message.

## Adding Visual Input Error States

Let's add visual feedback to the input itself when it's in an error state.

```html tailwind
<div>
  <label for="email" class="block text-sm font-medium text-slate-900">Email address</label>
  <div class="mt-2">
    <input
      type="email"
      name="email"
      id="email"
      required
      class="peer block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400 invalid:outline-red-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 focus:invalid:outline-red-500"
      placeholder="you@example.com"
    />
  </div>
  <div
    class="mt-2 hidden text-sm text-red-600 peer-invalid:block peer-invalid:peer-placeholder-shown:hidden"
  >
    Please enter a valid email address
  </div>
</div>
```

Input error styling:

- `invalid:outline-red-500`: Red outline when the input is invalid
- `focus:invalid:outline-red-500`: Red outline remains when focusing an invalid input

This provides immediate visual feedback on the input itself, complementing the error message below.

## Adding Success State Feedback

Let's add a subtle success indicator when the input is valid and has content.

```html tailwind
<div>
  <label for="email" class="block text-sm font-medium text-slate-900">Email address</label>
  <div class="mt-2">
    <input
      type="email"
      name="email"
      id="email"
      required
      class="peer block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400 valid:outline-green-500 invalid:outline-red-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 focus:invalid:outline-red-500"
      placeholder="you@example.com"
    />
  </div>
  <div
    class="mt-2 hidden text-sm text-green-600 peer-valid:block peer-valid:peer-placeholder-shown:hidden"
  >
    ✓ Email address is valid
  </div>
  <div
    class="mt-2 hidden text-sm text-red-600 peer-invalid:block peer-invalid:peer-placeholder-shown:hidden"
  >
    Please enter a valid email address
  </div>
</div>
```

Success state additions:

- `valid:outline-green-500`: Green outline when input is valid
- Success message with `peer-valid:peer-placeholder-shown:hidden peer-valid:block`: Shows when input is valid and not empty
- `text-green-600`: Green color for positive feedback
- Checkmark (`✓`) icon provides immediate visual recognition

Now users get clear feedback for both error and success states!

## Adding Smooth Transitions

Let's add transitions to make the state changes feel polished rather than jarring.

```html tailwind
<div>
  <label for="email" class="block text-sm font-medium text-slate-900">Email address</label>
  <div class="mt-2">
    <input
      type="email"
      name="email"
      id="email"
      required
      class="peer block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 transition-colors placeholder:text-slate-400 valid:outline-green-500 invalid:outline-red-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 focus:invalid:outline-red-500"
      placeholder="you@example.com"
    />
  </div>
  <div
    class="mt-2 hidden text-sm text-green-600 transition-opacity peer-valid:block peer-valid:peer-placeholder-shown:hidden"
  >
    ✓ Email address is valid
  </div>
  <div
    class="mt-2 hidden text-sm text-red-600 transition-opacity peer-invalid:block peer-invalid:peer-placeholder-shown:hidden"
  >
    Please enter a valid email address
  </div>
</div>
```

Transition improvements:

- `transition-colors` on input: Smoothly animates outline color changes
- `transition-opacity` on messages: Smoothly fades messages in/out (though the hidden/block change is instant, this helps with other opacity-based interactions)

These subtle animations make the validation feel more responsive and professional.

## Enhancing Accessibility

Let's add proper ARIA attributes to ensure screen readers understand the validation state.

```html tailwind
<div>
  <label for="email" class="block text-sm font-medium text-slate-900">Email address</label>
  <div class="mt-2">
    <input
      type="email"
      name="email"
      id="email"
      required
      aria-describedby="email-error email-success"
      class="peer block w-full rounded-md bg-white px-3 py-1.5 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 transition-colors placeholder:text-slate-400 valid:outline-green-500 invalid:outline-red-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 focus:invalid:outline-red-500"
      placeholder="you@example.com"
    />
  </div>
  <div
    id="email-success"
    class="mt-2 hidden text-sm text-green-600 transition-opacity peer-valid:block peer-valid:peer-placeholder-shown:hidden"
  >
    ✓ Email address is valid
  </div>
  <div
    id="email-error"
    class="mt-2 hidden text-sm text-red-600 transition-opacity peer-invalid:block peer-invalid:peer-placeholder-shown:hidden"
  >
    Please enter a valid email address
  </div>
</div>
```

Accessibility improvements:

- `aria-describedby="email-error email-success"`: Links the input to both message elements so screen readers announce them
- `id` attributes on messages: Required for `aria-describedby` to function properly

This ensures that screen reader users hear validation feedback when it appears, not just sighted users who see the visual changes.

## Why This Approach Works

This validation pattern leverages the browser's built-in HTML5 validation combined with Tailwind's peer utilities to create sophisticated UX without JavaScript. Here's what makes it powerful:

- **Progressive Enhancement**: The form works perfectly without CSS—the browser still validates and prevents submission of invalid data.
- **Real-time Feedback**: Users get immediate visual feedback as they type, helping them correct errors before submitting.
- **Smart Timing**: Errors only appear after users start typing, avoiding the jarring experience of seeing errors on empty fields.
- **Accessibility**: Screen readers announce validation messages when they appear, and the semantic HTML ensures compatibility with assistive technologies.
- **Performance**: Zero JavaScript means instant loading and no runtime overhead.

## Common Use Cases

This pattern works great for:

- Email addresses (as shown)
- Phone numbers with `type="tel"` and `pattern` attributes
- URLs with `type="url"`
- Any text input with custom `pattern` validation
- Password fields with complexity requirements

## Challenges

1. **Password Strength Indicator**: Create a password input that shows strength levels (weak/medium/strong) using multiple peer states and the `pattern` attribute
2. **Confirm Password Field**: Build two password inputs where the second shows an error when it doesn't match the first (hint: you'll need some creative use of peer utilities or light JavaScript)
