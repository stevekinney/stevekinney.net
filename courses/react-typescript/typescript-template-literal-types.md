---
title: Template Literal Types
description: >-
  Master TypeScript's template literal types for type-safe string manipulation
  and CSS-in-JS
modified: '2025-09-22T09:27:10-06:00'
date: '2025-09-14T18:57:01.949Z'
---

Remember template literals in JavaScript? TypeScript took that concept and turned it into a superpower for type-level string manipulation. Template literal types let you create new string literal types by combining and transforming existing ones. They're incredibly useful for CSS-in-JS, API routes, event names, and anywhere you need type-safe string patterns.

## The Basics

Template literal types use the same syntax as JavaScript template literals, but at the type level:

```typescript
type World = 'world';
type Greeting = `hello ${World}`;
// Type: "hello world"

type FirstName = 'Alice' | 'Bob';
type LastName = 'Smith' | 'Jones';
type FullName = `${FirstName} ${LastName}`;
// Type: "Alice Smith" | "Alice Jones" | "Bob Smith" | "Bob Jones"
```

## Union Type Combinations

Template literal types really shine when combined with union types:

```typescript
type Color = "red" | "green" | "blue";
type Size = "small" | "medium" | "large";

type ClassName = `${Size}-${Color}`;
// Type: "small-red" | "small-green" | "small-blue" |
//       "medium-red" | "medium-green" | "medium-blue" |
//       "large-red" | "large-green" | "large-blue"

// In a React component
interface ButtonProps {
  variant: ClassName;
}

const Button = ({ variant }: ButtonProps) => {
  return <button className={variant}>Click me</button>;
};

// TypeScript enforces valid combinations
<Button variant="small-red" />     // ✅ Valid
<Button variant="huge-purple" />   // ❌ Error
```

## CSS-in-JS Type Safety

Template literal types are perfect for CSS properties:

```typescript
type CSSUnit = 'px' | 'em' | 'rem' | '%';
type CSSValue = `${number}${CSSUnit}`;

interface Styles {
  width?: CSSValue;
  height?: CSSValue;
  margin?: CSSValue;
  padding?: CSSValue;
}

const styles: Styles = {
  width: '100px', // ✅ Valid
  height: '2em', // ✅ Valid
  margin: '1.5rem', // ✅ Valid
  padding: '10', // ❌ Error: missing unit
};

// More complex CSS patterns
type FlexDirection = 'row' | 'column';
type FlexWrap = 'wrap' | 'nowrap';
type FlexFlow = `${FlexDirection} ${FlexWrap}`;

interface FlexStyles {
  flexFlow?: FlexFlow;
}

const flexContainer: FlexStyles = {
  flexFlow: 'row wrap', // ✅ Valid
  // flexFlow: "diagonal wrap" // ❌ Error
};
```

## Event Handler Types

Create type-safe event handler names:

```typescript
type DOMEvents = "click" | "focus" | "blur" | "change";
type EventHandlerName = `on${Capitalize<DOMEvents>}`;
// Type: "onClick" | "onFocus" | "onBlur" | "onChange"

type EventHandlers = {
  [K in EventHandlerName]?: () => void;
};

const handlers: EventHandlers = {
  onClick: () => console.log("clicked"),
  onFocus: () => console.log("focused"),
  // onHover: () => {} // ❌ Error: not a valid handler
};

// React component with dynamic event handlers
type ElementEvent = "click" | "mouseenter" | "mouseleave" | "focus" | "blur";
type ElementHandlers = {
  [K in `on${Capitalize<ElementEvent>}`]?: (e: Event) => void;
};

const InteractiveElement = (props: ElementHandlers & { children: React.ReactNode }) => {
  return <div {...props}>{props.children}</div>;
};
```

## API Route Types

Type-safe API routes with parameters:

```typescript
type Entity = 'users' | 'posts' | 'comments';
type Operation = 'get' | 'create' | 'update' | 'delete';

type APIEndpoint = `/api/${Entity}` | `/api/${Entity}/${Operation}`;
// Type: "/api/users" | "/api/posts" | "/api/comments" |
//       "/api/users/get" | "/api/users/create" | etc.

// With ID parameters
type APIRoute = `/api/${Entity}` | `/api/${Entity}/${string}`;

function fetchData(endpoint: APIEndpoint) {
  return fetch(endpoint);
}

fetchData('/api/users'); // ✅ Valid
fetchData('/api/posts/create'); // ✅ Valid
fetchData('/api/invalid'); // ❌ Error

// More complex routing
type RESTMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type RouteWithMethod = `${RESTMethod} /api/${Entity}`;

const routes: Record<RouteWithMethod, Function> = {
  'GET /api/users': getUsersHandler,
  'POST /api/users': createUserHandler,
  'DELETE /api/posts': deletePostHandler,
  // "PATCH /api/users": updateUserHandler // ❌ Error: PATCH not in RESTMethod
};
```

