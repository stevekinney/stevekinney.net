---
title: Building a Popover Menu
description: Let's build a modern popover menu using the native HTML Popover API and Tailwind CSS for styling.
---

Let's start with our basic HTML structure using the native Popover API.

```html
<div>
  <button popovertarget="button-menu" class="bg-sky-50">Menu</button>
  <div id="button-menu" popover>
    <button>Settings</button>
    <button>Profile</button>
    <button>Logout</button>
  </div>
</div>
```

This uses the native HTML Popover API where `popovertarget` connects the trigger button to the popover element by ID. The browser handles all the show/hide logic automatically—we just need to style it beautifully with Tailwind.

## Styling the Trigger Button

First, let's apply professional button styling to make our trigger look clickable and polished.

```html
<div>
  <button
    popovertarget="button-menu"
    class="rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
  >
    Menu
  </button>
  <div id="button-menu" popover>
    <button>Settings</button>
    <button>Profile</button>
    <button>Logout</button>
  </div>
</div>
```

Trigger button styling:

- `rounded-md`: 6px border radius for modern appearance
- `bg-slate-600`: Professional gray background color
- `px-3 py-2`: 12px horizontal and 8px vertical padding for comfortable touch targets
- `text-sm font-semibold`: 14px semibold text for clear readability
- `shadow-xs`: Subtle 1px shadow adds depth
- `hover:bg-slate-500`: Lighter shade on hover for interactive feedback
- `focus-visible:outline-*`: Proper keyboard navigation styling

This creates a professional trigger button that clearly indicates it's interactive.

## Positioning Popovers with CSS Anchor Positioning

**The Problem**: The HTML `popover` attribute moves elements to the top layer, breaking normal CSS positioning (like `absolute top-full left-0`). The popover appears wherever the browser decides to place it, not necessarily near your button.

**The Solution**: Use CSS Anchor Positioning to explicitly anchor the popover to the button. First, let's set up Tailwind 4 custom utilities in your CSS:

```css
@utility anchor-* {
  anchor-name: --{*};
}

@utility position-anchor-* {
  position-anchor: --{*};
}

@utility top-anchor-* {
  top: anchor({*});
}

@utility left-anchor-* {
  left: anchor({*});
}

/* Combined utilities for common patterns */
@utility anchor-below-* {
  position-anchor: --{*};
  top: anchor(bottom);
  left: anchor(left);
}
```

Now let's apply anchor positioning to our popover:

```html
<div>
  <button
    popovertarget="button-menu"
    class="anchor-menu-button rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
  >
    Menu
  </button>
  <div
    id="button-menu"
    popover
    class="anchor-below-menu-button m-0 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
  >
    <button>Settings</button>
    <button>Profile</button>
    <button>Logout</button>
  </div>
</div>
```

Anchor positioning setup:

- `anchor-menu-button` on trigger: Creates an anchor named `--menu-button`
- `anchor-below-menu-button` on popover: Positions the popover below and aligned to the left edge of the anchor

This ensures the popover appears exactly where you want it—directly below the trigger button—regardless of the browser's default positioning logic.

## Creating the Popover Container

Now let's style the popover itself to look like a modern dropdown menu with proper visual hierarchy.

```html
<div>
  <button
    popovertarget="button-menu"
    class="anchor-menu-button rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
  >
    Menu
  </button>
  <div
    id="button-menu"
    popover
    class="anchor-below-menu-button m-0 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
  >
    <button>Settings</button>
    <button>Profile</button>
    <button>Logout</button>
  </div>
</div>
```

Popover container styling:

- `m-0`: Removes default browser margins that popovers often have
- `rounded-lg`: 8px border radius, slightly more pronounced than the trigger button
- `border border-slate-200`: Subtle light gray border for definition
- `bg-white`: Clean white background
- `p-1`: 4px padding creates a border around menu items
- `shadow-lg`: More prominent shadow than the button, creating a floating effect

The larger border radius and shadow help establish that this is a floating panel, distinct from the trigger button.

## Styling the Menu Items

Let's transform the menu buttons into proper menu items with consistent spacing and hover states.

```html
<div>
  <button
    popovertarget="button-menu"
    class="anchor-menu-button rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
  >
    Menu
  </button>
  <div
    id="button-menu"
    popover
    class="anchor-below-menu-button m-0 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
  >
    <button class="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700">
      Settings
    </button>
    <button class="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700">
      Profile
    </button>
    <button class="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700">
      Logout
    </button>
  </div>
</div>
```

Menu item styling:

- `block w-full`: Makes each button take the full width and stack vertically
- `rounded-md`: 6px border radius matches the trigger button
- `px-3 py-2`: Same padding as the trigger for visual consistency
- `text-left`: Left-aligns text, which is standard for menu items
- `text-sm`: 14px font size for comfortable reading
- `text-slate-700`: Dark gray text for good contrast against white background

Now our menu items look cohesive and properly sized, but they need interactive feedback.

## Adding Interactive States

Let's add hover and focus states to make the menu items feel responsive and accessible.

