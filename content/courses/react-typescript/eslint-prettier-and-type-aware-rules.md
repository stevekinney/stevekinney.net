---
title: ESLint, Prettier, and Type-Aware Rules
description: Wire ESLint with type-aware rules—catch bugs like unsafe spreads, any leaks, and unhandled promises.
date: 2025-09-06T22:04:44.967Z
modified: 2025-09-06T22:04:44.967Z
published: true
tags: ['react', 'typescript', 'eslint', 'prettier', 'linting']
---

Let's talk about setting up ESLint and Prettier for React TypeScript projects with type-aware rules—the kind that actually leverage your TypeScript types to catch runtime bugs before they happen. We'll explore how type-aware linting can catch sketchy spreads, `any` type leaks, and unhandled promises that regular ESLint would completely miss. By the end, you'll have a bulletproof linting setup that acts like a compiler-aware code reviewer, saving you from entire categories of bugs that only show up in production.

## Why Type-Aware Rules Matter

Regular ESLint operates purely on syntax. It knows about JavaScript patterns but has no idea what TypeScript's compiler knows about your code. Type-aware rules bridge that gap—they understand your types, interfaces, and generic constraints to catch problems that would otherwise slip through.

Consider this seemingly innocent React component:

```tsx
// ❌ Regular ESLint won't catch the issue here
interface User {
  id: string;
  name: string;
  email?: string;
}

function UserProfile({ user, ...props }: { user: User; className?: string }) {
  return <div {...props}>{user.name}</div>;
}

// This breaks at runtime if user.email is undefined
const MyComponent = () => {
  const user: User = { id: '1', name: 'Alice' };
  return <UserProfile user={user} onClick={() => user.email.toLowerCase()} />;
};
```

Regular ESLint sees valid JavaScript. Type-aware ESLint sees that `user.email` might be `undefined` and flags the unsafe property access. That's the difference between syntax checking and actual type analysis.

## Setting Up the Foundation

First, let's install the necessary packages. We'll need ESLint, Prettier, and the TypeScript-aware plugins:

```bash
npm install --save-dev \
  eslint \
  prettier \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-config-prettier \
  eslint-plugin-prettier \
  eslint-plugin-react \
  eslint-plugin-react-hooks
```

The key players here are:

- `@typescript-eslint/parser`: Teaches ESLint to understand TypeScript syntax
- `@typescript-eslint/eslint-plugin`: Provides the type-aware rules we want
- `eslint-config-prettier`: Turns off ESLint rules that conflict with Prettier
- `eslint-plugin-prettier`: Runs Prettier as an ESLint rule

## Basic ESLint Configuration

Create `.eslintrc.json` in your project root:

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
    "project": ["./tsconfig.json"]
  },
  "plugins": ["react", "@typescript-eslint"],
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

The crucial bit is `"project": ["./tsconfig.json"]` in `parserOptions`—this tells the TypeScript parser where to find your type information, enabling all the type-aware goodness.

> [!WARNING]
> Type-aware linting is significantly slower than regular linting because it needs to compile your TypeScript. For large projects, consider running type-aware rules only in CI or as a separate command.

## Prettier Configuration

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
  "arrowParens": "avoid"
}
```

And `.prettierignore` to skip files you don't want formatted:

```
# Dependencies
node_modules

# Build outputs
build
dist
coverage

# Generated files
*.generated.ts
```

## Essential Type-Aware Rules

Now for the Real World Use Cases™. Here are the type-aware rules that will actually save your bacon:

### Catching Unsafe Any Usage

```json
{
  "rules": {
    "@typescript-eslint/no-unsafe-argument": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error"
  }
}
```

These rules prevent `any` types from infecting your codebase:

```tsx
// ❌ These will all trigger type-aware rules
declare const userInput: any;

const Component = () => {
  // no-unsafe-assignment
  const email: string = userInput.email;

  // no-unsafe-call
  const formatted = userInput.format();

  // no-unsafe-member-access
  return <div>{userInput.name}</div>;
};
```

### Preventing Floating Promises

```json
{
  "rules": {
    "@typescript-eslint/no-floating-promises": "error"
  }
}
```

This catches async operations you forgot to handle:

```tsx
// ❌ Floating promise - what if it fails?
const handleClick = () => {
  fetch('/api/users'); // ESLint will flag this
};

