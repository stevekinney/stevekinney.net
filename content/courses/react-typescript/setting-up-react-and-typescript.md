---
title: 'Setting Up: React and TypeScript'
description: >-
  Set up React 19 with TypeScript from scratch—tsconfig, JSX runtime, strict
  mode, linting, and project structure that scales.
date: 2025-09-06T22:04:44.905Z
modified: '2025-09-27T13:14:43-06:00'
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

Before we dive into the fun stuff, let's make sure we have the right tools installed. You'll want Node.js 18 or higher—React 19 requires it—and your favorite package manager. I'll use `npm` in the examples, but feel free to swap in `yarn` or `pnpm` or `bun`.

> [!TIP] You can use a Vite template to make this easy on yourself.
> Try `npm create vite@latest` and follow the prompts if you want to make this easy on yourself.

But, let's say that we wanted to do this by hand.

```bash
# Create a new project directory
mkdir your-project-here
cd your-project-here

# Initialize package.json
npm init -y
```

Now let's install React 19 and TypeScript. Note that React 19 is currently in beta, so we'll need to install the beta versions:

```bash
# Install React
npm install react react-dom

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

Allow me to break down the React 19-specific bits:

- **`jsx: "react-jsx"`**: Uses the new JSX transform—no more `import React from 'react'` in every file!
- **`exactOptionalPropertyTypes: true`**: Prevents accidentally passing `undefined` to optional props.
- **`noUncheckedIndexedAccess: true`**: Forces you to handle potential `undefined` values when accessing arrays or objects with dynamic keys.

> [!TIP]
> The `exactOptionalPropertyTypes` setting is particularly helpful with React props. It ensures that if a prop is optional, you can't accidentally pass `undefined` to it—you have to either pass a real value or omit it entirely.

## ESLint: An Extra Layer of Protection

We can also set up [ESLint](https://eslint.org/) add additional checks on our code. Using ESLint with TypeScript requires a little extra tweaking that is probably worth talking about. But, first—let's install some dependencies.

```sh
npm install -D eslint @eslint/js @types/eslint__js typescript-eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
```

Okay, here is a reasonable template that you can copy and paste.

```js
import js from '@eslint/js'; // ESLint's core recommended JavaScript rules
import globals from 'globals'; // Provides global variable definitions for different environments
import typescript from 'typescript-eslint'; // TypeScript ESLint parser and rules
import react from 'eslint-plugin-react'; // React-specific linting rules
import reactHooks from 'eslint-plugin-react-hooks'; // Rules for React Hooks usage
import reactRefresh from 'eslint-plugin-react-refresh'; // React Fast Refresh validation

