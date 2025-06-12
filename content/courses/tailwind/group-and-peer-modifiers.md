---
title: Group and Peer Modifiers
description: "Style elements based on parent or sibling states using Tailwind's group and peer modifiers for complex interactions"
modified: 2025-06-11T15:15:17-06:00
---

`group` and `peer` modifiers are two of Tailwind's most powerful features for creating interactive components without writing custom CSS. They allow you to style elements based on the state of their parent (`group`) or sibling (`peer`) elements.

## Parent State Styling

`group` modifiers let you style child elements when a parent element changes state. You add group to a parent element, then use `group-hover:`, `group-focus:`, etc. on child elements.

Apply `group` class to a parent, then use `group-*` variants on descendants:

```html tailwind
<div class="group">
  <h3>Parent</h3>
  <p class="group-hover:text-blue-500">Changes when parent is hovered</p>
</div>
```

Some ideal use cases include:

- Multi-element hover effects on cards
- Navigation items with icons and text
- Complex button interactions
- Interactive list items

> [!TIP] You can combine modifiers with variants.
> It works with all pseudo-classes: `group-focus`, `group-active`, `group-odd`.

### Practical Example: Interactive Card

```html tailwind
<div class="group rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-xl">
  <h3 class="mb-2 text-lg font-semibold transition-colors group-hover:text-blue-600">
    Product Card
  </h3>
  <p class="mb-4 text-gray-600 transition-colors group-hover:text-gray-800">
    A fantastic product description.
  </p>
  <button
    class="rounded bg-blue-500 px-4 py-2 text-white transition-all group-hover:scale-105 group-hover:bg-blue-600"
  >
    Buy Now
  </button>
</div>
```

### Advanced Group Features

**`group-has-*`** - Style based on descendant state:

```html tailwind
<div class="group">
  <p class="group-has-[:focus]:font-bold">Bold when any child has focus</p>
  <input />
  <input />
  <input />
</div>
```

**Named groups** for nesting:

```html tailwind
<div class="group/outer">
  <div class="group/inner">
    <p class="group-hover/inner:text-blue-500 group-hover/outer:text-red-500">
      Responds to specific parent
    </p>
  </div>
</div>
```

**Arbitrary selectors**: `group-[.is-active]:bg-gray-100`

**v4 composability**: Combine with other variants like `group-has-focus:not-disabled:opacity-100`

### Smart Container Pattern

Use `group-has` to create contextually aware components:

```html tailwind
<!-- Navigation that changes theme when it contains an active link -->
<nav class="group group-has-[.active]:bg-blue-50 group-has-[.active]:shadow-lg">
  <a href="#" class="group-hover:text-blue-200">Home</a>
  <a href="#" class="active">Products</a>
</nav>

<!-- Form that styles based on validation state -->
<form class="group group-has-[:invalid]:border-red-500 group-has-[:valid]:border-green-500">
  <input type="email" required />
  <div class="hidden text-red-600 group-has-[:invalid]:block">
    Please fix errors before submitting
  </div>
</form>
```

## Sibling State Styling

Peer modifiers let you style elements based on the state of sibling elements. You add peer to one element, then use `peer-hover:`, `peer-checked:`, `peer-focus:`, etc. on siblings that come after it in the DOM.

Apply `peer` class to an element, then use `peer-*` variants on subsequent siblings:

```html tailwind
<div class="space-y-1">
  <label class="block peer-invalid:text-red-500" for="email">Email</label>
  <input type="email" id="email" class="peer block rounded-sm outline-1" />
  <p class="peer-invalid:text-red-500">Please provide a valid email</p>
</div>
```

**Important:** `peer` _only_ works on siblings that come AFTER the peer element. This is a CSS limitation.

`peer` works with all pseudo-classes: `peer-focus`, `peer-required`, `peer-disabled`.

### Floating Label Pattern

Perfect for modern form inputs:

```html tailwind
<div class="relative">
  <input
    class="peer w-full rounded border px-3 pt-6 pb-2 placeholder-transparent focus:outline-none"
    placeholder="Enter your email"
    type="email"
  />
  <label
    class="absolute top-2 left-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs"
  >
    Email Address
  </label>
</div>
```

### Advanced Peer Features

**Named peers** for multiple siblings:

```html tailwind
<input type="email" class="peer/email" />
<input type="password" class="peer/password" />
<p class="hidden peer-invalid/email:block">Invalid email</p>
<p class="hidden peer-invalid/password:block">Invalid password</p>
```

> [!TIP] Arbitrary Selectors
> You can use `peer` with **arbitrary selectors**: `peer-[&:nth-child(3)]:mt-4`.

## Common Pitfalls & Solutions

### Multiple Peer Problem

```html tailwind
<!-- ❌ Ambiguous - which peer responds? -->
<input class="peer" />
<input class="peer" />
<label class="peer-focus:text-blue-600">Confusing!</label>

<!-- ✅ Clear with named peers -->
<input class="peer/email" />
<input class="peer/password" />
<label class="peer-focus/email:text-blue-600">Clear!</label>
```

### Nested Group Conflicts

```html tailwind
<!-- ❌ Inner button responds to both groups -->
<div class="group">
  <div class="group">
    <button class="group-hover:scale-110">Unpredictable</button>
  </div>
</div>

<!-- ✅ Named groups prevent conflicts -->
<div class="group/outer">
  <div class="group/inner">
    <button class="group-hover/inner:scale-110">Predictable</button>
  </div>
</div>
```

## Conditional Content Revelation

Show/hide content based on form selections without JavaScript by combinig `group` with `has-*:` to become `group-has-*:`

```html tailwind
<div class="group rounded-lg border p-4">
  <h3 class="font-semibold">Feedback Survey</h3>

  <div class="mt-4 space-y-2">
    <label class="flex items-center gap-2">
      <input type="radio" name="rating" value="good" class="h-4 w-4" />

      <span class="text-sm">Good</span>
    </label>

    <label class="flex items-center gap-2">
      <input type="radio" name="rating" value="poor" class="h-4 w-4" />

      <span class="text-sm">Poor</span>
    </label>
  </div>

  <div class="mt-4 hidden rounded bg-yellow-50 p-3 group-has-[input[value='poor']:checked]:block">
    <label class="block text-sm font-medium">What went wrong?</label>

    <textarea
      class="mt-1 block w-full rounded border-2 border-yellow-300 bg-white px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
      rows="2"
    ></textarea>
  </div>
</div>
```

Conditional content:

- `hidden`: Content hidden by default
- `has-[input[value='poor']:checked]:block`: Shows when specific radio button is selected
- Targets specific values using attribute selectors

Perfect for branching forms and progressive disclosure patterns.

## Key Differences

- **`group`**: Parent → descendants (any depth)
- **`peer`**: Sibling → subsequent siblings only
- **`group-has`**: Parent responds to descendant states
- **Named variants**: Prevent conflicts in complex layouts
