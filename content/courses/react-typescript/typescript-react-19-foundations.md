---
title: TypeScript + React 19 Foundations
description: Set up React 19 with TypeScript from scratch—tsconfig, JSX runtime, strict mode, linting, and project structure that scales.
date: 2025-09-06T22:04:44.905Z
modified: 2025-09-06T22:04:44.905Z
published: true
tags: ['react', 'typescript', 'react-19', 'setup', 'foundations', 'tsconfig']
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

## Configuring TypeScript for React 19

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
├── components/          # Reusable UI components
│   ├── ui/             # Basic building blocks (Button, Input, etc.)
│   └── shared/         # Business logic components
├── hooks/              # Custom hooks
├── types/              # Shared TypeScript types
├── utils/              # Pure utility functions
├── lib/                # Third-party library configurations
└── App.tsx
```

Let's create the basic structure:

```bash
mkdir -p src/{components/{ui,shared},hooks,types,utils,lib}
```

## Your First React 19 Component with TypeScript

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

## Advanced Component Patterns with React 19

React 19 makes some previously tricky patterns much more ergonomic. Let's look at a form component that demonstrates several modern techniques:

```tsx
// src/components/shared/ContactForm.tsx
import { useState, useTransition } from 'react';
import { Button } from '../ui/Button';

interface FormData {
  name: string;
  email: string;
  message: string;
}

interface ContactFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  initialData?: Partial<FormData>;
}

export function ContactForm({ onSubmit, initialData = {} }: ContactFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: initialData.name ?? '',
    email: initialData.email ?? '',
    message: initialData.message ?? '',
  });

  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const newErrors: Partial<FormData> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.message.trim()) newErrors.message = 'Message is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    startTransition(async () => {
      try {
        await onSubmit(formData);
        // Reset form on success
        setFormData({ name: '', email: '', message: '' });
      } catch (error) {
        // Handle error (you might want to show a toast or something)
        console.error('Failed to submit form:', error);
      }
    });
  };

  const handleChange =
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={handleChange('name')}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm ${
            errors.name ? 'border-red-500' : ''
          }`}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={handleChange('email')}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm ${
            errors.email ? 'border-red-500' : ''
          }`}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
          Message
        </label>
        <textarea
          id="message"
          rows={4}
          value={formData.message}
          onChange={handleChange('message')}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm ${
            errors.message ? 'border-red-500' : ''
          }`}
        />
        {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
}
```

This component demonstrates several key patterns:

- **`useTransition`**: React 19's concurrent feature for handling async operations without blocking the UI
- **Generic event handlers**: The `handleChange` function is typed to accept the correct event types
- **Proper error handling**: TypeScript ensures our error state matches our form data structure
- **Nullish coalescing (`??`)**: Better than `||` for handling potentially undefined initial data

## Creating Type-Safe Custom Hooks

Custom hooks in React 19 + TypeScript can be incredibly powerful when properly typed. Here's a practical example of a hook for managing API state:

```tsx
// src/hooks/useApiState.ts
import { useState, useEffect, useCallback } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiStateOptions {
  immediate?: boolean;
}

export function useApiState<T>(apiCall: () => Promise<T>, options: UseApiStateOptions = {}) {
  const { immediate = true } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, [apiCall]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.loading,
    hasError: !!state.error,
    hasData: !!state.data,
  };
}
```

Usage example:

```tsx
// src/components/UserProfile.tsx
interface User {
  id: string;
  name: string;
  email: string;
}

async function fetchUser(userId: string): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
}

export function UserProfile({ userId }: { userId: string }) {
  const {
    data: user,
    isLoading,
    hasError,
    error,
    execute,
  } = useApiState(() => fetchUser(userId), { immediate: true });

  if (isLoading) return <div>Loading user...</div>;
  if (hasError) return <div>Error: {error}</div>;
  if (!user) return <div>No user found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
      <button onClick={execute}>Refresh</button>
    </div>
  );
}
```

## Type-Safe Environment Variables

Here's a pattern for handling environment variables that'll save you from runtime surprises:

```tsx
// src/lib/env.ts
interface EnvConfig {
  API_BASE_URL: string;
  APP_NAME: string;
  ENABLE_ANALYTICS: boolean;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[`VITE_${key}`] ?? process.env[key];

  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value ?? defaultValue!;
}

export const env: EnvConfig = {
  API_BASE_URL: getEnvVar('API_BASE_URL'),
  APP_NAME: getEnvVar('APP_NAME', 'My App'),
  ENABLE_ANALYTICS: getEnvVar('ENABLE_ANALYTICS', 'false') === 'true',
};
```

## Setting Up Linting and Formatting

No TypeScript setup is complete without proper linting. Here's a solid ESLint configuration for React 19 + TypeScript:

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D eslint-plugin-react eslint-plugin-react-hooks
npm install -D prettier eslint-config-prettier
```

Create `.eslintrc.json`:

```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

And `.prettierrc.json`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## Common Pitfalls and How to Avoid Them

### Pitfall #1: Using `any` as an Escape Hatch

```tsx
// ❌ Bad - defeats the purpose of TypeScript
function handleApiResponse(response: any) {
  return response.data.user.name;
}

// ✅ Good - properly typed with error handling
interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

interface User {
  name: string;
  email: string;
}

function handleApiResponse(response: ApiResponse<{ user: User }>) {
  if (response.status === 'error') {
    throw new Error(response.message ?? 'API request failed');
  }
  return response.data.user.name;
}
```

### Pitfall #2: Not Handling Loading and Error States

```tsx
// ❌ Bad - assumes success
function UserComponent({ userId }: { userId: string }) {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  return <div>{user.name}</div>; // TypeScript error: user might be undefined
}

// ✅ Good - handles all states
function UserComponent({ userId }: { userId: string }) {
  const { data: user, isLoading, hasError, error } = useApiState(() => fetchUser(userId));

  if (isLoading) return <div>Loading...</div>;
  if (hasError) return <div>Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return <div>{user.name}</div>;
}
```

### Pitfall #3: Overusing `useEffect`

React 19 makes many common `useEffect` patterns unnecessary. Instead of reaching for `useEffect`, consider:

```tsx
// ❌ Overusing useEffect for derived state
function UserProfile({ user }: { user: User }) {
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    setDisplayName(user.firstName + ' ' + user.lastName);
  }, [user.firstName, user.lastName]);

  return <div>{displayName}</div>;
}

// ✅ Just compute it directly
function UserProfile({ user }: { user: User }) {
  const displayName = `${user.firstName} ${user.lastName}`;
  return <div>{displayName}</div>;
}
```

## Building and Development Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write src/**/*.{ts,tsx,js,jsx,json,css,md}"
  }
}
```

Create a simple `vite.config.ts`:

```tsx
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
});
```

## Next Steps

You now have a solid foundation for building React 19 applications with TypeScript. From here, you might want to explore:

- **Testing**: Set up Vitest and React Testing Library for your components
- **State Management**: Consider Zustand or Redux Toolkit for complex state
- **Routing**: React Router v6 works great with TypeScript
- **Styling**: Explore CSS-in-JS solutions like Styled Components or stick with Tailwind
- **Build Optimization**: Learn about code splitting and bundle analysis

The key to success with TypeScript and React is to embrace the type system rather than fight it. When TypeScript complains, it's usually trying to prevent a real bug. The upfront investment in proper typing pays dividends in reduced debugging time and increased confidence when refactoring.

Remember: TypeScript is your friend, not your enemy. It might seem verbose at first, but once you get comfortable with these patterns, you'll wonder how you ever shipped JavaScript without it.
