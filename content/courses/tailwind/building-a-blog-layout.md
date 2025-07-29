---
title: Building a Blog Layout with Named Areas
description: >-
  Let's build a semantic 2-column blog layout that collapses gracefully using
  CSS Grid Template Areas and container queries.

modified: 2025-06-11T19:05:33-06:00
---

Let's start with our basic HTML structure for a simple blog post layout.

```html tailwind
<div class="mx-auto max-w-sm rounded-lg bg-gray-100 p-4">
  <div class="mb-4 rounded bg-blue-200 p-4">
    <h1 class="text-lg font-bold">The Future of Web Development</h1>
    <div class="mt-2 text-sm">
      <span class="mr-2 rounded bg-white px-2 py-1">Published on March 15, 2025</span>
      <span class="rounded bg-white px-2 py-1">By Sarah Chen</span>
    </div>
  </div>
  <div class="mb-4 rounded bg-green-200 p-4">
    <nav>
      <h2 class="mb-2 font-semibold">Table of Contents</h2>
      <ul class="space-y-1">
        <li><a href="#intro" class="text-blue-600 hover:underline">Introduction</a></li>
        <li><a href="#trends" class="text-blue-600 hover:underline">Current Trends</a></li>
        <li><a href="#future" class="text-blue-600 hover:underline">Looking Ahead</a></li>
      </ul>
    </nav>
  </div>
  <div class="rounded bg-yellow-200 p-4">
    <article>
      <h2 id="intro" class="mb-2 font-semibold">Introduction</h2>
      <p class="mb-4 rounded bg-white p-3">
        Web development continues to evolve at breakneck speed. From the early days of static HTML
        to today's dynamic, interactive experiences, we've come a long way.
      </p>
      <h2 id="trends" class="mb-2 font-semibold">Current Trends</h2>
      <p class="mb-4 rounded bg-white p-3">
        Modern web development embraces component-based architectures, improved developer
        experience, and performance optimization as core principles.
      </p>
      <h2 id="future" class="mb-2 font-semibold">Looking Ahead</h2>
      <p class="rounded bg-white p-3">
        The future promises even more exciting developments in areas like serverless computing, edge
        computing, and AI-powered development tools.
      </p>
    </article>
  </div>
</div>
```

We have a blog post with header, sidebar navigation, and main content, but they're stacked vertically. Let's transform this into a professional 2-column layout using the semantic power of CSS Grid Template Areas.

## Understanding Semantic Grid Areas

Building on techniques from our [dashboard tutorial](building-a-dashboard.md), let's use named grid areas instead of numeric positioning. This creates more maintainable, readable layouts where the CSS literally describes the visual structure.

```html tailwind
<div class="mx-auto max-w-sm rounded-lg bg-gray-100 p-4">
  <div class="@container">
    <div
      class="grid gap-6 [grid-template-areas:'header''sidebar''main'] @lg:grid-cols-[200px_1fr] @lg:[grid-template-areas:'header_header''sidebar_main']"
    >
      <div class="rounded bg-blue-200 p-4 [grid-area:header]">
        <h1 class="text-2xl font-bold text-slate-900">The Future of Web Development</h1>
        <div class="mt-2 flex gap-4 text-sm text-slate-600">
          <span class="rounded bg-white px-2 py-1">Published on March 15, 2025</span>
          <span class="rounded bg-white px-2 py-1">By Sarah Chen</span>
        </div>
      </div>
      <div class="rounded bg-green-200 p-4 [grid-area:sidebar]">
        <nav class="rounded-lg bg-slate-50 p-4">
          <h2 class="text-lg font-semibold text-slate-900">Table of Contents</h2>
          <ul class="mt-3 space-y-2">
            <li>
              <a href="#intro" class="text-sm text-blue-600 hover:text-blue-800">Introduction</a>
            </li>
            <li>
              <a href="#trends" class="text-sm text-blue-600 hover:text-blue-800">Current Trends</a>
            </li>
            <li>
              <a href="#future" class="text-sm text-blue-600 hover:text-blue-800">Looking Ahead</a>
            </li>
          </ul>
        </nav>
      </div>
      <div class="rounded bg-yellow-200 p-4 [grid-area:main]">
        <article class="prose prose-slate">
          <h2 id="intro">Introduction</h2>
          <p class="rounded bg-white p-3">
            Web development continues to evolve at breakneck speed. From the early days of static
            HTML to today's dynamic, interactive experiences, we've come a long way.
          </p>
          <h2 id="trends">Current Trends</h2>
          <p class="rounded bg-white p-3">
            Modern web development embraces component-based architectures, improved developer
            experience, and performance optimization as core principles.
          </p>
          <h2 id="future">Looking Ahead</h2>
          <p class="rounded bg-white p-3">
            The future promises even more exciting developments in areas like serverless computing,
            edge computing, and AI-powered development tools.
          </p>
        </article>
      </div>
    </div>
  </div>
</div>
```

