---
title: tsconfig.json Deep Dive
description: Let's tweak our TypeScript and React setup.
modified: '2025-09-27T18:58:51.877Z'
date: '2025-09-27T18:53:50.164Z'
---

As we saw in the [previous section](./setting-up-react-and-typescript.md).The `tsconfig.json` file is the command center for TypeScript in your project. It tells TypeScript:

- How to compile your code—or in React's case—how to type-check it.
- Which files to include/exclude.
- How strict to be about type checking.
- How to resolve modules and paths.

In a React + Vite project, TypeScript doesn't actually compile your code—Vite does that. Instead, TypeScript purely provides type checking. This is why we use `noEmit: true`.

## The Complete Configuration

Let's build the optimal `tsconfig.json` step by step:

```json
{
  "compilerOptions": {
    // Target and Library Settings
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",

    // JavaScript Support
    "allowJs": true,
    "checkJs": false,

    // Emit Configuration
    "noEmit": true,
    "sourceMap": true,
    "jsx": "react-jsx",

    // Type Checking - Strict Settings
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": false,
    "exactOptionalPropertyTypes": false,
    "noFallthroughCasesInSwitch": true,

    // Type Checking - Code Quality
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,

    // Module Resolution
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "verbatimModuleSyntax": true,

    // Path Mapping
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"]
    },

    // Performance
    "skipLibCheck": true,
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/.cache/typescript/tsconfig.tsbuildinfo",

    // Consistency
    "forceConsistentCasingInFileNames": true,

    // Environment Types
    "types": ["vite/client"]
  },
  "include": ["src/**/*", "vite.config.ts"],
  "exclude": ["node_modules", "dist", "build", "coverage"]
}
```

## Target and Library Settings

### `"target": "ES2022"`

**What it does:** Specifies the JavaScript version TypeScript compiles to.

**Why ES2022?**

- Includes modern features like top-level await, class fields, and `.at()` method
- All modern browsers support ES2022
- Vite will handle any additional transpilation needed for older browsers

**Alternatives:**

- `"ESNext"`: Always latest features (less predictable)
- `"ES2020"`: More conservative, but misses nice features

### `"lib": ["DOM", "DOM.Iterable", "ES2022"]`

**What it does:** Tells TypeScript which built-in APIs are available.

**Breaking it down:**

- `"DOM"`: Browser APIs (document, window, HTMLElement)
- `"DOM.Iterable"`: Makes DOM collections iterable (for...of loops on NodeLists)
- `"ES2022"`: JavaScript language features matching our target

**Could add:** `"WebWorker"` if using web workers, `"ES2022.Array"` for specific features

### `"module": "ESNext"`

**What it does:** Specifies the module system for emitted code.

**Why ESNext?** We're using native ES modules, and Vite handles the actual module transformation. This gives us:

- Dynamic imports
- Top-level await
- Import assertions

### `"moduleResolution": "bundler"`

**What it does:** How TypeScript resolves import statements.

**Why bundler?** New in TS 5.0+, designed for tools like Vite:

- Allows imports without extensions
- Supports package.json `exports` field
- More permissive than `"node16"` but safer than legacy `"node"`

**Legacy option:** `"node"` - still common but less accurate for modern bundlers

## JavaScript Support

### `"allowJs": true`

**What it does:** Lets TypeScript process JavaScript files.

**Why enable?**

- Gradual migration from JS to TS
- Third-party JS code in your source
- Configuration files often in JS

### `"checkJs": false`

**What it does:** Type-checks JavaScript files.

**Why disable?**

- JS files might have looser patterns
- Avoid errors in config files
- Can enable per-file with `// @ts-check`

**🔒 Stricter option:** Set to `true` for full type checking in JS files

## Emit Configuration

### `"noEmit": true`

**What it does:** Prevents TypeScript from generating output files.

**Critical for React:** Vite/esbuild handles compilation, TypeScript only type-checks. This prevents:

- Duplicate output files
- Compilation conflicts
- Slower builds

### `"sourceMap": true`

**What it does:** Generates source maps for debugging.

