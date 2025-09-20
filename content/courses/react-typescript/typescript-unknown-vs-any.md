---
title: Unknown vs Any - The Safe Way to Handle Dynamic Types
description: >-
  Learn when to use unknown vs any and how to safely handle dynamic data in
  TypeScript
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T18:55:29.322Z'
---

Let's talk about TypeScript's two ways of saying "I don't know what type this is" - `any` and `unknown`. One of them is a dangerous escape hatch that defeats the purpose of TypeScript, while the other is a safe way to handle truly dynamic data. Let's learn when and how to use each one (spoiler: you'll almost always want `unknown`).

## The Problem with Any

When you use `any`, you're essentially turning off TypeScript:

```typescript
let value: any = 42;

// TypeScript allows ALL of these, even the ones that will crash
value.toLowerCase(); // Runtime error!
value.foo.bar.baz; // Runtime error!
value(); // Runtime error!
const result = value + 'hello'; // Works, but what's the result?
```

It's like telling TypeScript "trust me, I know what I'm doing" - except you might not, and TypeScript won't help you when you're wrong.

## Enter Unknown: The Safe Alternative

`unknown` is like `any`'s responsible sibling. It can hold any value, but you must check what it is before using it:

```typescript
let value: unknown = 42;

// TypeScript blocks all of these
value.toLowerCase(); // Error: Object is of type 'unknown'
value.foo.bar.baz; // Error: Object is of type 'unknown'
value(); // Error: Object is of type 'unknown'

// You must check first
if (typeof value === 'string') {
  // Now TypeScript knows it's safe
  console.log(value.toLowerCase());
}
```

## Real-World Scenarios

### API Responses

When dealing with external APIs, you often don't know the exact shape of the data:

```typescript
// ❌ Bad: Using any
async function fetchUserBad(id: string): Promise<any> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

const user = await fetchUserBad('123');
console.log(user.namee); // Typo! But TypeScript won't catch it
console.log(user.email.toLowerCase()); // Might crash if email is null

// ✅ Good: Using unknown with validation
async function fetchUserGood(id: string): Promise<unknown> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// Type guard to validate the response
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'email' in value &&
    typeof (value as any).name === 'string' &&
    typeof (value as any).email === 'string'
  );
}

const data = await fetchUserGood('123');
if (isUser(data)) {
  // Safe to use as User
  console.log(data.name);
  console.log(data.email.toLowerCase());
} else {
  console.error('Invalid user data received');
}
```

### Event Handlers

React event handlers often deal with unknown event types:

```typescript
// ❌ Bad: Using any
const handleEvent = (e: any) => {
  console.log(e.target.value); // Might not exist
  e.preventDefault(); // Might not be a function
};

// ✅ Good: Using unknown with checks
const handleEvent = (e: unknown) => {
  // Check if it's an event
  if (e instanceof Event) {
    e.preventDefault();

    // Check if target has value
    const target = e.target;
    if (target instanceof HTMLInputElement) {
      console.log(target.value);
    }
  }
};

// Even better: Use proper types when possible
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // TypeScript knows this is a form event
};
```

### JSON Parsing

JSON.parse returns `any` by default, which is dangerous:

```typescript
// ❌ Dangerous default behavior
const data = JSON.parse('{"name": "Alice"}');
console.log(data.age.years); // Runtime error, but TypeScript doesn't warn

// ✅ Safe wrapper
function parseJSON(json: string): unknown {
  return JSON.parse(json);
}

const data = parseJSON('{"name": "Alice"}');
// Now you must validate before use
if (typeof data === 'object' && data !== null && 'name' in data) {
  console.log((data as { name: string }).name);
}
```

## Type Guards for Unknown

Here's how to safely narrow `unknown` types:

### Basic Type Guards

```typescript
function processValue(value: unknown) {
  // Check for primitives
  if (typeof value === 'string') {
    return value.toUpperCase();
  }

  if (typeof value === 'number') {
    return value.toFixed(2);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Check for null/undefined
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  // Check for arrays
  if (Array.isArray(value)) {
    return value.length;
  }

  // Check for objects
  if (typeof value === 'object') {
    return Object.keys(value).length;
  }

  // Check for functions
  if (typeof value === 'function') {
    return 'function';
  }
}
```

### Custom Type Guards

