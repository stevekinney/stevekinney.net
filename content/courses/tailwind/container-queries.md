---
title: Container Queries
description: >-
  Build truly responsive components with native CSS container queries support in
  Tailwind 4 for parent-based styling
modified: 2025-06-11T19:05:33-06:00
---

Container queries let you style elements based on their parent's size, not the viewport. Perfect for reusable components.

## Container Vs Viewport Queries

| Type               | Based On       | Use Case     |
| ------------------ | -------------- | ------------ |
| Viewport (`md:`)   | Browser window | Page layouts |
| Container (`@md:`) | Parent element | Components   |

## Basic Usage

Mark parent as container, style children based on its size:

```html
<div class="@container">
  <article class="flex flex-col @sm:flex-row @lg:grid @lg:grid-cols-3">
    <!-- Adapts to container width -->
  </article>
</div>
```

## Container Breakpoints

Default sizes match viewport breakpoints:

- `@sm`: 640px container
- `@md`: 768px container
- `@lg`: 1024px container
- `@xl`: 1280px container
- `@2xl`: 1536px container

## Common Patterns

### Card Component

```html
<div class="@container">
  <div class="p-4 @sm:p-6 @md:p-8">
    <h3 class="text-lg @sm:text-xl @lg:text-2xl">Responsive heading</h3>
    <div class="mt-2 grid gap-4 @sm:mt-4 @md:grid-cols-2">
      <!-- Content -->
    </div>
  </div>
</div>
```

### Sidebar Layout

```html
<aside class="@container">
  <nav class="flex flex-wrap gap-2 @sm:flex-col @sm:gap-1">
    <a href="#" class="@sm:py-2">Link</a>
  </nav>
</aside>
```

## Named Containers

Target specific containers in nested layouts:

```html
<!-- Main content area -->
<main class="@container/main">
  <!-- Sidebar -->
  <aside class="@container/sidebar">
    <nav class="@sm/sidebar:block">
      <!-- Responds to sidebar width -->
    </nav>
  </aside>

  <!-- Article -->
  <article class="@lg/main:prose-lg">
    <!-- Responds to main width -->
  </article>
</main>
```

## Container Query Ranges

### Maximum Width

```html
<div class="@container">
  <div class="@max-md:hidden">Hidden in small containers</div>
</div>
```

### Specific Ranges

```html
<div class="@container">
  <div class="@sm:@max-lg:bg-blue-100">Blue only in medium containers</div>
</div>
```

## Arbitrary Container Sizes

```html
<div class="@container">
  <!-- Custom breakpoint -->
  <div class="@min-[400px]:flex">Flex at 400px container width</div>

  <!-- Custom range -->
  <div class="@min-[300px]:@max-[500px]:bg-gray-100">Gray between 300-500px</div>
</div>
```

## Container Types

Control which dimension to query:

```html
<!-- Default: inline-size (width) -->
<div class="@container">...</div>

<!-- Query height -->
<div class="@container/size">...</div>
```

## Container Units

Size elements relative to container:

```html
<div class="@container">
  <!-- 50% of container width -->
  <div class="w-[50cqw]">...</div>

  <!-- Font size based on container -->
  <h2 class="text-[5cqw]">Scales with container</h2>
</div>
```

Units available:

- `cqw` - 1% of container width
- `cqh` - 1% of container height
- `cqi` - 1% of container inline size
- `cqb` - 1% of container block size
- `cqmin` - 1% of container minimum dimension
- `cqmax` - 1% of container maximum dimension

## Customizing Container Sizes

```css
@import 'tailwindcss';

@theme {
  /* Add custom sizes */
  --container-xs: 320px;
  --container-3xl: 1600px;

  /* Override defaults */
  --container-sm: 600px;
}
```

## Real-World Example

Product card that works everywhere:

```html
<div class="@container">
  <div class="flex flex-col gap-4 p-4 @sm:flex-row">
    <!-- Image -->
    <img src="..." class="w-full rounded @sm:w-32 @md:w-48" />

    <!-- Content -->
    <div class="flex-1">
      <h3 class="text-lg font-semibold @md:text-xl">Product Name</h3>
      <p class="mt-1 text-sm text-gray-600 @lg:text-base">
        Description that adjusts to available space
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button class="px-3 py-1 @sm:px-4 @sm:py-2">Add to Cart</button>
      </div>
    </div>
  </div>
</div>
```

## Best Practices

1. **Use for components** - Not page layouts
2. **Name nested containers** - Avoid confusion
3. **Test at various sizes** - Components appear in many contexts
4. **Consider performance** - Each container adds overhead
5. **Fallback for old browsers** - Container queries need modern browsers
