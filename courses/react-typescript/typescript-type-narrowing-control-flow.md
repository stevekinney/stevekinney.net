---
title: Type Narrowing and Control Flow
description: >-
  Master TypeScript's control flow analysis to write safer code with precise
  type checking
modified: '2025-09-22T09:27:10-06:00'
date: '2025-09-14T18:52:34.152Z'
---

TypeScript has this incredible ability to understand your code's logic and narrow types based on the checks you perform. It's like having a really smart assistant that follows along as you write conditions and helps ensure type safety. Let's dive into how TypeScript's control flow analysis makes your React code safer and more predictable.

## What is Type Narrowing?

Type narrowing is when TypeScript refines a type to be more specific based on the code's control flow. Think of it as TypeScript following your logic:

```typescript
function processValue(value: string | number) {
  // Here, value is string | number

  if (typeof value === 'string') {
    // Here, TypeScript knows value is string
    console.log(value.toUpperCase());
  } else {
    // Here, TypeScript knows value is number
    console.log(value.toFixed(2));
  }
}
```

## Type Guards: Your Narrowing Tools

### typeof Type Guards

The `typeof` operator is your first line of defense for primitive types:

```typescript
function formatValue(value: string | number | boolean) {
  if (typeof value === 'string') {
    // value is string
    return value.trim();
  }

  if (typeof value === 'number') {
    // value is number
    return value.toLocaleString();
  }

  // value is boolean
  return value ? 'Yes' : 'No';
}

// In React components
const DisplayValue = ({ value }: { value: string | number | null }) => {
  if (typeof value === 'string') {
    return <span className="text-value">{value}</span>;
  }

  if (typeof value === 'number') {
    return <span className="number-value">{value.toFixed(2)}</span>;
  }

  return <span className="null-value">No value</span>;
};
```

### instanceof Type Guards

For class instances and built-in objects:

```typescript
class ValidationError extends Error {
  field: string;

  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}

function handleError(error: Error | ValidationError) {
  if (error instanceof ValidationError) {
    // error is ValidationError
    console.log(`Field ${error.field}: ${error.message}`);
  } else {
    // error is Error
    console.log(`General error: ${error.message}`);
  }
}

// Works with built-in types too
function processDate(value: Date | string) {
  if (value instanceof Date) {
    // value is Date
    return value.toISOString();
  }

  // value is string
  return new Date(value).toISOString();
}
```

### in Operator Type Guards

Check for property existence to narrow object types:

```typescript
interface Car {
  drive(): void;
  wheels: number;
}

interface Boat {
  sail(): void;
  rudder: boolean;
}

function operateVehicle(vehicle: Car | Boat) {
  if ('wheels' in vehicle) {
    // vehicle is Car
    vehicle.drive();
    console.log(`Car has ${vehicle.wheels} wheels`);
  } else {
    // vehicle is Boat
    vehicle.sail();
    console.log(`Boat rudder: ${vehicle.rudder}`);
  }
}

// React example
interface TextProps {
  text: string;
  maxLength?: number;
}

interface ComponentProps {
  component: React.ComponentType;
  props?: Record<string, any>;
}

const DynamicRender = (props: TextProps | ComponentProps) => {
  if ('text' in props) {
    // props is TextProps
    const displayText = props.maxLength
      ? props.text.slice(0, props.maxLength)
      : props.text;
    return <p>{displayText}</p>;
  }

  // props is ComponentProps
  const Component = props.component;
  return <Component {...props.props} />;
};
```

## Truthiness Narrowing

TypeScript understands JavaScript's truthiness:

```typescript
function processUser(user: User | null | undefined) {
  if (!user) {
    // user is null | undefined
    return 'No user';
  }

  // user is User
  return `Hello, ${user.name}`;
}

// More specific checks
function handleValue(value: string | null | undefined | '') {
  if (value) {
    // value is string (and not empty)
    return value.toUpperCase();
  }

  // value is null | undefined | ''
  return 'No value';
}

// Array checking
function processItems<T>(items: T[] | null | undefined) {
  if (!items?.length) {
    // items is null | undefined | empty array
    return [];
  }

  // items is non-empty T[]
  return items.map((item) => processItem(item));
}
```

