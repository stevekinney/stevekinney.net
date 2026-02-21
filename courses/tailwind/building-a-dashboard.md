---
title: Building a Dashboard with CSS Grid Template Areas
description: >-
  Let's build a responsive dashboard layout using CSS Grid Template Areas for
  semantic, maintainable grid layouts with named regions.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-06-11T19:05:33-06:00'
---

Let's start with our basic HTML structure for a simple analytics dashboard.

```html tailwind
<div class="space-y-4 rounded-lg bg-gray-100 p-4">
  <div class="rounded bg-blue-200 p-4">
    <h1 class="text-lg font-bold">Analytics Dashboard</h1>
    <div class="mt-2 flex gap-4">
      <span class="rounded bg-white px-2 py-1 text-sm">Welcome back, Sarah</span>
      <button class="rounded bg-blue-600 px-3 py-1 text-sm text-white">Settings</button>
    </div>
  </div>
  <div class="rounded bg-green-200 p-4">
    <nav class="space-y-2">
      <a href="#" class="block rounded bg-white px-3 py-2 text-blue-600">Overview</a>
      <a href="#" class="block rounded bg-white px-3 py-2 text-blue-600">Analytics</a>
      <a href="#" class="block rounded bg-white px-3 py-2 text-blue-600">Reports</a>
      <a href="#" class="block rounded bg-white px-3 py-2 text-blue-600">Settings</a>
    </nav>
  </div>
  <div class="rounded bg-yellow-200 p-4">
    <h2 class="mb-3 font-semibold">Recent Activity</h2>
    <div class="space-y-2">
      <div class="rounded bg-white p-3">1,234 Total Users</div>
      <div class="rounded bg-white p-3">$45,678 Revenue</div>
      <div class="rounded bg-white p-3">12.5% Growth</div>
    </div>
  </div>
  <div class="rounded bg-purple-200 p-4">
    <h3 class="mb-3 font-semibold">Quick Stats</h3>
    <div class="space-y-2">
      <div class="rounded bg-white p-2 text-sm">Sessions: 8,432</div>
      <div class="rounded bg-white p-2 text-sm">Bounce Rate: 24%</div>
      <div class="rounded bg-white p-2 text-sm">Avg. Duration: 3:42</div>
    </div>
  </div>
</div>
```

We have a dashboard with header, sidebar navigation, main content, and a stats panel, but they're all stacked vertically. Let's transform this into a sophisticated layout using CSS Grid Template Areas—a more semantic approach than traditional grid column/row positioning.

## Understanding Grid Template Areas

Unlike the numeric grid positioning we've used in previous tutorials like our [invoice table](building-an-invoice-table.md), Grid Template Areas let us define named regions in our layout. Think of it as drawing a visual map of your layout using meaningful names instead of numbers.

Let's set up our basic grid structure with named areas:

```html tailwind
<div
  class="grid h-screen grid-cols-[250px_1fr_200px] grid-rows-[auto_1fr] gap-4 p-4"
  style="grid-template-areas: 'header header header' 'sidebar main stats'"
>
  <div class="rounded-lg bg-white p-4 shadow-sm" style="grid-area: header">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
      <div class="flex items-center gap-4">
        <span class="text-slate-600">Welcome back, Sarah</span>
        <button class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
          Settings
        </button>
      </div>
    </div>
  </div>
  <div class="rounded-lg bg-white p-4 shadow-sm" style="grid-area: sidebar">
    <nav class="space-y-2">
      <a href="#" class="block rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"
        >Overview</a
      >
      <a
        href="#"
        class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >Analytics</a
      >
      <a
        href="#"
        class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >Reports</a
      >
      <a
        href="#"
        class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >Settings</a
      >
    </nav>
  </div>
  <div class="rounded-lg bg-white p-6 shadow-sm" style="grid-area: main">
    <h2 class="mb-4 text-xl font-semibold text-slate-900">Recent Activity</h2>
    <div class="grid grid-cols-3 gap-4">
      <div class="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
        <div class="text-2xl font-bold">1,234</div>
        <div class="text-sm opacity-90">Total Users</div>
      </div>
      <div class="rounded-lg bg-gradient-to-r from-green-500 to-green-600 p-4 text-white">
        <div class="text-2xl font-bold">$45,678</div>
        <div class="text-sm opacity-90">Revenue</div>
      </div>
      <div class="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white">
        <div class="text-2xl font-bold">12.5%</div>
        <div class="text-sm opacity-90">Growth</div>
      </div>
    </div>
  </div>
  <div class="rounded-lg bg-white p-4 shadow-sm" style="grid-area: stats">
    <h3 class="mb-3 text-lg font-semibold text-slate-900">Quick Stats</h3>
    <div class="space-y-3">
      <div class="text-sm">
        <div class="font-medium text-slate-900">Sessions</div>
        <div class="text-slate-600">8,432</div>
      </div>
      <div class="text-sm">
        <div class="font-medium text-slate-900">Bounce Rate</div>
        <div class="text-slate-600">24%</div>
      </div>
      <div class="text-sm">
        <div class="font-medium text-slate-900">Avg. Duration</div>
        <div class="text-slate-600">3:42</div>
      </div>
    </div>
  </div>
</div>
```

