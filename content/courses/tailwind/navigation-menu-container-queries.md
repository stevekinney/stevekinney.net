---
title: Building an Adaptive Navigation Menu
description: >-
  Let's build a navigation menu that transforms from horizontal links to compact
  layout to hamburger menu based on container width using Tailwind's container
  queries.
modified: '2025-07-29T15:11:25-06:00'
date: '2025-06-11T19:05:33-06:00'
---

Let's start with our basic HTML structure for a simple navigation menu.

```html tailwind
<div>
  <nav>
    <div>
      <a href="#">Brand</a>
    </div>
    <div>
      <a href="#">Home</a>
      <a href="#">About</a>
      <a href="#">Services</a>
      <a href="#">Portfolio</a>
      <a href="#">Contact</a>
    </div>
  </nav>
</div>
```

We have a basic navigation with a brand logo and five navigation links, but they're stacked vertically and completely unstyled. Let's transform this into an intelligent navigation that adapts not to the screen size, but to the size of its container—making it truly reusable in headers, sidebars, or any layout context.

## Understanding Container vs Media Queries

Before we start building, it's crucial to understand why container queries are revolutionary for navigation design. Traditional responsive navigation uses media queries that respond to viewport size:

**Media queries think globally**: "When the browser window is 768px wide, switch to mobile menu"
**Container queries think locally**: "When this navigation's container is 384px wide, switch to mobile menu"

This means our navigation will work perfectly whether it's:

- Full-width in a page header
- Constrained in a dashboard sidebar
- Embedded in a narrow widget
- Part of a multi-column layout

Let's build this step by step using container queries to create truly modular navigation.

## Setting Up Container Query Context

First, let's establish our container as a query context and add basic navigation styling, building on techniques from our [statistics card tutorial](building-a-statistics-card.md).

```html tailwind
<div class="@container border-b border-slate-200 bg-white">
  <nav class="flex items-center justify-between px-4 py-3">
    <div>
      <a href="#" class="text-xl font-bold text-slate-900">Brand</a>
    </div>
    <div class="flex gap-6">
      <a href="#" class="text-sm font-medium text-slate-700 hover:text-slate-900">Home</a>
      <a href="#" class="text-sm font-medium text-slate-700 hover:text-slate-900">About</a>
      <a href="#" class="text-sm font-medium text-slate-700 hover:text-slate-900">Services</a>
      <a href="#" class="text-sm font-medium text-slate-700 hover:text-slate-900">Portfolio</a>
      <a href="#" class="text-sm font-medium text-slate-700 hover:text-slate-900">Contact</a>
    </div>
  </nav>
</div>
```

Foundation setup:

- `@container`: Establishes this element as a container query context—child elements can now respond to this container's width
- `flex items-center justify-between`: Creates a horizontal layout with brand on left, links on right
- `px-4 py-3`: 16px horizontal and 12px vertical padding for comfortable spacing
- `text-xl font-bold`: Prominent brand typography (20px, 700 weight)
- `gap-6`: 24px spacing between navigation links for readability
- `hover:text-slate-900`: Darker text on hover for interactive feedback

This creates a clean horizontal navigation that works well in wide containers, but will overflow in narrow spaces.

## Adding Container-Responsive Link Spacing

Now let's make the navigation adapt its spacing based on container width. In medium-width containers, we'll use tighter spacing to fit more content.

```html tailwind
<div class="@container border-b border-slate-200 bg-white">
  <nav class="flex items-center justify-between px-4 py-3">
    <div>
      <a href="#" class="text-xl font-bold text-slate-900">Brand</a>
    </div>
    <div class="flex gap-3 @lg:gap-6">
      <a href="#" class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        Home
      </a>
      <a href="#" class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        About
      </a>
      <a href="#" class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        Services
      </a>
      <a href="#" class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        Portfolio
      </a>
      <a href="#" class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        Contact
      </a>
    </div>
  </nav>
</div>
```

Container-responsive spacing:

- `gap-3 @lg:gap-6`: 12px gap by default, expanding to 24px when the container is at least 512px wide
- `transition-colors`: Smooth color transitions for polished hover effects

The `@lg:` prefix means "when this container (not the viewport) is large." This ensures optimal spacing regardless of where the navigation is placed in your layout.

