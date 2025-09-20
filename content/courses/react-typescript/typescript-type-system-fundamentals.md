---
title: TypeScript Type System Fundamentals
description: >-
  Master TypeScript's type system from the ground up—structural typing, type
  inference, narrowing, and the mental models that make everything click.
date: 2025-09-14T18:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - typescript
  - fundamentals
  - type-system
  - basics
---

Before you can master React with TypeScript, you need to understand how TypeScript thinks about types. It's not like Java or C# where types are about classes and inheritance. TypeScript uses structural typing—if it walks like a duck and quacks like a duck, TypeScript says it's a duck. This fundamental difference changes everything about how you write and think about types.

Let's build a rock-solid foundation in TypeScript's type system. Once you understand these core concepts, every React pattern will make more sense, every error message will be clearer, and you'll write types that actually help rather than hinder.

## Structural Typing: The Foundation

TypeScript doesn't care about names or declarations—it cares about shape. This is the most important concept to internalize.

### Understanding Structural Typing

```typescript
// These are the same to TypeScript
interface User {
  name: string;
  age: number;
}

interface Person {
  name: string;
  age: number;
}

// TypeScript sees them as interchangeable
const user: User = { name: 'Alice', age: 30 };
const person: Person = user; // ✅ No error!

// It's all about the shape
function greet(someone: { name: string }) {
  console.log(`Hello, ${someone.name}`);
}

greet(user); // ✅ Works - user has a name
greet(person); // ✅ Works - person has a name
greet({ name: 'Bob', age: 25, city: 'NYC' }); // ✅ Works - has name and more
```

### Duck Typing in Practice

```typescript
// TypeScript doesn't need explicit types if the shape matches
class Duck {
  swim() {
    console.log('Swimming like a duck');
  }

  quack() {
    console.log('Quack!');
  }
}

class Person {
  swim() {
    console.log('Swimming like a human');
  }

  quack() {
    console.log('I can quack too!');
  }
}

// If it has swim and quack, it's duck-like enough
function makeItSwimAndQuack(duck: { swim(): void; quack(): void }) {
  duck.swim();
  duck.quack();
}

makeItSwimAndQuack(new Duck()); // ✅ Works
makeItSwimAndQuack(new Person()); // ✅ Also works!
```

### Excess Property Checking

```typescript
// Direct object literals get stricter checking
interface Config {
  url: string;
  timeout: number;
}

// ❌ Error: Object literal may only specify known properties
const config1: Config = {
  url: 'api.example.com',
  timeout: 5000,
  extra: 'oops' // Error!
};

// ✅ But this works (object comes from a variable)
const settings = {
  url: 'api.example.com',
  timeout: 5000,
  extra: 'not a problem'
};
const config2: Config = settings; // No error - has required shape

// This is why you see this pattern in React props
interface ButtonProps {
  label: string;
  onClick: () => void;
}

// ❌ Inline object literal - excess property checking
<Button label="Click" onClick={() => {}} extra="oops" />

// ✅ Object from variable - no excess property checking
const props = { label: "Click", onClick: () => {}, extra: "ok" };
<Button {...props} />
```

## Type Inference: Let TypeScript Do the Work

TypeScript is incredibly good at figuring out types. Understanding when to let inference work and when to be explicit is key.

### Basic Inference

```typescript
// TypeScript infers types from values
let message = 'Hello'; // Type: string
let count = 42; // Type: number
let isActive = true; // Type: boolean

// Arrays and objects too
let numbers = [1, 2, 3]; // Type: number[]
let user = { name: 'Alice', age: 30 }; // Type: { name: string; age: number }

// Function return types
function add(a: number, b: number) {
  return a + b; // Return type inferred as number
}

// Complex inference
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]; // Type: Array<{ id: number; name: string }>
```

### Contextual Typing

```typescript
// TypeScript infers from context
const numbers = [1, 2, 3];

// TypeScript knows 'n' is a number from array context
numbers.map((n) => n * 2);

// Event handlers get contextual types
document.addEventListener('click', (e) => {
  // TypeScript knows 'e' is MouseEvent
  console.log(e.clientX, e.clientY);
});

// Function parameters from expected types
interface Calculator {
  add(a: number, b: number): number;
}

const calc: Calculator = {
  add(a, b) {
    // a and b are inferred as numbers
    return a + b;
  },
};
```

