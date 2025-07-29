---
title: 'Building an Input with Prefix, Suffix, and Internal Buttons'
description: >-
  Let's build a compound input field that supports prefixes, suffixes, and
  internal buttons step by step using Tailwind's advanced selector utilities.

modified: 2025-06-11T19:05:33-06:00
---

Let's start with our basic HTML structure for a simple search input field.

```html tailwind
<div>
  <label for="search">Search products</label>
  <input type="text" name="search" id="search" placeholder="Enter search terms..." />
</div>
```

It's a basic input field, but modern interfaces often need more sophisticated input patterns—prefix text like "https://", suffix indicators like currency symbols, or internal buttons for actions like search or clear. Let's transform this into a flexible compound input that can handle all these scenarios.

## Creating the Compound Input Container

First, let's establish a container that will hold our input and additional elements, applying some professional-ish styling.

```html tailwind
<div>
  <label for="search" class="block text-sm font-medium text-slate-900">Search products</label>
  <div class="mt-2">
    <div class="flex rounded-md bg-white outline-1 -outline-offset-1 outline-slate-300">
      <input
        type="text"
        name="search"
        id="search"
        class="block w-full border-0 bg-transparent px-3 py-1.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
        placeholder="Enter search terms..."
      />
    </div>
  </div>
</div>
```

Container approach:

- `flex`: Creates a horizontal container for input and additional elements
- `rounded-md outline-1 -outline-offset-1 outline-slate-300`: Moves the border styling to the container instead of the input
- `bg-white`: Explicit white background for the entire compound input
- `border-0 bg-transparent`: Removes the input's default styling since the container handles appearance
- `focus:outline-none`: Removes the input's default focus ring—we'll handle focus on the container

This approach treats the entire compound input as a single visual unit, which is essential for a professional appearance when we add prefix/suffix elements.

## Introducing focus-within for Container Focus

Now let's add proper focus states using the `focus-within` pseudo-class, which applies styles when any child element receives focus.

```html tailwind
<div>
  <label for="search" class="block text-sm font-medium text-slate-900">Search products</label>
  <div class="mt-2">
    <div
      class="flex rounded-md bg-white outline-1 -outline-offset-1 outline-slate-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600"
    >
      <input
        type="text"
        name="search"
        id="search"
        class="block w-full border-0 bg-transparent px-3 py-1.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
        placeholder="Enter search terms..."
      />
    </div>
  </div>
</div>
```

Focus-within magic:

- `focus-within:outline-2`: Thicker 2px outline when any child element (like our input) receives focus
- `focus-within:-outline-offset-2`: Negative offset creates the inset ring effect
- `focus-within:outline-indigo-600`: Brand color for the focus state

The `focus-within` pseudo-class is perfect for compound inputs because it creates a unified focus experience—whether the user clicks on the input, a button, or any other interactive element inside the container, the entire compound input shows a consistent focus state.

## Adding Prefix and Suffix Elements

Let's add prefix and suffix elements to demonstrate common patterns like URL prefixes and unit suffixes.

```html tailwind
<div>
  <label for="website" class="block text-sm font-medium text-slate-900">Website URL</label>
  <div class="mt-2">
    <div
      class="flex rounded-md bg-white outline-1 -outline-offset-1 outline-slate-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600"
    >
      <div
        class="flex items-center rounded-l-md border-r border-slate-300 bg-slate-50 px-3 text-sm text-slate-500"
      >
        https://
      </div>
      <input
        type="text"
        name="website"
        id="website"
        class="block w-full border-0 bg-transparent px-3 py-1.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
        placeholder="example.com"
      />
      <div
        class="flex items-center rounded-r-md border-l border-slate-300 bg-slate-50 px-3 text-sm text-slate-500"
      >
        .com
      </div>
    </div>
  </div>
</div>
```

Prefix and suffix styling:

- `flex items-center`: Vertically centers the prefix/suffix content with the input
- `bg-slate-50`: Light gray background differentiates static elements from the editable input
- `border-r border-slate-300` and `border-l border-slate-300`: Subtle borders separate sections
- `rounded-l-md` and `rounded-r-md`: Maintains the container's rounded corners
- `px-3`: Consistent padding with the input field
- `text-sm text-slate-500`: Smaller, muted text indicates these are helper elements

This creates clear visual separation while maintaining the unified appearance of a single input component.

## Adding Internal Action Buttons

Now let's create a search input with an internal search button, demonstrating how to handle interactive elements within the compound input.