## String Manipulation Utilities

TypeScript provides built-in string manipulation utilities:

```typescript
type Greeting = 'hello world';

type UpperGreeting = Uppercase<Greeting>;
// Type: "HELLO WORLD"

type LowerGreeting = Lowercase<UpperGreeting>;
// Type: "hello world"

type CapitalGreeting = Capitalize<Greeting>;
// Type: "Hello world"

type UncapitalGreeting = Uncapitalize<'Hello World'>;
// Type: "hello World"

// Practical example
type HTTPMethod = 'get' | 'post' | 'put' | 'delete';
type MethodHandler = `handle${Capitalize<HTTPMethod>}Request`;
// Type: "handleGetRequest" | "handlePostRequest" | "handlePutRequest" | "handleDeleteRequest"

interface RequestHandlers {
  handleGetRequest: (url: string) => void;
  handlePostRequest: (url: string, body: any) => void;
  handlePutRequest: (url: string, body: any) => void;
  handleDeleteRequest: (url: string) => void;
}
```

## React Component Prop Patterns

Create consistent prop naming patterns:

```typescript
// Variant props pattern
type Size = "sm" | "md" | "lg";
type Color = "primary" | "secondary" | "danger";
type Variant = `${Size}-${Color}`;

interface ButtonProps {
  variant: Variant;
  children: React.ReactNode;
}

// State props pattern
type Status = "idle" | "loading" | "success" | "error";
type StatusProp = `is${Capitalize<Status>}`;
// Type: "isIdle" | "isLoading" | "isSuccess" | "isError"

type StatusFlags = {
  [K in StatusProp]?: boolean;
};

const Component = (props: StatusFlags) => {
  if (props.isLoading) return <Spinner />;
  if (props.isError) return <ErrorMessage />;
  return <Content />;
};

// Data attribute pattern
type DataAttribute = `data-${string}`;

interface ElementProps {
  [key: DataAttribute]: string | number | boolean;
  className?: string;
}

const element: ElementProps = {
  "data-testid": "my-element",
  "data-index": 5,
  className: "container"
};
```

## BEM Naming Convention

Implement BEM (Block Element Modifier) with type safety:

```typescript
type Block = 'button' | 'card' | 'modal';
type Element = 'header' | 'body' | 'footer' | 'icon';
type Modifier = 'primary' | 'secondary' | 'disabled' | 'large' | 'small';

type BEMClassName =
  | Block
  | `${Block}__${Element}`
  | `${Block}--${Modifier}`
  | `${Block}__${Element}--${Modifier}`;

// Examples:
// "button"
// "button__icon"
// "button--primary"
// "button__icon--large"

const classNames: BEMClassName[] = [
  'button',
  'button__icon',
  'button--primary',
  'button__icon--large',
  // "button__invalid", // ❌ Error: invalid element
];

// BEM class name builder
function bem<B extends Block>(block: B, element?: Element, modifier?: Modifier): BEMClassName {
  if (element && modifier) {
    return `${block}__${element}--${modifier}`;
  }
  if (element) {
    return `${block}__${element}`;
  }
  if (modifier) {
    return `${block}--${modifier}`;
  }
  return block;
}

const className = bem('button', 'icon', 'large'); // "button__icon--large"
```

## Tailwind CSS Type Safety

Create type-safe Tailwind class names:

```typescript
type TailwindSpacing = "0" | "1" | "2" | "4" | "8" | "16";
type TailwindColor = "red" | "blue" | "green" | "gray";
type TailwindShade = "100" | "500" | "900";

type SpacingClass = `${"p" | "m"}${"" | "x" | "y" | "t" | "b" | "l" | "r"}-${TailwindSpacing}`;
type ColorClass = `${"text" | "bg"}-${TailwindColor}-${TailwindShade}`;

type TailwindClass = SpacingClass | ColorClass;

interface TailwindProps {
  className?: TailwindClass | `${TailwindClass} ${TailwindClass}`;
}

const Component = ({ className }: TailwindProps) => {
  return <div className={className}>Content</div>;
};

<Component className="px-4" />              // ✅ Valid
<Component className="bg-blue-500" />       // ✅ Valid
<Component className="px-4 text-red-500" /> // ✅ Valid
<Component className="invalid-class" />     // ❌ Error
```

