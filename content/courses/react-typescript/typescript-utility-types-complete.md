---
title: Utility Types Complete Guide
description: >-
  Master TypeScript's built-in utility types and create your own for cleaner,
  more maintainable code
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T19:01:07.875Z'
---

TypeScript provides a treasure trove of built-in utility types that save you from writing boilerplate type transformations. Think of them as your type-level standard library - pre-built tools for common type manipulations. Let's explore every utility type and learn how to create our own.

## Object Manipulation Utilities

### Partial&lt;T&gt;

Makes all properties optional:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

type PartialUser = Partial<User>;
// {
//   id?: string;
//   name?: string;
//   email?: string;
//   age?: number;
// }

// Perfect for update operations
function updateUser(id: string, updates: Partial<User>) {
  // Only update provided fields
  return database.update(id, updates);
}

updateUser('123', { name: 'Alice' }); // ✅ Only updating name
updateUser('123', {}); // ✅ No updates
```

### Required&lt;T&gt;

Makes all properties required:

```typescript
interface Config {
  apiUrl?: string;
  timeout?: number;
  retries?: number;
}

type RequiredConfig = Required<Config>;
// {
//   apiUrl: string;
//   timeout: number;
//   retries: number;
// }

// Ensure all config is provided
function initialize(config: Required<Config>) {
  // All properties guaranteed to exist
  connect(config.apiUrl, config.timeout);
}
```

### Readonly&lt;T&gt;

Makes all properties readonly:

```typescript
interface State {
  count: number;
  user: User;
}

type ReadonlyState = Readonly<State>;
// {
//   readonly count: number;
//   readonly user: User;
// }

// Prevent accidental mutations
function processState(state: Readonly<State>) {
  // state.count = 5;  // ❌ Error: Cannot assign to 'count'
  return { ...state, count: state.count + 1 }; // ✅ Create new object
}
```

### Record&lt;K, T&gt;

Creates an object type with keys K and values T:

```typescript
type Role = 'admin' | 'user' | 'guest';
type Permissions = Record<Role, string[]>;
// {
//   admin: string[];
//   user: string[];
//   guest: string[];
// }

const permissions: Permissions = {
  admin: ['read', 'write', 'delete'],
  user: ['read', 'write'],
  guest: ['read'],
};

// Dynamic keys
type Cache<T> = Record<string, T>;

const userCache: Cache<User> = {
  'user-1': { id: '1', name: 'Alice' },
  'user-2': { id: '2', name: 'Bob' },
};
```

## Property Selection Utilities

### Pick&lt;T, K&gt;

Picks specific properties from a type:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

type UserPreview = Pick<User, 'id' | 'name'>;
// { id: string; name: string; }

type PublicUser = Pick<User, 'id' | 'name' | 'email'>;
// { id: string; name: string; email: string; }

// Use in function parameters
function displayUser(user: Pick<User, 'name' | 'email'>) {
  return `${user.name} (${user.email})`;
}
```

### Omit&lt;T, K&gt;

Omits specific properties from a type:

```typescript
type UserWithoutPassword = Omit<User, 'password'>;
// { id: string; name: string; email: string; createdAt: Date; }

type UserUpdate = Omit<User, 'id' | 'createdAt'>;
// { name: string; email: string; password: string; }

// Remove sensitive data
function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password, ...sanitized } = user;
  return sanitized;
}
```

## Union Manipulation Utilities

### Exclude&lt;T, U&gt;

Excludes types from a union:

```typescript
type Status = 'idle' | 'loading' | 'success' | 'error';
type ActiveStatus = Exclude<Status, 'idle'>;
// 'loading' | 'success' | 'error'

type Primitive = string | number | boolean | null | undefined;
type NonNullablePrimitive = Exclude<Primitive, null | undefined>;
// string | number | boolean

// Filter union members
type Events = 'click' | 'focus' | 'blur' | 'change' | 'submit';
type NonFormEvents = Exclude<Events, 'change' | 'submit'>;
// 'click' | 'focus' | 'blur'
```

### Extract&lt;T, U&gt;

