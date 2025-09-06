---
title: Build Pipeline: tsc, SWC, and Vite
description: Choose the right compiler and checker—separate type checking from transpile for fast builds and reliable CI.
date: 2025-09-06T22:04:44.974Z
modified: 2025-09-06T22:04:44.974Z
published: true
tags: ['react', 'typescript', 'build-tools', 'tsc', 'swc', 'vite', 'performance', 'tooling']
---

Modern TypeScript build tooling has evolved beyond the "just use `tsc` for everything" approach. Today's fastest development setups separate type checking from transpilation, using specialized tools for each job. Let's explore how to build a robust pipeline with TypeScript's compiler (`tsc`), the ultra-fast SWC transpiler, and Vite's development server—and understand when to use each tool.

You're probably here because your builds are slow, your CI is timing out, or you're wondering why everyone keeps talking about SWC and esbuild. The short answer: TypeScript's official compiler is thorough but leisurely, while newer tools focus on speed by doing less work. The trick is knowing how to combine them effectively.

## The Modern Build Landscape

In the early days of TypeScript, `tsc` was your only option for both type checking and transpilation. It worked fine for smaller projects, but as codebases grew, build times became painful. Modern tooling solves this by specializing:

- **Type checkers** (like `tsc`) focus on correctness and emit `.d.ts` files
- **Transpilers** (like SWC, esbuild, Babel) focus on speed and JavaScript output
- **Bundlers** (like Vite, Webpack) orchestrate everything and handle development servers

This separation lets you get fast feedback during development while maintaining type safety.

## Understanding the Players

### TypeScript Compiler (tsc)

The original and most comprehensive option. When you run `tsc`, it:

- **Type checks** your entire codebase
- **Transpiles** TypeScript to JavaScript
- **Generates** declaration files (`.d.ts`)
- **Handles** complex TypeScript features like decorators and emit helpers

```bash
# Traditional approach - does everything
tsc --build
```

**Pros**: Complete TypeScript support, generates declaration files, handles complex scenarios
**Cons**: Slower for large codebases, single-threaded type checking

### SWC (Speedy Web Compiler)

Written in Rust, SWC focuses purely on fast transpilation:

```bash
# Install SWC
pnpm add -D @swc/cli @swc/core
```

SWC transforms TypeScript to JavaScript without type checking—it simply strips types and transforms syntax. This makes it significantly faster than `tsc` for transpilation.

**Pros**: Extremely fast, good TypeScript support, handles JSX well
**Cons**: No type checking, no declaration file generation, newer tool with evolving ecosystem

### Vite

A build tool that uses esbuild (similar philosophy to SWC) during development and Rollup for production builds:

```bash
# Vite with TypeScript support
pnpm create vite my-app --template react-ts
```

**Pros**: Fast dev server, excellent DX, handles most TypeScript scenarios
**Cons**: Complex configurations can be tricky, esbuild has some TypeScript limitations

## Setting Up a Hybrid Pipeline

The winning strategy combines these tools: use fast transpilers for development speed, and `tsc` for type checking and declaration generation. Here's how to set it up:

### Project Structure

```
my-app/
├── src/
│   ├── components/
│   └── index.ts
├── tsconfig.json
├── tsconfig.build.json
├── vite.config.ts
├── .swcrc
└── package.json
```

### TypeScript Configuration

First, create a base `tsconfig.json` for your IDE and type checking:

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
    "noEmit": true, // ✅ We're not using tsc for transpilation
    "declaration": false,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

For library builds that need declaration files, create `tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false, // ✅ Generate output
    "declaration": true, // ✅ Generate .d.ts files
    "declarationMap": true,
    "outDir": "dist/types",
    "emitDeclarationOnly": true // ✅ Only emit declarations, not JS
  },
  "exclude": ["**/*.test.*", "**/*.spec.*", "dist", "node_modules"]
}
```

### Vite Configuration

Configure Vite for blazing-fast development:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'; // ✅ Uses SWC for even faster builds

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    // For production builds, Vite uses Rollup
    target: 'es2020',
    outDir: 'dist',
    rollupOptions: {
      external: ['react', 'react-dom'], // For library builds
    },
  },
});
```

### SWC Configuration (Optional)

If you want to use SWC directly for builds, create `.swcrc`:

```json
{
  "jsc": {
    "target": "es2020",
    "parser": {
      "syntax": "typescript",
      "tsx": true,
      "decorators": true
    },
    "transform": {
      "react": {
        "runtime": "automatic",
        "development": false
      }
    }
  },
  "module": {
    "type": "es6"
  }
}
```

### Package Scripts

Here's where everything comes together:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "npm run type-check && vite build",
    "build:lib": "npm run type-check && swc src -d dist/lib && tsc -p tsconfig.build.json",
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",
    "lint": "eslint src --ext ts,tsx",
    "test": "vitest"
  }
}
```

Let's break down what each script does:

