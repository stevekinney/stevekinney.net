---
title: Building a Modal Dialog
description: Let's build a professional modal dialog with backdrop, animations, and proper content structure step by step using Tailwind CSS.
---

Let's start with our basic HTML structure for a modal dialog component.

```html
<div>
  <button>Open Modal</button>

  <dialog>
    <div>
      <header>
        <h2>Modal Title</h2>
        <button>×</button>
      </header>
      <main>
        <p>
          This is the modal content. You can put any content here that you want to display in the
          modal.
        </p>
      </main>
      <footer>
        <button>Close</button>
      </footer>
    </div>
  </dialog>
</div>
```

It's a semantic `<dialog>` element with proper content structure, but it's completely unstyled and the native dialog appearance varies significantly across browsers. Let's transform this into a polished modal that feels modern and professional.

## Styling the Trigger Button

First, let's style our trigger button using the patterns we learned in our [button tutorial](building-a-button.md).

```html
<div>
  <button
    class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
  >
    Open Modal
  </button>

  <dialog>
    <div>
      <header>
        <h2>Modal Title</h2>
        <button>×</button>
      </header>
      <main>
        <p>
          This is the modal content. You can put any content here that you want to display in the
          modal.
        </p>
      </main>
      <footer>
        <button>Close</button>
      </footer>
    </div>
  </dialog>
</div>
```

Button styling:

- `bg-blue-600 hover:bg-blue-500`: Blue primary color with lighter hover state
- `px-4 py-2`: 16px horizontal and 8px vertical padding for comfortable touch targets
- `text-sm font-semibold`: 14px semibold text for clarity
- `shadow-sm`: Subtle depth that makes the button feel clickable
- `focus-visible:outline-*`: Accessible focus ring for keyboard navigation

This gives us a professional trigger button that clearly indicates it will open something important.

## Creating the Modal Backdrop

Now let's style the dialog element itself. The `<dialog>` element provides the semantic foundation, but we need to override its default styling for a modern appearance.

```html
<div>
  <button
    class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
  >
    Open Modal
  </button>

  <dialog class="backdrop:bg-black/50 backdrop:backdrop-blur-sm">
    <div>
      <header>
        <h2>Modal Title</h2>
        <button>×</button>
      </header>
      <main>
        <p>
          This is the modal content. You can put any content here that you want to display in the
          modal.
        </p>
      </main>
      <footer>
        <button>Close</button>
      </footer>
    </div>
  </dialog>
</div>
```

Backdrop styling:

- `backdrop:bg-black/50`: Semi-transparent black backdrop (50% opacity) that darkens the background content
- `backdrop:backdrop-blur-sm`: Subtle blur effect that creates depth and focus on the modal content

The `backdrop:` pseudo-element utilities style the browser's native dialog backdrop, creating a professional overlay effect without needing additional HTML elements.

## Positioning and Sizing the Modal

Let's position the modal properly and create the main container structure using techniques from our [card tutorial](building-a-card.md).

```html
<div>
  <button
    class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
  >
    Open Modal
  </button>

  <dialog
    class="m-auto h-fit w-full max-w-md rounded-lg bg-white p-0 shadow-lg backdrop:bg-black/50 backdrop:backdrop-blur-sm"
  >
    <div>
      <header>
        <h2>Modal Title</h2>
        <button>×</button>
      </header>
      <main>
        <p>
          This is the modal content. You can put any content here that you want to display in the
          modal.
        </p>
      </main>
      <footer>
        <button>Close</button>
      </footer>
    </div>
  </dialog>
</div>
```

Modal container styling:

- `m-auto`: Centers the modal both horizontally and vertically using automatic margins
- `w-full max-w-md`: Full width up to 448px maximum for optimal readability
- `h-fit`: Height adjusts to content rather than filling the viewport
- `rounded-lg bg-white`: 8px border radius and white background for modern card appearance
- `shadow-lg`: Substantial shadow that creates clear separation from the backdrop
- `p-0`: Removes default dialog padding so we can control spacing internally

The `m-auto` utility ensures consistent centering across all browsers by setting `margin: auto` on all sides, overriding any browser-specific dialog positioning quirks.

## Structuring the Modal Content

Now let's properly structure the header, main content, and footer areas with appropriate spacing and visual hierarchy.