```typescript
interface Product {
  id: string;
  name: string;
  price: number;
}

function isProduct(value: unknown): value is Product {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'price' in value &&
    typeof (value as Product).id === 'string' &&
    typeof (value as Product).name === 'string' &&
    typeof (value as Product).price === 'number'
  );
}

// Using the guard
function displayProduct(data: unknown) {
  if (isProduct(data)) {
    return (
      <div>
        <h2>{data.name}</h2>
        <p>${data.price.toFixed(2)}</p>
      </div>
    );
  }

  return <div>Invalid product data</div>;
}
```

## Runtime Validation Libraries

For complex validation, use libraries like Zod:

```typescript
import { z } from 'zod';

// Define schema
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(150),
  roles: z.array(z.string())
});

type User = z.infer<typeof UserSchema>;

// Safe parsing
function parseUser(data: unknown): User | null {
  try {
    return UserSchema.parse(data);
  } catch (error) {
    console.error('Invalid user data:', error);
    return null;
  }
}

// In a React component
const UserProfile = ({ data }: { data: unknown }) => {
  const user = parseUser(data);

  if (!user) {
    return <div>Invalid user data</div>;
  }

  // TypeScript knows user is fully typed
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <p>Age: {user.age}</p>
      <ul>
        {user.roles.map(role => (
          <li key={role}>{role}</li>
        ))}
      </ul>
    </div>
  );
};
```

## Error Handling

Errors in JavaScript can be anything, so handle them safely:

```typescript
// ❌ Bad: Assuming error shape
try {
  await someOperation();
} catch (error: any) {
  console.log(error.message); // Might not exist
  console.log(error.response.data); // Might crash
}

// ✅ Good: Safe error handling
try {
  await someOperation();
} catch (error: unknown) {
  if (error instanceof Error) {
    // Standard Error object
    console.log(error.message);
    console.log(error.stack);
  } else if (typeof error === 'string') {
    // String error
    console.log(error);
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    // Custom error object
    console.log((error as { message: string }).message);
  } else {
    // Unknown error type
    console.log('An unknown error occurred:', error);
  }
}

// Better: Create error type guards
function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as any).isAxiosError === true
  );
}

try {
  await axios.get('/api/data');
} catch (error: unknown) {
  if (isAxiosError(error)) {
    console.log(error.response?.data);
    console.log(error.response?.status);
  } else if (error instanceof Error) {
    console.log(error.message);
  } else {
    console.log('Unknown error:', error);
  }
}
```

## Working with Third-Party Libraries

When libraries have poor or missing types:

```typescript
// Some library without types
declare module 'untyped-library' {
  export function doSomething(input: any): any;
}

// ❌ Bad: Propagating any
import { doSomething } from 'untyped-library';

function myFunction(data: any) {
  return doSomething(data); // Still any
}

// ✅ Good: Contain the any, expose unknown
import { doSomething } from 'untyped-library';

function myFunction(data: unknown): unknown {
  // Validate input
  if (typeof data !== 'string') {
    throw new Error('Expected string input');
  }

  // Call the untyped function
  const result = doSomething(data);

  // Return as unknown for safe consumption
  return result as unknown;
}

// Even better: Add runtime validation
function myFunctionSafe(data: unknown): string {
  if (typeof data !== 'string') {
    throw new Error('Expected string input');
  }

  const result = doSomething(data);

  if (typeof result !== 'string') {
    throw new Error('Unexpected result from library');
  }

  return result;
}
```

## React Component Props

Handling dynamic props safely:

```typescript
// ❌ Bad: Any props
const DynamicComponent = (props: any) => {
  return <div>{props.message}</div>;  // Might crash
};

// ✅ Good: Unknown with validation
const DynamicComponent = (props: unknown) => {
  // Validate props
  if (
    typeof props === 'object' &&
    props !== null &&
    'message' in props &&
    typeof (props as any).message === 'string'
  ) {
    return <div>{(props as { message: string }).message}</div>;
  }

  return <div>Invalid props</div>;
};

// Better: Type guard
interface MessageProps {
  message: string;
}

function isMessageProps(props: unknown): props is MessageProps {
  return (
    typeof props === 'object' &&
    props !== null &&
    'message' in props &&
    typeof (props as any).message === 'string'
  );
}

const DynamicComponent = (props: unknown) => {
  if (isMessageProps(props)) {
    return <div>{props.message}</div>;
  }

  return <div>Invalid props</div>;
};
```

## Local Storage and Session Storage

Browser storage returns strings that need parsing:

```typescript
// ❌ Bad: Trusting localStorage
const data: any = JSON.parse(localStorage.getItem('user') || '{}');
console.log(data.name); // Might not exist

// ✅ Good: Safe storage access
function getFromStorage<T>(key: string, validator: (value: unknown) => value is T): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const parsed: unknown = JSON.parse(item);
    if (validator(parsed)) {
      return parsed;
    }

    console.warn(`Invalid data in localStorage for key: ${key}`);
    return null;
  } catch (error) {
    console.error(`Error parsing localStorage item: ${key}`, error);
    return null;
  }
}

// Usage
const user = getFromStorage('user', isUser);
if (user) {
  console.log(user.name); // Safe!
}
```

## Migration Strategy: From Any to Unknown

If you have existing code with `any`, here's how to migrate:

```typescript
// Step 1: Change any to unknown
// Before
function processData(data: any) {
  return data.value * 2;
}

// After - This will now show errors
function processData(data: unknown) {
  return data.value * 2; // Error: Object is of type 'unknown'
}

// Step 2: Add type guards
function processData(data: unknown) {
  if (
    typeof data === 'object' &&
    data !== null &&
    'value' in data &&
    typeof (data as any).value === 'number'
  ) {
    return (data as { value: number }).value * 2;
  }
  throw new Error('Invalid data shape');
}

// Step 3: Create proper types
interface DataWithValue {
  value: number;
}

function isDataWithValue(data: unknown): data is DataWithValue {
  return (
    typeof data === 'object' &&
    data !== null &&
    'value' in data &&
    typeof (data as any).value === 'number'
  );
}

function processData(data: unknown): number {
  if (isDataWithValue(data)) {
    return data.value * 2;
  }
  throw new Error('Invalid data shape');
}
```

## When Is Any Acceptable?

There are rare cases where `any` might be acceptable:

### 1. Migration Code

```typescript
// Temporarily during migration
// TODO: Add proper types
const legacyData: any = getLegacyData();
```

### 2. Test Code

```typescript
// In tests where type safety is less critical
it('handles any input', () => {
  const testData: any = { foo: 'bar' };
  expect(someFunction(testData)).toBeDefined();
});
```

### 3. Console Logging

```typescript
// For debugging only
function debugLog(label: string, value: any) {
  console.log(label, value);
}
```

But even in these cases, consider if `unknown` would work just as well!

## Performance Considerations

Type checking has no runtime performance impact, but validation does:

```typescript
// Lightweight check
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Heavier validation
function isComplexObject(value: unknown): value is ComplexType {
  // Many checks...
  return validateComplexStructure(value);
}

// Cache validation results for repeated checks
const validationCache = new WeakMap<object, boolean>();

function isCachedValid(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (validationCache.has(value)) {
    return validationCache.get(value)!;
  }

  const isValid = expensiveValidation(value);
  validationCache.set(value, isValid);
  return isValid;
}
```

## Best Practices

### 1. Default to Unknown

```typescript
// ✅ Start with unknown
function processInput(input: unknown) {
  // Validate and narrow
}

// ❌ Don't default to any
function processInput(input: any) {
  // No safety
}
```

### 2. Create Reusable Type Guards

```typescript
// Define once, use everywhere
const typeGuards = {
  isString: (value: unknown): value is string => typeof value === 'string',

  isNumber: (value: unknown): value is number => typeof value === 'number' && !isNaN(value),

  isNonNullObject: (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null,

  hasProperty: <K extends string>(value: unknown, key: K): value is Record<K, unknown> =>
    typeGuards.isNonNullObject(value) && key in value,
};
```

### 3. Validate at Boundaries

```typescript
// Validate data as it enters your application
async function fetchData(): Promise<ValidatedData> {
  const response = await fetch('/api/data');
  const data: unknown = await response.json();

  // Validate immediately
  if (!isValidData(data)) {
    throw new Error('Invalid data from API');
  }

  return data; // Now properly typed
}
```

### 4. Use Assertion Functions

```typescript
function assertString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`Expected string, got ${typeof value}`);
  }
}

function processName(name: unknown) {
  assertString(name);
  // name is now typed as string
  return name.toUpperCase();
}
```

## Summary

The difference between `any` and `unknown` is simple but crucial:

- **`any`**: "I don't care what type this is" (dangerous)
- **`unknown`**: "I don't know what type this is yet" (safe)

Use `unknown` when:

- Handling external data (APIs, user input, localStorage)
- Dealing with errors in catch blocks
- Working with untyped libraries
- Parsing JSON or other dynamic data

Use `any` only when:

- Migrating JavaScript to TypeScript (temporarily)
- In test code where type safety is less critical
- You absolutely must and have a very good reason

Remember: Every `any` in your codebase is a potential runtime error waiting to happen. Every `unknown` is a safety checkpoint that forces you to validate before use. Choose safety!