Extracts types from a union:

```typescript
type Status = 'idle' | 'loading' | 'success' | 'error';
type DoneStatus = Extract<Status, 'success' | 'error'>;
// 'success' | 'error'

// Extract specific shapes from union
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: 'triangle'; base: number; height: number };

type RoundShape = Extract<Shape, { kind: 'circle' }>;
// { kind: 'circle'; radius: number }

// Extract functions from union
type Mixed = string | number | (() => void) | (() => string);
type Functions = Extract<Mixed, Function>;
// (() => void) | (() => string)
```

### NonNullable&lt;T&gt;

Removes null and undefined:

```typescript
type MaybeString = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>;
// string

type MaybeUser = User | null | undefined;
type DefiniteUser = NonNullable<MaybeUser>;
// User

// Clean up optional values
function processValue<T>(value: T | null | undefined): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error('Value is required');
  }
  return value; // Type is NonNullable<T>
}
```

## Function Utilities

### Parameters&lt;T&gt;

Extracts function parameters:

```typescript
function createUser(name: string, age: number, email?: string): User {
  return { id: '1', name, age, email: email || '' };
}

type CreateUserParams = Parameters<typeof createUser>;
// [name: string, age: number, email?: string]

// Use with rest parameters
function log(...args: string[]): void {
  console.log(...args);
}

type LogParams = Parameters<typeof log>;
// string[]

// Apply to other functions
function applyFunction<F extends (...args: any[]) => any>(
  fn: F,
  args: Parameters<F>,
): ReturnType<F> {
  return fn(...args);
}
```

### ReturnType&lt;T&gt;

Extracts function return type:

```typescript
function getUser(): User {
  return { id: '1', name: 'Alice' };
}

type UserReturn = ReturnType<typeof getUser>;
// User

// With async functions
async function fetchData(): Promise<string[]> {
  return ['a', 'b', 'c'];
}

type DataReturn = ReturnType<typeof fetchData>;
// Promise<string[]>

// Generic return type
function identity<T>(value: T): T {
  return value;
}

type StringIdentity = ReturnType<typeof identity<string>>;
// string
```

### ConstructorParameters&lt;T&gt;

Extracts constructor parameters:

```typescript
class User {
  constructor(
    public name: string,
    public age: number,
    private id: string,
  ) {}
}

type UserConstructorParams = ConstructorParameters<typeof User>;
// [name: string, age: number, id: string]

// Use with factory functions
function createInstance<T extends new (...args: any[]) => any>(
  Constructor: T,
  ...args: ConstructorParameters<T>
): InstanceType<T> {
  return new Constructor(...args);
}
```

### InstanceType&lt;T&gt;

Gets instance type of a constructor:

```typescript
type UserInstance = InstanceType<typeof User>;
// User

// With built-in constructors
type DateInstance = InstanceType<typeof Date>;
// Date

type ErrorInstance = InstanceType<typeof Error>;
// Error

// Generic factory
function factory<T extends new (...args: any[]) => any>(Constructor: T): InstanceType<T> {
  return new Constructor();
}
```

## String Manipulation Utilities

### Uppercase&lt;T&gt;

```typescript
type Shout = Uppercase<'hello'>;
// 'HELLO'

type Methods = 'get' | 'post' | 'put' | 'delete';
type UpperMethods = Uppercase<Methods>;
// 'GET' | 'POST' | 'PUT' | 'DELETE'
```

### Lowercase&lt;T&gt;

```typescript
type Whisper = Lowercase<'HELLO'>;
// 'hello'

type HTTPMethods = 'GET' | 'POST' | 'PUT' | 'DELETE';
type LowerMethods = Lowercase<HTTPMethods>;
// 'get' | 'post' | 'put' | 'delete'
```

### Capitalize&lt;T&gt;

```typescript
type Title = Capitalize<'hello world'>;
// 'Hello world'

type EventNames = 'click' | 'focus' | 'blur';
type HandlerNames = `on${Capitalize<EventNames>}`;
// 'onClick' | 'onFocus' | 'onBlur'
```

### Uncapitalize&lt;T&gt;