// ✅ Properly handled
const handleClick = async () => {
  try {
    await fetch('/api/users');
  } catch (error) {
    console.error('Failed to fetch users:', error);
  }
};

// ✅ Or explicitly ignore
const handleClickFireAndForget = () => {
  void fetch('/api/users'); // The void tells ESLint you meant it
};
```

### Enforcing Proper Promise Usage

```json
{
  "rules": {
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": "error"
  }
}
```

These prevent common async/await mistakes:

```tsx
// ❌ await-thenable catches this
const notAsync = () => 'hello';
const result = await notAsync(); // You can't await non-promises

// ❌ no-misused-promises catches this
const asyncHandler = async () => {
  // Do async work
};

// Don't pass async functions where sync functions are expected
<button onClick={asyncHandler}>Click</button>; // This is wrong!

// ✅ Proper async handling in React
const handleAsyncClick = () => {
  void asyncHandler(); // Explicitly fire-and-forget
};
<button onClick={handleAsyncClick}>Click</button>;
```

## Advanced Configuration for React Projects

Here's a more comprehensive configuration that's battle-tested for React TypeScript projects:

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
    "project": ["./tsconfig.json"]
  },
  "plugins": ["react", "@typescript-eslint"],
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "rules": {
    // Type-aware rules
    "@typescript-eslint/no-unsafe-argument": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        "checksVoidReturn": false
      }
    ],

    // Additional type-aware goodies
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
    "react/prop-types": "off", // We're using TypeScript
    "react/react-in-jsx-scope": "off", // Not needed in React 17+

    // General code quality
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
    }
  ]
}
```

## NPM Scripts for Your Workflow

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "typecheck": "tsc --noEmit",
    "check-all": "npm run typecheck && npm run lint && npm run format:check"
  }
}
```

The `check-all` script is particularly handy for CI/CD pipelines or pre-commit hooks.

## Performance Optimization

Type-aware linting can be slow. Here are some strategies to speed things up:

### Separate Commands for Different Use Cases

```json
{
  "scripts": {
    "lint:fast": "eslint . --ext .ts,.tsx,.js,.jsx --config .eslintrc.fast.json",
    "lint:full": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:ci": "npm run lint:full"
  }
}
```

Create `.eslintrc.fast.json` without the type-aware rules for development:

```json
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

### Cache ESLint Results

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx --cache",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --cache --fix"
  }
}
```

## Common Gotchas and Solutions

### The `checksVoidReturn` Issue

By default, `no-misused-promises` prevents you from using async functions in event handlers:

```tsx
// ❌ This triggers no-misused-promises
<button onClick={async () => await handleSomething()}>Click</button>
```

The solution is to configure the rule to allow void returns:

```json
{
  "@typescript-eslint/no-misused-promises": [
    "error",
    {
      "checksVoidReturn": false
    }
  ]
}
```

### Ignoring Type-Aware Rules for Third-Party Code

Sometimes you need to disable type-aware rules for specific files or libraries:

```tsx
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const thirdPartyData = sketyLibrary.getData();

// Or for entire files:
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
```

### Performance vs. Safety Tradeoffs

For large codebases, consider this tiered approach:

1. **Development**: Fast linting without type-aware rules
2. **Pre-commit**: Type-aware rules on changed files only
3. **CI/CD**: Full type-aware linting on the entire codebase

## Integration with VS Code

Add this to your `.vscode/settings.json`:

```json
{
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.fixAll.prettier": "explicit"
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## Next Steps

With this setup, you've got a robust foundation that catches entire categories of TypeScript/React bugs at development time. From here, consider:

- Adding [eslint-plugin-jsx-a11y](https://www.npmjs.com/package/eslint-plugin-jsx-a11y) for accessibility linting
- Exploring [eslint-plugin-testing-library](https://www.npmjs.com/package/eslint-plugin-testing-library) if you're writing tests
- Setting up [husky](https://www.npmjs.com/package/husky) and [lint-staged](https://www.npmjs.com/package/lint-staged) for pre-commit hooks

The key insight is that type-aware linting transforms ESLint from a syntax checker into a TypeScript-aware bug hunter. It's slower, but it catches the kinds of runtime errors that would otherwise have you debugging production issues at 2 AM.
