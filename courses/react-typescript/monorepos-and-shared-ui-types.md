---
title: Install all dependencies
description: >-
  Building applications in isolation is fine until you need to share components,
  utilities, or types across multiple projects. That's when you realize you've
  been copy-pasting the same button component and duplicating TypeScript
  interfaces...
modified: '2025-09-06T17:49:18-06:00'
date: '2025-09-06T17:49:18-06:00'
---

Building applications in isolation is fine until you need to share components, utilities, or types across multiple projects. That's when you realize you've been copy-pasting the same button component and duplicating TypeScript interfaces like it's 2015 (we've all been there). Enter monorepos—a single repository containing multiple packages that can import from each other while maintaining proper type safety and development workflows.

Monorepos solve the "shared component library" problem elegantly. Instead of publishing internal packages to npm or wrestling with Git submodules, you keep everything in one place with proper tooling to build, test, and deploy individual packages independently. Today, we'll build a TypeScript monorepo with a shared UI library that provides both React components and type definitions to consuming applications.

## Why Monorepos for Shared Libraries?

Before diving in, let's quickly cover why monorepos make sense for shared UI libraries:

- **Single source of truth**: All your components and types live in one place
- **Atomic changes**: Update both library and consumer in the same commit
- **Simplified dependency management**: No more "which version of our button component are we using?"
- **Better developer experience**: Jump to definitions works across packages
- **Consistent tooling**: Share ESLint configs, build scripts, and testing setup

The tradeoffs? Larger repository size and slightly more complex build orchestration—but modern tools make these concerns largely theoretical for most teams.

## Setting Up the Monorepo Structure

We'll use [pnpm workspaces](https://pnpm.io/workspaces) because it handles package linking elegantly and has excellent TypeScript support. Our structure will look like this:

```
my-monorepo/
├── packages/
│   ├── ui/           # Shared UI components
│   ├── types/        # Shared TypeScript types
│   └── web-app/      # Consumer application
├── package.json      # Root workspace config
├── pnpm-workspace.yaml
└── tsconfig.json     # Root TypeScript config
```

Start by creating the root `package.json`:

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel --recursive run dev",
    "build": "pnpm --recursive run build",
    "type-check": "pnpm --recursive run type-check"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
```

Create the workspace configuration in `pnpm-workspace.yaml`:

```yaml
packages:
  - 'packages/*'
```

## Creating the Shared Types Package

Let's start with the types package since our UI components will depend on it. This keeps our type definitions as a single source of truth.

```bash
mkdir -p packages/types/src
cd packages/types
```

Create `packages/types/package.json`:

```json
{
  "name": "@my-org/types",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "type-check": "tsc --noEmit",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "workspace:*"
  }
}
```

> [!NOTE]  
> The `workspace:*` syntax tells pnpm to use the TypeScript version from the root workspace, ensuring consistency.

Create `packages/types/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

The `composite: true` flag is crucial—it enables TypeScript project references, allowing other packages to build incrementally and get proper IDE support.

Now, create some shared types in `packages/types/src/index.ts`:

```ts
// Common UI prop types
export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

// Theme-related types
export type ThemeVariant = 'primary' | 'secondary' | 'danger' | 'success';

export type Size = 'sm' | 'md' | 'lg';

// Component-specific types
export interface ButtonProps extends BaseProps {
  variant?: ThemeVariant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface ModalProps extends BaseProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

// Data types that might be shared across apps
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// Utility types for forms
export type FormField<T> = {
  value: T;
  error?: string;
  touched: boolean;
};

export type FormState<T extends Record<string, unknown>> = {
  [K in keyof T]: FormField<T[K]>;
};
```

These types cover common UI patterns you'll want to share: component props, theme systems, data models, and form utilities.

## Building the Shared UI Package

Now for the fun part—building reusable React components. Create the UI package structure:

```bash
mkdir -p packages/ui/src/components
cd packages/ui
```

Create `packages/ui/package.json`:

```json
{
  "name": "@my-org/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./styles": "./dist/styles.css"
  },
  "scripts": {
    "build": "tsc && rollup -c",
    "type-check": "tsc --noEmit",
    "dev": "tsc --watch"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "dependencies": {
    "@my-org/types": "workspace:*",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "workspace:*",
    "@types/react-dom": "workspace:*",
    "typescript": "workspace:*",
    "rollup": "^4.0.0",
    "@rollup/plugin-typescript": "^11.0.0"
  }
}
```

Create `packages/ui/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../types" }]
}
```

The `references` array tells TypeScript that this package depends on the types package, enabling incremental builds and proper cross-package type checking.

Create a Button component in `packages/ui/src/components/Button.tsx`:

```tsx
import React from 'react';
import clsx from 'clsx';
import { ButtonProps } from '@my-org/types';

const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  ...rest
}) => {
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'rounded-md',
    'font-medium',
    'transition-colors',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
  ];

  const variantClasses = {
    primary: [
      'bg-blue-600',
      'text-white',
      'hover:bg-blue-700',
      'focus:ring-blue-500',
      'disabled:bg-blue-300',
    ],
    secondary: [
      'bg-gray-200',
      'text-gray-900',
      'hover:bg-gray-300',
      'focus:ring-gray-500',
      'disabled:bg-gray-100',
    ],
    danger: [
      'bg-red-600',
      'text-white',
      'hover:bg-red-700',
      'focus:ring-red-500',
      'disabled:bg-red-300',
    ],
    success: [
      'bg-green-600',
      'text-white',
      'hover:bg-green-700',
      'focus:ring-green-500',
      'disabled:bg-green-300',
    ],
  };

  const sizeClasses = {
    sm: ['text-sm', 'px-3', 'py-1.5'],
    md: ['text-sm', 'px-4', 'py-2'],
    lg: ['text-base', 'px-6', 'py-3'],
  };

  const classes = clsx(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    {
      'opacity-50 cursor-not-allowed': disabled || loading,
      'cursor-wait': loading,
    },
    className,
  );

  return (
    <button className={classes} disabled={disabled || loading} onClick={onClick} {...rest}>
      {loading && (
        <svg className="mr-2 -ml-1 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
```

Create a Modal component in `packages/ui/src/components/Modal.tsx`:

```tsx
import React, { useEffect } from 'react';
import clsx from 'clsx';
import { ModalProps } from '@my-org/types';

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className }) => {
  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="bg-opacity-50 fixed inset-0 bg-black transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={clsx('relative w-full max-w-md rounded-lg bg-white shadow-xl', className)}>
          {/* Header */}
          {title && (
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
```

Create the main export file `packages/ui/src/index.ts`:

```ts
// Export all components
export { default as Button } from './components/Button';
export { default as Modal } from './components/Modal';

// Re-export types for convenience
export type { ButtonProps, ModalProps, ThemeVariant, Size, BaseProps } from '@my-org/types';
```

## Setting Up TypeScript Project References

The magic happens in the root `tsconfig.json`. This file coordinates building across all packages:

```json
{
  "compilerOptions": {
    "target": "es2020",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@my-org/ui": ["./packages/ui/src"],
      "@my-org/types": ["./packages/types/src"]
    }
  },
  "references": [
    { "path": "./packages/types" },
    { "path": "./packages/ui" },
    { "path": "./packages/web-app" }
  ],
  "files": []
}
```

The `paths` mapping allows TypeScript to resolve package imports during development, while `references` enables incremental compilation across packages.

## Creating a Consumer Application

Now let's create an app that uses our shared UI library. Create `packages/web-app`:

```bash
mkdir -p packages/web-app/src
cd packages/web-app
```

Create `packages/web-app/package.json`:

```json
{
  "name": "web-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@my-org/ui": "workspace:*",
    "@my-org/types": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "workspace:*",
    "@types/react-dom": "workspace:*",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "workspace:*",
    "vite": "^4.0.0"
  }
}
```

Create `packages/web-app/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../types" }, { "path": "../ui" }]
}
```