Grid Template Areas setup:

- `@container`: Establishes container query context so the layout responds to its container size, not viewport
- `[grid-template-areas:'header''sidebar''main']`: Mobile-first single column with semantic area names
- `@lg:[grid-template-areas:'header_header''sidebar_main']`: Two-column layout where header spans both columns
- `@lg:grid-cols-[200px_1fr]`: Fixed 200px sidebar, flexible main content area
- `[grid-area:header]`: Assigns each element to its named area

The beauty is in the template areas string—it's literally a visual map of your layout!

## Why Named Areas Beat Column Spans

Let's compare the semantic approach we're using versus traditional column positioning to understand why named areas are superior.

**Traditional numeric approach:**

```css
.header {
  grid-column: 1 / 3;
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
```

**Our semantic approach:**

```css
grid-template-areas:
  'header header'
  'sidebar main';
```

The named areas approach provides several advantages:

- **Visual clarity**: You can literally see the layout structure in the CSS
- **Self-documenting**: Area names like "header" and "sidebar" are immediately understandable
- **Easier maintenance**: Changing layouts means updating one visual string, not multiple numeric coordinates
- **Better responsive design**: Different layouts at different breakpoints are crystal clear

This makes complex layouts much more maintainable, especially when working in teams.

## Adding Professional Styling and Typography

Let's enhance our layout with proper styling, building on patterns from our [card tutorial](building-a-card.md) and [form tutorials](building-a-form-input.md).

```html tailwind
<div class="mx-auto max-w-sm">
  <div class="@container">
    <div
      class="grid gap-6 [grid-template-areas:'header''sidebar''main'] @lg:grid-cols-[200px_1fr] @lg:[grid-template-areas:'header_header''sidebar_main']"
    >
      <div class="border-b border-slate-200 pb-6 [grid-area:header]">
        <h1 class="text-2xl leading-tight font-bold text-slate-900 @lg:text-3xl">
          The Future of Web Development
        </h1>
        <div class="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
          <span class="flex items-center gap-1">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            March 15, 2025
          </span>
          <span class="flex items-center gap-1">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Sarah Chen
          </span>
        </div>
      </div>
      <div class="[grid-area:sidebar]">
        <nav class="sticky top-4 rounded-lg bg-slate-50 p-4 shadow-sm">
          <h2 class="text-lg font-semibold text-slate-900">Table of Contents</h2>
          <ul class="mt-3 space-y-2">
            <li>
              <a
                href="#intro"
                class="block rounded-md px-2 py-1 text-sm text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                >Introduction</a
              >
            </li>
            <li>
              <a
                href="#trends"
                class="block rounded-md px-2 py-1 text-sm text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                >Current Trends</a
              >
            </li>
            <li>
              <a
                href="#future"
                class="block rounded-md px-2 py-1 text-sm text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                >Looking Ahead</a
              >
            </li>
          </ul>
        </nav>
      </div>
      <div class="[grid-area:main]">
        <article class="prose prose-slate max-w-none">
          <h2 id="intro">Introduction</h2>
          <p>
            Web development continues to evolve at breakneck speed. From the early days of static
            HTML to today's dynamic, interactive experiences, we've come a long way.
          </p>
          <h2 id="trends">Current Trends</h2>
          <p>
            Modern web development embraces component-based architectures, improved developer
            experience, and performance optimization as core principles.
          </p>
          <h2 id="future">Looking Ahead</h2>
          <p>
            The future promises even more exciting developments in areas like serverless computing,
            edge computing, and AI-powered development tools.
          </p>
        </article>
      </div>
    </div>
  </div>
</div>
```

Professional enhancements:

- `border-b border-slate-200 pb-6`: Subtle separator below header for visual hierarchy
- `@lg:text-3xl`: Responsive typography that scales with container size
- SVG icons with `h-4 w-4`: 16px calendar and user icons for visual interest
- `sticky top-4`: Sidebar navigation stays visible during scroll
- `shadow-sm`: Subtle depth for the navigation panel
- `transition-colors hover:bg-blue-50`: Smooth hover states for navigation links
- `prose prose-slate max-w-none`: Typography utilities for readable article content

The `sticky` positioning ensures the table of contents remains accessible as users scroll through long articles.

## Container-Responsive Layout Refinements