```html tailwind
<div>
  <label for="search" class="block text-sm font-medium text-slate-900">Search products</label>
  <div class="mt-2">
    <div
      class="flex rounded-md bg-white outline-1 -outline-offset-1 outline-slate-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600"
    >
      <div class="flex items-center pl-3 text-slate-400">🔍</div>
      <input
        type="text"
        name="search"
        id="search"
        class="block w-full border-0 bg-transparent px-3 py-1.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
        placeholder="Search for products..."
      />
      <button
        type="submit"
        class="flex items-center rounded-r-md bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-white focus:outline-none"
      >
        Search
      </button>
    </div>
  </div>
</div>
```

Internal button implementation:

- Search emoji with `pl-3 text-slate-400`: Provides visual context with muted coloring
- Button with `rounded-r-md`: Maintains the container's corner radius
- `focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-white`: Separate focus ring for the button that works with the container's focus-within state

The button's focus ring is designed to work harmoniously with the container's focus-within outline, creating clear visual hierarchy when different elements are focused.

## Using has() for Dynamic Button States

Let's enhance our input with a clear button that only appears when there's content, using the `has()` selector to conditionally show elements.

```html tailwind
<div>
  <label for="search" class="block text-sm font-medium text-slate-900">Search products</label>
  <div class="mt-2">
    <div
      class="group flex rounded-md bg-white outline-1 -outline-offset-1 outline-slate-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600"
    >
      <div class="flex items-center pl-3 text-slate-400">🔍</div>
      <input
        type="text"
        name="search"
        id="search"
        class="peer block w-full border-0 bg-transparent px-3 py-1.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
        placeholder="Search for products..."
      />
      <button
        type="button"
        class="hidden items-center px-2 text-slate-400 peer-placeholder-shown:hidden peer-[:not(:placeholder-shown)]:flex hover:text-slate-600"
        aria-label="Clear search"
      >
        ✕
      </button>
      <button
        type="submit"
        class="flex items-center rounded-r-md bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-white focus:outline-none"
      >
        Search
      </button>
    </div>
  </div>
</div>
```

Dynamic button visibility:

- `peer`: Marks the input as a peer element for sibling styling
- `peer-placeholder-shown:hidden`: Hides the clear button when placeholder is shown (input is empty)
- `peer-[:not(:placeholder-shown)]:flex`: Shows the clear button when input has content (placeholder is not shown)
- `group`: Allows for coordinated hover effects across the container

This creates smart UX where the clear button only appears when it's needed, reducing visual clutter when the input is empty.

## Adding Multi-State Input Variants

Let's create a more sophisticated example that demonstrates different input states and uses multiple advanced selectors.

```html tailwind
<div class="space-y-6">
  <!-- Search with Clear -->
  <div>
    <label for="search-clear" class="block text-sm font-medium text-slate-900"
      >Search with auto-clear</label
    >
    <div class="mt-2">
      <div
        class="group flex rounded-md bg-white outline-1 -outline-offset-1 outline-slate-300 transition-colors focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600 hover:bg-slate-50"
      >
        <div class="flex items-center pl-3 text-slate-400 group-focus-within:text-indigo-600">
          🔍
        </div>
        <input
          type="text"
          name="search-clear"
          id="search-clear"
          class="peer block w-full border-0 bg-transparent px-3 py-1.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          placeholder="Type to search..."
        />
        <button
          type="button"
          class="hidden items-center px-2 text-slate-400 transition-colors peer-[:not(:placeholder-shown)]:flex hover:text-slate-600"
          aria-label="Clear search"
        >
          ✕
        </button>
      </div>
    </div>
  </div>

  <!-- Password with Toggle -->
  <div>
    <label for="password-toggle" class="block text-sm font-medium text-slate-900"
      >Password with visibility toggle</label
    >
    <div class="mt-2">
      <div
        class="flex rounded-md bg-white outline-1 -outline-offset-1 outline-slate-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600"
      >
        <input
          type="password"
          name="password-toggle"
          id="password-toggle"
          class="block w-full border-0 bg-transparent px-3 py-1.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          placeholder="Enter your password"
        />
        <button
          type="button"
          class="flex items-center px-3 text-slate-400 hover:text-slate-600 focus:text-indigo-600 focus:outline-none"
          aria-label="Toggle password visibility"
        >
          👁️
        </button>
      </div>
    </div>
  </div>

  <!-- URL Input with Protocol -->
  <div>
    <label for="url-protocol" class="block text-sm font-medium text-slate-900">Website URL</label>
    <div class="mt-2">
      <div
        class="flex rounded-md bg-white outline-1 -outline-offset-1 outline-slate-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600"
      >
        <div
          class="flex items-center rounded-l-md border-r border-slate-300 bg-slate-50 px-3 text-sm text-slate-500"
        >
          https://
        </div>
        <input
          type="text"
          name="url-protocol"
          id="url-protocol"
          class="block w-full border-0 bg-transparent px-3 py-1.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          placeholder="example.com"
        />
        <button
          type="button"
          class="flex items-center rounded-r-md border-l border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:bg-indigo-50 focus:text-indigo-700 focus:outline-none"
          aria-label="Validate URL"
        >
          ✓
        </button>
      </div>
    </div>
  </div>
</div>
```