## Equality Narrowing

TypeScript narrows based on equality checks:

```typescript
function handleStatus(status: 'loading' | 'success' | 'error' | null) {
  if (status === null) {
    // status is null
    return 'Not started';
  }

  if (status === 'loading') {
    // status is 'loading'
    return <Spinner />;
  }

  if (status === 'success') {
    // status is 'success'
    return <SuccessMessage />;
  }

  // status is 'error'
  return <ErrorMessage />;
}

// Using switch for exhaustive checks
type Action =
  | { type: 'increment'; amount: number }
  | { type: 'decrement'; amount: number }
  | { type: 'reset' };

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'increment':
      // action is { type: 'increment'; amount: number }
      return state + action.amount;

    case 'decrement':
      // action is { type: 'decrement'; amount: number }
      return state - action.amount;

    case 'reset':
      // action is { type: 'reset' }
      return 0;

    default:
      // TypeScript knows this is unreachable
      const exhaustive: never = action;
      throw new Error(`Unhandled action: ${exhaustive}`);
  }
}
```

## Custom Type Guards

Create your own type guard functions:

```typescript
// Simple type guard
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// More complex type guard
interface User {
  id: number;
  name: string;
  email: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'email' in value &&
    typeof (value as User).id === 'number' &&
    typeof (value as User).name === 'string' &&
    typeof (value as User).email === 'string'
  );
}

// Using the type guard
function processData(data: unknown) {
  if (isUser(data)) {
    // data is User
    console.log(`User: ${data.name} (${data.email})`);
  } else if (isString(data)) {
    // data is string
    console.log(`String: ${data}`);
  } else {
    console.log('Unknown data type');
  }
}
```

## Array Type Guards

Working with arrays requires special attention:

```typescript
// Filter with type guards
const mixedArray: (string | number | null)[] = ['a', 1, null, 'b', 2];

// This doesn't narrow the type
const filtered = mixedArray.filter((item) => item !== null);
// filtered is still (string | number | null)[]

// Use a type guard function
function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

const filtered2 = mixedArray.filter(isNotNull);
// filtered2 is (string | number)[]

// Or be more specific
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

const strings = mixedArray.filter(isString);
// strings is string[]
```

## Control Flow Analysis

TypeScript follows your code's logic:

```typescript
function processValue(value: string | number | null) {
  // value is string | number | null

  if (value === null) {
    return 'null';
  }
  // value is string | number

  if (typeof value === 'string') {
    return value.length;
  }
  // value is number

  return value * 2;
}

// Assignment narrowing
let value: string | number = 'hello';
// value is string | number, but currently 'hello'

value = 42;
// value is still string | number, but currently 42

if (Math.random() > 0.5) {
  value = 'world';
  // value is string in this block
  console.log(value.toUpperCase());
} else {
  value = 100;
  // value is number in this block
  console.log(value.toFixed(2));
}
```

## Never and Exhaustiveness

Use `never` to ensure you handle all cases:

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: 'triangle'; base: number; height: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;

    case 'square':
      return shape.size ** 2;

    case 'triangle':
      return (shape.base * shape.height) / 2;

    default:
      // If we miss a case, TypeScript will error here
      const exhaustive: never = shape;
      throw new Error(`Unhandled shape: ${exhaustive}`);
  }
}

// React reducer example
type State = {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: any;
  error?: string;
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: any }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { status: 'loading' };

    case 'FETCH_SUCCESS':
      return { status: 'success', data: action.payload };

    case 'FETCH_ERROR':
      return { status: 'error', error: action.error };

    case 'RESET':
      return { status: 'idle' };

    default:
      const exhaustive: never = action;
      return state;
  }
}
```

## Assertion Functions

Create functions that assert conditions:

```typescript
function assertIsDefined<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error('Value is null or undefined');
  }
}