### Const Assertions for Literal Types

```typescript
// Without const assertion - mutable, wider types
let config1 = {
  endpoint: 'api.example.com',
  port: 8080,
  protocol: 'https',
};
// Type: { endpoint: string; port: number; protocol: string }

// With const assertion - readonly, narrower types
const config2 = {
  endpoint: 'api.example.com',
  port: 8080,
  protocol: 'https',
} as const;
// Type: {
//   readonly endpoint: "api.example.com";
//   readonly port: 8080;
//   readonly protocol: "https"
// }

// Const assertions with arrays
const colors1 = ['red', 'green', 'blue'];
// Type: string[]

const colors2 = ['red', 'green', 'blue'] as const;
// Type: readonly ["red", "green", "blue"]

// Extracting literal types
type Color = (typeof colors2)[number]; // "red" | "green" | "blue"
```

## Type Narrowing: Progressive Type Refinement

TypeScript understands control flow and narrows types based on your code's logic.

### Type Guards

```typescript
// typeof type guards
function processValue(value: string | number) {
  if (typeof value === 'string') {
    // TypeScript knows value is string here
    console.log(value.toUpperCase());
  } else {
    // TypeScript knows value is number here
    console.log(value.toFixed(2));
  }
}

// instanceof type guards
class Cat {
  meow() {
    console.log('Meow!');
  }
}

class Dog {
  bark() {
    console.log('Woof!');
  }
}

function makeSound(animal: Cat | Dog) {
  if (animal instanceof Cat) {
    animal.meow(); // TypeScript knows it's a Cat
  } else {
    animal.bark(); // TypeScript knows it's a Dog
  }
}

// in operator type guards
interface Bird {
  fly(): void;
  layEggs(): void;
}

interface Fish {
  swim(): void;
  layEggs(): void;
}

function move(animal: Bird | Fish) {
  if ('fly' in animal) {
    animal.fly(); // It's a Bird
  } else {
    animal.swim(); // It's a Fish
  }
}
```

### Discriminated Unions

Discriminated unions are one of TypeScript's most powerful patterns for handling complex state. They use a common property to distinguish between different shapes of data.

**See: [TypeScript Discriminated Unions](typescript-discriminated-unions.md)** for comprehensive coverage including:

- Complete pattern explanation and examples
- React-specific use cases
- Exclusive props patterns
- Runtime validation approaches

### Custom Type Predicates

```typescript
// User-defined type guards
interface User {
  id: string;
  name: string;
  email: string;
}

// This is a type predicate
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'email' in value &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).name === 'string' &&
    typeof (value as User).email === 'string'
  );
}

// Using the type predicate
function processData(data: unknown) {
  if (isUser(data)) {
    // TypeScript knows data is User
    console.log(`User: ${data.name} (${data.email})`);
  } else {
    console.log('Not a valid user');
  }
}

// Array type guards
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function processArray(value: unknown) {
  if (isStringArray(value)) {
    // TypeScript knows value is string[]
    value.forEach((str) => console.log(str.toUpperCase()));
  }
}
```

## Unknown vs Any: Type Safety Levels

Understanding the difference between `unknown` and `any` is crucial for type safety.

### The Problem with Any

```typescript
// any disables all type checking - avoid it!
let value: any = 42;
value = "now I'm a string";
value = { suddenly: "I'm an object" };
value.foo.bar.baz; // No error, but will crash at runtime

// any spreads like a virus
function processAny(value: any) {
  const result = value.someMethod(); // result is any
  return result.someProperty; // returns any
}

// any breaks type safety
const data: any = 'not an array';
data.map((x) => x * 2); // No TypeScript error, runtime crash
```

### Unknown: The Safe Alternative

```typescript
// unknown requires type checking before use
let value: unknown = 42;
value = "now I'm a string";
value = { suddenly: "I'm an object" };

// ❌ Can't use unknown without checking
value.someMethod(); // Error!

// ✅ Must narrow the type first
if (typeof value === 'object' && value !== null && 'suddenly' in value) {
  console.log(value.suddenly); // Now it works
}

// Safe API responses
async function fetchData(): Promise<unknown> {
  const response = await fetch('/api/data');
  return response.json(); // Returns unknown
}

async function getData() {
  const data = await fetchData();

  // Must validate before using
  if (isUser(data)) {
    console.log(data.name); // Safe!
  }
}
```

