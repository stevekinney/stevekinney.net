---
title: 'Development: blazing fast with real-time feedback'
description: >-
  Setting up tooling for TypeScript React projects feels like assembling
  furniture from three different stores—everything should work together, but the
  instructions never quite align. Let's build a complete tooling setup that
  combines ESLi...
modified: '2025-09-06T17:49:18-06:00'
date: '2025-09-06T17:49:18-06:00'
---

Setting up tooling for TypeScript React projects feels like assembling furniture from three different stores—everything should work together, but the instructions never quite align. Let's build a complete tooling setup that combines ESLint's type-aware linting, Prettier's consistent formatting, and a build pipeline that's both fast for development and bulletproof for production. By the end, you'll have a development environment that catches bugs early, formats code automatically, and builds blazingly fast.

The secret is treating these tools as complementary rather than competing—each excels at a specific job, and the magic happens when they work together seamlessly.

## The Complete Setup Overview

Modern TypeScript tooling works best when you separate concerns:

- **ESLint**: Catches logic errors and enforces code quality (with TypeScript awareness)
- **Prettier**: Handles all formatting consistently
- **Build Pipeline**: Fast transpilation for development, thorough checking for production

Here's what we're building toward:

```bash
# Development: blazing fast with real-time feedback
pnpm dev          # Vite dev server (no type checking)
pnpm type:watch   # TypeScript checking in separate terminal

# Pre-commit: quick quality gates
pnpm check-all    # Type check + lint + format check

# Production: comprehensive and bulletproof
pnpm build        # Type check → lint → build optimized bundle
```

## Project Foundation

Let's start with the essential dependencies:

```bash
# Core tooling
pnpm add -D typescript @types/react @types/react-dom

# Linting and formatting
pnpm add -D eslint prettier
pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
pnpm add -D eslint-config-prettier eslint-plugin-prettier
pnpm add -D eslint-plugin-react eslint-plugin-react-hooks

# Build tools (choose your fighter)
pnpm add -D vite @vitejs/plugin-react-swc  # Fast option
# OR
pnpm add -D @swc/cli @swc/core             # Direct SWC usage
```

## TypeScript Configuration Strategy

The foundation of good tooling is proper TypeScript configuration. We'll use multiple config files for different purposes:

### Base Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true, // ✅ We'll handle transpilation separately
    "jsx": "react-jsx",

    // Type checking strictness
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true
  },
  "include": ["src/**/*", "vite.config.ts"],
  "exclude": ["node_modules", "dist", "build"]
}
```

### Build-Specific Config (`tsconfig.build.json`)

For libraries or when you need declaration files:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist/types",
    "emitDeclarationOnly": true // Only generate .d.ts files
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.*", "src/**/*.spec.*", "**/*.stories.*"]
}
```

## ESLint Configuration with Type Awareness

Create `.eslintrc.json` that leverages TypeScript's type information:

```json
{
  "env": {
    "browser": true,
    "es2022": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "plugin:prettier/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": ["./tsconfig.json"] // ✅ Enables type-aware rules
  },
  "plugins": ["react", "@typescript-eslint"],
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "rules": {
    // Type-aware safety rules
    "@typescript-eslint/no-unsafe-argument": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error",

    // Async/Promise safety
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": ["error", { "checksVoidReturn": false }],

    // Modern TypeScript patterns
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/strict-boolean-expressions": [
      "error",
      {
        "allowString": false,
        "allowNumber": false,
        "allowNullableObject": false
      }
    ],

    // React-specific
    "react/prop-types": "off", // Using TypeScript instead
    "react/react-in-jsx-scope": "off", // React 17+ JSX transform

    // Code quality
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ]
  },
  "overrides": [
    {
      "files": ["**/*.js", "**/*.jsx"],
      "rules": {
        // Disable type-aware rules for JS files
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-return": "off"
      }
    },
    {
      "files": ["vite.config.ts", "vitest.config.ts"],
      "rules": {
        // Build configs often use dynamic imports
        "@typescript-eslint/no-unsafe-member-access": "off"
      }
    }
  ]
}
```

## Prettier Configuration

Create `.prettierrc.json` for consistent formatting:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

And `.prettierignore` to skip generated files:

```
node_modules
dist
build
coverage
*.generated.ts
*.generated.js
public/build
.cache
```

## Build Pipeline Configuration

### Option 1: Vite (Recommended for Most Projects)

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'; // Uses SWC for speed

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true, // Helpful for debugging
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  // Optimize deps that commonly cause issues
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
```

### Option 2: Direct SWC Usage

If you need more control, create `.swcrc`:

```json
{
  "jsc": {
    "target": "es2020",
    "parser": {
      "syntax": "typescript",
      "tsx": true,
      "decorators": true,
      "dynamicImport": true
    },
    "transform": {
      "react": {
        "runtime": "automatic",
        "development": false,
        "refresh": false
      }
    }
  },
  "module": {
    "type": "es6",
    "strictMode": true
  },
  "sourceMaps": true
}
```

## Package Scripts That Tie Everything Together

Here's the `package.json` scripts section that orchestrates all our tooling:

```json
{
  "scripts": {
    // Development
    "dev": "vite",
    "dev:host": "vite --host",

    // Type checking (separate from transpilation)
    "type:check": "tsc --noEmit",
    "type:watch": "tsc --noEmit --watch --pretty",

    // Linting and formatting
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx --cache",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --cache --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",

    // Building
    "build": "npm run check-all && vite build",
    "build:lib": "npm run check-all && swc src -d dist/lib && tsc -p tsconfig.build.json",
    "build:analyze": "npm run build && npx vite-bundle-analyzer",

    // Quality gates
    "check-all": "npm run type:check && npm run lint && npm run format:check",
    "fix-all": "npm run lint:fix && npm run format",

    // Testing
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",

    // Utilities
    "clean": "rm -rf dist node_modules/.cache",
    "preview": "vite preview"
  }
}
```

## Development Workflow

### The Fast Development Loop

During active development, run these in separate terminals:

```bash
# Terminal 1: Fast dev server (no type checking)
pnpm dev