## Query String Types

Type-safe URL query parameters:

```typescript
type QueryParam = 'page' | 'limit' | 'sort' | 'filter';
type QueryString = `?${QueryParam}=${string}` | `?${QueryParam}=${string}&${QueryString}`;

function buildURL(base: string, query: QueryString): string {
  return `${base}${query}`;
}

buildURL('/api/users', '?page=1'); // ✅ Valid
buildURL('/api/users', '?page=1&limit=10'); // ✅ Valid
buildURL('/api/users', '?invalid=value'); // ❌ Error

// More sophisticated query builder
type QueryValue = string | number | boolean;
type QueryPair<K extends QueryParam> = `${K}=${QueryValue}`;

type BuildQuery<T extends QueryParam[]> = T extends []
  ? ''
  : T extends [infer First, ...infer Rest]
    ? First extends QueryParam
      ? Rest extends QueryParam[]
        ? `${QueryPair<First>}${Rest extends [] ? '' : `&${BuildQuery<Rest>}`}`
        : never
      : never
    : never;
```

## Environment Variable Types

Type-safe environment variables:

```typescript
type EnvPrefix = 'REACT_APP_' | 'NEXT_PUBLIC_' | 'VITE_';
type EnvKey = 'API_URL' | 'API_KEY' | 'ENVIRONMENT' | 'VERSION';
type EnvVar = `${EnvPrefix}${EnvKey}`;

interface ProcessEnv {
  [key: EnvVar]: string | undefined;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REACT_APP_API_URL: string;
      REACT_APP_API_KEY: string;
      REACT_APP_ENVIRONMENT: 'development' | 'production' | 'test';
      REACT_APP_VERSION: string;
    }
  }
}

// Now process.env is type-safe
const apiUrl = process.env.REACT_APP_API_URL; // string
const env = process.env.REACT_APP_ENVIRONMENT; // "development" | "production" | "test"
```

## Database Query Types

Type-safe database operations:

```typescript
type Table = 'users' | 'posts' | 'comments';
type Operation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
type SQLQuery = `${Operation} ${'*' | string} FROM ${Table}`;

type Query =
  | `SELECT * FROM ${Table}`
  | `SELECT ${string} FROM ${Table} WHERE ${string}`
  | `INSERT INTO ${Table} (${string}) VALUES (${string})`
  | `UPDATE ${Table} SET ${string} WHERE ${string}`
  | `DELETE FROM ${Table} WHERE ${string}`;

function executeQuery(query: Query) {
  // Execute query
  console.log(`Executing: ${query}`);
}

executeQuery('SELECT * FROM users'); // ✅
executeQuery('SELECT id, name FROM users WHERE id = 1'); // ✅
executeQuery('DELETE FROM posts WHERE id = 5'); // ✅
// executeQuery("DROP TABLE users");                          // ❌ Error
```

## Recursive Template Literals

Create recursive string patterns:

```typescript
type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type TwoDigits = `${Digit}${Digit}`;
type Year = `20${TwoDigits}`;
type Month = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12';
type Day = TwoDigits; // Simplified

type DateString = `${Year}-${Month}-${Day}`;

const validDate: DateString = '2024-03-15'; // ✅
// const invalidDate: DateString = "24-3-15";  // ❌ Error

// Path segments
type PathSegment = string;
type Path = `/${PathSegment}` | `/${PathSegment}/${Path}`;

// Note: TypeScript has recursion depth limits, so this won't work infinitely
```

## Real-World Example: Form Validation Messages

```typescript
type FieldName = "email" | "password" | "username" | "age";
type ValidationRule = "required" | "minLength" | "maxLength" | "pattern" | "min" | "max";
type ValidationMessage = `${FieldName}_${ValidationRule}`;

const validationMessages: Record<ValidationMessage, string> = {
  email_required: "Email is required",
  email_pattern: "Please enter a valid email",
  password_required: "Password is required",
  password_minLength: "Password must be at least 8 characters",
  username_required: "Username is required",
  username_maxLength: "Username must be less than 20 characters",
  age_required: "Age is required",
  age_min: "You must be at least 18",
  age_max: "Please enter a valid age"
};

interface ValidationError {
  field: FieldName;
  rule: ValidationRule;
}

function getErrorMessage(error: ValidationError): string {
  const key: ValidationMessage = `${error.field}_${error.rule}`;
  return validationMessages[key] || "Validation error";
}

// Usage in a React component
const FormField = ({ field, rule }: ValidationError) => {
  const message = getErrorMessage({ field, rule });
  return <span className="error">{message}</span>;
};
```