## Creating Compact Navigation Layout

For medium-width containers, let's create a more compact layout where some links might be abbreviated or repositioned.

```html tailwind
<div class="@container border-b border-slate-200 bg-white">
  <nav class="flex items-center justify-between px-4 py-3">
    <div>
      <a href="#" class="text-lg font-bold text-slate-900 @lg:text-xl">Brand</a>
    </div>
    <div class="hidden gap-2 @sm:flex @md:gap-3 @lg:gap-6">
      <a href="#" class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        Home
      </a>
      <a href="#" class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        About
      </a>
      <a href="#" class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        Services
      </a>
      <a
        href="#"
        class="hidden text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 @md:block"
      >
        Portfolio
      </a>
      <a href="#" class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        Contact
      </a>
    </div>
  </nav>
</div>
```

Compact layout refinements:

- `text-lg @lg:text-xl`: Brand text scales from 18px to 20px based on container space
- `hidden @sm:flex`: Navigation links are hidden by default, appear when container is at least 384px wide
- `gap-2 @md:gap-3 @lg:gap-6`: Progressive spacing that adapts to container width (8px → 12px → 24px)
- `hidden @md:block` on Portfolio: This link disappears in the most constrained horizontal layout

This creates a smart progressive disclosure where less critical navigation items disappear as space becomes limited.

## Adding Hamburger Menu for Narrow Containers

Now let's add a hamburger menu that appears when the container is too narrow for horizontal navigation.

```html tailwind
<div class="@container border-b border-slate-200 bg-white">
  <nav class="flex items-center justify-between px-4 py-3">
    <div>
      <a href="#" class="text-lg font-bold text-slate-900 @lg:text-xl">Brand</a>
    </div>

    <!-- Horizontal Navigation (medium+ containers) -->
    <div class="hidden gap-2 @sm:flex @md:gap-3 @lg:gap-6">
      <a href="#" class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        Home
      </a>
      <a href="#" class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        About
      </a>
      <a href="#" class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        Services
      </a>
      <a
        href="#"
        class="hidden text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 @md:block"
      >
        Portfolio
      </a>
      <a href="#" class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
        Contact
      </a>
    </div>

    <!-- Mobile Menu Button (narrow containers) -->
    <div class="@sm:hidden">
      <button
        class="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-slate-100"
        id="mobile-menu-1"
      >
        <svg class="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
  </nav>
</div>
```

Hamburger menu addition:

- `@sm:hidden`: Mobile menu button appears only when container is less than 384px wide
- `w-8 h-8`: 32px square button provides adequate touch target
- `rounded-md hover:bg-slate-100`: Subtle hover feedback with light background
- SVG hamburger icon with `w-5 h-5`: 20px icon size for good visual balance
- `text-slate-600`: Muted icon color that darkens to `currentColor` on hover

Now we have intelligent navigation that shows the hamburger menu only when the container is truly constrained—not based on screen size, but on actual available space.

## Adding Dropdown Menu Implementation

Let's complete the hamburger functionality with a dropdown menu that appears when the button is activated.

```html tailwind
<div class="@container border-b border-slate-200 bg-white">
  <nav>
    <div class="flex items-center justify-between px-4 py-3">
      <div>
        <a href="#" class="text-lg font-bold text-slate-900 @lg:text-xl">Brand</a>
      </div>

      <!-- Horizontal Navigation (medium+ containers) -->
      <div class="hidden gap-2 @sm:flex @md:gap-3 @lg:gap-6">
        <a
          href="#"
          class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
        >
          Home
        </a>
        <a
          href="#"
          class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
        >
          About
        </a>
        <a
          href="#"
          class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
        >
          Services
        </a>
        <a
          href="#"
          class="hidden text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 @md:block"
        >
          Portfolio
        </a>
        <a
          href="#"
          class="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
        >
          Contact
        </a>
      </div>

      <!-- Mobile Menu Button (narrow containers) -->
      <div class="@sm:hidden">
        <input type="checkbox" id="mobile-menu-2" class="peer sr-only" />
        <label
          for="mobile-menu-2"
          class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-slate-100"
        >
          <svg
            class="h-5 w-5 text-slate-600 peer-checked:hidden"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <svg
            class="hidden h-5 w-5 text-slate-600 peer-checked:block"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </label>
      </div>
    </div>

    <!-- Mobile Dropdown Menu -->
    <div class="hidden border-t border-slate-200 bg-slate-50 peer-checked:block @sm:hidden">
      <div class="space-y-1 px-4 py-2">
        <a
          href="#"
          class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          Home
        </a>
        <a
          href="#"
          class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          About
        </a>
        <a
          href="#"
          class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          Services
        </a>
        <a
          href="#"
          class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          Portfolio
        </a>
        <a
          href="#"
          class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          Contact
        </a>
      </div>
    </div>
  </nav>
</div>
```