Grid Template Areas setup:

- `grid-template-areas: 'header header header' 'sidebar main stats'`: Defines a visual map with header spanning the top row and three columns in the bottom row
- `grid-area: header`: Places each component in its named area
- `grid-cols-[250px_1fr_200px]`: Sets specific column sizes (fixed sidebar, flexible main, fixed stats)
- `grid-rows-[auto_1fr]`: Header sizes to content, main row takes remaining space

The magic is in the `grid-template-areas` string—it's literally a visual representation of your layout! Each word represents a named area, and identical words create spanning regions.

## Converting to Tailwind Utilities

Now let's replace the inline styles with Tailwind's grid template utilities, building on the patterns from our [statistics card tutorial](building-a-statistics-card.md):

```html tailwind
<div
  class="grid h-screen grid-cols-[250px_1fr_200px] grid-rows-[auto_1fr] gap-4 p-4 [grid-template-areas:'header_header_header''sidebar_main_stats']"
>
  <div class="rounded-lg bg-white p-4 shadow-sm [grid-area:header]">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
      <div class="flex items-center gap-4">
        <span class="text-slate-600">Welcome back, Sarah</span>
        <button
          class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Settings
        </button>
      </div>
    </div>
  </div>
  <div class="rounded-lg bg-white p-4 shadow-sm [grid-area:sidebar]">
    <nav class="space-y-2">
      <a href="#" class="block rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"
        >Overview</a
      >
      <a
        href="#"
        class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >Analytics</a
      >
      <a
        href="#"
        class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >Reports</a
      >
      <a
        href="#"
        class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >Settings</a
      >
    </nav>
  </div>
  <div class="rounded-lg bg-white p-6 shadow-sm [grid-area:main]">
    <h2 class="mb-4 text-xl font-semibold text-slate-900">Recent Activity</h2>
    <div class="grid grid-cols-3 gap-4">
      <div class="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
        <div class="text-2xl font-bold">1,234</div>
        <div class="text-sm opacity-90">Total Users</div>
      </div>
      <div class="rounded-lg bg-gradient-to-r from-green-500 to-green-600 p-4 text-white">
        <div class="text-2xl font-bold">$45,678</div>
        <div class="text-sm opacity-90">Revenue</div>
      </div>
      <div class="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white">
        <div class="text-2xl font-bold">12.5%</div>
        <div class="text-sm opacity-90">Growth</div>
      </div>
    </div>
  </div>
  <div class="rounded-lg bg-white p-4 shadow-sm [grid-area:stats]">
    <h3 class="mb-3 text-lg font-semibold text-slate-900">Quick Stats</h3>
    <div class="space-y-3">
      <div class="text-sm">
        <div class="font-medium text-slate-900">Sessions</div>
        <div class="text-slate-600">8,432</div>
      </div>
      <div class="text-sm">
        <div class="font-medium text-slate-900">Bounce Rate</div>
        <div class="text-slate-600">24%</div>
      </div>
      <div class="text-sm">
        <div class="font-medium text-slate-900">Avg. Duration</div>
        <div class="text-slate-600">3:42</div>
      </div>
    </div>
  </div>
</div>
```