## Icon Component with Dynamic Imports

```typescript
type IconName = "home" | "user" | "settings" | "search" | "heart";
type IconSize = "sm" | "md" | "lg";
type IconVariant = "outline" | "solid";

type IconComponent = `${Capitalize<IconName>}Icon`;
type IconClass = `icon-${IconSize}` | `icon-${IconVariant}`;

interface IconProps {
  name: IconName;
  size?: IconSize;
  variant?: IconVariant;
  className?: IconClass;
}

const Icon = ({ name, size = "md", variant = "outline" }: IconProps) => {
  const className: IconClass = `icon-${size}`;

  // Dynamic icon selection
  const iconComponents: Record<IconComponent, React.FC> = {
    HomeIcon: HomeIconComponent,
    UserIcon: UserIconComponent,
    SettingsIcon: SettingsIconComponent,
    SearchIcon: SearchIconComponent,
    HeartIcon: HeartIconComponent
  };

  const IconComponent = iconComponents[`${name.charAt(0).toUpperCase()}${name.slice(1)}Icon` as IconComponent];

  return <IconComponent className={className} />;
};
```

## Pattern Matching with Template Literals

```typescript
// Email validation at type level
type Email = `${string}@${string}.${string}`;

function sendEmail(to: Email) {
  console.log(`Sending email to ${to}`);
}

sendEmail('user@example.com'); // Works at runtime
// Note: TypeScript can't actually validate email format at compile time
// This is more for documentation/intent

// URL pattern
type Protocol = 'http' | 'https';
type Domain = string;
type URLPattern = `${Protocol}://${Domain}`;

function fetchFromURL(url: URLPattern) {
  return fetch(url);
}

fetchFromURL('https://api.example.com'); // ✅
fetchFromURL('ftp://files.example.com'); // Would fail at runtime
```

## State Machine Types

```typescript
type State = 'idle' | 'loading' | 'success' | 'error';
type Action = 'fetch' | 'resolve' | 'reject' | 'reset';
type Transition = `${State}_${Action}`;

type ValidTransitions =
  | 'idle_fetch'
  | 'loading_resolve'
  | 'loading_reject'
  | 'success_reset'
  | 'error_reset';

const transitions: Record<ValidTransitions, State> = {
  idle_fetch: 'loading',
  loading_resolve: 'success',
  loading_reject: 'error',
  success_reset: 'idle',
  error_reset: 'idle',
};

function transition(currentState: State, action: Action): State {
  const key = `${currentState}_${action}` as ValidTransitions;
  return transitions[key] || currentState;
}
```

## Best Practices

### Use for Consistency

```typescript
// ✅ Good: Enforce naming patterns
type ComponentName = `${string}Component`;
type HookName = `use${Capitalize<string>}`;
type HandlerName = `handle${Capitalize<string>}`;
```

### Avoid Over-Complexity

```typescript
// ❌ Too complex
type ComplexPattern = `${Uppercase<string>}_${number}_${Lowercase<string>}-${string}`;

// ✅ Simple and clear
type SimplePattern = `${string}-${number}`;
```

### Combine with Other Features

```typescript
// Template literals + mapped types
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User {
  name: string;
  age: number;
}

type UserGetters = Getters<User>;
// Type: {
//   getName: () => string;
//   getAge: () => number;
// }
```

### Document Intent

```typescript
// Make the pattern clear
type ISO8601Date = `${number}-${number}-${number}T${number}:${number}:${number}Z`;
type UUID = `${string}-${string}-${string}-${string}-${string}`;
type SemVer = `${number}.${number}.${number}`;
```

## Summary

Template literal types bring JavaScript's string template power to TypeScript's type system. They enable:

1. **Type-safe string patterns** - Enforce consistent naming and formatting
2. **CSS-in-JS safety** - Type-check class names and styles
3. **API route typing** - Ensure valid endpoints
4. **Event handler patterns** - Consistent event naming
5. **Configuration validation** - Type-safe environment variables

Master template literal types, and you'll write React applications with unprecedented string type safety!
