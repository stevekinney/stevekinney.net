---
title: Publishing Types and Monorepos
description: Emit declarations, design stable public APIs, and speed checks with project references in monorepos.
date: 2025-09-06T22:23:57.380Z
modified: 2025-09-06T22:23:57.380Z
published: true
tags: ['react', 'typescript', 'monorepos', 'publishing', 'project-references', 'workspace']
---

Publishing TypeScript libraries feels straightforward until you need to support multiple entry points, maintain backward compatibility, or coordinate releases across a dozen packages. That's when you discover the subtle art of declaration file generation, the power of TypeScript project references, and why "it works on my machine" becomes a battle cry when your consumers can't import your carefully crafted types.

Monorepos amplify these challenges—and opportunities. When done right, they enable atomic changes across multiple packages, shared build configurations, and lightning-fast incremental compilation. When done wrong, they become circular dependency nightmares where changing a single type breaks half your organization's builds.

Today, we'll explore the practical patterns for publishing TypeScript packages from monorepos: generating clean declaration files, designing stable APIs, leveraging project references for speed, and coordinating releases without losing your sanity.

## Declaration File Generation: The Good Parts

TypeScript's declaration file generation is surprisingly sophisticated once you understand its behavior. The key insight is that your published `.d.ts` files become your package's public API contract—they need to be stable, complete, and consumable by projects with different TypeScript configurations.

### Basic Declaration Setup

Start with a TypeScript configuration optimized for publishing:

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "moduleResolution": "node",
    "target": "es2018",
    "module": "esnext"
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "dist"]
}
```

The crucial flags:

- `declaration: true` generates `.d.ts` files alongside compiled JavaScript
- `declarationMap: true` creates source maps for better IDE navigation
- `skipLibCheck: true` prevents TypeScript from checking node_modules types (essential for publishing)

### API Surface Management

Your declaration files expose everything marked as `export`. This becomes your public API, so be intentional about what you expose:

```ts
// ✅ Clean public API
export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export function createUser(profile: UserProfile): Promise<User>;

// ❌ Internal implementation details leaked
export interface DatabaseConnection {
  query: (sql: string) => Promise<any>;
}

export const __internal_db_pool: DatabaseConnection;
```

Use internal modules and namespace patterns to organize implementation details:

```ts
// src/public-api.ts - what consumers import
export type { UserProfile, CreateUserOptions } from './types';
export { createUser, updateUser } from './user-service';

// src/internal/database.ts - implementation details
export interface DatabaseConnection {
  // Internal use only
}

// src/index.ts - main entry point
export * from './public-api';
// Don't export from ./internal/
```

### Handling Complex Types

When publishing libraries with generic types, pay attention to constraint inference:

```ts
// ❌ Consumers see overly complex inferred types
export function processData<T>(data: T, processor: (item: T) => unknown) {
  return data.map(processor);
}

// ✅ Clear, documented generics with constraints
export function processData<T extends readonly unknown[]>(
  data: T,
  processor: (item: T[number]) => unknown,
): unknown[] {
  return data.map(processor);
}
```

TypeScript's declaration emit will inline complex types, which can create unreadable `.d.ts` files. Use type aliases to maintain readability:

```ts
// Generated .d.ts will be clean and readable
export type EventHandler<T> = (event: T) => void | Promise<void>;
export type EventMap = Record<string, unknown[]>;

export declare class EventEmitter<T extends EventMap> {
  on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): void;
}
```

## Project References in Monorepos

TypeScript project references transform monorepo builds from sequential compilation nightmares into elegant, incremental builds. They establish explicit dependencies between packages and enable TypeScript to build only what's changed.

### Setting Up Project References

Start with a root `tsconfig.json` that orchestrates everything:

```json
{
  "files": [],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@company/ui": ["packages/ui/src"],
      "@company/utils": ["packages/utils/src"],
      "@company/types": ["packages/types/src"]
    }
  },
  "references": [
    { "path": "./packages/types" },
    { "path": "./packages/utils" },
    { "path": "./packages/ui" },
    { "path": "./apps/web" },
    { "path": "./apps/admin" }
  ]
}
```

Each package needs `composite: true` to participate in project references:

```json
// packages/ui/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [{ "path": "../types" }, { "path": "../utils" }],
  "include": ["src/**/*"]
}
```

### Understanding Build Modes

Project references enable two powerful build modes:

```bash
# Traditional mode - builds everything
tsc --build

