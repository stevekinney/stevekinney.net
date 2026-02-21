---
title: Tailwind Anti-Patterns
description: >-
  Common Tailwind anti-patterns to avoid for cleaner, maintainable code and
  proper utility-first development practices.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

## Overusing the `@apply` Directive

Using `@apply` to inline utility classes:

```css
/* ❌ Anti-pattern */
.btn {
  @apply bg-blue-500 px-4 py-2 text-white;
}
```

This breaks down for a few reasons:

- Breaks utility-first paradigm
- Creates inflexible styles
- Variants don't work as expected in Tailwind 4
- Increases CSS bundle size

**Use this _only_ for**: Third-party library overrides or compatibility needs.

## Expecting Variant Behavior in `@layer` Components

Defining custom styles in `@layer` components expecting variant support:

```css
/* ❌ Anti-pattern in Tailwind 4 */
@layer components {
  .my-button {
    background: blue;
  }
}
/* hover:my-button won't work */
```

**Fix:** Use `@utility` for variant support:

```css
/* ✅ Correct approach */
@utility my-button {
  background: blue;
}
```

## Skipping Component-Based Architecture

Obviously, you can use Tailwind _without_ components, but it becomes quickly obviously how this could get rough.

```html tailwind
<div class="space-x-2">
  <button class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700">
    Button
  </button>
  <button class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700">
    Button
  </button>
  <button class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700">
    Button
  </button>
</div>
```

**Fix:** Use component frameworks to avoid duplication. You've got options: React, Svelte, Angular, Vue, etc. I mean, you can use web components. You can even use jQuery. You can even use server-side templating. But, yea, if you're typing all of this out by hand or something, then maybe Tailwind isn't a good fit.

## Ignoring Theme Customization

In a pinch, it might be tempting to use arbitrary values instead of design tokens.

```html tailwind
<!-- ❌ Anti-pattern: Magic values -->
<div class="bg-[#ff6b35] p-[123px] text-[14.5px]"></div>
```

But, I think it's pretty obvious how over a long enough period of time, you're going to regret that choice.

Instead, use CSS-first theme configuration:

```css
/* ✅ Define consistent tokens */
@theme {
  --color-brand: #ff6b35;
  --spacing-section: 123px;
}
```

## Targeting Older Browsers Without Consideration

Tailwind 4 does a lot of what it does by leveraging modern browser features. It falls apart quickly if you're trying to support browsers older than Chrome 111, Safari 16.4, or Firefox 128. In that case, just use Tailwind 3 with PostCSS to poly-fill these features. And like, get a new job.

At the minimum, you need to support these features.

- Cascade Layers (`@layer`)
- Registered Custom Properties (`@property`)
- `color-mix()` function

## Using Traditional CSS Preprocessors

Since you're going to ask me how to do this at some point, let me just handle this now. Just don't use Sass, Less, or Stylus with Tailwind 4.

## Applying Utilities to High-Level Components

Using low-level components and then building you larger UI out of those components makes makes it easier to make larger-scale changes faster.

```jsx
/* ❌ Anti-pattern */
function CheckoutForm() {
  return (
    <form className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-md">
      {/* Complex checkout logic */}
    </form>
  );
}
```

```jsx
/* ✅ Better approach */
function Card({ children }) {
  return <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-md">{children}</div>;
}

function CheckoutForm() {
  return <Card>{/* Complex checkout logic using pre-styled components */}</Card>;
}
```

## TL;DR

- Embrace the utility-first approach in your HTML
- Use component abstraction for reusability
- Leverage `@theme` for consistent design tokens
- Use `@utility` for custom utilities needing variant support
- Understand browser compatibility requirements before adoption