- `dev`: Vite dev server with SWC transpilation (no type checking)
- `build`: Type check first, then Vite production build
- `build:lib`: For libraries—type check, SWC transpile, then generate declarations
- `type-check`: Run TypeScript compiler in check-only mode
- `type-check:watch`: Continuous type checking during development

## Development Workflow

### Fast Development Loop

During active development, you want the fastest possible feedback:

```bash
# Terminal 1: Fast dev server (no type checking)
pnpm dev

# Terminal 2: Continuous type checking
pnpm type-check:watch
```

This setup gives you:

- **Sub-second** hot module replacement
- **Real-time** type errors in a separate terminal
- **Instant** feedback on code changes

### Pre-commit Checks

Before committing, run full validation:

```bash
# Quick pre-commit script
pnpm type-check && pnpm lint && pnpm test
```

Consider using [Husky](https://typicode.github.io/husky/) to automate this.

## CI/CD Pipeline

Your continuous integration should be thorough but efficient:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm type-check # Full type checking
      - run: pnpm lint # Code quality
      - run: pnpm test # Unit tests
      - run: pnpm build # Production build test
```

> [!TIP]
> Run type checking early in CI—it often catches issues faster than waiting for a full build.

## Real-World Patterns

### Library Development

When building libraries, you need both fast development and proper output:

```json
{
  "scripts": {
    "dev": "vite build --mode development --watch",
    "build": "npm run clean && npm run type-check && npm run build:lib && npm run build:types",
    "build:lib": "swc src -d dist --source-maps",
    "build:types": "tsc -p tsconfig.build.json",
    "clean": "rm -rf dist"
  }
}
```

This pattern:

1. Uses SWC for fast JavaScript output
2. Uses `tsc` only for declaration files
3. Provides source maps for debugging
4. Separates concerns cleanly

### Monorepo Setup

In monorepos, the hybrid approach shines:

```json
{
  "scripts": {
    "dev": "concurrently \"pnpm:dev:*\"",
    "dev:vite": "vite",
    "dev:types": "tsc --build --watch",
    "build": "pnpm type-check && pnpm build:all",
    "build:all": "pnpm --recursive build",
    "type-check": "tsc --build"
  }
}
```

Use TypeScript's project references for efficient cross-package type checking:

```json
// tsconfig.json (root)
{
  "references": [
    { "path": "./packages/ui" },
    { "path": "./packages/utils" },
    { "path": "./apps/web" }
  ]
}
```

## Performance Comparison

Here's what you can expect in a medium-sized React app (~100 components):

| Tool Combination | Dev Server | Type Check | Full Build |
| ---------------- | ---------- | ---------- | ---------- |
| tsc only         | ~8s        | ~12s       | ~25s       |
| Vite + tsc check | ~1s        | ~12s       | ~8s        |
| SWC + tsc check  | ~0.5s      | ~12s       | ~6s        |

The key insight: separating concerns gives you the best of both worlds—fast iteration and thorough checking.

## Troubleshooting Common Issues

### SWC/esbuild Limitations

Some TypeScript features aren't supported by fast transpilers:

```ts
// ❌ Not supported by esbuild/SWC
const enum Colors {
  Red = 'red',
  Blue = 'blue',
}

// ✅ Use regular enums or const assertions instead
const Colors = {
  Red: 'red',
  Blue: 'blue',
} as const;
```

### Decorator Issues

If using decorators (like with class-based React components or MobX):

```json
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

And ensure your transpiler supports them:

```json
// .swcrc
{
  "jsc": {
    "parser": {
      "decorators": true
    }
  }
}
```

### Import/Export Edge Cases

Some complex import patterns might need adjustment:

```ts
// ❌ Might cause issues with some transpilers
export { default as Button } from './Button';

// ✅ More explicit, always works
export { Button as default } from './Button';
```

## Choosing Your Setup

Here's a decision matrix for common scenarios:

**Small Projects (< 50 files)**

- Stick with `tsc` for simplicity
- Or use Vite if you want fast dev server

**Medium Projects (50-500 files)**

- Vite + `tsc --noEmit` for type checking
- Consider SWC if Vite's esbuild has limitations

**Large Projects (500+ files)**

- Definitely separate transpilation from type checking
- Use SWC or esbuild for transpilation
- Consider TypeScript project references
- Invest in proper CI caching

**Libraries**

- Always use `tsc` for declaration file generation
- Use fast transpilers for JavaScript output
- Test with multiple TypeScript versions

## Next Steps

Once you have a solid build pipeline:

1. **Add pre-commit hooks** with Husky for quality gates
2. **Set up CI caching** to speed up builds
3. **Monitor bundle size** with tools like [bundlemon](https://bundlemon.dev/)
4. **Consider parallel type checking** with TypeScript project references
5. **Experiment with newer tools** like Turbopack or rspack

The build tooling landscape evolves quickly, but the principles remain: separate concerns, optimize for the common case (development), and don't sacrifice correctness for speed in production.

Your build pipeline should feel invisible during development and bulletproof in production. With the hybrid approach using specialized tools for specialized jobs, you can achieve both.
