---
title: Migration Strategies - JavaScript to TypeScript
description: >-
  Practical strategies for gradually migrating React codebases from JavaScript
  to TypeScript
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T19:29:28.079Z'
---

You've got a massive React codebase written in JavaScript, and you want to add TypeScript. The good news? You don't need to rewrite everything overnight. TypeScript's incremental adoption strategy makes it possible to migrate gradually while maintaining a working application. Let's explore proven strategies for migrating real-world React applications to TypeScript.

## The Migration Mindset

Before we dive into specifics, understand this: **migration is not about perfection**. It's about progress. Every file you convert makes your codebase more maintainable, even if you haven't touched the rest.

```typescript
// This is perfectly valid during migration
// someFile.js - Still JavaScript
import { processUser } from './userProcessor.ts'; // TypeScript file

// userProcessor.ts - Now TypeScript
export function processUser(user: any): string {
  return `Hello, ${user.name}`; // `any` is okay for now
}
```

## Phase 1: Configuration and Setup

### Start with TypeScript Configuration

```json
// tsconfig.json - Start permissive, get stricter over time
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true, // ✅ Critical: Allow JS files
    "checkJs": false, // ✅ Start with false
    "skipLibCheck": true, // ✅ Skip checking node_modules
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false, // ✅ Start with false
    "noEmit": true, // ✅ Don't output files yet
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noFallthroughCasesInSwitch": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build"]
}
```

### Package Dependencies

```bash
# Install TypeScript and types
npm install --save-dev typescript @types/react @types/react-dom @types/node

# For Create React App projects
npm install --save-dev @types/jest

# Common utility types you'll need
npm install --save-dev @types/lodash @types/classnames

# If using React Router
npm install --save-dev @types/react-router-dom
```

## Phase 2: The Gradual Migration Strategy

### Start with Type Declaration Files

Create `.d.ts` files for your existing modules before converting them:

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

### The File Extension Strategy

Convert files incrementally by changing extensions:

```typescript
// 1. Start with .js.ts (if your bundler supports it)
// or just rename .js to .ts

// utils/formatters.js → utils/formatters.ts
export function formatCurrency(amount: number): string {
  // Add types gradually
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
}

// Keep existing JS exports, add types
export const API_ENDPOINTS = {
  USERS: '/api/users',
  POSTS: '/api/posts',
} as const; // Add const assertion for better typing
```

## Phase 3: Component Migration Patterns

### Strategy 1: Props-First Migration

Start by typing props, keep everything else loose:

```typescript
// Before: UserCard.js
import React from 'react';

const UserCard = ({ user, onEdit, onDelete }) => {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <div className="actions">
        <button onClick={() => onEdit(user.id)}>Edit</button>
        <button onClick={() => onDelete(user.id)}>Delete</button>
      </div>
    </div>
  );
};

export default UserCard;
```

```typescript
// After: UserCard.tsx - Props typed, rest flexible
import React from 'react';

// Define props interface
interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

// Component is now type-safe at the boundary
const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete }) => {
  // Internal logic can still use implicit types
  const handleEdit = () => onEdit(user.id);
  const handleDelete = () => onDelete(user.id);

  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      {user.avatar && <img src={user.avatar} alt={user.name} />}
      <div className="actions">
        <button onClick={handleEdit}>Edit</button>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
};

export default UserCard;
```

### Strategy 2: Hook Migration

Convert custom hooks early - they're often reused:

```typescript
// Before: useLocalStorage.js
import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
}
```

```typescript
// After: useLocalStorage.ts
import { useState, useEffect } from 'react';

// Generic hook with proper typing
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading localStorage key "' + key + '":', error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error setting localStorage key "' + key + '":', error);
    }
  };

  return [storedValue, setValue];
}

// Usage is now fully type-safe
// const [user, setUser] = useLocalStorage<User>('user', null);
// const [settings, setSettings] = useLocalStorage<Settings>('settings', defaultSettings);
```

### Strategy 3: The `any` Escape Hatch

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

## Phase 4: API and Data Layer Migration

### Typing External APIs Gradually

```typescript
// Before: api.js
export async function fetchUsers() {
  const response = await fetch('/api/users');
  return response.json();
}

export async function createUser(userData) {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return response.json();
}
```