```html
<div>
  <button
    class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
  >
    Open Modal
  </button>

  <dialog
    class="m-auto h-fit w-full max-w-md rounded-lg bg-white p-0 shadow-lg backdrop:bg-black/50 backdrop:backdrop-blur-sm"
  >
    <div class="flex flex-col">
      <header class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 class="text-lg font-semibold text-slate-900">Modal Title</h2>
        <button class="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          ×
        </button>
      </header>
      <main class="px-6 py-4">
        <p class="text-slate-700">
          This is the modal content. You can put any content here that you want to display in the
          modal.
        </p>
      </main>
      <footer class="border-t border-slate-200 px-6 py-4">
        <button
          class="rounded-md bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-500"
        >
          Close
        </button>
      </footer>
    </div>
  </dialog>
</div>
```

Content structure improvements:

- `flex flex-col`: Vertical flexbox layout for header, main, footer sections
- `border-b border-slate-200`: Subtle separator below header for visual organization
- `px-6 py-4`: Consistent 24px horizontal and 16px vertical padding across sections
- `flex items-center justify-between`: Spreads title and close button across header width
- `text-lg font-semibold`: Prominent heading that establishes content hierarchy
- `text-slate-700`: Slightly muted body text color for comfortable reading
- Close button with hover states for clear interactive feedback

The consistent padding and borders create clear content zones while maintaining visual cohesion.

## Enhancing the Close Button

Let's improve the close button in the header to make it more accessible and visually appealing, building on our understanding of focus states.

```html
<div>
  <button
    class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
  >
    Open Modal
  </button>

  <dialog
    class="m-auto h-fit w-full max-w-md rounded-lg bg-white p-0 shadow-lg backdrop:bg-black/50 backdrop:backdrop-blur-sm"
  >
    <div class="flex flex-col">
      <header class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 class="text-lg font-semibold text-slate-900">Modal Title</h2>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          <span class="text-xl leading-none">×</span>
        </button>
      </header>
      <main class="px-6 py-4">
        <p class="text-slate-700">
          This is the modal content. You can put any content here that you want to display in the
          modal.
        </p>
      </main>
      <footer class="border-t border-slate-200 px-6 py-4">
        <button
          class="rounded-md bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
        >
          Close
        </button>
      </footer>
    </div>
  </dialog>
</div>
```

Close button enhancements:

- `flex h-8 w-8 items-center justify-center`: 32px square button with centered content
- `text-xl leading-none`: Larger × symbol with tight line height for better visual balance
- `transition-colors`: Smooth color changes on hover and focus
- `focus-visible:outline-slate-500`: Accessible focus ring that matches the button's muted aesthetic
- Consistent hover and focus patterns with the footer close button

The square format with generous padding creates a comfortable touch target while the muted colors keep it unobtrusive.

## Adding Button Variations and Layout

Let's enhance the footer with multiple button options and proper spacing.

```html
<div>
  <button
    class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
  >
    Open Modal
  </button>

  <dialog
    class="m-auto h-fit w-full max-w-md rounded-lg bg-white p-0 shadow-lg backdrop:bg-black/50 backdrop:backdrop-blur-sm"
  >
    <div class="flex flex-col">
      <header class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 class="text-lg font-semibold text-slate-900">Confirm Action</h2>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          <span class="text-xl leading-none">×</span>
        </button>
      </header>
      <main class="px-6 py-4">
        <p class="text-slate-700">
          Are you sure you want to delete this item? This action cannot be undone and will
          permanently remove the data from our servers.
        </p>
      </main>
      <footer class="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
        <button
          class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          Cancel
        </button>
        <button
          class="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          Delete
        </button>
      </footer>
    </div>
  </dialog>
</div>
```

Footer enhancements:

- `flex justify-end gap-3`: Right-aligned buttons with 12px spacing between them
- Secondary cancel button with `border border-slate-300 bg-white`: Subtle border and white background for lower visual weight
- Primary delete button with `bg-red-600`: Red color indicates destructive action
- Consistent `transition-colors` and focus states across all interactive elements
- More realistic content that demonstrates a confirmation dialog use case

The button hierarchy clearly communicates the primary and secondary actions while maintaining the established visual patterns.

## Adding Smooth Entrance Animations

Now let's add sophisticated animations using Tailwind's `starting:` variant to define initial animation states and create smooth entrance effects.

