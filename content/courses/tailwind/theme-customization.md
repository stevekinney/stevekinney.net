---
title: Theme Customization
description: Create, customize, and manage design systems using Tailwind's powerful CSS-native theme variable system
---

Unlike previous versions that relied on JavaScript configuration files, Tailwind 4 uses CSS-native theme variables that provide better performance, easier sharing between projects, and more intuitive workflows.

## Understanding Theme Variables

Theme variables in Tailwind 4 are special CSS variables defined using the `@theme` directive. These aren't just regular CSS variables—they instruct Tailwind to generate corresponding utility classes, making them the foundation of your design system.

### The @theme Directive

```css
@import 'tailwindcss';

@theme {
  --color-brand-500: oklch(0.7 0.15 200);
  --font-heading: 'Inter', sans-serif;
  --spacing-gutter: 2rem;
}
```

When you define these variables, Tailwind automatically:

- Creates utility classes like `bg-brand-500`, `text-brand-500`, `font-heading`, etc.
- Generates regular CSS variables you can use in custom CSS
- Maintains proper specificity and inheritance

### Why @theme Instead of :root?

You might wonder why Tailwind uses a special `@theme` directive instead of regular CSS variables. The key differences are:

- **Utility generation**: Theme variables automatically create utility classes
- **Build-time processing**: Tailwind can optimize and validate theme variables during compilation
- **Explicit intent**: Using `@theme` makes it clear which variables are part of your design system
- **Validation**: Tailwind can enforce that theme variables are defined at the top level

## Theme Variable Namespaces

Tailwind organizes theme variables into namespaces, where each namespace controls different aspects of your design system. Understanding these namespaces is crucial for building a cohesive design system.

### Core Namespaces

Let's explore the main namespaces and build a custom design system step by step:

#### Colors (`--color-*`)

Colors are the foundation of most design systems. Here's how to build a comprehensive color palette:

```css
@import 'tailwindcss';

@theme {
  /* Brand colors */
  --color-primary-50: oklch(0.95 0.02 240);
  --color-primary-100: oklch(0.9 0.04 240);
  --color-primary-500: oklch(0.6 0.15 240);
  --color-primary-900: oklch(0.2 0.08 240);

  /* Semantic colors */
  --color-success: oklch(0.7 0.15 142);
  --color-warning: oklch(0.8 0.12 85);
  --color-danger: oklch(0.6 0.2 25);

  /* Neutral scale */
  --color-surface: oklch(0.98 0.002 240);
  --color-muted: oklch(0.94 0.006 240);
  --color-subtle: oklch(0.88 0.012 240);
}
```

This creates utilities like:

- `bg-primary-500`, `text-primary-500`, `border-primary-500`
- `bg-success`, `text-success`, `border-success`
- `bg-surface`, `text-surface`, `border-surface`

#### Typography (`--font-*`, `--text-*`, `--font-weight-*`)

Typography systems require coordination between font families, sizes, and weights:

```css
@theme {
  /* Font families */
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-serif: 'Playfair Display', ui-serif, Georgia, serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Type scale */
  --text-xs: 0.75rem;
  --text-xs--line-height: 1.2;
  --text-sm: 0.875rem;
  --text-sm--line-height: 1.4;
  --text-base: 1rem;
  --text-base--line-height: 1.5;
  --text-lg: 1.125rem;
  --text-lg--line-height: 1.6;
  --text-xl: 1.25rem;
  --text-xl--line-height: 1.6;

  /* Font weights */
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

#### Spacing (`--spacing-*`)

Consistent spacing is crucial for visual hierarchy:

```css
@theme {
  /* Base spacing unit */
  --spacing: 0.25rem; /* 4px */

  /* Custom spacing values */
  --spacing-gutter: 1.5rem; /* 24px */
  --spacing-section: 4rem; /* 64px */
  --spacing-page: 6rem; /* 96px */
}
```

The `--spacing` variable is special—it's used as the base unit for the default spacing scale (1 = 4px, 2 = 8px, etc.).

## Building a Complete Design System

Let's build a comprehensive design system for a SaaS application, step by step:

### Step 1: Define the Foundation

```css
@import 'tailwindcss';