function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Expected string, got ${typeof value}`);
  }
}

// Using assertion functions
function processConfig(config: Config | null) {
  assertIsDefined(config);
  // config is Config from here on

  console.log(config.apiUrl);
  console.log(config.timeout);
}

// React example
const UserProfile = ({ userId }: { userId: string | null }) => {
  assertIsDefined(userId);
  // userId is string from here on

  const user = useUser(userId);

  return <div>User: {user.name}</div>;
};
```

## Optional Chaining and Narrowing

TypeScript understands optional chaining:

```typescript
interface User {
  name: string;
  address?: {
    street: string;
    city: string;
  };
}

function getCity(user: User) {
  const city = user.address?.city;
  // city is string | undefined

  if (city) {
    // city is string
    return city.toUpperCase();
  }

  return 'No city';
}

// With nullish coalescing
function getDisplayName(user: User | null) {
  const name = user?.name ?? 'Anonymous';
  // name is string (never undefined or null)

  return name.toUpperCase();
}
```

## Type Narrowing in React

### Component Props

```typescript
type ButtonProps =
  | { variant: 'primary'; onClick: () => void }
  | { variant: 'link'; href: string }
  | { variant: 'disabled' };

const Button = (props: ButtonProps) => {
  switch (props.variant) {
    case 'primary':
      // props has onClick
      return (
        <button className="btn-primary" onClick={props.onClick}>
          Click me
        </button>
      );

    case 'link':
      // props has href
      return (
        <a className="btn-link" href={props.href}>
          Visit
        </a>
      );

    case 'disabled':
      // props has no additional properties
      return (
        <button className="btn-disabled" disabled>
          Disabled
        </button>
      );

    default:
      const exhaustive: never = props;
      throw new Error(`Unhandled variant: ${exhaustive}`);
  }
};
```

### Conditional Rendering

```typescript
interface DataState<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: T;
  error?: Error;
}

function DataDisplay<T>({ state }: { state: DataState<T> }) {
  if (state.status === 'idle') {
    return <div>Ready to load</div>;
  }

  if (state.status === 'loading') {
    return <div>Loading...</div>;
  }

  if (state.status === 'error') {
    // TypeScript knows error exists when status is 'error'
    return <div>Error: {state.error?.message}</div>;
  }

  // state.status is 'success', data should exist
  return <div>Data: {JSON.stringify(state.data)}</div>;
}
```

### Form Validation

```typescript
type ValidationResult =
  | { valid: true; value: string }
  | { valid: false; error: string };

function validateEmail(input: string): ValidationResult {
  if (!input.includes('@')) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true, value: input.trim().toLowerCase() };
}

const EmailInput = () => {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    const result = validateEmail(input);

    if (result.valid) {
      // result.value is available
      submitEmail(result.value);
    } else {
      // result.error is available
      showError(result.error);
    }
  };

  return (
    <input
      value={input}
      onChange={e => setInput(e.target.value)}
      onBlur={handleSubmit}
    />
  );
};
```

## Advanced Patterns

### Discriminated Unions with Multiple Fields

```typescript
type Response<T> =
  | { status: 'success'; data: T; timestamp: Date }
  | { status: 'error'; error: Error; retryAfter?: number }
  | { status: 'pending'; progress?: number };

function handleResponse<T>(response: Response<T>) {
  if (response.status === 'success') {
    // All success fields are available
    console.log(`Success at ${response.timestamp}: ${response.data}`);
  } else if (response.status === 'error') {
    // All error fields are available
    console.error(`Error: ${response.error.message}`);
    if (response.retryAfter) {
      setTimeout(retry, response.retryAfter);
    }
  } else {
    // response.status === 'pending'
    console.log(`Pending... ${response.progress ?? 0}%`);
  }
}
```

### Combining Type Guards