**Why enable?** Better debugging experience - see original TS code in browser DevTools

**Note:** Only matters if `noEmit: false`

### `"jsx": "react-jsx"`

**What it does:** How JSX is transformed.

**Options explained:**

- `"react-jsx"`: New transform (React 17+), no React import needed
- `"react"`: Legacy, requires `import React from 'react'`
- `"preserve"`: Leaves JSX unchanged (for other tools to handle)

## The Strict Family

### `"strict": true`

**What it does:** Enables ALL strict type-checking options:

- `strictNullChecks`: null/undefined must be explicit
- `strictFunctionTypes`: Stricter function compatibility
- `strictBindCallApply`: Type-check .bind(), .call(), .apply()
- `strictPropertyInitialization`: Class properties must be initialized
- `noImplicitAny`: No implicit any types
- `noImplicitThis`: 'this' must have explicit type
- `alwaysStrict`: Emit "use strict"
- `useUnknownInCatchVariables`: catch clause variables are 'unknown'

**This is non-negotiable** for any serious TypeScript project.

### `"noImplicitOverride": true`

**What it does:** Requires `override` keyword when overriding base class methods.

```typescript
// Without this flag - silent bugs possible
class Dog extends Animal {
  speak() {} // Did we mean to override? Typo?
}

// With flag - explicit intent
class Dog extends Animal {
  override speak() {} // Clear we're overriding
}
```

### `"noPropertyAccessFromIndexSignature": false`

**What it does:** When true, forces bracket notation for index signatures.

**Why we disable it:**

```typescript
interface Config {
  [key: string]: string;
}
const config: Config = { name: 'app' };

// With flag true (stricter but annoying):
config['name']; // Required
config.name; // Error!

// With flag false (our choice):
config.name; // Allowed - better DX
```

**🔒 Stricter option:** Enable for explicit index access patterns

### `"exactOptionalPropertyTypes": false`

**What it does:** Distinguishes between undefined and missing properties.

**Why we disable it:**

```typescript
interface User {
  name?: string;
}

// With flag false (our choice):
const user: User = { name: undefined }; // Allowed

// With flag true (stricter):
const user: User = { name: undefined }; // Error!
```

Most React code doesn't distinguish these cases, enabling causes friction.

**🔒 Stricter option:** Enable for precise optional property handling

### `"noFallthroughCasesInSwitch": true`

**What it does:** Errors on fallthrough cases in switch statements.

```typescript
switch(action) {
  case 'save':
    save();
    // Error! Did you forget 'break'?
  case 'delete':
    delete();
}
```

## Code Quality Checks

### `"noUnusedLocals": false` / `"noUnusedParameters": false`

**What it does:** Errors on unused variables/parameters.

**Why we disable:**

- Annoying during development
- ESLint handles this better
- Can prefix with `_` to indicate intentionally unused

**🔒 Stricter option:** Enable both for cleaner code

### `"noImplicitReturns": true`

**What it does:** All code paths must explicitly return.

```typescript
function calculate(n: number): number {
  if (n > 0) {
    return n * 2;
  }
  // Error! Missing return statement
}
```

### `"allowUnreachableCode": false`

**What it does:** Errors on code after return/throw/break.

```typescript
function example() {
  return 5;
  console.log('Never runs'); // Error!
}
```

## Module Resolution Options

### `"esModuleInterop": true`

**What it does:** Fixes CommonJS/ES module interoperability.

**Enables:**

```typescript
// Without:
import * as React from 'react';

// With:
import React from 'react';
```

### `"allowSyntheticDefaultImports": true`

**What it does:** Allows default imports from modules without default export.

**Note:** Implied by `esModuleInterop`, but explicit is clearer.

### `"resolveJsonModule": true`

**What it does:** Import JSON files as modules.

```typescript
import config from './config.json';
```

### `"isolatedModules": true`

**What it does:** Ensures each file can be transpiled independently.

**Critical for Vite/esbuild** which transpile file-by-file. Catches:

- Files without imports/exports
- Type-only imports not marked as such

### `"moduleDetection": "force"`