```typescript
// After: api.ts - Start with basic types, improve over time
interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  error?: string;
}

// Start with loose types, tighten gradually
export async function fetchUsers(): Promise<ApiResponse<any[]>> {
  const response = await fetch('/api/users');
  return response.json();
}

// Gradually add specific types
export async function createUser(userData: {
  name: string;
  email: string;
  [key: string]: any; // Allow extra properties during migration
}): Promise<ApiResponse<any>> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return response.json();
}

// Better version after more migration
export async function createUserTyped(userData: {
  name: string;
  email: string;
  department?: string;
  role?: 'admin' | 'user' | 'viewer';
}): Promise<ApiResponse<User>> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  const result = await response.json();

  // Add runtime validation gradually
  if (!result.success) {
    throw new Error(result.error || 'Failed to create user');
  }

  return result;
}
```

### State Management Migration

```typescript
// Before: userContext.js
import React, { createContext, useContext, useReducer } from 'react';

const UserContext = createContext();

const initialState = {
  users: [],
  loading: false,
  error: null,
  selectedUser: null
};

function userReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USERS':
      return { ...state, users: action.payload, loading: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

export function UserProvider({ children }) {
  const [state, dispatch] = useReducer(userReducer, initialState);
  return (
    <UserContext.Provider value={{ ...state, dispatch }}>
      {children}
    </UserContext.Provider>
  );
}
```

```typescript
// After: userContext.tsx - Gradually add types
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Start with basic types
interface User {
  id: string;
  name: string;
  email: string;
  [key: string]: any;  // Allow extra properties
}

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
  selectedUser: User | null;
}

// Type the actions
type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SELECT_USER'; payload: User | null };

interface UserContextType extends UserState {
  dispatch: React.Dispatch<UserAction>;
  // Add helper functions gradually
  selectUser: (user: User) => void;
  clearSelection: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const initialState: UserState = {
  users: [],
  loading: false,
  error: null,
  selectedUser: null
};

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USERS':
      return { ...state, users: action.payload, loading: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SELECT_USER':
      return { ...state, selectedUser: action.payload };
    default:
      return state;
  }
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [state, dispatch] = useReducer(userReducer, initialState);

  // Add helper functions
  const selectUser = (user: User) => {
    dispatch({ type: 'SELECT_USER', payload: user });
  };

  const clearSelection = () => {
    dispatch({ type: 'SELECT_USER', payload: null });
  };

  const contextValue: UserContextType = {
    ...state,
    dispatch,
    selectUser,
    clearSelection
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
```

## Phase 5: Dealing with Third-Party Libraries

### Untyped Libraries

```typescript
// Create declaration files for untyped libraries
// types/legacy-chart-lib.d.ts
declare module 'legacy-chart-lib' {
  interface ChartOptions {
    type: 'bar' | 'line' | 'pie';
    data: Array<{ label: string; value: number }>;
    width?: number;
    height?: number;
  }

  export class Chart {
    constructor(element: HTMLElement, options: ChartOptions);
    update(data: Array<{ label: string; value: number }>): void;
    destroy(): void;
  }

  export function createChart(element: HTMLElement, options: ChartOptions): Chart;
}

// Now you can use the library with types
import { createChart, Chart } from 'legacy-chart-lib';

const ChartComponent: React.FC<{ data: Array<{ label: string; value: number }> }> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = createChart(chartRef.current, {
        type: 'bar',
        data,
        width: 400,
        height: 300
      });
    }

    return () => {
      chartInstance.current?.destroy();
    };
  }, [data]);

  return <div ref={chartRef} />;
};
```

### Module Augmentation

Extend existing library types:

```typescript
// types/react-router-extensions.d.ts
import 'react-router-dom';

declare module 'react-router-dom' {
  interface Location {
    state?: {
      from?: string;
      userId?: string;
      [key: string]: any;
    };
  }
}

// Now you can use extended location state
import { useLocation } from 'react-router-dom';

const SomePage: React.FC = () => {
  const location = useLocation();
  const fromPage = location.state?.from;  // TypeScript knows about this
  const userId = location.state?.userId;  // And this

  return <div>Welcome from {fromPage}</div>;
};
```

## Phase 6: Incremental Strictness

Gradually enable stricter TypeScript checking:

```json
// tsconfig.json - Enable rules incrementally
{
  "compilerOptions": {
    "strict": false, // Start false

    // Enable these one by one
    "noImplicitAny": true, // ✅ Enable first
    "strictNullChecks": false, // ❌ Enable later
    "strictFunctionTypes": true, // ✅ Usually safe
    "noImplicitReturns": true, // ✅ Good practice
    "noFallthroughCasesInSwitch": true, // ✅ Catches bugs

    // Advanced - enable after most migration is done
    "noUncheckedIndexedAccess": false, // ❌ Very strict
    "exactOptionalPropertyTypes": false // ❌ Very strict
  }
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

## Phase 7: Common Migration Patterns

### Event Handlers

```typescript
// Before: Untyped event handlers
const handleSubmit = (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  // ...
};