# Watch mode - rebuilds only changed projects
tsc --build --watch

# Clean builds when you need a fresh start
tsc --build --clean
```

The magic happens in `--build` mode, where TypeScript:

1. Analyzes project dependencies
2. Builds projects in topological order
3. Skips unchanged projects (based on file timestamps)
4. Updates only downstream dependents when a project changes

### Handling Circular Dependencies

Project references will catch circular dependencies that might not be obvious in your import graph:

```bash
# TypeScript will error with clear dependency cycle information
error TS6202: Project references may not form a circular graph.
Cycle detected: packages/ui -> packages/theme -> packages/ui
```

Resolve cycles by:

1. Moving shared types to a common package
2. Using dependency injection patterns
3. Restructuring package boundaries

```ts
// ❌ Circular dependency
// packages/ui exports Button
// packages/theme imports Button, exports themes
// packages/ui imports themes

// ✅ Resolved with shared types
// packages/design-tokens exports theme types
// packages/ui imports theme types, exports Button
// packages/theme imports theme types, exports theme implementations
```

## Multi-Package Type Coordination

Managing types across multiple packages requires careful coordination to maintain consistency while allowing independent evolution.

### Shared Type Strategies

**Centralized types package approach:**

```
packages/
├── types/           # Shared interfaces and types
├── ui/              # Consumes types
├── api-client/      # Consumes types
└── validation/      # Consumes and extends types
```

```ts
// packages/types/src/user.ts
export interface BaseUser {
  id: string;
  name: string;
  email: string;
}

// packages/ui/src/user-card.tsx
import type { BaseUser } from '@company/types';

interface UserCardProps {
  user: BaseUser;
  onClick?: () => void;
}

// packages/api-client/src/user-api.ts
import type { BaseUser } from '@company/types';

export interface CreateUserRequest extends Omit<BaseUser, 'id'> {
  password: string;
}
```

**Distributed types with re-exports:**

```ts
// packages/ui/src/types.ts - UI-specific types
export interface ButtonProps {
  variant: 'primary' | 'secondary';
  size: 'sm' | 'md' | 'lg';
}

// packages/ui/src/index.ts - re-export for consumers
export type { ButtonProps } from './types';
export type { BaseUser } from '@company/types'; // Re-export shared types
```

### Version Compatibility Patterns

Use branded types and version markers to manage breaking changes:

```ts
// packages/types/src/versioned-api.ts
declare const __version: unique symbol;

export interface ApiV1<T = unknown> {
  readonly [__version]: 'v1';
  data: T;
  success: boolean;
}

export interface ApiV2<T = unknown> {
  readonly [__version]: 'v2';
  result: T;
  status: 'success' | 'error';
  errors?: string[];
}

// Type guards for safe migration
export function isV1Response<T>(response: ApiV1<T> | ApiV2<T>): response is ApiV1<T> {
  return response[__version] === 'v1';
}
```

### Runtime-Type Integration

Combine TypeScript types with runtime validation for APIs crossing package boundaries:

```ts
// packages/validation/src/user-schema.ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// packages/api-client/src/user-service.ts
import { UserSchema, type User } from '@company/validation';

export async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();

  // Runtime validation ensures type safety
  return UserSchema.parse(data);
}
```

## Advanced Build Patterns

### Conditional Compilation

Use TypeScript's declaration merging for environment-specific types:

```ts
// packages/core/src/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    DATABASE_URL: string;
  }
}

// packages/core/src/browser.d.ts (only in browser builds)
declare global {
  interface Window {
    __APP_CONFIG__: {
      apiUrl: string;
      version: string;
    };
  }
}
```

### Build Script Orchestration

Create smart build scripts that leverage project references:

```json
// package.json
{
  "scripts": {
    "build": "tsc --build",
    "build:watch": "tsc --build --watch",
    "build:clean": "tsc --build --clean && pnpm build",
    "type-check": "tsc --build --dry",
    "build:packages": "pnpm --filter './packages/*' build",
    "build:apps": "pnpm --filter './apps/*' build"
  }
}
```

Use dependency graphs to optimize build order:

```bash
# Build only a specific package and its dependencies
pnpm --filter '@company/ui...' build