# Terminal 2: Real-time type checking
pnpm type:watch
```

This setup gives you:

- **Sub-second** hot reloading for UI changes
- **Immediate** type error feedback in a dedicated terminal
- **Zero** build time interruptions for type errors

### Pre-commit Quality Gates

Before committing code, run your quality gates:

```bash
# Quick check before committing
pnpm check-all

# Or fix issues automatically
pnpm fix-all && pnpm type:check
```

### Production Builds

For production deployments:

```bash
# Full production build with all checks
pnpm build

# Analyze bundle size
pnpm build:analyze
```

## IDE Integration

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",

  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
  "eslint.codeActionsOnSave.mode": "all",

  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.fixAll.prettier": "explicit"
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  // TypeScript-specific
  "typescript.preferences.useAliasesForRenames": false,
  "typescript.suggest.completeFunctionCalls": true
}
```

### Recommended Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

## Performance Optimization Strategies

### Tiered Linting Approach

For large projects, create a fast configuration for development:

```json
// .eslintrc.dev.json (faster, no type checking)
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:prettier/recommended"
  ]
  // Note: No "recommended-requiring-type-checking"
}
```

Update your scripts:

```json
{
  "scripts": {
    "lint:dev": "eslint . --config .eslintrc.dev.json --cache",
    "lint:ci": "eslint . --cache", // Uses full config
    "dev:check": "concurrently \"pnpm dev\" \"pnpm type:watch\" \"pnpm lint:dev --watch\""
  }
}
```

### Build Optimization

Cache everything you can:

```bash
# Enable ESLint caching
echo ".eslintcache" >> .gitignore

# Enable TypeScript incremental builds
# (add to tsconfig.json)
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # Run checks in parallel for speed
      - name: Type check
        run: pnpm type:check

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

      - name: Test
        run: pnpm test --coverage

      - name: Build
        run: pnpm build
```

### Pre-commit Hooks with Husky

```bash
# Install husky and lint-staged
pnpm add -D husky lint-staged

# Initialize husky
npx husky install
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --cache --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged for changed files
npx lint-staged

# Quick type check
pnpm type:check
```

## Common Gotchas and Solutions

### The "Can't Find Module" Issue

When separating transpilation from type checking, you might see import errors:

```ts
// ❌ This might cause issues with some transpilers
import type { ComponentProps } from 'react';
import Button from './Button';

// ✅ More explicit imports work better
import { type ComponentProps } from 'react';
import { Button } from './Button';
```

### ESLint Performance Issues

Type-aware rules can be slow. Monitor with:

```bash
# Check which rules are slowest
TIMING=1 npx eslint src/
```

Consider disabling expensive rules in development:

```json
{
  "overrides": [
    {
      "files": ["**/*"],
      "env": {
        "development": true
      },
      "rules": {
        "@typescript-eslint/strict-boolean-expressions": "off"
      }
    }
  ]
}
```

### Build Tool Compatibility

Some TypeScript features aren't supported by fast transpilers:

```ts
// ❌ const enums don't work with esbuild/SWC
const enum Status {
  Loading = 'loading',
  Success = 'success',
}

// ✅ Use const assertions instead
const Status = {
  Loading: 'loading',
  Success: 'success',
} as const;

type Status = (typeof Status)[keyof typeof Status];
```

## Troubleshooting Your Setup

### Debug ESLint Issues

```bash
# Check what files ESLint is processing
npx eslint --debug src/

# Test specific rules
npx eslint --rule '@typescript-eslint/no-unsafe-assignment: error' src/
```

### Debug TypeScript Issues

```bash
# Check what files TypeScript sees
npx tsc --listFiles --noEmit

# Trace module resolution
npx tsc --traceResolution --noEmit > resolution.log
```

### Debug Build Issues

```bash
# Check what Vite is doing
DEBUG=vite:* pnpm dev

# Analyze bundle
npx vite-bundle-analyzer dist/
```

## Choosing Your Configuration

Here's a decision matrix for different project types:

**Small Projects (< 20 components)**

- Use Vite with default settings
- Basic ESLint config without type-aware rules
- Standard Prettier config

**Medium Projects (20-100 components)**

- Full type-aware ESLint setup
- Separate type checking from transpilation
- Pre-commit hooks for quality gates

**Large Projects (100+ components)**

- Tiered linting (fast for dev, comprehensive for CI)
- Incremental TypeScript builds
- Comprehensive CI pipeline with caching

**Libraries**

- Always generate declaration files
- Use SWC for JavaScript, `tsc` for declarations
- Test with multiple TypeScript versions

## Next Steps

With this foundation, you're ready to:

1. **Add testing tools** like Vitest or Jest with TypeScript support
2. **Integrate bundle analysis** to monitor size and performance
3. **Set up Storybook** for component development
4. **Add accessibility linting** with eslint-plugin-jsx-a11y
5. **Experiment with newer tools** like Turbopack or Biome

The key insight is that great tooling feels invisible when it works and saves you hours when it doesn't. This setup gives you fast iteration, early error detection, and bulletproof production builds—the foundation every TypeScript React project deserves.

Your tools should make you more productive, not get in your way. With type-aware linting catching bugs, Prettier handling formatting, and a hybrid build pipeline optimized for both speed and correctness, you're free to focus on what matters: building great user experiences.