const handleChange = (e) => {
  setValue(e.target.value);
};
```

```typescript
// After: Properly typed
import React from 'react';

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  // TypeScript knows about form methods
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value); // TypeScript knows this is a string
};

// Generic handler for multiple input types
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));
};
```

### Ref Patterns

```typescript
// Before: Untyped refs
import { useRef } from 'react';

const MyComponent = () => {
  const inputRef = useRef();
  const modalRef = useRef();

  const focusInput = () => {
    inputRef.current.focus(); // No type safety
  };
};
```

```typescript
// After: Typed refs
import React, { useRef } from 'react';

const MyComponent: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();  // Type-safe with null check
  };

  const scrollToTop = () => {
    modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <input ref={inputRef} type="text" />
      <div ref={modalRef} className="modal">
        {/* Modal content */}
      </div>
    </div>
  );
};
```

### Children Props

```typescript
// Handle different children patterns
interface FlexibleProps {
  children: React.ReactNode;  // Most common
}

interface RenderPropProps {
  children: (data: User[]) => React.ReactNode;  // Render prop
}

interface StrictChildrenProps {
  children: React.ReactElement<ButtonProps>;  // Specific component type
}

// Migration-friendly: Accept multiple patterns
interface MigrationFriendlyProps {
  children: React.ReactNode | ((data: any) => React.ReactNode);
}

const FlexibleComponent: React.FC<MigrationFriendlyProps> = ({ children }) => {
  const data = useData();

  return (
    <div>
      {typeof children === 'function' ? children(data) : children}
    </div>
  );
};
```

## Phase 8: Testing During Migration

### Gradual Test Migration

```typescript
// Before: userUtils.test.js
import { formatUserName, validateEmail } from './userUtils';

describe('userUtils', () => {
  test('formats user name correctly', () => {
    const user = { firstName: 'John', lastName: 'Doe' };
    expect(formatUserName(user)).toBe('John Doe');
  });
});
```

```typescript
// After: userUtils.test.ts - Add types gradually
import { formatUserName, validateEmail } from './userUtils';

interface TestUser {
  firstName: string;
  lastName: string;
}

describe('userUtils', () => {
  test('formats user name correctly', () => {
    const user: TestUser = { firstName: 'John', lastName: 'Doe' };
    const result = formatUserName(user);

    expect(result).toBe('John Doe');
    expect(typeof result).toBe('string'); // Runtime type checking
  });

  test('validates email format', () => {
    const validEmails = ['test@example.com', 'user.name@domain.co.uk'];
    const invalidEmails = ['invalid', '@domain.com', 'user@'];

    validEmails.forEach((email) => {
      expect(validateEmail(email)).toBe(true);
    });

    invalidEmails.forEach((email) => {
      expect(validateEmail(email)).toBe(false);
    });
  });
});
```

### Type-Safe Test Utilities

```typescript
// test-utils.tsx - Gradually improve test setup
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';

// Flexible provider props during migration
interface ProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  initialRoute?: string;
}

const AllProviders: React.FC<ProvidersProps> = ({
  children,
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  }),
  initialRoute = '/'
}) => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

// Custom render with types
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialRoute?: string;
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { queryClient, initialRoute, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient} initialRoute={initialRoute}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
};

export * from '@testing-library/react';
export { customRender as render };
```

## Phase 9: Performance and Bundle Impact

### Monitor Bundle Size

```typescript
// webpack-bundle-analyzer or similar
// Check that TypeScript compilation doesn't increase bundle size

// tsconfig.json - Optimize for production
{
  "compilerOptions": {
    "target": "ES2020",        // Modern target for smaller output
    "module": "esnext",        // Tree shaking friendly
    "moduleResolution": "node",
    "declaration": false,      // Don't generate .d.ts files
    "removeComments": true,    // Remove comments from output
    "importHelpers": true,     // Use tslib helpers (install tslib)
    "downlevelIteration": false  // Smaller output for simple iteration
  }
}
```

### Conditional Compilation

```typescript
// Use environment variables for gradual features
declare const process: {
  env: {
    NODE_ENV: 'development' | 'production';
    REACT_APP_TYPESCRIPT_MIGRATION: 'true' | 'false';
  };
};

