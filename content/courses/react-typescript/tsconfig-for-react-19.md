---
title: Tsconfig That Loves React 19
description: Dial in strictness, module resolution, JSX settings, and project references—fast builds without losing safety.
date: 2025-09-06T22:23:57.262Z
modified: 2025-09-06T22:23:57.262Z
published: true
tags: ['react', 'typescript', 'tsconfig', 'react-19', 'configuration']
---

Your TypeScript configuration is the foundation of your React 19 project—it controls how your code compiles, how modules resolve, and how strictly TypeScript validates your types. Getting it right means faster builds, better developer experience, and fewer runtime surprises. Getting it wrong? Well, you'll spend more time fighting your toolchain than building features.

React 19 brings new APIs like the `use` hook, Server Components, and enhanced concurrent features that benefit from specific TypeScript configuration choices. Let's build a `tsconfig.json` that handles these modern patterns while keeping your builds snappy and your types safe.

## Starting with a Modern Foundation

Here's a solid base configuration for React 19 projects:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Let's break down why each of these choices matters for React 19.

## Modern JavaScript Targets

```json
{
  "target": "ES2022",
  "lib": ["ES2023", "DOM", "DOM.Iterable"]
}
```

React 19's concurrent features and the new `use` hook heavily rely on modern JavaScript features like `Promise.withResolvers()` and top-level await patterns. Targeting ES2022 gives you native async/await, optional chaining, and nullish coalescing—all staples of modern React code.

The `DOM.Iterable` lib is particularly important for React 19's enhanced iteration patterns:

```ts
// React 19 supports more ergonomic iteration patterns
function UserList({ users }: { users: User[] }) {
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## Module Resolution That Works

```json
{
  "module": "ESNext",
  "moduleResolution": "bundler",
  "allowImportingTsExtensions": true
}
```

The `bundler` resolution strategy is designed for modern build tools (Vite, esbuild, SWC) that React 19 projects typically use. It understands Node.js-style resolution while supporting bundler-specific features.

`allowImportingTsExtensions` lets you import TypeScript files directly:

```ts
// ✅ Now you can be explicit about imports
import { UserSchema } from './schemas/user.schema.ts';
import { Button } from '../components/Button.tsx';
```

This is especially valuable in monorepos where different packages might have different build outputs.

## JSX Configuration for React 19

```json
{
  "jsx": "react-jsx"
}
```

React 19 continues to use the automatic JSX transform introduced in React 17. This means no more manual React imports in every file:

```tsx
// ✅ Clean, modern React 19 component
function AsyncComponent({ userId }: { userId: string }) {
  const user = use(fetchUser(userId)); // No React import needed!

  return <div>{user.name}</div>;
}
```

> [!TIP]
> If you're still seeing errors about React not being defined, double-check that your bundler is configured for the automatic JSX transform.

## Strictness That Prevents Bugs

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

React 19's new APIs benefit from strict type checking. The `noUncheckedIndexedAccess` option is particularly valuable with Server Components and dynamic imports:

```ts
// ❌ Without noUncheckedIndexedAccess
function getUser(users: User[], id: string) {
  return users[parseInt(id)]; // Could be undefined!
}

// ✅ With noUncheckedIndexedAccess
function getUser(users: User[], id: string) {
  const user = users[parseInt(id)]; // Type: User | undefined
  if (!user) throw new Error('User not found');
  return user; // Now safely typed as User
}
```

`exactOptionalPropertyTypes` catches a common React props issue:

```tsx
type ButtonProps = {
  variant?: 'primary' | 'secondary';
};