```typescript
type Normal = Uncapitalize<'Hello World'>;
// 'hello World'

type PropertyNames = 'Name' | 'Age' | 'Email';
type LowerPropertyNames = Uncapitalize<PropertyNames>;
// 'name' | 'age' | 'email'
```

## Promise Utilities

### Awaited&lt;T&gt;

Unwraps Promise types:

```typescript
type PromiseString = Promise<string>;
type StringType = Awaited<PromiseString>;
// string

// Nested promises
type NestedPromise = Promise<Promise<Promise<number>>>;
type NumberType = Awaited<NestedPromise>;
// number

// With async functions
async function fetchUser(): Promise<User> {
  return { id: '1', name: 'Alice' };
}

type FetchedUser = Awaited<ReturnType<typeof fetchUser>>;
// User
```

## React-Specific Utility Patterns

### Component Props Utilities

```typescript
// Extract props from any component
type PropsOf<C> = C extends React.ComponentType<infer P> ? P : never;

// Make specific props optional
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled: boolean;
}

type FlexibleButton = Optional<ButtonProps, 'disabled' | 'onClick'>;
// { label: string; disabled?: boolean; onClick?: () => void; }
```

### Event Handler Types

```typescript
// Extract event type from handler
type EventOf<T> = T extends (event: infer E) => void ? E : never;

type ClickHandler = (e: React.MouseEvent) => void;
type ClickEvent = EventOf<ClickHandler>;
// React.MouseEvent

// Create handler type
type Handler<E> = (event: E) => void;
type MouseHandler = Handler<React.MouseEvent>;
```

## Custom Utility Types

### DeepPartial

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface Config {
  server: {
    host: string;
    port: number;
    ssl: {
      enabled: boolean;
      cert: string;
    };
  };
}

type PartialConfig = DeepPartial<Config>;
// Everything is optional, including nested properties
```

### DeepReadonly

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type ImmutableConfig = DeepReadonly<Config>;
// Everything is readonly, including nested properties
```

### Mutable

```typescript
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

interface ReadonlyUser {
  readonly id: string;
  readonly name: string;
}

type MutableUser = Mutable<ReadonlyUser>;
// { id: string; name: string; }
```

### PickByValue

```typescript
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

interface Mixed {
  id: number;
  name: string;
  isActive: boolean;
  description: string;
  count: number;
}

type StringFields = PickByValue<Mixed, string>;
// { name: string; description: string; }

type NumberFields = PickByValue<Mixed, number>;
// { id: number; count: number; }
```

### OmitByValue

```typescript
type OmitByValue<T, V> = {
  [K in keyof T as T[K] extends V ? never : K]: T[K];
};

type NonStringFields = OmitByValue<Mixed, string>;
// { id: number; isActive: boolean; count: number; }
```

### Nullable

```typescript
type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type Maybe<T> = T | null | undefined;

type NullableString = Nullable<string>; // string | null
type OptionalNumber = Optional<number>; // number | undefined
type MaybeUser = Maybe<User>; // User | null | undefined
```

### ValueOf

```typescript
type ValueOf<T> = T[keyof T];

interface Colors {
  red: '#ff0000';
  green: '#00ff00';
  blue: '#0000ff';
}

type ColorValue = ValueOf<Colors>;
// '#ff0000' | '#00ff00' | '#0000ff'
```

## Advanced Combinations

### API Response Types

```typescript
// Combine multiple utilities
type ApiResponse<T> = Readonly<{
  data: T;
  status: number;
  timestamp: Date;
}>;

type PartialApiResponse<T> = Partial<ApiResponse<T>>;
type ApiResponseData<T> = Pick<ApiResponse<T>, 'data'>;
type ApiMetadata<T> = Omit<ApiResponse<T>, 'data'>;

// Create variations
type UserResponse = ApiResponse<User>;
type PartialUserResponse = PartialApiResponse<User>;
type UserData = ApiResponseData<User>;
type UserMetadata = ApiMetadata<User>;
```

### Form State Management