Tailwind arbitrary value syntax:

- `[grid-template-areas:'header_header_header''sidebar_main_stats']`: Uses bracket notation for custom CSS properties
- `[grid-area:header]`: Assigns each element to its named grid area
- Added `hover:bg-blue-500` and `transition-colors` for interactive feedback

The bracket syntax `[property:value]` lets us use any CSS property with Tailwind, perfect for newer features like grid template areas.

## Adding Container Query Responsiveness

Now let's make our dashboard truly responsive using container queries, building on techniques from our [statistics card tutorial](building-a-statistics-card.md):

```html tailwind
<div class="@container">
  <div
    class="grid h-screen gap-4 p-4 @sm:grid-cols-1 @sm:grid-rows-[auto_auto_1fr_auto] @sm:[grid-template-areas:'header''sidebar''main''stats'] @xl:grid-cols-[250px_1fr_200px] @xl:grid-rows-[auto_1fr] @xl:[grid-template-areas:'header_header_header''sidebar_main_stats']"
  >
    <div class="rounded-lg bg-white p-4 shadow-sm [grid-area:header]">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
        <div class="flex items-center gap-4">
          <span class="hidden text-slate-600 @md:block">Welcome back, Sarah</span>
          <button
            class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Settings
          </button>
        </div>
      </div>
    </div>
    <div class="rounded-lg bg-white p-4 shadow-sm [grid-area:sidebar]">
      <nav class="@sm:flex @sm:gap-2 @xl:block @xl:space-y-2">
        <a href="#" class="block rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"
          >Overview</a
        >
        <a
          href="#"
          class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >Analytics</a
        >
        <a
          href="#"
          class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >Reports</a
        >
        <a
          href="#"
          class="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >Settings</a
        >
      </nav>
    </div>
    <div class="rounded-lg bg-white p-6 shadow-sm [grid-area:main]">
      <h2 class="mb-4 text-xl font-semibold text-slate-900">Recent Activity</h2>
      <div class="grid gap-4 @sm:grid-cols-1 @lg:grid-cols-3">
        <div class="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
          <div class="text-2xl font-bold">1,234</div>
          <div class="text-sm opacity-90">Total Users</div>
        </div>
        <div class="rounded-lg bg-gradient-to-r from-green-500 to-green-600 p-4 text-white">
          <div class="text-2xl font-bold">$45,678</div>
          <div class="text-sm opacity-90">Revenue</div>
        </div>
        <div class="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white">
          <div class="text-2xl font-bold">12.5%</div>
          <div class="text-sm opacity-90">Growth</div>
        </div>
      </div>
    </div>
    <div class="rounded-lg bg-white p-4 shadow-sm [grid-area:stats]">
      <h3 class="mb-3 text-lg font-semibold text-slate-900">Quick Stats</h3>
      <div class="@sm:flex @sm:gap-4 @xl:block @xl:space-y-3">
        <div class="text-sm">
          <div class="font-medium text-slate-900">Sessions</div>
          <div class="text-slate-600">8,432</div>
        </div>
        <div class="text-sm">
          <div class="font-medium text-slate-900">Bounce Rate</div>
          <div class="text-slate-600">24%</div>
        </div>
        <div class="text-sm">
          <div class="font-medium text-slate-900">Avg. Duration</div>
          <div class="text-slate-600">3:42</div>
        </div>
      </div>
    </div>
  </div>
</div>
```

Responsive layout magic:

- `@sm:` breakpoint: Stacks everything vertically with single-column grid and horizontal navigation
- `@xl:` breakpoint: Returns to the three-column layout with sidebar navigation
- Navigation adapts from horizontal flex on mobile to vertical block on desktop
- Stats panel adapts from horizontal to vertical layout
- Main content cards adapt from stacked to three-column grid

This demonstrates the real power of named grid areas—you can completely reshape your layout by just changing the `grid-template-areas` string and grid dimensions!

## Understanding the Semantic Advantage

Here's why Grid Template Areas is superior to traditional numeric grid positioning:

**Traditional Approach:**