Let's add more sophisticated responsive behavior using container queries, building on techniques from our [statistics card tutorial](building-a-statistics-card.md).

```html tailwind
<div class="mx-auto max-w-sm">
  <div class="@container">
    <div
      class="grid gap-4 [grid-template-areas:'header''sidebar''main'] @md:gap-6 @lg:grid-cols-[220px_1fr] @lg:[grid-template-areas:'header_header''sidebar_main'] @xl:grid-cols-[250px_1fr]"
    >
      <div class="border-b border-slate-200 pb-4 [grid-area:header] @md:pb-6">
        <h1 class="text-xl leading-tight font-bold text-slate-900 @md:text-2xl @lg:text-3xl">
          The Future of Web Development
        </h1>
        <div class="mt-2 flex flex-wrap gap-3 text-sm text-slate-600 @md:mt-3 @md:gap-4">
          <span class="flex items-center gap-1">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            March 15, 2025
          </span>
          <span class="flex items-center gap-1">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Sarah Chen
          </span>
        </div>
      </div>
      <div class="[grid-area:sidebar] @lg:order-first">
        <nav class="rounded-lg bg-slate-50 p-3 shadow-sm @md:p-4 @lg:sticky @lg:top-4">
          <h2 class="text-base font-semibold text-slate-900 @md:text-lg">Table of Contents</h2>
          <ul class="mt-2 space-y-1 @md:mt-3 @md:space-y-2">
            <li>
              <a
                href="#intro"
                class="block rounded-md px-2 py-1 text-sm text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                >Introduction</a
              >
            </li>
            <li>
              <a
                href="#trends"
                class="block rounded-md px-2 py-1 text-sm text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                >Current Trends</a
              >
            </li>
            <li>
              <a
                href="#future"
                class="block rounded-md px-2 py-1 text-sm text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                >Looking Ahead</a
              >
            </li>
          </ul>
        </nav>
      </div>
      <div class="[grid-area:main]">
        <article class="prose prose-slate prose-headings:scroll-mt-4 max-w-none">
          <h2 id="intro">Introduction</h2>
          <p>
            Web development continues to evolve at breakneck speed. From the early days of static
            HTML to today's dynamic, interactive experiences, we've come a long way. The tools,
            frameworks, and methodologies we use today would seem like magic to developers from just
            a decade ago.
          </p>
          <h2 id="trends">Current Trends</h2>
          <p>
            Modern web development embraces component-based architectures, improved developer
            experience, and performance optimization as core principles. We're seeing the rise of
            meta-frameworks, edge computing, and AI-assisted development tools that are reshaping
            how we build for the web.
          </p>
          <h2 id="future">Looking Ahead</h2>
          <p>
            The future promises even more exciting developments in areas like serverless computing,
            edge computing, and AI-powered development tools. As the web platform continues to
            evolve, developers will have access to increasingly powerful APIs and capabilities that
            bring native-like experiences to the browser.
          </p>
        </article>
      </div>
    </div>
  </div>
</div>
```

Container-responsive refinements:

- `@md:gap-6`: Progressive spacing that grows with container size
- `@lg:grid-cols-[220px_1fr] @xl:grid-cols-[250px_1fr]`: Sidebar width adapts to available space
- `@lg:sticky @lg:top-4`: Sticky positioning only activates in larger containers
- `@md:text-2xl @lg:text-3xl`: Typography scales across container breakpoints
- `prose-headings:scroll-mt-4`: Accounts for sticky navigation when scrolling to anchors

The key insight is that container queries make the layout truly modular—it adapts to its container size regardless of where it's placed in your application.

## Understanding Container vs Media Queries

This layout demonstrates the fundamental difference between container queries (`@md:`, `@lg:`) and media queries (`md:`, `lg:`):

**Media queries** respond to viewport size:

- "When the browser window is 768px wide, do this"
- Global breakpoints that affect the entire page

**Container queries** respond to container size:

- "When this component's container is 512px wide, do this"
- Local breakpoints that make components truly modular

This blog layout will work perfectly whether it's:

- Full-width on a desktop page
- In a narrow sidebar widget
- Part of a dashboard panel
- Embedded in an article preview

The layout intelligence is contained within the component itself, making it infinitely reusable.

## Challenges

Try building these variations:

1. **Three-Column Layout**: Extend to include an "aside" area for related articles using template areas like `"header header header" "sidebar main aside"` with responsive collapsing

2. **Dynamic Table of Contents**: Use the techniques from our [details disclosure tutorial](building-details-disclosure.md) to make the table of contents collapsible on mobile while keeping it always visible on larger containers