```html
<div>
  <button
    popovertarget="button-menu"
    class="anchor-menu-button rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
  >
    Menu
  </button>
  <div
    id="button-menu"
    popover
    class="anchor-below-menu-button m-0 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
  >
    <button
      class="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      Settings
    </button>
    <button
      class="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      Profile
    </button>
    <button
      class="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      Logout
    </button>
  </div>
</div>
```

Interactive state improvements:

- `hover:bg-slate-50`: Light gray background on hover provides clear feedback
- `focus-visible:bg-slate-50`: Same background for keyboard focus, ensuring accessibility
- `focus-visible:outline-none`: Removes the default browser outline since we're using background color for focus indication

The subtle hover states make it clear which item will be activated without being distracting.

## Adding Smooth Transitions

Let's add transitions to make the state changes feel polished and professional.

```html
<div>
  <button
    popovertarget="button-menu"
    class="anchor-menu-button rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
  >
    Menu
  </button>
  <div
    id="button-menu"
    popover
    class="anchor-below-menu-button m-0 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
  >
    <button
      class="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      Settings
    </button>
    <button
      class="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      Profile
    </button>
    <button
      class="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      Logout
    </button>
  </div>
</div>
```

Animation improvements:

- `transition-colors` on trigger button: Smoothly animates the background color change on hover
- `transition-colors` on menu items: Creates smooth hover and focus transitions

The 200ms default transition duration feels responsive without being sluggish, creating a more polished interaction experience.

## Improving Width and Typography

Let's refine the typography and ensure the popover has a proper minimum width for better readability.

```html
<div>
  <button
    popovertarget="button-menu"
    class="anchor-menu-button rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
  >
    Menu
  </button>
  <div
    id="button-menu"
    popover
    class="anchor-below-menu-button m-0 min-w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
  >
    <button
      class="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      Settings
    </button>
    <button
      class="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      Profile
    </button>
    <button
      class="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      Logout
    </button>
  </div>
</div>
```

Typography and sizing improvements:

- `min-w-48`: Sets minimum width of 192px so the popover doesn't look cramped
- `font-medium`: Medium font weight (500) for menu items provides better hierarchy than regular weight

The minimum width ensures the popover feels substantial and gives text room to breathe, while the font weight makes the menu items easier to scan.

## Adding Visual Grouping with Separators

Finally, let's add a separator before the logout button to group related actions and use color to indicate destructive actions.

```html
<div>
  <button
    popovertarget="button-menu"
    class="anchor-menu-button rounded-md bg-slate-600 px-3 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
  >
    Menu
  </button>
  <div
    id="button-menu"
    popover
    class="anchor-below-menu-button m-0 min-w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
  >
    <button
      class="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      Settings
    </button>
    <button
      class="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
    >
      Profile
    </button>
    <div class="my-1 border-t border-slate-200"></div>
    <button
      class="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none"
    >
      Logout
    </button>
  </div>
</div>
```

Final enhancements:

- `<div class="my-1 border-t border-slate-200"></div>`: Creates a separator line with 4px vertical margin
- `text-red-600` on logout button: Red text indicates a destructive action
- `hover:bg-red-50 focus-visible:bg-red-50`: Light red background on hover/focus instead of gray

The separator creates clear grouping between user actions (Settings, Profile) and the logout action, while the red color coding follows common UI patterns for destructive actions.

## Alternative Positioning Options

You can customize popover positioning by using different anchor utilities. Here are some common patterns:

**Right-aligned popover:**

```html
<button class="anchor-dropdown">Menu</button>
<div popover class="position-anchor-dropdown top-anchor-bottom left-anchor-right">
  <!-- Popover content -->
</div>
```

**Centered popover:**

```html
<button class="anchor-profile">Profile</button>
<div popover class="position-anchor-profile top-anchor-bottom left-anchor-center">
  <!-- Popover content -->
</div>
```

**Above the button:**

```html
<button class="anchor-tooltip">Help</button>
<div popover class="position-anchor-tooltip top-anchor-top left-anchor-left">
  <!-- Popover content -->
</div>
```

The anchor positioning system is completely flexible—you can create any spatial relationship between trigger and popover.

## Why This Approach is Powerful

**Semantic Class Names**: Classes like `anchor-menu-button` and `anchor-below-menu-button` are self-documenting and reusable.

**Dynamic Utilities**: The Tailwind 4 utilities work with any anchor name—`anchor-dropdown`, `anchor-profile`, `anchor-tooltip`—making them infinitely flexible.

**Native Browser Benefits**: Works with the native popover API while maintaining all accessibility features and browser optimizations.

**Precise Control**: Unlike JavaScript positioning libraries, CSS Anchor Positioning is handled by the browser's layout engine, making it more performant and reliable.

**Future-Proof**: As CSS Anchor Positioning gains broader support, this approach will become the standard way to position floating elements.

## Challenges

Try building these variations:

1. **User Profile Popover**: Create a popover with user avatar, name, email, and action buttons using a more complex layout with proper spacing and typography hierarchy

2. **Multi-Section Menu**: Extend the menu to include multiple grouped sections with separators, organizing related actions together using the separator pattern we learned