### Never: The Impossible Type

```typescript
// never represents values that never occur
function throwError(message: string): never {
  throw new Error(message);
}

function infiniteLoop(): never {
  while (true) {
    // Never returns
  }
}

// Exhaustiveness checking with never
type Shape = 'circle' | 'square' | 'triangle';

function getArea(shape: Shape): number {
  switch (shape) {
    case 'circle':
      return Math.PI * 10 * 10;
    case 'square':
      return 10 * 10;
    case 'triangle':
      return (10 * 10) / 2;
    default:
      // If we get here, shape is never
      const exhaustive: never = shape;
      throw new Error(`Unhandled shape: ${exhaustive}`);
  }
}

// never in conditional types
type NonNullable<T> = T extends null | undefined ? never : T;

type Result = NonNullable<string | null | undefined>; // string
```

## Type Aliases vs Interfaces

When to use `type` vs `interface` is a common question. Here's the definitive guide.

### Interfaces: Object Shapes and Classes

```typescript
// Interfaces are great for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// Interface extension
interface Admin extends User {
  permissions: string[];
}

// Multiple interface extension
interface SuperAdmin extends User, Admin {
  sudo: boolean;
}

// Interface merging (declaration merging)
interface Window {
  myCustomProperty: string;
}

interface Window {
  anotherProperty: number;
}
// Both properties are merged

// Interfaces with classes
interface Drivable {
  speed: number;
  drive(): void;
}

class Car implements Drivable {
  speed = 0;
  drive() {
    console.log('Driving...');
  }
}
```

### Type Aliases: Everything Else

```typescript
// Type aliases for primitives
type ID = string | number;
type Status = 'pending' | 'active' | 'deleted';

// Type aliases for unions
type Result<T> = T | Error;

// Type aliases for tuples
type Coordinate = [number, number];
type RGB = [red: number, green: number, blue: number]; // Named tuple

// Type aliases for functions
type Callback<T> = (data: T) => void;
type Predicate<T> = (value: T) => boolean;

// Type aliases for complex types
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Type aliases for conditional types
type IsArray<T> = T extends any[] ? true : false;

// Intersection types (only with type aliases)
type Combined = User & { lastLogin: Date } & { isActive: boolean };
```

### When to Use Which

```typescript
// Use interface when:
// 1. Defining object shapes
interface UserProfile {
  name: string;
  bio: string;
}

// 2. You need declaration merging
interface Config {
  url: string;
}
interface Config {
  timeout: number;
}

// 3. Working with classes
interface Serializable {
  serialize(): string;
}

// Use type alias when:
// 1. Creating union types
type Status = 'loading' | 'success' | 'error';

// 2. Creating function types
type Handler = (event: Event) => void;

// 3. Working with tuples
type Point = [x: number, y: number];

// 4. Creating complex mapped or conditional types
type Readonly<T> = { readonly [P in keyof T]: T[P] };

// 5. Need intersection types
type AdminUser = User & Admin;
```

## Literal Types and Template Literals

TypeScript's literal types are more powerful than they first appear.

### String Literal Types

```typescript
// Exact string values as types
type Direction = 'north' | 'south' | 'east' | 'west';

function move(direction: Direction) {
  // direction can only be one of the four strings
}

move('north'); // ✅
move('up'); // ❌ Error

// Combining with generics
type EventName = 'click' | 'focus' | 'blur';
type EventHandler<T extends EventName> = T extends 'click'
  ? (e: MouseEvent) => void
  : (e: FocusEvent) => void;
```

### Numeric and Boolean Literals

```typescript
// Numeric literals
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
type HttpSuccessCode = 200 | 201 | 204;

// Boolean literals
type True = true;
type False = false;

// Using in conditional types
type IsZero<N extends number> = N extends 0 ? true : false;
type Test = IsZero<0>; // true
type Test2 = IsZero<5>; // false
```

### Template Literal Types

