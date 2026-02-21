---
title: 'Unions, Intersections, and Type Guards'
description: >-
  Master TypeScript's union and intersection types for flexible yet type-safe
  code
modified: '2025-09-27T13:35:28-06:00'
date: '2025-09-14T18:58:22.492Z'
---

Union and intersection types are the building blocks of TypeScript's type algebra. They let you compose types in powerful ways - unions for "or" relationships, intersections for "and" relationships. Combined with type guards, they give you incredible flexibility without sacrificing type safety. Let's master these fundamental concepts.

## Union Types: This _or_ That

Union types represent values that can be one of several types:

```typescript
type StringOrNumber = string | number;

let value: StringOrNumber = 'hello'; // ✅ Valid

value = 42; // ✅ Valid
value = true; // ❌ Error

// More practical example
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

function handleState(state: LoadingState) {
  switch (state) {
    case 'idle':
      return 'Ready to start';
    case 'loading':
      return 'Please wait...';
    case 'success':
      return 'Complete!';
    case 'error':
      return 'Something went wrong';
  }
}
```

## Working with Union Types

When you have a union type, you can only access properties common to all types in the union:

```typescript
interface Bird {
  fly(): void;
  layEggs(): void;
}

interface Fish {
  swim(): void;
  layEggs(): void;
}

type Pet = Bird | Fish;

function handlePet(pet: Pet) {
  pet.layEggs(); // ✅ OK - both have layEggs
  // pet.fly();   // ❌ Error - only Bird can fly
  // pet.swim();  // ❌ Error - only Fish can swim
}
```

## Type Guards: Narrowing Unions

Type guards allow you to narrow union types to access type-specific properties. TypeScript provides several built-in type guards and allows you to create custom ones.

**See: [Type Narrowing and Control Flow](typescript-type-narrowing-control-flow.md)** for comprehensive coverage of type guards including:

- Built-in type guards (typeof, instanceof, in operator)
- Custom type guard functions
- Control flow analysis
- Assertion functions

Here's a quick example with union types:

```typescript
// Type predicate
function isBird(pet: Pet): pet is Bird {
  return (pet as Bird).fly !== undefined;
}

function handlePet(pet: Pet) {
  if (isBird(pet)) {
    pet.fly(); // ✅ TypeScript knows pet is Bird
  } else {
    pet.swim(); // ✅ TypeScript knows pet is Fish
  }
}
```

## Intersection Types: This AND That

Intersection types combine multiple types into one:

```typescript
interface Colorful {
  color: string;
}

interface Circle {
  radius: number;
}

type ColorfulCircle = Colorful & Circle;

const cc: ColorfulCircle = {
  color: 'red',
  radius: 42,
};

// Must have ALL properties
const invalid: ColorfulCircle = {
  color: 'blue',
  // ❌ Error: missing radius
};
```

## React Component Props with Intersections

Intersections are perfect for extending component props:

```typescript
// Base props
interface BaseButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

// Style props
interface StyledProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
}

// Accessibility props
interface A11yProps {
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  role?: string;
}

// Combine them all
type ButtonProps = BaseButtonProps & StyledProps & A11yProps;

const Button = ({ children, variant = 'primary', size = 'medium', ...rest }: ButtonProps) => {
  return (
    <button
      className={`btn-${variant} btn-${size}`}
      {...rest}
    >
      {children}
    </button>
  );
};

// Has access to all properties
<Button
  variant="secondary"
  size="large"
  aria-label="Submit form"
  onClick={() => console.log('clicked')}
>
  Submit
</Button>
```

## Advanced Type Guards

For exhaustive, discriminator-based narrowing patterns (tagged/discriminated unions), see the canonical guide: [TypeScript Discriminated Unions](typescript-discriminated-unions.md).

### Custom Type Guard Functions

For more advanced type guard patterns and custom type guard functions, **see: [Type Narrowing and Control Flow](typescript-type-narrowing-control-flow.md)**.