**What it does:** Treats all files as modules (not scripts).

**Benefits:**

- No accidental globals
- Consistent file treatment
- Required for top-level await

### `"verbatimModuleSyntax": true`

**What it does:** Requires explicit `type` modifier for type-only imports.

```typescript
// Bad - ambiguous
import { User } from './types';

// Good - explicit
import type { User } from './types';
```

**Why?** Bundlers can tree-shake better, clearer intent.

## Path Mapping

### `"baseUrl": "."`

**What it does:** Base directory for non-relative imports.

### `"paths"`

**What it does:** Custom module resolution paths.

```typescript
// Instead of:
import Button from '../../../components/Button';

// You can:
import Button from '@components/Button';
```

**Best practices:**

- Keep aliases focused and meaningful
- Mirror your folder structure
- Don't overdo it (too many aliases = confusion)

## Performance

### `"skipLibCheck": true`

**What it does:** Skip type checking of declaration files (.d.ts).

**Why enable?**

- Faster compilation
- Avoid errors in third-party types
- You can't fix node_modules anyway

**🔒 Stricter option:** Disable to catch all type issues

### `"incremental": true`

**What it does:** Saves compilation info for faster subsequent builds.

### `"tsBuildInfoFile"`

**What it does:** Where to store incremental compilation info.

**Best practice:** Use node_modules/.cache to keep project clean.

## Environment Types

### `"types": ["vite/client"]`

**What it does:** Which type packages to include globally.

**Common additions:**

```json
"types": [
  "vite/client",     // Vite env variables
  "node",            // Node.js types if needed
  "@testing-library/jest-dom", // Testing matchers
  "vitest/globals"   // If using Vitest
]
```

## Advanced: Multiple Config Strategy

### Base config (`tsconfig.json`)

Your main configuration (shown above)

### Node config (`tsconfig.node.json`)

For Vite config and Node.js scripts:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "types": ["node"],
    "allowJs": true
  },
  "include": ["vite.config.ts", "*.config.js"]
}
```

### Build config (`tsconfig.build.json`)

Stricter for production:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "exclude": ["**/*.test.tsx", "**/*.spec.tsx"]
}
```

## Where We Chose Developer Experience Over Strictness

### `noUncheckedIndexedAccess` (not included)

**What it does:** Makes indexed access return `T | undefined`

```typescript
const arr = [1, 2, 3];
const first = arr[0]; // number | undefined with flag
// Requires constant checking even for "safe" access
```

In my humble opinion, this is much friction for most React applications. Consider for high-reliability applications. Every time I try to be a good person and use this, I end up turning it off _real fast_.

### `noPropertyAccessFromIndexSignature: false`

Allows natural property access on index signatures.

### `exactOptionalPropertyTypes: false`

Doesn't distinguish undefined from missing - matches most React patterns.

### `noUnusedLocals/Parameters: false`

ESLint handles this better with more flexibility.

## Decision Framework

**Enable for safety:**

- All `strict` options
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`

**Enable for clarity:**

- `verbatimModuleSyntax`
- `noImplicitOverride`
- `isolatedModules`

**Consider per project:**

- `noUncheckedIndexedAccess` - High safety requirements
- `noUnusedLocals/Parameters` - Clean codebase
- `exactOptionalPropertyTypes` - API precision

**Always enable for React:**

- `jsx: "react-jsx"`
- `noEmit: true`
- `moduleResolution: "bundler"`

## Common Pitfalls

1. **Don't use `"moduleResolution": "node"`** - It's legacy
2. **Don't disable `strict`** - It's a package deal
3. **Don't forget `isolatedModules`** - Required for Vite
4. **Don't mix build tools** - Let Vite build, TypeScript check

## Checking Your Config

Run these commands to verify:

```bash
# Type checking
npx tsc --noEmit

# See computed config
npx tsc --showConfig

# Check specific file
npx tsc --noEmit --explain-files | grep "yourfile.tsx"
```

Remember: TypeScript is a tool to help you ship better code faster, not to fight with you. This config embodies that philosophy.