```html
<div>
  <button
    class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
  >
    Open Modal
  </button>

  <dialog
    class="animate-in fade-in zoom-in backdrop:animate-in backdrop:fade-in m-auto h-fit w-full max-w-md rounded-lg bg-white p-0 shadow-xl duration-200 backdrop:bg-black/50 backdrop:backdrop-blur-sm backdrop:duration-300 starting:scale-95 starting:opacity-0 backdrop:starting:opacity-0"
  >
    <div class="flex flex-col overflow-hidden">
      <header class="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
        <h2 class="text-lg font-semibold text-slate-900">Confirm Action</h2>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          <span class="text-xl leading-none" aria-hidden="true">×</span>
          <span class="sr-only">Close modal</span>
        </button>
      </header>
      <main class="px-4 py-4 sm:px-6">
        <p class="leading-relaxed text-slate-700">
          Are you sure you want to delete this item? This action cannot be undone and will
          permanently remove the data from our servers.
        </p>
      </main>
      <footer
        class="flex flex-col-reverse gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6"
      >
        <button
          class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          Cancel
        </button>
        <button
          class="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          Delete
        </button>
      </footer>
    </div>
  </dialog>
</div>
```

Animation enhancements:

- `starting:opacity-0 starting:scale-95`: Defines the initial state—invisible and slightly smaller (95% scale)
- `animate-in fade-in zoom-in duration-200`: Animates to full opacity and scale over 200ms
- `backdrop:starting:opacity-0`: Sets the backdrop's initial state to transparent
- `backdrop:animate-in backdrop:fade-in backdrop:duration-300`: Backdrop fades in over 300ms for a layered animation effect
- `shadow-xl`: Enhanced shadow for more dramatic depth
- `overflow-hidden`: Ensures content respects the modal's rounded corners

The `starting:` variant is crucial here—it sets the initial state before the animation begins, creating smooth entrance effects. The modal starts invisible and slightly scaled down, then animates to its final state when opened.

## Adding Responsive Behavior and Final Polish

Finally, let's add responsive behavior and additional polish to make the modal feel professional across all devices.

```html
<div>
  <button
    class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
  >
    Open Modal
  </button>

  <dialog
    class="animate-in fade-in zoom-in backdrop:animate-in backdrop:fade-in m-auto h-fit w-full max-w-md rounded-lg bg-white p-0 shadow-xl duration-200 backdrop:bg-black/50 backdrop:backdrop-blur-sm backdrop:duration-300 starting:scale-95 starting:opacity-0 backdrop:starting:opacity-0"
  >
    <div class="flex flex-col overflow-hidden">
      <header class="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
        <h2 class="text-lg font-semibold text-slate-900">Confirm Action</h2>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          <span class="text-xl leading-none" aria-hidden="true">×</span>
          <span class="sr-only">Close modal</span>
        </button>
      </header>
      <main class="px-4 py-4 sm:px-6">
        <p class="leading-relaxed text-slate-700">
          Are you sure you want to delete this item? This action cannot be undone and will
          permanently remove the data from our servers.
        </p>
      </main>
      <footer
        class="flex flex-col-reverse gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6"
      >
        <button
          class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          Cancel
        </button>
        <button
          class="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          Delete
        </button>
      </footer>
    </div>
  </dialog>
</div>
```

Responsive and accessibility features:

- `px-4 sm:px-6`: Responsive padding that's tighter on mobile (16px) and more generous on larger screens (24px)
- `flex-col-reverse sm:flex-row sm:justify-end`: Stacked buttons on mobile with primary action on top, horizontal layout on larger screens
- `sr-only`: Screen reader text for the close button icon
- `aria-hidden="true"`: Hides the × symbol from screen readers since we provide descriptive text
- `leading-relaxed`: More comfortable line height for the longer descriptive text

The responsive footer layout ensures the primary action (Delete) is always easily accessible—on top for thumb-friendly mobile interaction, on the right for desktop mouse patterns.

## Why This Approach Works

This modal implementation combines modern CSS features with semantic HTML for optimal user experience:

**Perfect Centering**: The `m-auto` utility ensures consistent centering across all browsers, overriding any browser-specific quirks with the `<dialog>` element's default positioning.

**Smooth Animations**: The `starting:` variant defines initial animation states clearly, creating professional entrance effects that feel polished and intentional.

**Semantic Foundation**: The `<dialog>` element provides built-in keyboard handling (Escape to close), focus management, and screen reader support without additional JavaScript.

**Layered Animation Timing**: The modal content animates faster (200ms) than the backdrop (300ms), creating a sophisticated layered effect where the background dims first, then the content appears.

**Responsive Design**: The modal adapts from mobile-first stacked buttons to desktop-optimized horizontal layouts without losing usability.

## Common Use Cases

This modal pattern works excellently for:

- Confirmation dialogs for destructive actions
- Forms that need focused attention (login, contact forms)
- Image or content previews
- Settings panels that need isolation from main content
- Alert messages requiring user acknowledgment