```typescript
// Form field state
type FieldState<T> = {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
};

// Convert model to form
type FormState<T> = {
  [K in keyof T]: FieldState<T[K]>;
};

// Form with validation
type ValidatedForm<T> = FormState<T> & {
  isValid: boolean;
  isSubmitting: boolean;
  errors: Partial<Record<keyof T, string>>;
};

interface LoginData {
  email: string;
  password: string;
}

type LoginForm = ValidatedForm<LoginData>;
```

### React HOC Types

```typescript
// HOC that adds loading state
type WithLoading<P> = P & {
  loading?: boolean;
  error?: Error;
};

// HOC that injects props
type InjectProps<P, I> = Omit<P, keyof I> & Partial<I>;

// Theme injection
interface ThemeProps {
  theme: {
    colors: Record<string, string>;
    fonts: Record<string, string>;
  };
}

type WithTheme<P> = InjectProps<P, ThemeProps>;

// Usage
interface ButtonProps {
  label: string;
  onClick: () => void;
  theme?: ThemeProps['theme'];
}

type ThemedButton = WithTheme<ButtonProps>;
// { label: string; onClick: () => void; theme?: ThemeProps['theme']; }
```

## Type Guards with Utilities

```typescript
// Create type guards for utility types
function isPartial<T>(value: T | Partial<T>): value is Partial<T> {
  return Object.values(value).some((v) => v === undefined);
}

function isRequired<T>(value: Partial<T>): value is Required<T> {
  return Object.values(value).every((v) => v !== undefined);
}

function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

// Usage
function processUser(user: Partial<User> | User) {
  if (isRequired(user)) {
    // user is Required<User> (all fields present)
    console.log(user.email); // Safe access
  }
}
```

## Performance Considerations

### 1. Avoid Deep Nesting

```typescript
// ❌ Can be slow
type DeepNested<T> = {
  [P in keyof T]: DeepNested<DeepNested<DeepNested<T[P]>>>;
};

// ✅ Limit depth
type LimitedDepth<T, D extends number = 3> = D extends 0
  ? T
  : { [P in keyof T]: T[P] extends object ? LimitedDepth<T[P], Prev[D]> : T[P] };

type Prev = [never, 0, 1, 2, 3];
```

### 2. Use Type Aliases

```typescript
// ✅ Good: Reusable and clear
type UserUpdate = Partial<Omit<User, 'id'>>;
type PublicUser = Pick<User, 'id' | 'name' | 'email'>;

// ❌ Bad: Inline everywhere
function update(data: Partial<Omit<User, 'id'>>) {}
function display(user: Pick<User, 'id' | 'name' | 'email'>) {}
```

## Best Practices

### 1. Combine for Clarity

```typescript
// Instead of complex inline types
type UserFormData = Partial<Pick<User, 'name' | 'email' | 'age'>>;

// Is clearer than
type UserFormData2 = {
  name?: string;
  email?: string;
  age?: number;
};
```

### 2. Create Domain-Specific Utilities

```typescript
// Project-specific utilities
type Loadable<T> = {
  data?: T;
  loading: boolean;
  error?: Error;
};

type Timestamped<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

type Identifiable<T> = T & {
  id: string;
};
```

### 3. Document Complex Utilities

```typescript
/**
 * Makes specified keys optional while keeping others required
 * @example
 * type Result = PartialBy<User, 'email' | 'age'>
 * // { id: string; name: string; email?: string; age?: number; }
 */
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

## Summary

Utility types are essential tools in your TypeScript toolbox:

1. **Object utilities** (`Partial`, `Required`, `Readonly`, `Record`) - Transform object types
2. **Selection utilities** (`Pick`, `Omit`) - Select or exclude properties
3. **Union utilities** (`Exclude`, `Extract`, `NonNullable`) - Manipulate union types
4. **Function utilities** (`Parameters`, `ReturnType`) - Extract function type information
5. **String utilities** (`Uppercase`, `Lowercase`, etc.) - Transform string literal types
6. **Custom utilities** - Build your own for domain-specific needs

Master these utilities, and you'll write cleaner, more maintainable TypeScript code with less repetition!
