---
title: Module Resolution and Path Aliases
description: Make imports sane—align tsconfig paths with your bundler and avoid circular snags.
date: 2025-09-06T22:23:57.321Z
modified: 2025-09-06T22:23:57.321Z
published: true
tags: ['react', 'typescript', 'module-resolution', 'paths', 'imports', 'tooling']
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

### Next.js Configuration

Next.js reads your `tsconfig.json` paths automatically in most cases, but you might need additional configuration:

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js automatically uses tsconfig.json paths
  // But you can override here if needed
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
};

module.exports = nextConfig;
```

### Create React App (with CRACO)

CRA requires CRACO or ejecting to customize webpack:

```js
// craco.config.js
const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
    },
  },
};
```

## Working with React Component Libraries

When building a component library, you'll want to expose clean import paths for consumers:

```json
// tsconfig.json for a component library
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@mylib/components": ["src/components/index"],
      "@mylib/utils": ["src/utils/index"],
      "@mylib/types": ["src/types/index"]
    }
  }
}
```

And in your `package.json`, define the exports:

```json
{
  "name": "@mycompany/ui-lib",
  "exports": {
    "./components": "./dist/components/index.js",
    "./utils": "./dist/utils/index.js",
    "./types": "./dist/types/index.js"
  }
}
```

This allows consumers to import like:

```ts
import { Button, Input } from '@mycompany/ui-lib/components';
import { formatDate } from '@mycompany/ui-lib/utils';
```

## Avoiding Circular Dependencies

Path aliases make it easier to create circular dependencies accidentally. Here's how to avoid them:

```ts
// ❌ This can create circular dependencies
// hooks/useAuth.ts
import { api } from '@/services/api';

// services/api.ts
import { useAuth } from '@/hooks/useAuth'; // Circular!
```

**Solution**: Create clear dependency layers:

```ts
// ✅ Better architecture
// types/auth.ts - Pure types, no dependencies
export interface User {
  id: string;
  email: string;
}

// services/auth.ts - Business logic
import type { User } from '@/types/auth';

// hooks/useAuth.ts - React layer
import { authService } from '@/services/auth';
```

> [!WARNING]
> Circular dependencies will cause runtime errors or unexpected behavior. Use a dependency graph tool like `madge` to detect them early.

## Testing with Path Aliases

Jest and other testing frameworks need to understand your aliases too:

```json
// jest.config.js
module.exports = {
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^~/assets/(.*)$': '<rootDir>/public/assets/$1',
  },
};
```

For Vitest:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
    },
  },
});
```

## TypeScript Node Resolution Strategies

TypeScript offers different module resolution strategies that affect how aliases work:

```json
{
  "compilerOptions": {
    "moduleResolution": "node", // Classic Node.js resolution
    // or
    "moduleResolution": "bundler", // For modern bundlers (TS 4.7+)

    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**When to use "bundler"**: If you're using modern tools like Vite, esbuild, or Webpack with ESM support. It handles ES modules better and provides more accurate type checking for bundled environments.

**When to use "node"**: For Node.js applications, older projects, or when you need maximum compatibility.

## Real-World Configuration Example

Here's a production-ready setup for a typical React app:

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/utils/*": ["src/utils/*"],
      "@/services/*": ["src/services/*"],
      "@/types/*": ["src/types/*"],
      "@/assets/*": ["src/assets/*"],
      "@/styles/*": ["src/styles/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "build"]
}
```

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
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/assets': path.resolve(__dirname, './src/assets'),
      '@/styles': path.resolve(__dirname, './src/styles'),
    },
  },
  server: {
    port: 3000,
  },
});
```

## Common Gotchas and Solutions

### 1. Aliases Not Working in Tests

**Problem**: Your aliases work in development but fail in tests.

**Solution**: Make sure your test runner knows about your aliases:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

### 2. Import Auto-completion Not Working

**Problem**: Your editor doesn't suggest files when using aliases.

**Solution**: Restart your TypeScript server and ensure your `tsconfig.json` is valid:

- VS Code: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"
- Make sure `baseUrl` is set correctly
- Verify your paths don't have typos

### 3. Build Works but Types Don't

**Problem**: Your bundler resolves aliases correctly, but TypeScript complains.

**Solution**: Double-check that your `tsconfig.json` paths match your bundler configuration exactly. Pay attention to trailing slashes and glob patterns:

```json
// ✅ Correct
"@/*": ["src/*"]

// ❌ Wrong - missing glob
"@/": ["src/"]
```

### 4. Barrel Exports Creating Performance Issues

**Problem**: Using `index.ts` files with aliases can slow down development.

```ts
// ❌ This imports everything from utils
import { formatDate } from '@/utils';

// ✅ This imports only what you need
import { formatDate } from '@/utils/date';
```

**Solution**: Be specific with your imports, or use dynamic imports for large modules.

## Migration Strategy

Moving an existing codebase to use path aliases? Here's a step-by-step approach:

1. **Start small**: Add one alias (like `@/*`) and update a few files
2. **Use find-and-replace**: Most editors can help automate the conversion
3. **Update tests**: Make sure your test configuration includes the new aliases
4. **Gradual rollout**: Convert one directory at a time to avoid breaking everything
5. **Team coordination**: Document your chosen conventions so everyone uses them consistently

Path aliases are a small change that makes a huge difference in code maintainability. Once you've set them up correctly, your imports become cleaner, your refactoring becomes safer, and your developers become happier. Just remember: the key is keeping your TypeScript and bundler configurations in sync—because nothing's worse than code that type-checks but fails at runtime.