// Gradually roll out TypeScript features
const useNewTypedAPI = process.env.REACT_APP_TYPESCRIPT_MIGRATION === 'true';

export const api = {
  getUsers: useNewTypedAPI ? getTypedUsers : getLegacyUsers,
  createUser: useNewTypedAPI ? createTypedUser : createLegacyUser,
};
```

## Phase 10: Team Migration Strategy

### Code Review Guidelines

```typescript
// .github/PULL_REQUEST_TEMPLATE.md
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

### Incremental Adoption Guidelines

````typescript
// MIGRATION.md
# TypeScript Migration Guidelines

## Current Status
- Phase: **2** (Props and Hooks)
- Strictness: **Low** (`noImplicitAny: true` only)
- Target: 50% of components by end of sprint

## Rules for This Phase
1. ✅ All new components must have typed props
2. ✅ Convert one existing component per PR
3. ✅ Use `TODO_TYPE` for complex types you'll fix later
4. ❌ Don't enable `strictNullChecks` yet
5. ❌ Don't spend time on perfect types for legacy code

## File Naming Convention
- New TS files: `.tsx` / `.ts`
- Migrated files: Change extension in same PR
- Keep JS files as `.jsx` / `.js` until migrated

## Common Patterns
```typescript
// Use these patterns during migration
type TODO_TYPE = any;
type LEGACY_PROPS = Record<string, any>;

// Gradually improve these
interface ComponentProps {
  user: TODO_TYPE;  // Will improve later
  onUpdate: (user: TODO_TYPE) => void;
}
````

## Tooling for Migration

### ESLint Rules

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

### Migration Scripts

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

# Add basic types
sed -i '' 's/React\.FC/React.FC<any>/g' "$new_file"
sed -i '' 's/= ({/: React.FC<any> = ({/g' "$new_file"

echo "Migrated $file to $new_file"
echo "Don't forget to:"
echo "1. Add proper prop types"
echo "2. Type event handlers"
echo "3. Update imports in other files"
```

## Common Migration Pitfalls

### 1. Perfectionism Paralysis

```typescript
// ❌ Don't do this - trying to perfect everything
interface PerfectUserProps {
  user: {
    id: UUID;
    name: NonEmptyString;
    email: ValidatedEmail;
    createdAt: ISO8601DateTime;
    permissions: readonly Permission[];
    metadata: DeepReadonly<UserMetadata>;
  };
  onUpdate: (
    user: User,
    changes: DeepPartial<UserUpdatePayload>,
  ) => Promise<Result<User, ValidationError>>;
}

// ✅ Do this - good enough for now
interface UserProps {
  user: {
    id: string;
    name: string;
    email: string;
    [key: string]: any; // Allow extra properties
  };
  onUpdate: (user: any, changes: any) => void; // Improve later
}
```

### 2. Breaking Changes

```typescript
// ❌ Don't change APIs during migration
// Before
export function getUsers(filters) {
  return api.get('/users', { params: filters });
}

// Don't do this - breaks existing JS code
export function getUsers(filters: UserFilters): Promise<User[]> {
  // This breaks all JS callers
}

// ✅ Do this - maintain compatibility
export function getUsers(filters: any): Promise<any> {
  return api.get('/users', { params: filters });
}

// Create new typed version alongside
export function getUsersTyped(filters: UserFilters): Promise<User[]> {
  return getUsers(filters);
}
```

### 3. All-or-Nothing Approach

```typescript
// ❌ Don't try to migrate entire features at once
// Trying to migrate UserList, UserCard, UserForm, UserModal all at once

// ✅ Do this - one component at a time
// 1. Migrate UserCard first (it's a leaf component)
// 2. Then UserList (uses UserCard)
// 3. Then UserForm
// 4. Finally UserModal
```

## Success Metrics

Track your migration progress:

```typescript
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

## Summary

Successful TypeScript migration is about **progress, not perfection**:

1. **Start permissive** - Allow JavaScript, disable strict checks initially
2. **Migrate boundaries first** - Component props, API functions, hooks
3. **Use escape hatches** - `any` is okay temporarily
4. **Go file by file** - Don't try to migrate everything at once
5. **Maintain compatibility** - Don't break existing JavaScript code
6. **Track progress** - Measure and celebrate incremental improvements
7. **Enable strictness gradually** - Turn on rules as you improve coverage

Remember: A partially migrated TypeScript codebase is infinitely better than a JavaScript codebase you're afraid to change. Every type you add makes your application more maintainable, even if the rest isn't perfect yet.