Advanced interaction patterns:

- `group-focus-within:text-indigo-600`: Changes icon color when any part of the compound input is focused
- `transition-colors`: Smooth color animations across state changes
- `hover:bg-slate-50`: Subtle hover state on the entire container
- `focus:text-indigo-600`: Separate focus color for internal buttons
- `peer-[:not(:placeholder-shown)]:flex`: Modern CSS selector for showing elements when input has content

These patterns create sophisticated, app-like input experiences with clear visual feedback for all interaction states.

## Understanding focus-within vs. Individual Focus States

The `focus-within` pseudo-class is essential for compound inputs because it solves a fundamental UX problem. Let's understand why:

**Without focus-within** (traditional approach):

- Only the actual input shows focus styling
- Clicking buttons or other elements inside doesn't show the input is "active"
- Creates disjointed, confusing visual feedback

**With focus-within** (our approach):

- The entire compound input shows focus when any child receives focus
- Provides unified visual feedback regardless of which element is focused
- Creates the illusion of a single, cohesive input control

This is particularly important for accessibility—screen reader users and keyboard navigation users get consistent feedback regardless of which part of the compound input they're interacting with.

## Adding Polish and Accessibility

Let's enhance our inputs with proper ARIA attributes and refined styling for a production-ready component.

```html tailwind
<div class="space-y-6">
  <div>
    <label for="search-enhanced" class="block text-sm font-medium text-slate-900"
      >Search products</label
    >
    <div class="mt-2" role="search">
      <div
        class="group flex rounded-md bg-white shadow-sm outline-1 -outline-offset-1 outline-slate-300 transition-all duration-200 focus-within:shadow-md focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600 hover:shadow-md"
      >
        <div
          class="flex items-center pl-3 text-slate-400 transition-colors group-focus-within:text-indigo-500"
        >
          🔍
        </div>
        <input
          type="text"
          name="search-enhanced"
          id="search-enhanced"
          class="peer block w-full border-0 bg-transparent px-3 py-1.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-sm"
          placeholder="Search for products, brands, or categories..."
          aria-describedby="search-help"
        />
        <button
          type="button"
          class="hidden items-center px-2 text-slate-400 transition-colors peer-[:not(:placeholder-shown)]:flex hover:text-slate-600 focus:text-indigo-600 focus:outline-none"
          aria-label="Clear search input"
          tabindex="-1"
        >
          ✕
        </button>
        <button
          type="submit"
          class="flex items-center rounded-r-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-white focus:outline-none"
          aria-label="Search products"
        >
          <span class="hidden sm:block">Search</span>
          <span class="sm:hidden">🔍</span>
        </button>
      </div>
      <p id="search-help" class="mt-2 text-sm text-slate-500">
        Try searching for "wireless headphones" or "laptop stand"
      </p>
    </div>
  </div>
</div>
```

Accessibility and polish enhancements:

- `role="search"`: Identifies the search region for assistive technologies
- `aria-describedby="search-help"`: Links the input to helpful description text
- `aria-label` attributes on buttons: Provides clear descriptions for screen readers
- `tabindex="-1"` on clear button: Removes from tab order when hidden (UX improvement)
- `shadow-sm focus-within:shadow-md`: Subtle elevation changes on focus
- `sm:text-sm`: Responsive typography that prevents zoom on mobile
- `transition-all duration-200`: Smooth animations for all state changes

These refinements create a component that's not only visually polished but also fully accessible to users with assistive technologies.

## Why This Approach Works

The compound input pattern we've built leverages several powerful Tailwind utilities working in harmony:

**focus-within creates unified focus behavior**: The entire input container responds when any child receives focus, creating a cohesive user experience that feels like a single control.

**Peer selectors enable smart interactions**: The clear button only appears when there's content to clear, reducing visual clutter and providing contextual actions.

**Group utilities coordinate hover effects**: Multiple elements can respond to container-level interactions, creating sophisticated visual feedback.

**Accessibility is built-in**: Using semantic HTML elements (real inputs and buttons) with proper ARIA attributes ensures the component works with assistive technologies.

**Flexible architecture**: The same pattern works for search inputs, password fields, URL inputs, or any compound input pattern your application needs.

## Challenges

Try building these variations:

1. **Multi-Input Compound**: Create a compound input for entering a phone number with separate fields for country code, area code, and number, using `focus-within` to style the entire group as one unit.

2. **Smart Dropdown Input**: Build an input with an internal dropdown button that shows/hides suggestions, combining the patterns from this tutorial with the techniques from our [details disclosure tutorial](building-details-disclosure.md) to create a searchable select component.
