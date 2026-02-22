---
title: Migrating a React App from JS to TS
description: >-
  Convert safely—incremental tsconfig, strictness ratchet, and patterns for
  typing legacy components without churn.
date: 2025-09-06T22:04:45.010Z
modified: '2025-09-22T09:27:10-06:00'
published: true
tags:
  - react
  - typescript
  - migration
  - javascript
  - refactoring
---

Moving your React application from JavaScript to TypeScript doesn't have to be the kind of heroic weekend effort that leaves you questioning your life choices. With the right strategy, you can migrate incrementally—file by file, component by component—while keeping your app running in production. Let's explore how to convert safely using an incremental TypeScript configuration, a gradual strictness ratchet, and proven patterns for typing legacy components without causing unnecessary churn.

The key insight here is that TypeScript is designed for exactly this scenario. You don't need to convert everything at once, and you definitely don't need to shut down feature development while you do it.

## Why Migrate to TypeScript?

Before we dive into the how, let's quickly cover the why. TypeScript brings several advantages that become more valuable as your codebase grows:

- **Catch errors at compile time** instead of discovering them in production (or worse, user reports)
- **Better IDE support** with autocomplete, refactoring, and navigation
- **Self-documenting code** through explicit types and interfaces
- **Easier onboarding** for new team members who can understand function signatures without diving into implementations
- **Refactoring confidence** when you need to change APIs or component props

> [!NOTE]
> TypeScript adoption in React codebases has grown significantly. Most major React libraries now ship with TypeScript definitions, making the ecosystem much more TypeScript-friendly than even a few years ago.

## The Incremental Migration Strategy

The secret to a successful migration is taking it one step at a time. Here's the proven approach:

### Phase 1: Set Up TypeScript Infrastructure

First, let's get TypeScript installed and configured without changing any existing code:

```bash
# Install TypeScript and related dependencies
npm install --save-dev typescript @types/react @types/react-dom @types/node

# If you're using Create React App
npm install --save-dev @types/jest

# For custom webpack setups, you might also need:
npm install --save-dev ts-loader
```

Create a `tsconfig.json` file that's initially very permissive. This is crucial—we want TypeScript to accept all existing JavaScript patterns while we migrate:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

The key settings here:

- `allowJs: true` lets TypeScript process JavaScript files
- `strict: false` disables strict type checking initially
- `skipLibCheck: true` ignores type errors in node_modules

### Phase 2: Start Converting Files

Begin with leaf components—those that don't import other local components. These are typically utility functions, constants, and simple presentational components.

Let's look at a typical migration example. Here's a JavaScript component:

```js
// Button.js
import React from 'react';
import './Button.css';

const Button = ({ children, onClick, disabled, variant = 'primary' }) => {
  const handleClick = (e) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  return (
    <button className={`btn btn-${variant}`} onClick={handleClick} disabled={disabled}>
      {children}
    </button>
  );
};

export default Button;
```

Here's the TypeScript version with proper typing:

```tsx
// Button.tsx
import React from 'react';
import './Button.css';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  return (
    <button className={`btn btn-${variant}`} onClick={handleClick} disabled={disabled}>
      {children}
    </button>
  );
};

export default Button;
```

> [!TIP]
> Start with components that have clear, simple props. Complex components with lots of edge cases can wait until you're more comfortable with the patterns.

### Phase 3: Gradually Increase Strictness

As you convert more files, you can gradually tighten your TypeScript configuration. Add these compiler options one at a time:

```json
{
  "compilerOptions": {
    // ... existing options
    "noImplicitAny": true, // Disallow 'any' type
    "strictNullChecks": true, // Null and undefined are not assignable to other types
    "strictFunctionTypes": true, // Function parameters are contravariant
    "noImplicitReturns": true, // All code paths must return a value
    "noFallthroughCasesInSwitch": true // Switch statements need breaks
  }
}
```

Enable one option, fix the errors it reveals, then move to the next. This incremental approach prevents being overwhelmed by hundreds of type errors all at once.

## Common Migration Patterns

### Typing Props with Destructuring

One of the trickiest parts of migrating React components is handling props properly. Here are the most common patterns:

```tsx
// ✅ Good: Interface for props
interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  onEdit?: (userId: string) => void;
  showEmail?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({ user, onEdit, showEmail = true }) => {
  // Component implementation
};
```

For components that accept a lot of props, you might need to be more flexible during migration:

```tsx
// ⚠️ Acceptable during migration: Partial typing
interface UserCardProps {
  user: {
    id: string;
    name: string;
    [key: string]: any; // Escape hatch for unknown props
  };
  [key: string]: any; // Allow additional props during migration
}
```

### Handling Event Handlers

React event handlers have specific types that are worth learning:

```tsx
interface FormProps {
  onSubmit: (data: FormData) => void;
}

const Form: React.FC<FormProps> = ({ onSubmit }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleInputChange} />
      <button type="submit">Submit</button>
    </form>
  );
};
```

### State Management Migration

Converting useState calls is usually straightforward:

```tsx
// Before
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(false);

// After: Explicit typing
interface User {
  id: string;
  name: string;
  email: string;
}

const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState<boolean>(false);
```

For useReducer, you'll want to type both the state and actions:

```tsx
interface State {
  count: number;
  error: string | null;
}

type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' }
  | { type: 'error'; payload: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1 };
    case 'decrement':
      return { ...state, count: state.count - 1 };
    case 'reset':
      return { ...state, count: 0 };
    case 'error':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};
```

### API Data and External Libraries

When dealing with API responses, create interfaces for the data you expect:

```tsx
interface ApiUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface ApiResponse<T> {
  data: T[];
  total: number;
  page: number;
}

const useUsers = () => {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((response: ApiResponse<ApiUser>) => {
        setUsers(response.data);
        setLoading(false);
      });
  }, []);

  return { users, loading };
};
```

> [!WARNING]
> Don't trust API data without validation. Consider using a runtime validation library like [Zod](https://github.com/colinhacks/zod) to ensure your API responses match your TypeScript types.

## Dealing with Third-Party Libraries

Not all libraries come with TypeScript definitions. Here's how to handle different scenarios:

### Libraries with @types packages

Many popular libraries have community-maintained types:

```bash
npm install --save-dev @types/lodash @types/uuid @types/classnames
```

### Libraries without types

For libraries without types, you can create declaration files:

```ts
// types/react-some-library.d.ts
declare module 'react-some-library' {
  interface SomeLibraryProps {
    value: string;
    onChange: (value: string) => void;
  }

  const SomeLibrary: React.FC<SomeLibraryProps>;
  export default SomeLibrary;
}
```

Or use a more permissive approach during migration:

```ts
// types/globals.d.ts
declare module 'react-some-library' {
  const content: any;
  export default content;
}
```

## Testing During Migration

Your existing tests should continue to work, but you might want to add some TypeScript-specific testing patterns:

```tsx
// UserCard.test.tsx
import { render, screen } from '@testing-library/react';
import UserCard from './UserCard';

const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
};

test('renders user information', () => {
  render(<UserCard user={mockUser} />);

  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
});

// Type-checking test utilities
const renderUserCard = (props: Partial<UserCardProps> = {}) => {
  const defaultProps: UserCardProps = {
    user: mockUser,
    showEmail: true,
  };

  return render(<UserCard {...defaultProps} {...props} />);
};
```

## Migration Gotchas and How to Avoid Them

### Don't Convert Everything at Once

```tsx
// ❌ Bad: Trying to perfectly type everything immediately
interface SuperComplexProps {
  data: ComplexNestedType & {
    callbacks: {
      onUpdate: (id: string, changes: Partial<Entity>) => Promise<UpdateResult>;
      onDelete: (id: string) => Promise<void>;
    };
  };
  // ... 50 more properties
}

// ✅ Good: Start simple, improve incrementally
interface SuperComplexProps {
  data: any; // TODO: Type this properly later
  onUpdate?: (...args: any[]) => any;
  onDelete?: (id: string) => void;
}
```

### Avoid any, But Don't Fear It During Migration

```tsx
// ✅ Acceptable during migration
const legacyComponent = (props: any) => {
  // Keep the component working while you figure out the types
  return <div>{props.children}</div>;
};

// ✅ Better: Be explicit about what you don't know yet
interface LegacyComponentProps {
  children: React.ReactNode;
  [key: string]: unknown; // For props you haven't typed yet
}
```

### Handle defaultProps Migration

If you're using class components with defaultProps, the migration needs some care:

```tsx
// Before
class MyComponent extends React.Component {
  static defaultProps = {
    variant: 'primary',
    disabled: false,
  };

  render() {
    // ...
  }
}

// After: Use default parameters instead
interface MyComponentProps {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  children: React.ReactNode;
}

const MyComponent: React.FC<MyComponentProps> = ({
  variant = 'primary',
  disabled = false,
  children,
}) => {
  // ...
};
```

## Migration Strategies and Patterns

### The Migration Mindset

Before diving deeper, understand this: **migration is not about perfection**. It's about progress. Every file you convert makes your codebase more maintainable, even if you haven't touched the rest.

```typescript
// This is perfectly valid during migration
// someFile.js - Still JavaScript
import { processUser } from './userProcessor.ts'; // TypeScript file

// userProcessor.ts - Now TypeScript
export function processUser(user: any): string {
  return `Hello, ${user.name}`; // `any` is okay for now
}
```

### Start with Type Declaration Files

Create `.d.ts` files for your existing modules before converting them. This gives you type safety benefits even before migration:

```typescript
// types/api.d.ts - Describe existing JS API
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
}

// Describe your existing JS API functions
export declare function fetchUsers(): Promise<User[]>;
export declare function createPost(data: Omit<Post, 'id' | 'createdAt'>): Promise<Post>;
```

### The `any` Escape Hatch Strategy

Use `any` strategically during migration:

```typescript
// migration-helpers.ts - Temporary utility types
export type TODO_TYPE = any; // Mark things to fix later
export type LEGACY_PROPS = any; // For old component props
export type API_RESPONSE = any; // For untyped API responses

// Use in components during migration
interface UserListProps {
  users: TODO_TYPE[]; // Will fix this later
  filters: LEGACY_PROPS; // Legacy component props
  onUserSelect: (user: TODO_TYPE) => void; // Gradually type these
}
```

### File-by-File Strictness

Use comment directives for file-level control:

```typescript
// @ts-check - Enable checking in JS files
// users.js
// @ts-check

/**
 * @param {string} name
 * @param {number} age
 * @returns {string}
 */
function formatUser(name, age) {
  return `${name} (${age})`;
}

// TypeScript will catch errors even in JS!
formatUser('Alice', '30'); // Error: Argument of type 'string' is not assignable to parameter of type 'number'
```

```typescript
// Disable strict checks temporarily
// legacy-component.tsx
// @ts-nocheck - Skip this file entirely (temporary)

// Or disable specific lines
const userData = api.getUserData(); // @ts-ignore - Will fix this later
```

## Tools to Help Your Migration

### TypeScript Migration Assistant

VS Code has excellent TypeScript support with helpful quick fixes. Look for the lightbulb icon when you have type errors—it often suggests the fix automatically.

### ESLint Rules for TypeScript

Add these ESLint rules to catch common issues during migration:

```json
// .eslintrc.json - Gradual rule introduction
{
  "extends": ["@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn", // Allow during migration
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-non-null-assertion": "warn", // Discourage !
    "@typescript-eslint/explicit-function-return-type": "off", // Too strict for migration
    "@typescript-eslint/explicit-module-boundary-types": "off"
  },
  "overrides": [
    {
      "files": ["**/*.ts", "**/*.tsx"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "error" // Stricter for new TS files
      }
    }
  ]
}
```

### Type-only imports

Use type-only imports when you're only importing for type annotations:

```tsx
import type { User } from './types';
import { fetchUser } from './api'; // Regular import for runtime code

const UserProfile = ({ userId }: { userId: string }) => {
  const [user, setUser] = useState<User | null>(null);
  // ...
};
```

### Migration Scripts

Create helper scripts to automate common migration tasks:

```bash
#!/bin/bash
# migrate-file.sh - Helper script to migrate a file

file=$1
if [ -z "$file" ]; then
  echo "Usage: ./migrate-file.sh <file-path>"
  exit 1
fi

# Rename file
if [[ $file == *.js ]]; then
  new_file="${file%.js}.ts"
elif [[ $file == *.jsx ]]; then
  new_file="${file%.jsx}.tsx"
else
  echo "File must be .js or .jsx"
  exit 1
fi

mv "$file" "$new_file"
echo "Migrated $file to $new_file"
echo "Don't forget to:"
echo "1. Add proper prop types"
echo "2. Type event handlers"
echo "3. Update imports in other files"
```

## Team Migration Strategy

### Code Review Guidelines

Create a PR template for migration work:

```markdown
## TypeScript Migration Checklist

- [ ] Props interfaces defined for new/modified components
- [ ] Event handlers properly typed
- [ ] API responses typed (even if loosely)
- [ ] No new `any` types without `TODO_TYPE` marker
- [ ] Tests updated with basic types
- [ ] README updated if new patterns introduced

## Migration Progress

- Files converted: `___` / `___`
- Components typed: `___` / `___`
- API endpoints typed: `___` / `___`
```

### Track Your Progress

Monitor your migration with simple metrics:

```javascript
// migration-stats.js - Run weekly
const fs = require('fs');
const path = require('path');

function countFiles(dir, ext) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let count = 0;

  for (const file of files) {
    if (file.isDirectory()) {
      count += countFiles(path.join(dir, file.name), ext);
    } else if (file.name.endsWith(ext)) {
      count++;
    }
  }

  return count;
}

const srcDir = './src';
const jsFiles = countFiles(srcDir, '.js') + countFiles(srcDir, '.jsx');
const tsFiles = countFiles(srcDir, '.ts') + countFiles(srcDir, '.tsx');
const total = jsFiles + tsFiles;

console.log(`Migration Progress:
TypeScript files: ${tsFiles}
JavaScript files: ${jsFiles}
Total files: ${total}
Progress: ${Math.round((tsFiles / total) * 100)}%`);
```

## Key Takeaways

Successful TypeScript migration is about **progress, not perfection**:

1. **Start permissive** - Allow JavaScript, disable strict checks initially
2. **Migrate boundaries first** - Component props, API functions, hooks
3. **Use escape hatches** - `any` is okay temporarily
4. **Go file by file** - Don't try to migrate everything at once
5. **Maintain compatibility** - Don't break existing JavaScript code
6. **Track progress** - Measure and celebrate incremental improvements
7. **Enable strictness gradually** - Turn on rules as you improve coverage

Remember: A partially migrated TypeScript codebase is infinitely better than a JavaScript codebase you're afraid to change. Every type you add makes your application more maintainable, even if the rest isn't perfect yet. The goal isn't to have perfect types everywhere—it's to catch more bugs, improve developer experience, and make your code more maintainable over time.