Here's an example specific to working with union types:

```typescript
// Array type guard for unions
function isArrayOf<T>(value: unknown, itemGuard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(itemGuard);
}

// Usage with union types
type StringOrNumber = string | number;

function processData(value: unknown) {
  if (isArrayOf(value, (item): item is string => typeof item === 'string')) {
    // value is string[]
    console.log(value.join(', '));
  }
}
```

## Union Types with React Events

```typescript
type InputElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function handleChange(event: React.ChangeEvent<InputElement>) {
  const { value, type } = event.target;

  // Common properties work
  console.log(value);

  // Type-specific properties need guards
  if (event.target instanceof HTMLInputElement) {
    if (event.target.type === 'checkbox') {
      console.log(event.target.checked);
    }
  } else if (event.target instanceof HTMLSelectElement) {
    console.log(event.target.selectedIndex);
  }
}

// Component accepting multiple input types
const FormField = ({ type }: { type: 'text' | 'textarea' | 'select' }) => {
  const handleChange = (e: React.ChangeEvent<InputElement>) => {
    console.log(e.target.value);
  };

  switch (type) {
    case 'text':
      return <input type="text" onChange={handleChange} />;
    case 'textarea':
      return <textarea onChange={handleChange} />;
    case 'select':
      return (
        <select onChange={handleChange}>
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
      );
  }
};
```

## Intersection Types for Mixins

```typescript
// Mixin pattern with intersections
interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

interface Identifiable {
  id: string;
}

interface Versioned {
  version: number;
}

// Combine mixins
type Entity<T> = T & Timestamped & Identifiable & Versioned;

interface UserData {
  name: string;
  email: string;
}

type User = Entity<UserData>;
// Has id, createdAt, updatedAt, version, name, email

const user: User = {
  id: 'user-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  version: 1,
  name: 'Alice',
  email: 'alice@example.com',
};

// Factory function
function createEntity<T>(data: T): Entity<T> {
  return {
    ...data,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };
}
```

## Complex Union and Intersection Patterns

### Union of Intersections

```typescript
type AdminUser = {
  role: 'admin';
  permissions: string[];
} & BaseUser;

type RegularUser = {
  role: 'user';
  subscription: 'free' | 'premium';
} & BaseUser;

type GuestUser = {
  role: 'guest';
  sessionId: string;
};

interface BaseUser {
  id: string;
  email: string;
}

type User = AdminUser | RegularUser | GuestUser;

function getDisplayName(user: User): string {
  if (user.role === 'guest') {
    return `Guest (${user.sessionId})`;
  }
  // TypeScript knows user has email here
  return user.email;
}

function hasPermission(user: User, permission: string): boolean {
  if (user.role === 'admin') {
    return user.permissions.includes(permission);
  }
  if (user.role === 'user') {
    return user.subscription === 'premium';
  }
  return false;
}
```

### Intersection of Unions

```typescript
type Status = 'draft' | 'published' | 'archived';
type Visibility = 'public' | 'private' | 'unlisted';

type Post = {
  title: string;
  content: string;
} & {
  status: Status;
} & {
  visibility: Visibility;
};

// Must have all properties with correct union values
const post: Post = {
  title: 'My Post',
  content: 'Content here',
  status: 'published', // Must be one of Status
  visibility: 'public', // Must be one of Visibility
};
```

## Type Guards with Generics

```typescript
// Generic type guard
function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K,
): obj is T & Record<K, unknown> {
  return key in obj;
}

// Usage
function processObject(obj: unknown) {
  if (
    typeof obj === 'object' &&
    obj !== null &&
    hasProperty(obj, 'name') &&
    hasProperty(obj, 'age')
  ) {
    // TypeScript knows obj has name and age
    console.log(obj.name, obj.age);
  }
}

// Array type guard
function isArrayOf<T>(arr: unknown, guard: (item: unknown) => item is T): arr is T[] {
  return Array.isArray(arr) && arr.every(guard);
}

// Usage
const data: unknown = ['a', 'b', 'c'];

if (isArrayOf(data, (item): item is string => typeof item === 'string')) {
  // data is string[]
  console.log(data.map((s) => s.toUpperCase()));
}
```