Dropdown menu implementation:

- `peer sr-only`: Hidden checkbox that manages the menu state using the peer system
- `peer-checked:hidden` and `hidden peer-checked:block`: Icon switching between hamburger and X
- `hidden peer-checked:block @sm:hidden`: Dropdown appears when checkbox is checked AND container is narrow
- `border-t border-slate-200 bg-slate-50`: Visual separation with subtle background
- `block px-3 py-2`: Stacked vertical links with comfortable touch targets
- `space-y-1`: 4px spacing between menu items

The beauty is that all menu items appear in the dropdown—even "Portfolio" which was hidden in the compact horizontal layout!

## Adding Focus States and Accessibility

Let's enhance accessibility with proper focus states and ARIA attributes.

```html tailwind
<div class="@container border-b border-slate-200 bg-white">
  <nav role="navigation" aria-label="Main navigation">
    <div class="flex items-center justify-between px-4 py-3">
      <div>
        <a
          href="#"
          class="rounded-sm text-lg font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 @lg:text-xl"
        >
          Brand
        </a>
      </div>

      <!-- Horizontal Navigation (medium+ containers) -->
      <div class="hidden gap-2 @sm:flex @md:gap-3 @lg:gap-6">
        <a
          href="#"
          class="rounded-sm text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Home
        </a>
        <a
          href="#"
          class="rounded-sm text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          About
        </a>
        <a
          href="#"
          class="rounded-sm text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Services
        </a>
        <a
          href="#"
          class="hidden rounded-sm text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 @md:block"
        >
          Portfolio
        </a>
        <a
          href="#"
          class="rounded-sm text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Contact
        </a>
      </div>

      <!-- Mobile Menu Button (narrow containers) -->
      <div class="@sm:hidden">
        <input type="checkbox" id="mobile-menu-3" class="peer sr-only" />
        <label
          for="mobile-menu-3"
          class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors focus-within:bg-slate-100 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 hover:bg-slate-100"
          aria-label="Toggle navigation menu"
        >
          <svg
            class="h-5 w-5 text-slate-600 peer-checked:hidden"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <svg
            class="hidden h-5 w-5 text-slate-600 peer-checked:block"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </label>
      </div>
    </div>

    <!-- Mobile Dropdown Menu -->
    <div class="hidden border-t border-slate-200 bg-slate-50 peer-checked:block @sm:hidden">
      <div class="space-y-1 px-4 py-2">
        <a
          href="#"
          class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Home
        </a>
        <a
          href="#"
          class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          About
        </a>
        <a
          href="#"
          class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Services
        </a>
        <a
          href="#"
          class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Portfolio
        </a>
        <a
          href="#"
          class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Contact
        </a>
      </div>
    </div>
  </nav>
</div>
```

Accessibility enhancements:

- `role="navigation" aria-label="Main navigation"`: Clearly identifies the navigation landmark for screen readers
- `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`: Blue focus rings for keyboard navigation
- `aria-label="Toggle navigation menu"`: Descriptive label for the mobile menu button
- `aria-hidden="true"` on SVG icons: Prevents screen readers from announcing decorative icons
- `focus-within:` states: Visual feedback when the mobile menu button receives focus

The `focus-visible` pseudo-class ensures focus rings only appear for keyboard navigation, providing excellent UX for both mouse and keyboard users.

## Adding Polish and Active States

Finally, let's add some polish with active navigation states and smooth transitions throughout.

