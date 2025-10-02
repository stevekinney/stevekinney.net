---
title: Module Resolution and Path Aliases
description: >-
  Make imports sane—align tsconfig paths with your bundler and avoid circular
  snags.
date: 2025-09-06T22:23:57.321Z
modified: '2025-09-22T09:27:10-06:00'
published: true
tags:
  - react
  - typescript
  - module-resolution
  - paths
  - imports
  - tooling
---

Deep folder hierarchies make imports a nightmare. You know the drill: `../../../components/ui/Button` everywhere, fragile paths that break when you refactor, and import statements that look like they're trying to escape your codebase entirely. **Module resolution** and **path aliases** solve this by letting you write clean, absolute imports like `@/components/Button` or `~/utils/helpers`—but only if you configure both TypeScript and your bundler correctly.

Module resolution is how TypeScript (and your bundler) finds the files you're importing. Path aliases let you create shortcuts—think of them as bookmarks for your most commonly imported directories. The trick is making sure your `tsconfig.json` paths match what your bundler expects, so your code works both in development and production.

## The Problem with Relative Imports

Before we dive into solutions, let's acknowledge why relative imports get messy:

```ts
// ❌ Fragile and hard to read
import Button from '../../../components/ui/Button';
import { formatDate } from '../../../../utils/date';
import { useAuth } from '../../../hooks/useAuth';

// What happens when you move this file?
// What happens when you refactor the folder structure?
```

Every time you move a file or reorganize folders, you're hunting down relative paths. And don't get me started on the cognitive load of counting `../` segments to figure out where you actually are in your project.

## Setting Up Path Aliases in TypeScript

TypeScript's `tsconfig.json` lets you define path mappings that create shortcuts to commonly used directories. Here's a typical setup:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/utils/*": ["src/utils/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/types/*": ["src/types/*"],
      "~/assets/*": ["public/assets/*"]
    }
  }
}
```

Now your imports become clean and predictable:

```ts
// ✅ Clear, absolute, and refactor-safe
import Button from '@/components/ui/Button';
import { formatDate } from '@/utils/date';
import { useAuth } from '@/hooks/useAuth';
```

### Common Path Alias Patterns

Different teams prefer different conventions. Here are the most popular approaches:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      // Option 1: @ prefix (popular with Vue/Nuxt)
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],

      // Option 2: ~ prefix (popular with Next.js)
      "~/*": ["src/*"],
      "~/components/*": ["src/components/*"],

      // Option 3: No prefix, just descriptive names
      "components/*": ["src/components/*"],
      "utils/*": ["src/utils/*"],

      // Option 4: Mix and match based on usage
      "@/*": ["src/*"],
      "assets/*": ["public/assets/*"],
      "styles/*": ["src/styles/*"]
    }
  }
}
```

> [!TIP]
> Stick to one convention across your project. Mixing `@/` and `~/` prefixes will confuse your team and your future self.

## Bundler Configuration

Here's where things get tricky: TypeScript handles type checking, but your bundler (Vite, Webpack, etc.) handles the actual file resolution at runtime. They need to agree on what your aliases mean.

### Vite Configuration

If you're using Vite, you'll need to configure its alias resolution:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },
});
```

**Alternatively**: You can use [vite-tsconfig-paths](https://npm.im/vite-tsconfig-paths) to have Vite use your `tsconfig.json` paths.
