---
title: Type-Level Programming
description: Master advanced TypeScript patterns for type-level computation and validation
modified: '2025-09-22T09:27:10-06:00'
date: '2025-09-14T19:02:39.867Z'
---

Welcome to the deep end of TypeScript. If anything in this tutorial makes you want to cry, that's probably a natural reaction. This is some nerdy stuff. Type-level programming means writing "code" that runs at compile time using TypeScript's type system. It's like having a programming language within a programming language. This is where TypeScript transforms from a type checker into a powerful meta-programming tool. Let's explore how to compute, validate, and transform types at compile time.

## The Type System as a Programming Language

TypeScript's type system is Turing complete, meaning you can theoretically compute anything at the type level—within recursion limits, of course.

```typescript
// Type-level addition
type Add<A extends number, B extends number> = [...BuildTuple<A>, ...BuildTuple<B>]['length'];

type BuildTuple<N extends number, T extends unknown[] = []> = T['length'] extends N
  ? T
  : BuildTuple<N, [...T, unknown]>;

type Sum = Add<3, 4>; // 7

// Type-level boolean logic
type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false;

type Or<A extends boolean, B extends boolean> = A extends true
  ? true
  : B extends true
    ? true
    : false;

type Not<A extends boolean> = A extends true ? false : true;
```

## String Manipulation at Type Level

```typescript
// Split string into characters
type Split<S extends string> = S extends `${infer Head}${infer Tail}` ? [Head, ...Split<Tail>] : [];

type Letters = Split<'hello'>; // ['h', 'e', 'l', 'l', 'o']

// Join array into string
type Join<T extends string[], D extends string = ''> = T extends []
  ? ''
  : T extends [infer Head]
    ? Head
    : T extends [infer Head, ...infer Tail]
      ? Head extends string
        ? Tail extends string[]
          ? `${Head}${D}${Join<Tail, D>}`
          : never
        : never
      : never;

type Joined = Join<['a', 'b', 'c'], '-'>; // 'a-b-c'

// Reverse a string
type Reverse<S extends string> = S extends `${infer Head}${infer Tail}`
  ? `${Reverse<Tail>}${Head}`
  : '';

type Reversed = Reverse<'hello'>; // 'olleh'
```

## Type-Level State Machines

```typescript
// Traffic light state machine
type TrafficLight = {
  red: { next: 'green'; wait: 60 };
  green: { next: 'yellow'; wait: 45 };
  yellow: { next: 'red'; wait: 5 };
};

type NextState<Current extends keyof TrafficLight> = TrafficLight[Current]['next'];

type State1 = NextState<'red'>; // 'green'
type State2 = NextState<State1>; // 'yellow'
type State3 = NextState<State2>; // 'red'

// Wizard flow state machine
type WizardFlow = {
  start: { next: 'personal'; canGoBack: false };
  personal: { next: 'contact'; canGoBack: true; required: ['name', 'age'] };
  contact: { next: 'review'; canGoBack: true; required: ['email', 'phone'] };
  review: { next: 'complete'; canGoBack: true };
  complete: { next: never; canGoBack: false };
};

type CurrentStep<T extends keyof WizardFlow> = {
  step: T;
  next: WizardFlow[T]['next'];
  canGoBack: WizardFlow[T]['canGoBack'];
  required: T extends keyof {
    [K in keyof WizardFlow as WizardFlow[K] extends { required: any } ? K : never]: any;
  }
    ? WizardFlow[T]['required']
    : never;
};

type PersonalStep = CurrentStep<'personal'>;
// {
//   step: 'personal';
//   next: 'contact';
//   canGoBack: true;
//   required: ['name', 'age'];
// }
```

## Type-Level Validation

```typescript
// Email validation at type level
type IsEmail<S extends string> = S extends `${infer User}@${infer Domain}`
  ? Domain extends `${infer Sub}.${infer Tld}`
    ? Sub extends ''
      ? false
      : Tld extends ''
        ? false
        : true
    : false
  : false;

type ValidEmail = IsEmail<'user@example.com'>; // true
type InvalidEmail = IsEmail<'not-an-email'>; // false

// URL validation
type IsHttpUrl<S extends string> = S extends `http${'s' | ''}://${infer Rest}`
  ? Rest extends `${infer Domain}/${infer Path}`
    ? true
    : Rest extends `${infer Domain}`
      ? true
      : false
  : false;

type ValidUrl = IsHttpUrl<'https://example.com/path'>; // true
type InvalidUrl = IsHttpUrl<'ftp://example.com'>; // false
```

## Type-Level Math

```typescript
// Compare numbers
type GreaterThan<A extends number, B extends number> =
  CompareLength<BuildTuple<A>, BuildTuple<B>> extends true ? true : false;