```css
.header {
  grid-column: 1 / 4;
  grid-row: 1;
}
.sidebar {
  grid-column: 1;
  grid-row: 2;
}
.main {
  grid-column: 2;
  grid-row: 2;
}
.stats {
  grid-column: 3;
  grid-row: 2;
}
```

**Template Areas Approach:**

```css
.container {
  grid-template-areas:
    'header header header'
    'sidebar main stats';
}
.header {
  grid-area: header;
}
```

The template areas approach is:

- **Visual**: You can literally see your layout in the CSS
- **Semantic**: Named areas are self-documenting
- **Maintainable**: Changing layouts requires updating one string, not multiple numeric coordinates
- **Responsive**: Different layouts at different breakpoints are crystal clear

## Adding Dynamic Content Areas

Let's enhance our dashboard to handle dynamic content using the techniques we learned in our [card list tutorial](building-a-card-list.md):

```html tailwind
<div class="@container">
  <div
    class="grid h-screen gap-4 p-4 @sm:grid-cols-1 @sm:grid-rows-[auto_auto_1fr_auto] @sm:[grid-template-areas:'header''sidebar''main''stats'] @xl:grid-cols-[250px_1fr_200px] @xl:grid-rows-[auto_1fr] @xl:[grid-template-areas:'header_header_header''sidebar_main_stats']"
  >
    <div class="rounded-lg bg-white p-4 shadow-sm [grid-area:header]">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
        <div class="flex items-center gap-4">
          <span class="hidden text-slate-600 @md:block">Welcome back, Sarah</span>
          <button
            class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Settings
          </button>
        </div>
      </div>
    </div>
    <div class="overflow-hidden rounded-lg bg-white shadow-sm [grid-area:sidebar]">
      <nav class="@sm:flex @sm:gap-2 @xl:block">
        <a
          href="#"
          class="block bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition-colors not-first:border-t not-first:border-slate-200 @sm:not-first:border-t-0 @sm:not-first:border-l @xl:not-first:border-t @xl:not-first:border-l-0"
          >Overview</a
        >
        <a
          href="#"
          class="block px-4 py-3 text-sm font-medium text-slate-700 transition-colors not-first:border-t not-first:border-slate-200 hover:bg-slate-50 @sm:not-first:border-t-0 @sm:not-first:border-l @xl:not-first:border-t @xl:not-first:border-l-0"
          >Analytics</a
        >
        <a
          href="#"
          class="block px-4 py-3 text-sm font-medium text-slate-700 transition-colors not-first:border-t not-first:border-slate-200 hover:bg-slate-50 @sm:not-first:border-t-0 @sm:not-first:border-l @xl:not-first:border-t @xl:not-first:border-l-0"
          >Reports</a
        >
        <a
          href="#"
          class="block px-4 py-3 text-sm font-medium text-slate-700 transition-colors not-first:border-t not-first:border-slate-200 hover:bg-slate-50 @sm:not-first:border-t-0 @sm:not-first:border-l @xl:not-first:border-t @xl:not-first:border-l-0"
          >Settings</a
        >
      </nav>
    </div>
    <div class="overflow-hidden rounded-lg bg-white p-6 shadow-sm [grid-area:main]">
      <h2 class="mb-4 text-xl font-semibold text-slate-900">Recent Activity</h2>
      <div class="mb-6 grid gap-4 @sm:grid-cols-1 @lg:grid-cols-3">
        <div class="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white shadow-sm">
          <div class="text-2xl font-bold">1,234</div>
          <div class="text-sm opacity-90">Total Users</div>
        </div>
        <div
          class="rounded-lg bg-gradient-to-r from-green-500 to-green-600 p-4 text-white shadow-sm"
        >
          <div class="text-2xl font-bold">$45,678</div>
          <div class="text-sm opacity-90">Revenue</div>
        </div>
        <div
          class="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white shadow-sm"
        >
          <div class="text-2xl font-bold">12.5%</div>
          <div class="text-sm opacity-90">Growth</div>
        </div>
      </div>
      <div class="overflow-hidden rounded-lg border border-slate-200">
        <div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 class="text-sm font-semibold text-slate-900">Recent Transactions</h3>
        </div>
        <div class="divide-y divide-slate-200">
          <div class="px-4 py-3 transition-colors hover:bg-slate-50">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-slate-900">Payment from Acme Corp</div>
              <div class="text-sm font-semibold text-green-600">+$2,500.00</div>
            </div>
            <div class="mt-1 text-xs text-slate-500">2 hours ago</div>
          </div>
          <div class="px-4 py-3 transition-colors hover:bg-slate-50">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-slate-900">Subscription renewal</div>
              <div class="text-sm font-semibold text-red-600">-$29.99</div>
            </div>
            <div class="mt-1 text-xs text-slate-500">1 day ago</div>
          </div>
          <div class="px-4 py-3 transition-colors hover:bg-slate-50">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-slate-900">Client payment</div>
              <div class="text-sm font-semibold text-green-600">+$1,250.00</div>
            </div>
            <div class="mt-1 text-xs text-slate-500">3 days ago</div>
          </div>
        </div>
      </div>
    </div>
    <div class="rounded-lg bg-white p-4 shadow-sm [grid-area:stats]">
      <h3 class="mb-3 text-lg font-semibold text-slate-900">Quick Stats</h3>
      <div class="@sm:flex @sm:gap-4 @xl:block @xl:space-y-3">
        <div class="py-2 text-sm @sm:flex-1 @xl:border-b @xl:border-slate-100 @xl:last:border-b-0">
          <div class="font-medium text-slate-900">Sessions</div>
          <div class="text-slate-600">8,432</div>
        </div>
        <div class="py-2 text-sm @sm:flex-1 @xl:border-b @xl:border-slate-100 @xl:last:border-b-0">
          <div class="font-medium text-slate-900">Bounce Rate</div>
          <div class="text-slate-600">24%</div>
        </div>
        <div class="py-2 text-sm @sm:flex-1 @xl:border-b @xl:border-slate-100 @xl:last:border-b-0">
          <div class="font-medium text-slate-900">Avg. Duration</div>
          <div class="text-slate-600">3:42</div>
        </div>
      </div>
    </div>
  </div>
</div>
```