function Button({ variant }: ButtonProps) {
  // ❌ This would fail with exactOptionalPropertyTypes
  // if someone passed { variant: undefined }
  const className = variant === 'primary' ? 'btn-primary' : 'btn-secondary';

  // ✅ Handle the optional properly
  const className = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
}
```

## Performance Optimizations

```json
{
  "isolatedModules": true,
  "noEmit": true,
  "skipLibCheck": true
}
```

These settings optimize for modern build tools:

- `isolatedModules`: Ensures each file can be compiled independently (required for SWC/esbuild)
- `noEmit`: TypeScript only does type checking; your bundler handles code generation
- `skipLibCheck`: Skips type checking of declaration files for faster builds

In a React 19 project with hundreds of components, these can cut your type checking time significantly.

## Advanced Configuration Patterns

### Path Mapping for Clean Imports

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

This gives you clean imports across your React app:

```tsx
// ✅ Clean and predictable
import { useAsyncData } from '@hooks/useAsyncData';
import { Button } from '@components/Button';
import { validateUser } from '@utils/validation';
```

### Project References for Monorepos

If you're working in a monorepo with shared React components:

```json
{
  "references": [
    { "path": "./packages/ui" },
    { "path": "./packages/utils" },
    { "path": "./apps/web" }
  ]
}
```

This enables TypeScript's build coordination across your monorepo, essential for shared component libraries:

```tsx
// In apps/web/src/App.tsx
import { Button } from '@company/ui'; // Properly typed from packages/ui
import { formatDate } from '@company/utils'; // Properly typed from packages/utils
```

## React 19 Specific Considerations

### Server Components Support

If you're using React Server Components, you might need different configs for client and server:

```json
// tsconfig.server.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2023"], // No DOM for server
    "types": ["node"] // Node.js types instead
  },
  "include": ["src/app/**/*server*", "src/lib/server/**/*"]
}
```

### Concurrent Features Type Safety

For React 19's concurrent features, ensure your async patterns are well-typed:

```tsx
// The 'use' hook benefits from strict async typing
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json(); // Make sure this matches User type
}

function UserProfile({ userId }: { userId: string }) {
  // TypeScript ensures the promise resolves to User
  const user = use(fetchUser(userId));
  return <div>{user.name}</div>;
}
```

## Development vs Production Configs

You might want different strictness levels during development:

```json
// tsconfig.dev.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

Then in your package.json:

```json
{
  "scripts": {
    "dev": "vite --mode development",
    "type-check": "tsc --project tsconfig.json --noEmit",
    "type-check:dev": "tsc --project tsconfig.dev.json --noEmit",
    "build": "tsc --project tsconfig.json --noEmit && vite build"
  }
}
```

## Common Pitfalls and Solutions

### Module Resolution Issues

If you're seeing "Cannot find module" errors with React 19:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler", // Not "node"
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true
  }
}
```

### JSX Transform Errors

If you're getting React-related JSX errors:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx", // Not "react" or "preserve"
    "jsxImportSource": "react" // Usually not needed, but helpful for custom JSX
  }
}
```

### Slow Type Checking

For large React 19 projects:

```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "isolatedModules": true,
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

> [!WARNING]
> Don't disable strict checks just to speed up builds. The type safety is worth the extra seconds.

## Validation and Testing Your Config

Create a simple test to verify your configuration works:

```tsx
// test-config.tsx - Put this in your src folder temporarily
import { use } from 'react'; // React 19 import should work
import { Button } from './components/Button'; // Path mapping should work

// This should type-check properly
const asyncData: Promise<{ name: string }> = Promise.resolve({ name: 'Test' });

function TestComponent() {
  const data = use(asyncData); // Should be properly typed
  return <Button variant="primary">{data.name}</Button>;
}

// Strictness test - this should error with your strict config
const maybeUser: { name: string } | undefined = undefined;
console.log(maybeUser.name); // Should error with strict checks
```

Run `tsc --noEmit` to verify everything type-checks correctly, then delete the test file.

## Keeping Your Config Updated

React and TypeScript evolve quickly. Here's how to stay current:

1. **Follow React's TypeScript integration updates** in their release notes
2. **Monitor TypeScript's release blog** for new compiler options
3. **Use tools like `@typescript-eslint/parser`** to ensure your config stays compatible with your linting setup
4. **Test your config with new TypeScript versions** before upgrading

Your `tsconfig.json` is more than configuration—it's a contract between you and the type system that keeps your React 19 applications safe, fast, and maintainable. With these settings, you're ready to take full advantage of React 19's features while maintaining the type safety that makes TypeScript worthwhile.