type CompareLength<A extends unknown[], B extends unknown[]> = A extends [...B, ...infer Rest]
  ? Rest extends []
    ? false
    : true
  : false;

type IsGreater = GreaterThan<5, 3>; // true

// Range type
type Range<
  Start extends number,
  End extends number,
  Acc extends number[] = [],
> = Acc['length'] extends End
  ? []
  : Acc['length'] extends Start
    ? [Acc['length'], ...Range<[...Acc, unknown]['length'], End, [...Acc, unknown]>]
    : Range<Start, End, [...Acc, unknown]>;

type NumberRange = Range<3, 7>; // [3, 4, 5, 6]

// Fibonacci sequence
type Fibonacci<
  N extends number,
  Current extends number = 1,
  Previous extends number = 0,
  Index extends number = 0,
> = Index extends N ? Current : Fibonacci<N, Add<Current, Previous>, Current, Add<Index, 1>>;

// Note: Add implementation needed from earlier
type Fib5 = Fibonacci<5>; // 8
```

## Type-Level Data Structures

```typescript
// Type-level linked list
type LinkedList<T> = null | { value: T; next: LinkedList<T> };

type MyList = {
  value: 1;
  next: {
    value: 2;
    next: {
      value: 3;
      next: null;
    };
  };
};

// Operations on linked list
type Head<L extends LinkedList<any>> = L extends { value: infer V } ? V : never;
type Tail<L extends LinkedList<any>> = L extends { next: infer N } ? N : never;

type First = Head<MyList>; // 1
type Rest = Tail<MyList>; // { value: 2; next: { value: 3; next: null } }

// Type-level tree
type Tree<T> = {
  value: T;
  left?: Tree<T>;
  right?: Tree<T>;
};

// Tree traversal
type InOrder<T extends Tree<any>> =
  T extends Tree<infer V>
    ? [
        ...(T['left'] extends Tree<any> ? InOrder<T['left']> : []),
        V,
        ...(T['right'] extends Tree<any> ? InOrder<T['right']> : []),
      ]
    : [];
```

## React Component Type Builders

```typescript
// Build component props from a schema
type PropSchema = {
  name: { type: 'string'; required: true };
  age: { type: 'number'; required: false };
  onClick: { type: 'function'; required: true };
};

type SchemaToProps<S> = {
  [K in keyof S as S[K] extends { required: true } ? K : never]: S[K] extends { type: 'string' }
    ? string
    : S[K] extends { type: 'number' }
      ? number
      : S[K] extends { type: 'function' }
        ? () => void
        : never;
} & {
  [K in keyof S as S[K] extends { required: false } ? K : never]?: S[K] extends { type: 'string' }
    ? string
    : S[K] extends { type: 'number' }
      ? number
      : S[K] extends { type: 'function' }
        ? () => void
        : never;
};

type GeneratedProps = SchemaToProps<PropSchema>;
// { name: string; onClick: () => void; age?: number; }
```

## Type-Level JSON Parser

```typescript
// Parse JSON string types
type ParseJSON<T extends string> = T extends `"${infer Value}"`
  ? Value
  : T extends `${infer Num}`
    ? Num extends `${number}`
      ? number
      : never
    : T extends 'true'
      ? true
      : T extends 'false'
        ? false
        : T extends 'null'
          ? null
          : T extends `[${infer Items}]`
            ? ParseArray<Items>
            : T extends `{${infer Props}}`
              ? ParseObject<Props>
              : never;

type ParseArray<T extends string> = T extends ``
  ? []
  : T extends `${infer Item},${infer Rest}`
    ? [ParseJSON<Trim<Item>>, ...ParseArray<Rest>]
    : [ParseJSON<Trim<T>>];

type Trim<T extends string> = T extends ` ${infer R}`
  ? Trim<R>
  : T extends `${infer L} `
    ? Trim<L>
    : T;

// Usage
type Parsed = ParseJSON<'{"name": "Alice", "age": 30}'>;
// { name: "Alice"; age: number }
```

## Type-Level Route Matching

```typescript
// Express-style route pattern matching
type ExtractRouteParams<T extends string> = T extends `${infer Start}:${infer Param}/${infer Rest}`
  ? ExtractRouteParams<Start> & { [K in Param]: string } & ExtractRouteParams<Rest>
  : T extends `${infer Start}:${infer Param}`
    ? { [K in Param]: string }
    : {};

type UserRoute = ExtractRouteParams<'/users/:userId/posts/:postId'>;
// { userId: string; postId: string }