/** @type {import('eslint').Linter.Config[]} */ // TypeScript type annotation for config array
export default [
  js.configs.recommended, // Enable ESLint's recommended JavaScript rules
  ...typescript.configs.strict, // Apply TypeScript's strict ruleset (includes recommended + type-checked rules)
  {
    files: ['**/*.{ts,tsx}'], // Apply this config to TypeScript and TSX files only
    languageOptions: {
      globals: {
        ...globals.browser, // Include browser global variables (window, document, etc.)
        ...globals.es2020, // Include ES2020 global features (Promise, BigInt, etc.)
      },
      parserOptions: {
        project: true, // Enable TypeScript project for type-aware linting
        ecmaVersion: 'latest', // Use the latest ECMAScript version
        ecmaFeatures: { jsx: true }, // Enable JSX parsing
        sourceType: 'module', // Treat files as ES modules
      },
    },
    settings: {
      react: { version: 'detect' }, // Auto-detect React version for appropriate rules
    },
    plugins: {
      react, // Register React plugin
      'react-hooks': reactHooks, // Register React Hooks plugin
      'react-refresh': reactRefresh, // Register React Refresh plugin
    },
    rules: {
      ...react.configs.recommended.rules, // Apply React's recommended rules
      ...react.configs['jsx-runtime'].rules, // Rules for new JSX transform (no React import needed)
      ...reactHooks.configs.recommended.rules, // Apply React Hooks rules (deps, exhaustive-deps)

      // React Refresh
      'react-refresh/only-export-components': [
        // Warn when files export non-components (breaks Fast Refresh)
        'warn',
        {
          allowConstantExport: true, // Allow exporting constants alongside components
        },
      ],

      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        // Error on unused variables
        'error',
        {
          argsIgnorePattern: '^_', // Ignore unused args starting with underscore
          varsIgnorePattern: '^_', // Ignore unused vars starting with underscore
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off', // Don't require return types on functions
      '@typescript-eslint/explicit-module-boundary-types': 'off', // Don't require types on module boundaries
      '@typescript-eslint/no-explicit-any': 'error', // Disallow 'any' type usage

      'react/prop-types': 'off', // TypeScript handles this
    },
  },
  {
    files: ['**/*.js'], // Apply to plain JavaScript files
    ...typescript.configs.disableTypeChecked, // Disable TS rules for JS files
  },
  {
    ignores: ['dist', 'build', 'node_modules', 'coverage', '*.min.js'], // Skip linting these paths/patterns
  },
];
```

Let's explain each of these.

### `eslint-plugin-react`

**Purpose:** Core React linting rules for JSX and React-specific patterns.

**What it catches:**

- Missing `key` props in lists
- Invalid prop types
- Unused state and props
- Direct state mutations
- Accessibility issues in JSX
- React best practices violations

```javascript
// Basic setup
rules: {
  ...react.configs.recommended.rules,
  ...react.configs['jsx-runtime'].rules, // For React 17+ JSX transform
}

// Popular custom rules
rules: {
  // Component and prop naming
  'react/jsx-pascal-case': ['error', { allowAllCaps: true }],
  'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],

  // Props and state
  'react/prop-types': 'off', // Turn off if using TypeScript
  'react/require-default-props': 'off', // Often disabled with TypeScript
  'react/destructuring-assignment': ['error', 'always'],
  'react/no-unused-prop-types': 'error',
  'react/no-unused-state': 'error',

  // JSX formatting
  'react/jsx-indent': ['error', 2],
  'react/jsx-indent-props': ['error', 2],
  'react/jsx-max-props-per-line': ['error', { maximum: 1, when: 'multiline' }],
  'react/jsx-first-prop-new-line': ['error', 'multiline'],
  'react/jsx-closing-bracket-location': ['error', 'line-aligned'],

  // Security and performance
  'react/no-danger': 'warn',
  'react/no-array-index-key': 'warn',
  'react/jsx-no-target-blank': ['error', { enforceSynamicLinks: 'always' }],
}
```

### `eslint-plugin-react-hooks`

**Purpose:** Enforces the Rules of Hooks - React's critical rules for using hooks correctly.

**What it catches:**

- Hooks called conditionally (violates rules of hooks)
- Missing dependencies in `useEffect`, `useMemo`, `useCallback`
- Hooks called outside of components or custom hooks
- Custom hooks not starting with "use"

**Common configurations:**

```javascript
// Standard (recommended for most projects)
rules: {
  ...reactHooks.configs.recommended.rules,
  // This expands to:
  'react-hooks/rules-of-hooks': 'error', // Checks rules of hooks
  'react-hooks/exhaustive-deps': 'warn', // Checks effect dependencies
}

// Stricter configuration
rules: {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'error', // Error instead of warning
}

// More lenient (not recommended)
rules: {
  'react-hooks/rules-of-hooks': 'error', // Never disable this!
  'react-hooks/exhaustive-deps': ['warn', {
    additionalHooks: '(useMyCustomEffect|useAsync)', // Check custom hooks
    enableDangerousAutofixThisMayCauseInfiniteLoops: false, // Disable autofix
  }],
}
```

**Common patterns people use:**

```javascript
// Some teams disable exhaustive-deps for specific cases
'react-hooks/exhaustive-deps': ['warn', {
  additionalHooks: 'useUpdateEffect|useIsomorphicLayoutEffect',
}]

// NEVER do this (but some people unfortunately do):
// 'react-hooks/exhaustive-deps': 'off' // ❌ Bad idea!
```

### `eslint-plugin-react-refresh`

**Purpose:** Ensures components are compatible with React Fast Refresh (Vite's hot reload).

**What it catches:**

- Components exported alongside non-component exports
- Anonymous default exports that break Fast Refresh
- Class components (which don't work well with Fast Refresh)

**Common configurations:**

```javascript
// Basic setup (most common)
rules: {
  'react-refresh/only-export-components': ['warn', {
    allowConstantExport: true // Allow const exports alongside components
  }],
}

// Stricter version
rules: {
  'react-refresh/only-export-components': ['error', {
    allowConstantExport: false // Only allow component exports
  }],
}

// More permissive
rules: {
  'react-refresh/only-export-components': ['warn', {
    allowConstantExport: true,
    allowExportNames: ['meta', 'links', 'handle', 'loader'], // For frameworks like Remix
  }],
}
```

## Prettier: Consistent Code Formatting

While ESLint handles code quality, Prettier handles formatting. They work great together when configured properly.

### Installation

```bash
npm install -D prettier eslint-config-prettier
```

### Prettier Configuration

Create `.prettierrc.json`:

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

And `.prettierignore`:

```
node_modules
dist
build
coverage
*.min.js
```

### Integrating with ESLint

To avoid conflicts between ESLint and Prettier, add `eslint-config-prettier` to your ESLint config. This disables ESLint rules that would conflict with Prettier's formatting.

## Package Scripts

Add these scripts to your `package.json` for a smooth development workflow:

```json
{
  "scripts": {
    // Development
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",

    // Type checking
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",

    // Linting and formatting
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",

    // Combined checks (useful for CI/pre-commit)
    "check-all": "npm run type-check && npm run lint && npm run format:check",
    "fix-all": "npm run lint:fix && npm run format"
  }
}
```

### Development Workflow

During development, run these in separate terminals for the best experience:

```bash
# Terminal 1: Dev server with hot reload
npm run dev

# Terminal 2: Type checking in watch mode
npm run type-check:watch
```

Before committing:

```bash
# Check everything
npm run check-all

# Or auto-fix what's possible
npm run fix-all
```

## Real-World Configuration Examples

### Strict Configuration (Enterprise/Large Teams)

```javascript
rules: {
  // React
  ...react.configs.recommended.rules,
  'react/jsx-no-leaked-render': ['error', { validStrategies: ['coerce'] }],
  'react/jsx-handler-names': ['error', {
    eventHandlerPrefix: 'handle',
    eventHandlerPropPrefix: 'on',
  }],
  'react/hook-use-state': 'error',
  'react/no-unstable-nested-components': 'error',

  // Hooks
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'error',

  // Fast Refresh
  'react-refresh/only-export-components': 'error',
}
```

### Balanced Configuration (Most Projects)

```javascript
rules: {
  ...react.configs.recommended.rules,
  ...react.configs['jsx-runtime'].rules,
  ...reactHooks.configs.recommended.rules,
  'react/prop-types': 'off', // Using TypeScript
  'react/display-name': 'off', // Often too noisy
  'react-refresh/only-export-components': ['warn', {
    allowConstantExport: true
  }],
}
```

### Minimal Configuration (Prototypes/Small Projects)

```javascript
rules: {
  'react/jsx-key': 'error', // Critical for React
  'react-hooks/rules-of-hooks': 'error', // Critical for hooks
  'react-hooks/exhaustive-deps': 'warn', // Helpful but not blocking
  'react-refresh/only-export-components': 'warn', // Nice for DX
}
```

## Common Pitfalls

1. **Don't disable `rules-of-hooks`**: This can cause React to behave unpredictably.
2. **Be careful with `exhaustive-deps`**: It's annoying but _usually_ right.
3. **`react-refresh` is Vite-specific**: You don't need it for Create React App or Next.js
4. **TypeScript makes many React rules redundant**: You can disable `prop-types` related rules
5. **Some rules conflict with Prettier** - Disable formatting rules if using Prettier.

> [!TIP] I made a list of all of the "recommended" rules and what they do.
> You can check that list out [here](typescript-react-eslint-rules.md).

## `package,json` Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

## Some Other Best Practices

For stricter type checking, enable type-aware rules by adding project configuration:

If you're using Bun or Deno, you can use `import.meta.env`. But, if you're using Node, you'll need to create your own polyfill.

```js
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

```javascript
parserOptions: {
  project: './tsconfig.json',
  tsconfigRootDir: __dirname,
}
```

Again, in Deno or Bun, you can do this instead:

```javascript
parserOptions: {
  project: './tsconfig.json',
  tsconfigRootDir: import.meta.dirname,
}
```

Then use `typescript.configs.recommendedTypeChecked` instead of just `recommended`.

**2. Custom Rules for Your Team**
Add project-specific rules based on your team's conventions:

```javascript
rules: {
  'react/prop-types': 'off', // TypeScript handles this
  'react/react-in-jsx-scope': 'off', // Not needed with React 17+
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  'prefer-const': 'error',
}
```

## Optional: Setting Up Visual Studio Code and/or Cursor

If you're using Visual Studio Code or Cursor, you might want to install the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint).

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["javascript", "typescript", "javascriptreact", "typescriptreact"]
}
```

## Optional: Setting Up Pre-Commit Hooks

Use Husky and lint-staged to enforce linting before commits:

```bash
npm install -D husky lint-staged
npx husky init
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "git add"]
  }
}
```
