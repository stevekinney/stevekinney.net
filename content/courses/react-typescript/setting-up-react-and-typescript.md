---
title: 'Setting Up: React and TypeScript'
description: >-
  Set up React 19 with TypeScript from scratch—tsconfig, JSX runtime, strict
  mode, linting, and project structure that scales.
date: 2025-09-06T22:04:44.905Z
modified: '2025-09-20T10:40:36-06:00'
published: true
tags:
  - react
  - typescript
  - react-19
  - setup
  - foundations
  - tsconfig
---

Building modern React applications with TypeScript isn't just about adding some type annotations and hoping for the best. It's about setting up a foundation that helps you catch bugs before they reach production, provides excellent developer experience, and scales gracefully as your team and codebase grow. React 19 brings some exciting improvements to how we write components, and when paired with TypeScript's latest features, you get a development experience that's both powerful and pleasant.

In this guide, we'll build a React 19 + TypeScript project from the ground up, covering everything from `tsconfig.json` configuration to component patterns that'll make your future self thank you.

## Setting Up Your Development Environment

Before we dive into the fun stuff, let's make sure we have the right tools installed. You'll want Node.js 18 or higher (React 19 requires it) and your favorite package manager. I'll use `npm` in the examples, but feel free to swap in `yarn` or `pnpm`.

```bash
# Create a new project directory
mkdir react-typescript-foundations
cd react-typescript-foundations

# Initialize package.json
npm init -y
```

Now let's install React 19 and TypeScript. Note that React 19 is currently in beta, so we'll need to install the beta versions:

```bash
# Install React 19 beta
npm install react@beta react-dom@beta

# Install TypeScript and related dev dependencies
npm install -D typescript @types/react @types/react-dom @types/node

# Install build tools (we'll use Vite for this example)
npm install -D vite @vitejs/plugin-react
```

## Configuring TypeScript for React

The `tsconfig.json` is where the magic happens. React 19 introduces some changes that affect how we configure TypeScript, particularly around the new JSX runtime and improved type checking.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": true,
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
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    // React 19 specific improvements
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Let me break down the React 19-specific bits:

- **`jsx: "react-jsx"`**: Uses the new JSX transform (no more `import React from 'react'` in every file!)
- **`exactOptionalPropertyTypes: true`**: Prevents accidentally passing `undefined` to optional props
- **`noUncheckedIndexedAccess: true`**: Forces you to handle potential `undefined` values when accessing arrays or objects with dynamic keys

> [!TIP]
> The `exactOptionalPropertyTypes` setting is particularly helpful with React props. It ensures that if a prop is optional, you can't accidentally pass `undefined` to it—you have to either pass a real value or omit it entirely.

## Project Structure That Scales

Here's a folder structure that works well for React + TypeScript projects of any size:

```
src/
├── components/         # Reusable UI components
│   ├── ui/             # Basic building blocks (Button, Input, etc.)
│   └── shared/         # Business logic components
├── hooks/              # Custom hooks
├── types/              # Shared TypeScript types
├── utilities/          # Pure utility functions
├── lib/                # Third-party library configurations
└── App.tsx
```

Let's create the basic structure:

```bash
mkdir -p src/{components/{ui,shared},hooks,types,utils,lib}
```

## Your First React Component with TypeScript

React 19 brings some subtle but important changes to how we write components. Let's start with a simple button component that showcases modern patterns:

```tsx
// src/components/ui/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  onClick,
}: ButtonProps) {
  const baseClasses = 'font-medium rounded focus:outline-none focus:ring-2';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  } as const;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  } as const;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      {children}
    </button>
  );
}
```

A few things to note about this component:

- **Explicit prop types**: Every prop has a clear type, making the component's API obvious
- **Default parameters**: We use default parameters in the function signature rather than `defaultProps`
- **`as const` assertions**: This ensures TypeScript knows exactly which strings are valid, not just `string`
- **No `React.FC`**: The React team recommends against using `React.FC` for function components

**See Also**:

- [advanced-patterns-react-19-and-typescript](advanced-patterns-react-19-and-typescript.md)
- [Custom Hooks](custom-hooks-with-generics-comprehensive.md)
- [Typesafe Environment Variables](typesafe-environment-variables.md)
- [Setting Up Linting and Formatting](setting-up-linting-and-formatting.md)
- [Common Pitfalls](common-pitfalls-with-react-and-typescript.md)
- [Building Development Scripts](building-development-scripts.md)
- [React 19 Updates](react-19-updates-typescript.md)