// Match URL to route
type MatchRoute<
  Pattern extends string,
  URL extends string,
> = Pattern extends `${infer P1}/:${infer Param}/${infer P2}`
  ? URL extends `${P1}/${infer Value}/${infer Rest}`
    ? { [K in Param]: Value } & MatchRoute<P2, Rest>
    : never
  : Pattern extends `${infer P1}/:${infer Param}`
    ? URL extends `${P1}/${infer Value}`
      ? { [K in Param]: Value }
      : never
    : URL extends Pattern
      ? {}
      : never;

type Matched = MatchRoute<'/users/:id', '/users/123'>;
// { id: '123' }
```

## Type-Level SQL Query Builder

```typescript
// SQL query type builder
type Query<T> = {
  select: <K extends keyof T>(...fields: K[]) => QueryWith<Pick<T, K>>;
  where: <K extends keyof T>(field: K, value: T[K]) => Query<T>;
  orderBy: <K extends keyof T>(field: K, dir?: 'asc' | 'desc') => Query<T>;
};

type QueryWith<T> = {
  from: (table: string) => QueryResult<T>;
};

type QueryResult<T> = {
  execute: () => Promise<T[]>;
  first: () => Promise<T | null>;
};

// Type-safe query building
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

declare const query: Query<User>;

const result = query
  .select('id', 'name') // Only id and name available
  .from('users')
  .execute(); // Promise<{ id: number; name: string }[]>
```

## Type-Level Form Validation

```typescript
// Validation rule types
type ValidationRules = {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  email?: boolean;
  min?: number;
  max?: number;
};

// Generate validator from rules
type Validator<Rules extends ValidationRules> = Rules['required'] extends true
  ? Rules['email'] extends true
    ? (value: string) => value is Email
    : Rules['minLength'] extends number
      ? (value: string) => value is MinLength<Rules['minLength']>
      : (value: unknown) => value is NonNullable<unknown>
  : (value: unknown) => boolean;

// Field with validation
type Field<T, Rules extends ValidationRules = {}> = {
  value: T;
  rules: Rules;
  validate: Validator<Rules>;
  errors: string[];
};

// Form from schema
type FormSchema = {
  email: { type: string; rules: { required: true; email: true } };
  password: { type: string; rules: { required: true; minLength: 8 } };
  age: { type: number; rules: { min: 18; max: 100 } };
};

type FormFields<S> = {
  [K in keyof S]: S[K] extends { type: infer T; rules: infer R }
    ? R extends ValidationRules
      ? Field<T, R>
      : never
    : never;
};

type LoginForm = FormFields<FormSchema>;
```

## Type-Level Event System

```typescript
// Event emitter with type-safe events
type EventMap = {
  'user:login': { userId: string; timestamp: Date };
  'user:logout': { userId: string };
  'data:update': { table: string; id: string; changes: object };
};

type TypedEventEmitter<T extends Record<string, any>> = {
  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): void;
  off<K extends keyof T>(event: K, handler: (data: T[K]) => void): void;
  emit<K extends keyof T>(event: K, data: T[K]): void;
  once<K extends keyof T>(event: K, handler: (data: T[K]) => void): void;
};

declare const emitter: TypedEventEmitter<EventMap>;

emitter.on('user:login', ({ userId, timestamp }) => {
  // userId is string, timestamp is Date
});

emitter.emit('user:login', { userId: '123', timestamp: new Date() }); // ✅
// emitter.emit('user:login', { userId: 123 });  // ❌ Error: userId must be string
```

## Type-Level Testing

```typescript
// Type-level test framework
type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

type NotEqual<X, Y> = Equal<X, Y> extends true ? false : true;

// Write type-level tests
type TestStringUtilities = [
  Expect<Equal<Uppercase<'hello'>, 'HELLO'>>,
  Expect<Equal<Lowercase<'HELLO'>, 'hello'>>,
  Expect<Equal<Capitalize<'hello'>, 'Hello'>>,
];

type TestNumberComparison = [
  Expect<Equal<GreaterThan<5, 3>, true>>,
  Expect<Equal<GreaterThan<3, 5>, false>>,
  Expect<Equal<GreaterThan<3, 3>, false>>,
];

// Test will fail at compile time if any assertion is false
type RunTests = [...TestStringUtilities, ...TestNumberComparison];
```

## Performance Optimizations

```typescript
// Tail recursion optimization pattern
type Reverse<T extends any[], Acc extends any[] = []> = T extends []
  ? Acc
  : T extends [...infer Rest, infer Last]
  ? Reverse<Rest, [Last, ...Acc]>
  : never;

// Cache computed types
type Cache<K, V> = { [P in K & string]: V };