```typescript
// Basic template literals
type Color = 'red' | 'green' | 'blue';
type Brightness = 'light' | 'dark';
type Theme = `${Brightness}-${Color}`;
// Type: "light-red" | "light-green" | "light-blue" | "dark-red" | "dark-green" | "dark-blue"

// CSS units
type Unit = 'px' | 'em' | 'rem' | '%';
type CSSValue = `${number}${Unit}`;

const width: CSSValue = '100px'; // ✅
const height: CSSValue = '50%'; // ✅
const invalid: CSSValue = '10'; // ❌ Error

// Event handler names
type EventName = 'click' | 'focus' | 'change';
type HandlerName<T extends EventName> = `on${Capitalize<T>}`;

type ClickHandler = HandlerName<'click'>; // "onClick"
type FocusHandler = HandlerName<'focus'>; // "onFocus"

// Property getters/setters
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// Type: {
//   getName: () => string;
//   getAge: () => number;
// }
```

## Type Assertions and Casting

Sometimes you know more than TypeScript. Here's how to tell it.

### Basic Type Assertions

```typescript
// Using 'as' syntax (preferred)
const input = document.getElementById('user-input') as HTMLInputElement;
input.value = 'Hello'; // TypeScript knows it's an input

// Angle bracket syntax (doesn't work in JSX)
const input2 = <HTMLInputElement>document.getElementById('user-input');

// Double assertion for tricky cases
const value = 'hello' as unknown as number; // Dangerous but sometimes necessary

// Const assertions
const config = {
  endpoint: 'api.example.com',
  port: 8080,
} as const;

// Type assertions in object literals
const user = {
  id: '123',
  name: 'Alice',
} as User;
```

### Non-Null Assertions

```typescript
// The ! operator tells TypeScript a value isn't null/undefined
function processUser(user?: User) {
  // Without assertion
  console.log(user?.name); // Safe but verbose

  // With assertion (when you're certain)
  console.log(user!.name); // Dangerous but concise
}

// Common in DOM manipulation
const button = document.querySelector('button')!; // I know it exists
button.addEventListener('click', () => {});

// In array access
const users = [{ id: 1, name: 'Alice' }];
const firstUser = users[0]!; // I know the array isn't empty
```

### Assertion Functions

```typescript
// Custom assertion functions
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Value must be a string');
  }
}

function processValue(value: unknown) {
  assertIsString(value);
  // TypeScript knows value is string after assertion
  console.log(value.toUpperCase());
}

// Non-null assertion function
function assertDefined<T>(value: T | undefined | null): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error('Value must be defined');
  }
}

function example(value?: string) {
  assertDefined(value);
  // TypeScript knows value is string, not undefined
  console.log(value.length);
}
```

## Function Types and Overloads

Functions in TypeScript are more flexible than you might think.

### Function Type Expressions

```typescript
// Basic function types
type GreetFunction = (name: string) => string;

const greet: GreetFunction = (name) => `Hello, ${name}`;

// Optional and rest parameters
type Logger = (message: string, ...args: unknown[]) => void;

const log: Logger = (message, ...args) => {
  console.log(message, ...args);
};

// Functions with properties
interface CallableWithProperties {
  (x: number): number;
  description: string;
}

const double: CallableWithProperties = (x) => x * 2;
double.description = 'Doubles a number';
```

### Function Overloads

```typescript
// Multiple function signatures
function createElement(tag: 'div'): HTMLDivElement;
function createElement(tag: 'span'): HTMLSpanElement;
function createElement(tag: 'button'): HTMLButtonElement;
function createElement(tag: string): HTMLElement;
function createElement(tag: string): HTMLElement {
  return document.createElement(tag);
}

const div = createElement('div'); // Type: HTMLDivElement
const span = createElement('span'); // Type: HTMLSpanElement
const generic = createElement('section'); // Type: HTMLElement

// Overloads with different parameter counts
function makeDate(timestamp: number): Date;
function makeDate(year: number, month: number, day: number): Date;
function makeDate(yearOrTimestamp: number, month?: number, day?: number): Date {
  if (month !== undefined && day !== undefined) {
    return new Date(yearOrTimestamp, month, day);
  }
  return new Date(yearOrTimestamp);
}

const date1 = makeDate(2023, 0, 1); // From parts
const date2 = makeDate(Date.now()); // From timestamp
```

### Generic Functions

Generics enable writing reusable, type-safe functions that work with any type.

**See: [TypeScript Generics Deep Dive](typescript-generics-deep-dive.md)** for comprehensive coverage including:

- Complete generics patterns and constraints
- React component generics
- Advanced type parameters
- Real-world applications

## Index Signatures and Mapped Types

Dynamic property access is common in JavaScript. Here's how TypeScript handles it.

### Index Signatures

```typescript
// String index signatures
interface StringDictionary {
  [key: string]: string;
}

const dict: StringDictionary = {
  hello: 'world',
  foo: 'bar',
};

// Number index signatures
interface StringArray {
  [index: number]: string;
}

const arr: StringArray = ['hello', 'world'];

// Mixed index signatures
interface MixedDictionary {
  [key: string]: string | number;
  length: number; // Specific properties must be compatible
  name: string;
}

// Template literal index signatures
interface EventHandlers {
  [key: `on${string}`]: Function;
}

const handlers: EventHandlers = {
  onClick: () => {},
  onFocus: () => {},
  regularMethod: () => {}, // ❌ Error: doesn't match pattern
};
```

### Record Types

```typescript
// Record for object types
type Role = 'admin' | 'user' | 'guest';
type Permissions = Record<Role, string[]>;

const permissions: Permissions = {
  admin: ['read', 'write', 'delete'],
  user: ['read', 'write'],
  guest: ['read'],
};

// Partial records
type PartialPermissions = Partial<Record<Role, string[]>>;

const somePermissions: PartialPermissions = {
  admin: ['read', 'write'],
  // user and guest are optional
};
```

## Module Systems and Namespaces

Understanding TypeScript's module system is crucial for organizing code.

### ES Modules

```typescript
// Named exports
export interface User {
  id: string;
  name: string;
}

export function createUser(name: string): User {
  return { id: Math.random().toString(), name };
}

export const DEFAULT_USER: User = {
  id: '0',
  name: 'Anonymous',
};

// Default export
export default class UserService {
  getUser(id: string): User | undefined {
    // Implementation
  }
}

// Re-exports
export { User, createUser } from './user';
export * from './types';
export { default as UserService } from './UserService';
```

### Type-Only Imports

```typescript
// Import only types (removed at runtime)
import type { User } from './types';
import type { ComponentProps } from 'react';

// Mixed imports with type modifier
import UserService, { type User, type UserOptions } from './user';

// Type-only re-exports
export type { User, UserOptions } from './user';
```

### Ambient Declarations

```typescript
// Declare types for modules without types
declare module 'some-untyped-library' {
  export function doSomething(value: string): void;
  export class SomeClass {
    constructor(options: any);
  }
}

// Global augmentation
declare global {
  interface Window {
    myGlobalFunction: () => void;
  }
}

// Module augmentation
declare module 'express' {
  interface Request {
    user?: User;
  }
}
```

## Best Practices and Mental Models

### Start Specific, Widen as Needed

```typescript
// ❌ Too wide initially
function processData(data: any) {
  // No type safety
}

// ✅ Start specific
function processUser(user: User) {
  // Full type safety
}

// ✅ Widen when needed with generics
function processEntity<T extends { id: string }>(entity: T) {
  // Flexible but safe
}
```

### Use Union Types for States

```typescript
// ❌ Multiple booleans
interface BadState {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

// ✅ Union types
type GoodState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: Data };
```

### Prefer Type Inference

```typescript
// ❌ Unnecessary annotations
const name: string = 'Alice';
const age: number = 30;
const user: { name: string; age: number } = { name, age };

// ✅ Let TypeScript infer
const name = 'Alice';
const age = 30;
const user = { name, age };
```

### Make Invalid States Unrepresentable

```typescript
// ❌ Invalid states possible
interface BadForm {
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;
}

// ✅ Invalid states impossible
type GoodForm =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; data: FormData }
  | { status: 'error'; error: string };
```

## Wrapping Up

These fundamentals form the bedrock of TypeScript understanding. Structural typing teaches you to think in shapes, not names. Type inference shows you when to write types and when to let TypeScript work. Type narrowing reveals how TypeScript understands your code's flow. And the distinction between `unknown` and `any` keeps your code safe.

Master these concepts, and React TypeScript patterns will feel natural. You'll write types that help rather than hinder, catch bugs at compile time, and build applications with confidence. The type system isn't a burden—it's your most powerful tool for writing robust, maintainable code.
