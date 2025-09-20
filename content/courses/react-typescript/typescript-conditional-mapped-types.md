---
title: Conditional and Mapped Types
description: >-
  Transform and manipulate types at compile time with TypeScript's most powerful
  features
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T18:59:44.932Z'
---

If TypeScript's type system is a programming language, then conditional and mapped types are its control flow and loops. They let you transform types, create new types based on existing ones, and build incredibly sophisticated type-level logic. These are the tools that make libraries like React Hook Form and tRPC possible. Let's master them.

## Conditional Types: If-Then-Else for Types

Conditional types follow the pattern `T extends U ? X : Y`:

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false
type C = IsString<'hello'>; // true (string literal extends string)

// More practical example
type Flatten<T> = T extends Array<infer Item> ? Item : T;

type Str = Flatten<string>; // string
type Num = Flatten<number[]>; // number
type Mixed = Flatten<(string | number)[]>; // string | number
```

## The `infer` Keyword

`infer` lets you extract types from other types:

```typescript
// Extract return type
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getString(): string {
  return 'hello';
}

type StringReturn = ReturnType<typeof getString>; // string

// Extract promise type
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type PromiseString = UnwrapPromise<Promise<string>>; // string
type JustString = UnwrapPromise<string>; // string

// Extract array element type
type ElementType<T> = T extends (infer E)[] ? E : never;

type StringElement = ElementType<string[]>; // string
type NumberElement = ElementType<number[]>; // number
```

## React Component Props Extraction

```typescript
// Extract props type from a component
type ComponentProps<T> = T extends React.ComponentType<infer P> ? P : never;

const Button = (props: { label: string; onClick: () => void }) => {
  return <button onClick={props.onClick}>{props.label}</button>;
};

type ButtonProps = ComponentProps<typeof Button>;
// { label: string; onClick: () => void }

// Extract props from different component types
type PropsOf<C> = C extends React.ComponentType<infer P>
  ? P
  : C extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[C]
  : never;

type DivProps = PropsOf<'div'>;  // React.HTMLAttributes<HTMLDivElement>
type CustomProps = PropsOf<typeof Button>;  // Button's props
```

## Mapped Types: Transforming Object Types

Mapped types let you create new types by transforming properties of existing types:

```typescript
// Basic mapped type
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

interface User {
  name: string;
  age: number;
}

type ReadonlyUser = Readonly<User>;
// { readonly name: string; readonly age: number; }

// Make all properties optional
type Partial<T> = {
  [P in keyof T]?: T[P];
};

type PartialUser = Partial<User>;
// { name?: string; age?: number; }

// Make all properties required
type Required<T> = {
  [P in keyof T]-?: T[P]; // -? removes optional
};
```

## Key Remapping with Template Literals

```typescript
// Getters and setters
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

interface State {
  name: string;
  age: number;
  isActive: boolean;
}

type StateGetters = Getters<State>;
// {
//   getName: () => string;
//   getAge: () => number;
//   getIsActive: () => boolean;
// }

type StateSetters = Setters<State>;
// {
//   setName: (value: string) => void;
//   setAge: (value: number) => void;
//   setIsActive: (value: boolean) => void;
// }
```

## Filtering Properties

```typescript
// Pick only string properties
type StringProperties<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

interface Mixed {
  id: number;
  name: string;
  email: string;
  age: number;
  isActive: boolean;
}

type OnlyStrings = StringProperties<Mixed>;
// { name: string; email: string; }

// Pick methods only
type Methods<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};

interface Service {
  url: string;
  timeout: number;
  get(): Promise<any>;
  post(data: any): Promise<any>;
}

type ServiceMethods = Methods<Service>;
// { get(): Promise<any>; post(data: any): Promise<any>; }
```

## Conditional Types with Mapped Types

```typescript
// Make specific properties optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

type UserUpdate = PartialBy<User, 'email' | 'password'>;
// { id: string; name: string; email?: string; password?: string; }

// Nullable properties
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

type NullableUser = Nullable<User>;
// All properties can be null

// Deep partial
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

## React Form Types

```typescript
// Form field state
type FieldState<T> = {
  value: T;
  error?: string;
  touched: boolean;
};

// Convert model to form state
type FormState<T> = {
  [K in keyof T]: FieldState<T[K]>;
};

interface LoginModel {
  email: string;
  password: string;
  remember: boolean;
}

type LoginFormState = FormState<LoginModel>;
// {
//   email: FieldState<string>;
//   password: FieldState<string>;
//   remember: FieldState<boolean>;
// }

// Form change handlers
type FormHandlers<T> = {
  [K in keyof T as `onChange${Capitalize<string & K>}`]: (value: T[K]) => void;
};

type LoginHandlers = FormHandlers<LoginModel>;
// {
//   onChangeEmail: (value: string) => void;
//   onChangePassword: (value: string) => void;
//   onChangeRemember: (value: boolean) => void;
// }
```