Enhanced features:

- **Dynamic Navigation**: Uses `not-first:` utilities with responsive border switching (top borders on desktop, left borders on mobile)
- **Scrollable Content**: Added `overflow-hidden` and proper content areas that can handle dynamic data
- **Transaction List**: Real-world content with hover states and proper typography hierarchy
- **Responsive Stat Borders**: Conditional borders that adapt to horizontal/vertical layouts

## Why This Approach is Revolutionary

CSS Grid Template Areas combined with container queries creates **truly semantic, adaptive layouts**:

**Layout as Code**: The `grid-template-areas` string is literally a visual representation of your layout. Other developers can instantly understand the structure.

**Responsive Semantics**: Instead of changing numeric grid positions, you reshape the semantic layout itself. "Header spans full width" vs "Header is in columns 1-3, row 1."

**Maintainable Complexity**: Complex dashboards become manageable because each area has a meaningful name and clear boundaries.

**Component Modularity**: Each grid area can contain any component—the layout system doesn't care about internal complexity.

**Container Adaptivity**: The dashboard works equally well in a full-screen app, embedded widget, or narrow sidebar because it responds to its container, not the viewport.

## Real-World Applications

This pattern solves layout challenges in:

- **Admin Dashboards**: Analytics, user management, content management systems
- **Documentation Sites**: Header, sidebar navigation, main content, table of contents
- **E-commerce**: Product grids with filters, shopping cart, product details
- **News Sites**: Article content with related articles, author info, advertisements
- **SaaS Applications**: Tool panels, main workspace, property inspectors

The semantic nature makes these layouts self-documenting and easy for teams to maintain.

## Challenges

Try building these variations:

1. **Blog Post Layout**: Create a three-area layout with header, main article content, and sidebar for table of contents using template areas like `"header header" "article toc"`
2. **Dynamic Dashboard**: Extend this dashboard to handle a "notifications" area that can be toggled on/off by changing the grid template areas between `"header header header"` and `"header header notifications"` states