## React Hook with Union State

For exhaustive async state patterns in React (idle/loading/success/error and beyond), see [TypeScript Discriminated Unions](typescript-discriminated-unions.md).

## Utility Types for Unions and Intersections

```typescript
// Extract from union
type ExtractAction<T, K> = T extends { type: K } ? T : never;

type Action = { type: 'ADD'; payload: number } | { type: 'REMOVE'; id: string } | { type: 'RESET' };

type AddAction = ExtractAction<Action, 'ADD'>;
// { type: 'ADD'; payload: number }

// Exclude from union
type NonResetAction = Exclude<Action, { type: 'RESET' }>;
// { type: 'ADD'; payload: number } | { type: 'REMOVE'; id: string }

// Union to intersection
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

type Test = UnionToIntersection<{ a: string } | { b: number }>;
// { a: string } & { b: number }
```

## Form Validation with Unions

This section has moved to the canonical guide: [TypeScript Discriminated Unions](typescript-discriminated-unions.md).

## Branded Types with Intersections

```typescript
// Brand types for extra type safety
type Brand<T, B> = T & { __brand: B };

type Email = Brand<string, 'Email'>;
type UserId = Brand<string, 'UserId'>;
type Url = Brand<string, 'Url'>;

// Type guards with validation
function isEmail(value: string): value is Email {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUrl(value: string): value is Url {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// Usage
function sendEmail(to: Email, subject: string) {
  console.log(`Sending to ${to}: ${subject}`);
}

const email = 'user@example.com';
if (isEmail(email)) {
  sendEmail(email, 'Hello'); // ✅ email is Email
}

// Can't accidentally mix types
const userId = 'user-123' as UserId;
// sendEmail(userId, "Hello");  // ❌ Error: UserId is not Email
```

## React Router with Type Guards

For router state modeled as tagged unions and exhaustive rendering, see [TypeScript Discriminated Unions](typescript-discriminated-unions.md).

## Best Practices

### Use Discriminated Unions Over Optional Properties

**See: [TypeScript Discriminated Unions](typescript-discriminated-unions.md)** for complete patterns and best practices for discriminated unions.

### Create Reusable Type Guards

```typescript
// Define once, use everywhere
const guards = {
  isString: (value: unknown): value is string => typeof value === 'string',

  isNumber: (value: unknown): value is number => typeof value === 'number' && !isNaN(value),

  hasProperty: <T extends PropertyKey>(obj: unknown, prop: T): obj is Record<T, unknown> =>
    typeof obj === 'object' && obj !== null && prop in obj,
} as const;
```

### Prefer Type Predicates Over Type Assertions

```typescript
// ✅ Good: Type predicate
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'id' in value && 'name' in value;
}

// ❌ Bad: Type assertion
const user = data as User; // Unsafe!
```

### Use Exhaustive Checks

```typescript
function handle(value: 'a' | 'b' | 'c') {
  switch (value) {
    case 'a':
      return 1;
    case 'b':
      return 2;
    case 'c':
      return 3;
    default:
      const _exhaustive: never = value;
      throw new Error(`Unhandled case: ${_exhaustive}`);
  }
}
```

## Summary

Unions, intersections, and type guards form the foundation of TypeScript's type system:

1. **Unions (`|`)** - Express "or" relationships, perfect for variants and states
2. **Intersections (`&`)** - Express "and" relationships, great for combining types
3. **Type Guards** - Safely narrow union types to access specific properties
4. **Discriminated Unions** - The most powerful pattern for state management
5. **Custom Type Guards** - Create reusable validation functions

Master these concepts, and you'll write React code that's both flexible and type-safe!