@theme {
  /* === COLORS === */
  /* Primary brand colors */
  --color-blue-50: oklch(0.97 0.01 240);
  --color-blue-100: oklch(0.94 0.03 240);
  --color-blue-200: oklch(0.88 0.06 240);
  --color-blue-300: oklch(0.82 0.09 240);
  --color-blue-400: oklch(0.74 0.12 240);
  --color-blue-500: oklch(0.65 0.15 240);
  --color-blue-600: oklch(0.55 0.18 240);
  --color-blue-700: oklch(0.45 0.15 240);
  --color-blue-800: oklch(0.35 0.12 240);
  --color-blue-900: oklch(0.25 0.09 240);
  --color-blue-950: oklch(0.15 0.06 240);

  /* Semantic colors */
  --color-success-50: oklch(0.96 0.02 142);
  --color-success-500: oklch(0.65 0.15 142);
  --color-success-900: oklch(0.25 0.08 142);

  --color-warning-50: oklch(0.96 0.02 85);
  --color-warning-500: oklch(0.75 0.12 85);
  --color-warning-900: oklch(0.35 0.08 85);

  --color-danger-50: oklch(0.96 0.02 25);
  --color-danger-500: oklch(0.6 0.2 25);
  --color-danger-900: oklch(0.3 0.12 25);

  /* === TYPOGRAPHY === */
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Refined type scale */
  --text-2xs: 0.6875rem; /* 11px */
  --text-2xs--line-height: 1.2;
  --text-xs: 0.75rem; /* 12px */
  --text-xs--line-height: 1.3;
  --text-sm: 0.875rem; /* 14px */
  --text-sm--line-height: 1.4;
  --text-base: 1rem; /* 16px */
  --text-base--line-height: 1.5;
  --text-lg: 1.125rem; /* 18px */
  --text-lg--line-height: 1.6;
  --text-xl: 1.25rem; /* 20px */
  --text-xl--line-height: 1.6;

  /* === SPACING === */
  --spacing: 0.25rem; /* 4px base unit */

  /* Semantic spacing */
  --spacing-section: 5rem; /* 80px */
  --spacing-container: 1.5rem; /* 24px */

  /* === LAYOUT === */
  --container-sm: 40rem; /* 640px */
  --container-md: 48rem; /* 768px */
  --container-lg: 64rem; /* 1024px */
  --container-xl: 80rem; /* 1280px */

  /* === EFFECTS === */
  --radius-sm: 0.375rem; /* 6px */
  --radius-md: 0.5rem; /* 8px */
  --radius-lg: 0.75rem; /* 12px */

  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-dialog: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}
```

### Step 2: Build Core Components

Now let's build components using our design system:

```html tailwind
<!-- Button Component -->
<button
  class="shadow-card rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-600 hover:shadow-lg"
>
  Primary Button
</button>

<!-- Card Component -->
<div class="shadow-card space-y-4 rounded-lg border border-blue-100 bg-white p-6">
  <h3 class="text-lg font-semibold text-blue-900">Card Title</h3>
  <p class="text-base text-blue-700">Card content goes here with proper spacing and typography.</p>
</div>

<!-- Alert Component -->
<div class="bg-success-50 border-success-200 text-success-900 rounded-md border px-4 py-3">
  <p class="text-sm font-medium">Success! Your changes have been saved.</p>
</div>
```

### Step 3: Handle Dark Mode

Extend your theme to support dark mode elegantly:

```css
@theme {
  /* Light mode colors (default) */
  --color-surface: oklch(0.99 0.002 240);
  --color-surface-muted: oklch(0.96 0.004 240);
  --color-text: oklch(0.15 0.006 240);
  --color-text-muted: oklch(0.45 0.008 240);

  /* Border colors */
  --color-border: oklch(0.88 0.008 240);
  --color-border-muted: oklch(0.92 0.004 240);
}

/* Dark mode overrides */
[data-theme='dark'] {
  --color-surface: oklch(0.08 0.004 240);
  --color-surface-muted: oklch(0.12 0.006 240);
  --color-text: oklch(0.94 0.004 240);
  --color-text-muted: oklch(0.7 0.006 240);

  --color-border: oklch(0.22 0.008 240);
  --color-border-muted: oklch(0.16 0.006 240);
}
```

Now you can use these semantic colors that automatically adapt:

```html tailwind
<div class="bg-surface border-border text-text border">
  <h2 class="text-text font-semibold">Adaptive Component</h2>
  <p class="text-text-muted">This content adapts to light and dark themes automatically.</p>
</div>
```

## Advanced Theme Techniques

### Referencing Other Variables

When creating derived values, use `@theme inline` to reference other theme variables:

```css
:root {
  --brand-hue: 240;
  --brand-saturation: 0.15;
}