# Build everything that depends on a changed package
pnpm --filter '...@company/types' build
```

### Declaration Bundling

For complex packages, bundle declarations to create cleaner public APIs:

```js
// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [
  // Build code
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.js', format: 'esm' },
    plugins: [typescript()],
  },
  // Bundle declarations
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts()],
  },
];
```

This creates a single `.d.ts` file instead of mirroring your source structure, making the package easier to consume.

## Publication Strategies

### Semantic Versioning with Types

Breaking changes in TypeScript aren't always obvious. Consider these scenarios:

```ts
// ❌ Breaking change - removed optional property
interface UserV1 {
  id: string;
  name: string;
  email?: string; // Was optional
}

interface UserV2 {
  id: string;
  name: string;
  email: string; // Now required - BREAKING
}

// ❌ Breaking change - narrowed return type
function processDataV1(): string | number {}
function processDataV2(): string {} // BREAKING - consumers expecting number will fail

// ✅ Non-breaking - widened parameter type
function handleEventV1(event: MouseEvent): void {}
function handleEventV2(event: MouseEvent | KeyboardEvent): void {} // OK - more flexible
```

Use tools like [API Extractor](https://api-extractor.com/) or [publint](https://publint.dev/) to catch accidental breaking changes.

### Changesets and Monorepo Publishing

Coordinate releases across packages with [Changesets](https://github.com/changesets/changesets):

```bash
# Initialize changesets
npx @changesets/cli init

# Add a changeset for your changes
npx changeset

# Version packages based on changesets
npx changeset version

# Publish all changed packages
npx changeset publish
```

Changesets configuration for TypeScript monorepos:

```json
// .changeset/config.json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [["@company/types", "@company/ui", "@company/utils"]],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch"
}
```

The `linked` array ensures related packages are versioned together, preventing type mismatches.

### Package.json Best Practices

Structure your package.json files for optimal TypeScript consumption:

```json
{
  "name": "@company/ui",
  "version": "2.1.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./components": {
      "types": "./dist/components/index.d.ts",
      "import": "./dist/components/index.mjs",
      "require": "./dist/components/index.js"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "peerDependencies": {
    "react": ">=18.0.0",
    "typescript": ">=4.7.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

> [!TIP]
> The `exports` field provides fine-grained control over package entry points and enables tree-shaking optimizations.

## Common Pitfalls and Solutions

### Dependency Hoisting Issues

Monorepo package managers can hoist dependencies in ways that break TypeScript resolution:

```bash
# Force specific packages to install locally
pnpm add typescript --save-dev # in each package

# Or use workspace protocols
"devDependencies": {
  "typescript": "workspace:*"
}
```

### Build Cache Invalidation

Project references rely on file timestamps, which can become stale:

```bash
# When in doubt, clean and rebuild
tsc --build --clean
tsc --build --force

# Or use pnpm's built-in cleaning
pnpm --recursive clean
pnpm build
```

### Type-Only Import Performance

Use type-only imports to prevent unnecessary compilation dependencies:

```ts
// ❌ Creates runtime dependency
import { User } from '@company/types';

// ✅ Type-only import - no runtime dependency
import type { User } from '@company/types';

// ✅ Mixed imports when needed
import { validateUser, type User } from '@company/types';
```

## Next Steps

You now have the tools to publish TypeScript packages from monorepos effectively. The patterns covered here scale from small internal libraries to large, multi-team organizations with dozens of interdependent packages.

Key takeaways:

- **Declaration files are your public API contract** - design them thoughtfully
- **Project references enable incremental builds** - use them to speed up development
- **Coordinate type changes across packages** - use shared types and version markers
- **Automate releases with changesets** - reduce human error in complex publishing workflows

Consider exploring:

- **API Extractor** for generating documentation and detecting breaking changes
- **Lerna** as an alternative to changesets for more complex release orchestration
- **Nx** for advanced build caching and dependency graph analysis
- **TypeScript composite projects** for even faster builds in large codebases

The investment in proper TypeScript tooling pays dividends as your monorepo grows. Start simple, measure build times, and incrementally adopt the patterns that provide the biggest impact for your specific use case.

Remember: the goal isn't to use every TypeScript feature, but to create a sustainable development experience that scales with your team and codebase complexity.