```typescript
interface Admin {
  role: 'admin';
  permissions: string[];
}

interface User {
  role: 'user';
  subscription?: 'free' | 'premium';
}

type Person = Admin | User;

function hasPermission(person: Person, permission: string): boolean {
  // First narrow by role
  if (person.role === 'admin') {
    // person is Admin
    return person.permissions.includes(permission);
  }

  // person is User
  // Further narrow by subscription
  if (person.subscription === 'premium') {
    // Premium users have some permissions
    return ['read', 'write'].includes(permission);
  }

  // Free users have limited permissions
  return permission === 'read';
}
```

### Narrowing with Generics

```typescript
function processValue<T>(value: T | null, processor: (value: T) => void): void {
  if (value !== null) {
    // value is T (not null)
    processor(value);
  }
}

// Type guard with generics
function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function filterDefined<T>(items: (T | undefined)[]): T[] {
  return items.filter(isDefined);
}
```

## Real-World Example: Form Handler

```typescript
type FieldValue = string | number | boolean | Date | null;

interface Field {
  name: string;
  value: FieldValue;
  validation?: (value: FieldValue) => string | null;
}

interface Form {
  fields: Field[];
  isValid: boolean;
}

function validateField(field: Field): string | null {
  const { value, validation } = field;

  // Check for required field
  if (value === null || value === undefined) {
    return 'Field is required';
  }

  // Type-specific validation
  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      return 'Field cannot be empty';
    }
    if (value.length > 255) {
      return 'Field is too long';
    }
  }

  if (typeof value === 'number') {
    if (isNaN(value)) {
      return 'Invalid number';
    }
    if (value < 0) {
      return 'Number must be positive';
    }
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return 'Invalid date';
    }
    if (value < new Date()) {
      return 'Date must be in the future';
    }
  }

  // Custom validation
  if (validation) {
    return validation(value);
  }

  return null;
}

const FormComponent = ({ form }: { form: Form }) => {
  const handleSubmit = () => {
    const errors = form.fields
      .map(field => ({
        field: field.name,
        error: validateField(field)
      }))
      .filter(result => result.error !== null);

    if (errors.length === 0) {
      // All fields are valid
      submitForm(form);
    } else {
      // Show errors
      errors.forEach(({ field, error }) => {
        console.error(`${field}: ${error}`);
      });
    }
  };

  return (
    <form onSubmit={e => {
      e.preventDefault();
      handleSubmit();
    }}>
      {form.fields.map(field => (
        <FieldRenderer key={field.name} field={field} />
      ))}
    </form>
  );
};
```

## Best Practices

### Use Discriminated Unions

```typescript
// ✅ Good - Easy to narrow
type Result<T> = { success: true; data: T } | { success: false; error: string };

// ❌ Avoid - Harder to narrow
interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Make Invalid States Unrepresentable

```typescript
// ✅ Good - Can't have both data and error
type State<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// ❌ Avoid - Could have data and error simultaneously
interface State<T> {
  isLoading: boolean;
  data?: T;
  error?: Error;
}
```

### Use Exhaustive Checks

```typescript
// ✅ Always include exhaustive checks
function handle(value: 'a' | 'b' | 'c') {
  switch (value) {
    case 'a':
      return 1;
    case 'b':
      return 2;
    case 'c':
      return 3;
    default:
      const exhaustive: never = value;
      throw new Error(`Unhandled value: ${exhaustive}`);
  }
}
```

### Prefer Type Guards Over Type Assertions

```typescript
// ✅ Good - Safe type narrowing
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

if (isString(value)) {
  console.log(value.toUpperCase());
}

// ❌ Avoid - Unsafe type assertion
console.log((value as string).toUpperCase());
```

## Summary

Type narrowing and control flow analysis are fundamental to writing safe TypeScript code. They let you:

1. **Write safer code** - TypeScript ensures you handle all cases
2. **Avoid runtime errors** - Catch type issues at compile time
3. **Express intent clearly** - Your type checks document your logic
4. **Reduce defensive coding** - TypeScript knows when checks are unnecessary
5. **Enable better refactoring** - Changes to types are caught immediately

Master these concepts, and you'll write React components that are not just type-safe, but also more maintainable and easier to reason about.