@theme inline {
  --color-primary-50: oklch(0.97 calc(var(--brand-saturation) * 0.2) var(--brand-hue));
  --color-primary-500: oklch(0.65 var(--brand-saturation) var(--brand-hue));
  --color-primary-900: oklch(0.25 calc(var(--brand-saturation) * 0.6) var(--brand-hue));
}
```

This approach allows you to create dynamic color systems that can be adjusted with just a few base variables.

### Component-Specific Themes

Create specialized themes for specific components:

```css
@theme {
  /* Button system */
  --button-padding-sm: calc(var(--spacing) * 2) calc(var(--spacing) * 3);
  --button-padding-md: calc(var(--spacing) * 2.5) calc(var(--spacing) * 4);
  --button-padding-lg: calc(var(--spacing) * 3) calc(var(--spacing) * 6);

  /* Form system */
  --form-field-height-sm: 2rem;
  --form-field-height-md: 2.5rem;
  --form-field-height-lg: 3rem;

  /* Animation system */
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --duration-fast: 150ms;
  --duration-normal: 300ms;
}
```

### Building Complex Components

Let's build a comprehensive dashboard card using our design system:

```html tailwind
<article class="bg-surface border-border shadow-card overflow-hidden rounded-lg border">
  <!-- Header -->
  <header class="bg-surface-muted border-border border-b px-6 py-4">
    <div class="flex items-center justify-between">
      <h2 class="text-text text-lg font-semibold">Revenue Overview</h2>
      <button
        class="text-text-muted hover:text-text hover:bg-surface -m-2 rounded-md p-2 transition-colors duration-200"
      >
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <!-- Icon content -->
        </svg>
      </button>
    </div>
  </header>

  <!-- Content -->
  <div class="space-y-6 p-6">
    <!-- Metrics -->
    <div class="grid grid-cols-3 gap-4">
      <div class="text-center">
        <div class="text-text text-2xl font-bold">$24,500</div>
        <div class="text-text-muted text-sm">This month</div>
      </div>
      <div class="text-center">
        <div class="text-success-500 text-2xl font-bold">+12.5%</div>
        <div class="text-text-muted text-sm">Growth</div>
      </div>
      <div class="text-center">
        <div class="text-text text-2xl font-bold">1,245</div>
        <div class="text-text-muted text-sm">Transactions</div>
      </div>
    </div>

    <!-- Chart placeholder -->
    <div
      class="bg-surface-muted border-border-muted flex h-32 items-center justify-center rounded-md border"
    >
      <span class="text-text-muted text-sm">Chart would go here</span>
    </div>
  </div>

  <!-- Footer -->
  <footer class="bg-surface-muted border-border border-t px-6 py-3">
    <div class="flex items-center justify-between">
      <span class="text-text-muted text-xs"> Updated 2 hours ago </span>
      <button
        class="text-xs font-medium text-blue-600 transition-colors duration-200 hover:text-blue-700"
      >
        View details
      </button>
    </div>
  </footer>
</article>
```

## Using Theme Variables in Custom CSS

Your theme variables are available as regular CSS variables, making it easy to create custom styles that stay consistent with your design system:

```css
@import 'tailwindcss';

@layer components {
  .gradient-card {
    background: linear-gradient(135deg, var(--color-blue-500), var(--color-blue-600));
    border-radius: var(--radius-lg);
    padding: var(--spacing-6);
    box-shadow: var(--shadow-card);
  }

  .custom-button {
    /* Use theme variables for consistency */
    background-color: var(--color-primary-500);
    color: var(--color-white);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    padding: calc(var(--spacing) * 2) calc(var(--spacing) * 4);
    border-radius: var(--radius-md);

    /* Use the --alpha() function for opacity */
    border: 1px solid --alpha(var(--color-primary-500) / 20%);

    &:hover {
      background-color: var(--color-primary-600);
    }
  }
}
```

## Sharing Themes Across Projects

One of the biggest advantages of CSS-based themes is how easy it is to share them across projects:

### Creating a Shared Theme Package

```css
/* themes/brand.css */
@theme {
  /* Brand foundation */
  --color-brand-50: oklch(0.97 0.01 240);
  --color-brand-500: oklch(0.65 0.15 240);
  --color-brand-900: oklch(0.25 0.09 240);

  /* Typography */
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Spacing scale */
  --spacing: 0.25rem;
  --spacing-section: 4rem;

  /* Component tokens */
  --radius-button: 0.5rem;
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}
```

### Using Shared Themes

```css
/* In any project */
@import 'tailwindcss';
@import './themes/brand.css';

/* Project-specific customizations */
@theme {
  /* Override or extend as needed */
  --color-accent: oklch(0.7 0.15 142);
}
```

## Performance Considerations

### Optimizing Theme Variables

Tailwind 4's theme system is designed for performance, but there are best practices to follow:

1. **Use semantic naming**: Instead of `--color-blue-500`, use `--color-primary-500` to make refactoring easier
2. **Minimize arbitrary values**: Rely on your theme variables rather than arbitrary values in HTML
3. **Use the `static` option sparingly**: Only generate all CSS variables when necessary

```css
/* Generate all variables (use sparingly) */
@theme static {
  --color-primary-500: oklch(0.65 0.15 240);
}

/* Default: only used variables are generated */
@theme {
  --color-primary-500: oklch(0.65 0.15 240);
}
```

## Conclusion

Tailwind CSS 4's theme system represents a fundamental shift towards CSS-native design systems. By mastering theme variables, you can create more maintainable, performant, and shareable design systems.

The key principles to remember:

1. **Start with foundations**: Define your colors, typography, and spacing first
2. **Use semantic naming**: Create meaningful variable names that reflect purpose, not appearance
3. **Build systematically**: Layer your design tokens from basic to component-specific
4. **Leverage CSS variables**: Take advantage of the generated CSS variables for custom styles
5. **Think in systems**: Design your theme to scale across multiple projects and team members

With these techniques, you'll be able to build sophisticated, maintainable design systems that grow with your projects and provide a solid foundation for your entire user interface.