## Advanced Conditional Types

```typescript
// Distribute over unions
type IsStringType<T> = T extends string ? true : false;

type TestUnion = IsStringType<string | number>; // boolean (true | false)

// Non-distributive (wrapped in tuple)
type IsStringTypeNonDist<T> = [T] extends [string] ? true : false;

type TestUnionNonDist = IsStringTypeNonDist<string | number>; // false

// Extract non-nullable
type NonNullable<T> = T extends null | undefined ? never : T;

type MaybeString = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>; // string

// Function overloads
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

function greet(name: string): string;
function greet(first: string, last: string): string;
function greet(...args: string[]): string {
  return `Hello ${args.join(' ')}`;
}

type GreetParams = Parameters<typeof greet>;
// [name: string] | [first: string, last: string]
```

## Recursive Conditional Types

```typescript
// Deeply nested promise unwrapping
type DeepAwait<T> = T extends Promise<infer U> ? DeepAwait<U> : T;

type Nested = Promise<Promise<Promise<string>>>;
type Unwrapped = DeepAwait<Nested>; // string

// Flatten nested arrays
type Flatten<T> = T extends readonly (infer U)[] ? Flatten<U> : T;

type NestedArray = number[][][];
type Flat = Flatten<NestedArray>; // number

// Path types for nested objects
type Path<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends object
    ? `${K}` | `${K}.${Path<T[K]>}`
    : `${K}`
  : never;

interface Person {
  name: string;
  address: {
    street: string;
    city: string;
    country: {
      code: string;
      name: string;
    };
  };
}

type PersonPaths = Path<Person>;
// "name" | "address" | "address.street" | "address.city" |
// "address.country" | "address.country.code" | "address.country.name"
```

## Template for API Response Types

```typescript
// API response wrapper
type ApiResponse<T, E = Error> = { success: true; data: T } | { success: false; error: E };

// Transform all methods to return API responses
type AsyncApi<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<ApiResponse<Awaited<R>>>
    : never;
};

interface UserService {
  getUser(id: string): User;
  updateUser(id: string, data: Partial<User>): User;
  deleteUser(id: string): void;
}

type AsyncUserService = AsyncApi<UserService>;
// {
//   getUser(id: string): Promise<ApiResponse<User>>;
//   updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>>;
//   deleteUser(id: string): Promise<ApiResponse<void>>;
// }
```

## React Props Manipulation

```typescript
// Remove event handlers
type DataProps<T> = {
  [K in keyof T as K extends `on${string}` ? never : K]: T[K];
};

interface ButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
  onHover: () => void;
}

type ButtonDataProps = DataProps<ButtonProps>;
// { label: string; disabled: boolean; }

// Make event handlers optional
type OptionalEvents<T> = {
  [K in keyof T as K extends `on${string}` ? K : never]?: T[K];
} & {
  [K in keyof T as K extends `on${string}` ? never : K]: T[K];
};

type FlexibleButton = OptionalEvents<ButtonProps>;
// { label: string; disabled: boolean; onClick?: () => void; onHover?: () => void; }
```

## Type-Safe Object Path Access

```typescript
// Get type at path
type GetPath<T, Path extends string> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? GetPath<T[Key], Rest>
    : never
  : Path extends keyof T
    ? T[Path]
    : never;

interface Data {
  user: {
    profile: {
      name: string;
      age: number;
    };
    settings: {
      theme: 'light' | 'dark';
    };
  };
}

type UserName = GetPath<Data, 'user.profile.name'>; // string
type Theme = GetPath<Data, 'user.settings.theme'>; // 'light' | 'dark'

// Safe get function
function get<T, P extends Path<T>>(obj: T, path: P): GetPath<T, P> {
  const keys = path.split('.');
  let result: any = obj;

  for (const key of keys) {
    result = result[key];
  }

  return result;
}
```

## Branded Types with Conditionals

```typescript
// Create branded types
type Brand<T, B> = T & { __brand: B };

// Validation with conditional types
type ValidEmail<T> = T extends `${string}@${string}.${string}` ? Brand<T, 'Email'> : never;

type Email1 = ValidEmail<'user@example.com'>; // Branded as Email
type Email2 = ValidEmail<'invalid'>; // never

// Runtime validation that matches
function isValidEmail<T extends string>(email: T): email is ValidEmail<T> {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const email = 'user@example.com';
if (isValidEmail(email)) {
  // email is branded as ValidEmail
  sendEmail(email);
}
```

## React Component Type Transformations