```html tailwind
<div class="@container border-b border-slate-200 bg-white shadow-sm">
  <nav role="navigation" aria-label="Main navigation">
    <div class="flex items-center justify-between px-4 py-3 @lg:px-6">
      <div>
        <a
          href="#"
          class="rounded-sm text-lg font-bold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 @lg:text-xl"
        >
          Brand
        </a>
      </div>

      <!-- Horizontal Navigation (medium+ containers) -->
      <div class="hidden gap-2 @sm:flex @md:gap-3 @lg:gap-6">
        <a
          href="#"
          class="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Home
        </a>
        <a
          href="#"
          class="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          About
        </a>
        <a
          href="#"
          class="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Services
        </a>
        <a
          href="#"
          class="hidden rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 @md:block"
        >
          Portfolio
        </a>
        <a
          href="#"
          class="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Contact
        </a>
      </div>

      <!-- Mobile Menu Button (narrow containers) -->
      <div class="@sm:hidden">
        <input type="checkbox" id="mobile-menu-3" class="peer sr-only" />
        <label
          for="mobile-menu-3"
          class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors focus-within:bg-slate-100 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 hover:bg-slate-100"
          aria-label="Toggle navigation menu"
        >
          <svg
            class="h-5 w-5 text-slate-600 transition-all peer-checked:hidden"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <svg
            class="hidden h-5 w-5 text-slate-600 transition-all peer-checked:block"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </label>
      </div>
    </div>

    <!-- Mobile Dropdown Menu -->
    <div
      class="hidden border-t border-slate-200 bg-slate-50/80 backdrop-blur-sm peer-checked:block @sm:hidden"
    >
      <div class="space-y-1 px-4 py-3">
        <a
          href="#"
          class="block rounded-md bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Home
        </a>
        <a
          href="#"
          class="block rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          About
        </a>
        <a
          href="#"
          class="block rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Services
        </a>
        <a
          href="#"
          class="block rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Portfolio
        </a>
        <a
          href="#"
          class="block rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Contact
        </a>
      </div>
    </div>
  </nav>
</div>
```

Polish enhancements:

- `shadow-sm`: Subtle shadow adds depth to the navigation bar
- `@lg:px-6`: Increased horizontal padding in larger containers for better proportions
- `bg-blue-50 text-blue-700`: Active state styling for current page (Home)
- `px-3 py-1.5 rounded-md`: Button-like styling for all navigation links
- `hover:bg-slate-50`: Consistent hover background across horizontal links
- `bg-slate-50/80 backdrop-blur-sm`: Slightly transparent dropdown with backdrop blur for modern feel
- `py-2.5`: Slightly taller touch targets in mobile menu (10px vs 8px)
- `transition-all` on icons: Smooth transitions for icon changes

## Why Container Queries are Revolutionary

This navigation demonstrates the fundamental shift from viewport-responsive to container-responsive design:

**Traditional Media Query Approach:**

```css
/* Always responds to screen size */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  .hamburger {
    display: block;
  }
}
```

**Our Container Query Approach:**

```css
/* Responds to container size */
@container (max-width: 384px) {
  .nav-links {
    display: none;
  }
  .hamburger {
    display: block;
  }
}
```

**Real-world benefits:**

**Sidebar Integration**: Place this navigation in a 300px dashboard sidebar—it automatically becomes a hamburger menu even on desktop, because the container is narrow.

**Widget Contexts**: Embed it in a narrow widget or card—the navigation adapts to the space available, not the screen size.

**Flexible Layouts**: Use it in CSS Grid areas or Flexbox containers of any size—the navigation intelligence is self-contained.

**Component Reusability**: The same navigation component works perfectly in headers, sidebars, modals, or any layout context without modification.

**No JavaScript Required**: All the responsive behavior is pure CSS, making it lightweight and reliable.

Container queries make components truly modular—they bring their own responsive intelligence instead of relying on global breakpoints that may not match their actual context.

## Challenges

Try building these variations:

1. **Breadcrumb Navigation**: Create a breadcrumb component that progressively collapses items (showing "Home > ... > Current") when the container gets narrow, using similar container query techniques.

2. **Tabbed Navigation**: Build a tab interface that switches from horizontal tabs to a dropdown selector when the container width can't accommodate all tabs, demonstrating container queries with different UI patterns.