type Fibonacci<N extends number, C extends Cache<number, number> = {}> =
  N extends keyof C
    ? C[N]
    : N extends 0 | 1
    ? 1
    : Add<Fibonacci<Subtract<N, 1>, C>, Fibonacci<Subtract<N, 2>, C>>;

// Limit recursion depth
type MaxDepth = 50;
type DepthCounter = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
  30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
  40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  50
];

type SafeRecursive<T, Depth extends number = 0> = Depth extends MaxDepth
  ? never
  : /* recursive logic here */;
```

## Real-World Application: Type-Safe GraphQL

```typescript
// GraphQL schema to TypeScript types
type GraphQLSchema = {
  Query: {
    user: { args: { id: string }; returns: User };
    users: { args: { limit?: number }; returns: User[] };
  };
  Mutation: {
    createUser: { args: { input: CreateUserInput }; returns: User };
    updateUser: { args: { id: string; input: UpdateUserInput }; returns: User };
  };
};

// Generate client from schema
type GraphQLClient<S> = {
  query: {
    [K in keyof S['Query']]: S['Query'][K] extends { args: infer A; returns: infer R }
      ? (args: A) => Promise<R>
      : never;
  };
  mutation: {
    [K in keyof S['Mutation']]: S['Mutation'][K] extends { args: infer A; returns: infer R }
      ? (args: A) => Promise<R>
      : never;
  };
};

declare const client: GraphQLClient<GraphQLSchema>;

// Fully typed!
const user = await client.query.user({ id: '123' }); // Promise<User>
const users = await client.query.users({ limit: 10 }); // Promise<User[]>
```

## Type-Level Design Patterns

### Builder Pattern

```typescript
type Builder<T, Built = {}> = {
  [K in keyof T]-?: K extends keyof Built
    ? Builder<T, Built>
    : Builder<T, Built & { [P in K]: T[K] }> & {
        [P in K as `with${Capitalize<string & P>}`]: (
          value: T[P],
        ) => Builder<T, Built & { [Q in K]: T[K] }>;
      };
} & {
  build: Built extends T ? () => T : never;
};

interface User {
  name: string;
  email: string;
  age: number;
}

declare function createBuilder<T>(): Builder<T>;

const user = createBuilder<User>()
  .withName('Alice')
  .withEmail('alice@example.com')
  .withAge(30)
  .build(); // Only available when all required fields are set
```

### Visitor Pattern

```typescript
type Visitor<T> = T extends { kind: infer K }
  ? K extends string
    ? { [P in K as `visit${Capitalize<P>}`]: (node: Extract<T, { kind: P }>) => void }
    : never
  : never;

type AST =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'binary'; op: '+' | '-'; left: AST; right: AST };

type ASTVisitor = Visitor<AST>;
// {
//   visitNumber: (node: { kind: 'number'; value: number }) => void;
//   visitString: (node: { kind: 'string'; value: string }) => void;
//   visitBinary: (node: { kind: 'binary'; op: '+' | '-'; left: AST; right: AST }) => void;
// }
```

## Best Practices

### Use Type Aliases for Complex Computations

```typescript
// ✅ Good: Break down complex types
type IsArray<T> = T extends any[] ? true : false;
type ElementType<T> = T extends (infer E)[] ? E : never;
type ArrayLength<T extends any[]> = T['length'];

// ❌ Bad: Everything inline
type ComplexType<T> = T extends any[]
  ? T['length'] extends 0
    ? never
    : T extends (infer E)[]
      ? E
      : never
  : false;
```

### Provide Escape Hatches

```typescript
// Allow opting out of type-level validation
type StrictEmail<T extends string> = IsEmail<T> extends true ? T : never;
type Email = StrictEmail<string> | (string & { __brand: 'Email' });

// Runtime validation for when type-level isn't enough
function validateEmail(email: string): email is Email {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### Document Complex Types

```typescript
/**
 * Deeply flattens nested array types
 * @example
 * type Result = DeepFlatten<number[][][]>  // number
 */
type DeepFlatten<T> = T extends readonly (infer U)[] ? DeepFlatten<U> : T;
```

## Summary

Type-level programming in TypeScript enables:

1. **Compile-time validation** - Catch errors before runtime
2. **Type transformations** - Generate new types from existing ones
3. **Type-safe APIs** - Build APIs that can't be misused
4. **Meta-programming** - Generate code from types
5. **Zero runtime cost** - All computation happens at compile time

While powerful, use type-level programming judiciously. Complex type-level code can slow down compilation and make code harder to understand. Reserve it for library code, critical type safety, and situations where the compile-time guarantees justify the complexity!