```typescript
// HOC type transformation
type WithLoading<P> = P & {
  loading?: boolean;
  error?: Error;
};

// Transform component type
type WithLoadingComponent<C> =
  C extends React.ComponentType<infer P> ? React.ComponentType<WithLoading<P>> : never;

// Inject props
type InjectProps<P, I> = Omit<P, keyof I> & Partial<I>;

// HOC that injects theme
interface ThemeProps {
  theme: {
    primaryColor: string;
    secondaryColor: string;
  };
}

type ThemedComponent<C> =
  C extends React.ComponentType<infer P> ? React.ComponentType<InjectProps<P, ThemeProps>> : never;
```

## Utility Type Combinations

```typescript
// Mutable (remove readonly)
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Pick and make partial
type PickPartial<T, K extends keyof T> = Partial<Pick<T, K>>;

// Omit and make required
type OmitRequired<T, K extends keyof T> = Required<Omit<T, K>>;

// Exclusive OR (XOR)
type XOR<T, U> =
  | (T & { [K in Exclude<keyof U, keyof T>]?: never })
  | (U & { [K in Exclude<keyof T, keyof U>]?: never });

interface Name {
  name: string;
}

interface Id {
  id: number;
}

// Can have name OR id, but not both
type Identifier = XOR<Name, Id>;

const id1: Identifier = { name: 'Alice' }; // ✅
const id2: Identifier = { id: 123 }; // ✅
// const id3: Identifier = { name: 'Alice', id: 123 };  // ❌ Error
```

## Real-World Example: Type-Safe API Client

```typescript
// API definition
interface APIEndpoints {
  '/users': {
    GET: { response: User[]; params: { page?: number } };
    POST: { response: User; body: CreateUserDTO };
  };
  '/users/:id': {
    GET: { response: User };
    PUT: { response: User; body: UpdateUserDTO };
    DELETE: { response: void };
  };
}

// Extract method types
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// Type-safe client
type APIClient = {
  [Path in keyof APIEndpoints]: {
    [Method in HTTPMethod as Lowercase<Method>]: Method extends keyof APIEndpoints[Path]
      ? APIEndpoints[Path][Method] extends { body: infer B; response: infer R }
        ? (body: B) => Promise<R>
        : APIEndpoints[Path][Method] extends { params: infer P; response: infer R }
          ? (params?: P) => Promise<R>
          : APIEndpoints[Path][Method] extends { response: infer R }
            ? () => Promise<R>
            : never
      : never;
  };
};

// Usage would be fully typed:
// client['/users'].get({ page: 1 })
// client['/users'].post({ name: 'Alice', email: 'alice@example.com' })
// client['/users/:id'].delete()
```

## Performance Tips

### 1. Avoid Deep Recursion

```typescript
// ❌ Can hit recursion limit
type DeepKeys<T> = T extends object ? { [K in keyof T]: K | DeepKeys<T[K]> }[keyof T] : never;

// ✅ Limit recursion depth
type Keys<T, Depth extends number = 5> = [Depth] extends [0]
  ? never
  : T extends object
    ? { [K in keyof T]: K | Keys<T[K], Prev[Depth]> }[keyof T]
    : never;

type Prev = [never, 0, 1, 2, 3, 4];
```

### 2. Use Type Aliases for Complex Types

```typescript
// ✅ Good: Break down complex types
type IsFunction<T> = T extends Function ? true : false;
type FunctionKeys<T> = {
  [K in keyof T]: IsFunction<T[K]> extends true ? K : never;
}[keyof T];

// ❌ Bad: Everything inline
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];
```

## Best Practices

### 1. Start Simple

```typescript
// Build up complexity gradually
type Simple<T> = T extends string ? true : false;
type Medium<T> = T extends `${infer Prefix}_${infer Suffix}` ? [Prefix, Suffix] : never;
type Complex<T> = T extends Record<infer K, infer V> ? /* ... */ : never;
```

### 2. Document Complex Types

```typescript
/**
 * Recursively makes all properties optional
 * @example
 * type Result = DeepPartial<{ a: { b: string } }>
 * // { a?: { b?: string } }
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

### 3. Test Your Types

```typescript
// Use type assertions to test
type Assert<T extends true> = T;

type Test1 = Assert<IsString<string> extends true ? true : false>; // ✅
type Test2 = Assert<IsString<number> extends false ? true : false>; // ✅
```

## Summary

Conditional and mapped types are TypeScript's power tools:

1. **Conditional Types** - Type-level if-then-else logic
2. **Mapped Types** - Transform object types systematically
3. **`infer` Keyword** - Extract types from complex structures
4. **Key Remapping** - Create new property names with template literals
5. **Recursive Types** - Handle deeply nested structures

Master these, and you'll be able to create type-safe abstractions that seemed impossible before!