Create a simple app in `packages/web-app/src/App.tsx`:

```tsx
import React, { useState } from 'react';
import { Button, Modal } from '@my-org/ui';
import type { User } from '@my-org/types';

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const user: User = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date(),
  };

  const handleClick = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
    setIsModalOpen(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-4 text-2xl font-bold">Monorepo Demo</h1>
        <p className="mb-4">Welcome, {user.name}!</p>

        <div className="space-x-4">
          <Button onClick={handleClick} loading={loading}>
            {loading ? 'Loading...' : 'Open Modal'}
          </Button>

          <Button variant="secondary">Secondary Action</Button>

          <Button variant="danger" size="sm">
            Delete
          </Button>
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="User Profile">
          <div className="space-y-2">
            <p>
              <strong>Name:</strong> {user.name}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Joined:</strong> {user.createdAt.toLocaleDateString()}
            </p>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default App;
```

## Build Configuration and Workflows

Create a build script for the UI package using Rollup. Add `packages/ui/rollup.config.js`:

```js
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true,
    }),
  ],
  external: ['react', 'react-dom', 'clsx', '@my-org/types'],
};
```

Now you can build everything from the root:

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Run type checking across all packages
pnpm type-check

# Start development servers
pnpm dev
```

## Advanced Patterns and Best Practices

### Barrel Exports for Clean Imports

Instead of importing from deep paths, create barrel exports in your UI package:

```ts
// packages/ui/src/components/index.ts
export { default as Button } from './Button';
export { default as Modal } from './Modal';

// packages/ui/src/hooks/index.ts
export { default as useLocalStorage } from './useLocalStorage';

// packages/ui/src/index.ts
export * from './components';
export * from './hooks';
export * from '@my-org/types';
```

### Shared Build Configuration

Create a shared TypeScript config for common settings:

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "es2020",
    "lib": ["dom", "dom.iterable", "es6"],
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  }
}
```

Then extend it in each package:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    // package-specific overrides
  }
}
```

### Runtime Type Validation

For shared types that cross API boundaries, add Zod schemas alongside your TypeScript types:

```ts
// packages/types/src/user.ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Export both type and runtime validator
export const parseUser = (data: unknown): User => {
  return UserSchema.parse(data);
};
```

This gives you both compile-time types and runtime validation using the same definition.

## Common Pitfalls and Solutions

### Circular Dependencies

Watch out for circular imports between packages. If your types package needs UI-specific types, create a separate `ui-types` package or move shared types to a more general location.

```ts
// ❌ Avoid this pattern
// packages/types depends on packages/ui
// packages/ui depends on packages/types

// ✅ Better approach
// packages/ui-types (specific to UI components)
// packages/api-types (shared between frontend/backend)
// packages/ui depends on ui-types and api-types
```

### Build Order Issues

Use TypeScript project references properly to ensure packages build in the correct order:

```bash
# Build everything with proper dependencies
npx tsc --build

# Or use pnpm's built-in ordering
pnpm --recursive run build
```

### Development vs Production Imports

During development, you want TypeScript to resolve to source files. In production, you want it to resolve to built `.d.ts` files. The `paths` configuration in your root `tsconfig.json` handles development, while the `types` field in `package.json` handles production builds.

## Next Steps

You now have a fully functional monorepo with shared UI components and types. Here are some enhancements to consider:

- **Storybook**: Add component documentation and testing
- **Testing**: Set up Jest with proper module resolution for cross-package testing
- **Linting**: Share ESLint configurations across packages
- **Publishing**: Use Changesets for versioning and publishing individual packages
- **CI/CD**: Set up build caching to only rebuild changed packages

The patterns shown here scale well—whether you're building a design system for a single organization or managing dozens of interconnected packages. The key is maintaining clear boundaries between packages while leveraging TypeScript's project references to keep everything type-safe and buildable.

Remember: monorepos are about organization and workflow, not architecture. Keep your components focused, your types specific, and your build processes predictable. The tooling will handle the rest.
