---
title: Structural Typing in TypeScript
description: >-
  Master TypeScript's structural type system—why shape matters more than names,
  and how this changes everything about React props.
date: 2025-09-14T18:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - typescript
  - structural-typing
  - fundamentals
  - react-props
---

TypeScript doesn't care what you call your types—it only cares about their shape. This is structural typing, and it's the most fundamental concept that sets TypeScript apart from nominally-typed languages like Java or C#. Once you truly understand structural typing, React props, component composition, and type compatibility all suddenly make sense.

Think of it this way: if I ask for a duck, I don't care if you give me a mallard, a rubber duck, or even a person in a duck costume—as long as it can swim and quack, TypeScript is happy. This flexibility is what makes TypeScript so powerful for JavaScript, and especially for React.

## The Mental Model: Shape Over Names

In TypeScript, two types are compatible if they have the same shape, regardless of their names or where they're defined.

### Your First Structural Type

```typescript
// These two interfaces have different names
interface Person {
  name: string;
  age: number;
}

interface Employee {
  name: string;
  age: number;
}

// But TypeScript treats them as the same type!
let person: Person = { name: 'Alice', age: 30 };
let employee: Employee = person; // ✅ No error!
person = employee; // ✅ Also works!

// Why? Because they have the same shape
// TypeScript doesn't care about the names 'Person' or 'Employee'
```

### Shape Compatibility in Practice

```typescript
// TypeScript only requires the minimum shape
interface Greetable {
  name: string;
}

function greet(obj: Greetable) {
  console.log(`Hello, ${obj.name}!`);
}

// All of these work because they have AT LEAST a name property
greet({ name: 'Alice' }); // ✅ Exact match
greet({ name: 'Bob', age: 30 }); // ✅ Has extra properties
greet({ name: 'Charlie', age: 25, city: 'NYC' }); // ✅ Even more properties

const user = {
  name: 'Diana',
  email: 'diana@example.com',
  id: '123',
};
greet(user); // ✅ Has the required shape plus more
```

## Why Structural Typing Matters for React

React components are all about passing props, and structural typing makes this incredibly flexible.

### Props Are Just Shapes

```typescript
// A component asks for a certain shape
interface ButtonProps {
  label: string;
  onClick: () => void;
}

function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

// Any object with the right shape works
const submitProps = {
  label: 'Submit',
  onClick: () => console.log('Submit'),
  color: 'blue', // Extra property
  size: 'large'  // Another extra
};

// This works! TypeScript only checks for required properties
<Button {...submitProps} />

// This is why spread operators are so common in React
const enhancedProps = {
  ...submitProps,
  disabled: false,
  type: 'submit'
};

<Button {...enhancedProps} /> // Still works!
```

### Component Composition Through Shapes

```typescript
interface ClickableProps {
  onClick: () => void;
}

interface DisableableProps {
  disabled?: boolean;
}

interface LabeledProps {
  label: string;
}

// Components can require combinations of shapes
type ButtonProps = ClickableProps & DisableableProps & LabeledProps;

// Any component that needs clicking can accept ClickableProps
function makeClickable<T extends ClickableProps>(props: T) {
  return {
    ...props,
    onClick: () => {
      console.log('Clicked!');
      props.onClick();
    }
  };
}

// Structural typing enables powerful composition patterns
interface CardProps extends ClickableProps {
  title: string;
  content: string;
}

function Card(props: CardProps) {
  // Card has onClick because it extends ClickableProps
  // Any function expecting ClickableProps can process Card
  const enhanced = makeClickable(props); // ✅ Works!
  return <div onClick={enhanced.onClick}>{props.title}</div>;
}
```

## Excess Property Checking: The Exception

There's one important exception to structural typing: excess property checking for object literals.

### Object Literals Are Strict

```typescript
interface Config {
  url: string;
  timeout: number;
}

// ❌ Error: Object literal may only specify known properties
const config1: Config = {
  url: 'api.example.com',
  timeout: 5000,
  typo: 'oops', // Error! 'typo' does not exist in type 'Config'
};

// ✅ But this works (not an object literal)
const settings = {
  url: 'api.example.com',
  timeout: 5000,
  typo: 'oops', // No error here
};
const config2: Config = settings; // No error - structural typing applies
```

### Why This Matters in React

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
}

// ❌ Direct JSX props are like object literals - strict checking
<Button
  label="Click me"
  onClick={() => {}}
  colour="blue" // Error! Did you mean 'color'?
/>

// ✅ But spreading objects bypasses excess property checking
const props = {
  label: "Click me",
  onClick: () => {},
  colour: "blue" // No error in object creation
};
<Button {...props} /> // No error when spreading!

// This is why you might see this pattern
const buttonProps: ButtonProps = {
  label: "Click me",
  onClick: () => {},
  // colour: "blue" // ❌ Would error here
};
```

### Working Around Excess Property Checking

```typescript
interface Options {
  width: number;
  height: number;
}

// Method 1: Type assertion
const options1 = {
  width: 100,
  height: 200,
  extra: 'data',
} as Options; // ✅ Assertion bypasses checking

// Method 2: Index signature
interface FlexibleOptions {
  width: number;
  height: number;
  [key: string]: any; // Allow any additional properties
}

// Method 3: Intermediate variable
const allSettings = {
  width: 100,
  height: 200,
  extra: 'data',
};
const options2: Options = allSettings; // ✅ Not a literal

// Method 4: Spread to satisfy interface
const options3: Options = {
  ...allSettings,
  width: 100, // Override to ensure correct type
  height: 200,
};
```

## Classes and Structural Typing

Even classes follow structural typing in TypeScript, unlike most OOP languages.

### Classes Are Shapes Too

```typescript
class Person {
  constructor(
    public name: string,
    public age: number,
  ) {}

  greet() {
    return `Hi, I'm ${this.name}`;
  }
}

class Employee {
  constructor(
    public name: string,
    public age: number,
  ) {}

  greet() {
    return `Hi, I'm ${this.name}`;
  }
}

// Different classes, same shape = compatible
let person: Person = new Employee('Alice', 30); // ✅ Works!
let employee: Employee = new Person('Bob', 25); // ✅ Works!

// Even plain objects work if they match the shape
let notAClass: Person = {
  name: 'Charlie',
  age: 35,
  greet() {
    return `Hi, I'm ${this.name}`;
  },
}; // ✅ Works!
```

### Private Members Break Compatibility

```typescript
class Car {
  private engineStatus = 'off';

  start() {
    this.engineStatus = 'on';
  }
}

class Motorcycle {
  private engineStatus = 'off';

  start() {
    this.engineStatus = 'on';
  }
}

// ❌ Error! Private members must originate from the same declaration
let vehicle: Car = new Motorcycle(); // Error!

// But without private members...
class PublicCar {
  engineStatus = 'off';

  start() {
    this.engineStatus = 'on';
  }
}

class PublicMotorcycle {
  engineStatus = 'off';

  start() {
    this.engineStatus = 'on';
  }
}

// ✅ Now they're compatible
let publicVehicle: PublicCar = new PublicMotorcycle(); // Works!
```

## Function Compatibility

Functions have their own structural typing rules, which are crucial for React event handlers.

### Parameter and Return Type Compatibility

```typescript
// Functions are compatible if parameters and returns are compatible
type NumberOperation = (x: number, y: number) => number;

const add: NumberOperation = (a, b) => a + b;
const multiply: NumberOperation = (x, y) => x * y;

// Can assign one to the other - same shape
let operation: NumberOperation = add;
operation = multiply; // ✅ Works!

// Fewer parameters is okay (common in React!)
type Handler = (event: MouseEvent, id: string) => void;

const simpleHandler: Handler = (event) => {
  // Ignoring the id parameter is fine
  console.log('Clicked!');
}; // ✅ Works!

const noParamHandler: Handler = () => {
  // Ignoring all parameters is fine too
  console.log('Clicked!');
}; // ✅ Works!
```

### Why This Matters for React Events

```typescript
// React expects specific event handler signatures
interface ButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

function Button({ onClick }: ButtonProps) {
  return <button onClick={onClick}>Click me</button>;
}

// All of these handlers are structurally compatible
<Button onClick={(e) => console.log(e.clientX)} /> // ✅ Uses event
<Button onClick={() => console.log('Clicked')} />  // ✅ Ignores event
<Button onClick={function() { alert('!') }} />     // ✅ Named function
<Button onClick={console.log} />                   // ✅ Even console.log!

// This is why you can pass simpler functions to complex handlers
const complexHandler = (
  event: React.MouseEvent,
  id: string,
  timestamp: number
) => void;

const simpleUsage = (handler: typeof complexHandler) => {
  // Can pass a simpler function
  handler = () => console.log('Simple!'); // ✅ Works!
};
```

## Subtype Relationships

Structural typing creates implicit subtype relationships based on shape.

### Width Subtyping

```typescript
// A type with more properties is a subtype of one with fewer
interface BasicUser {
  name: string;
}

interface DetailedUser {
  name: string;
  email: string;
  age: number;
}

// DetailedUser is a subtype of BasicUser
let basic: BasicUser;
let detailed: DetailedUser = {
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
};

basic = detailed; // ✅ Subtype can be assigned to supertype
// detailed = basic; // ❌ Error! Supertype can't be assigned to subtype

// This enables powerful patterns
function processUser(user: BasicUser) {
  console.log(user.name);
}

// Can pass any subtype
processUser(detailed); // ✅ Works!
processUser({ name: 'Bob', extra: 'data' }); // ✅ Works!
```

### Depth Subtyping

```typescript
// Nested structures follow the same rules
interface SimpleConfig {
  api: {
    url: string;
  };
}

interface DetailedConfig {
  api: {
    url: string;
    timeout: number;
    retries: number;
  };
  logging: boolean;
}

let simple: SimpleConfig;
let detailed: DetailedConfig = {
  api: {
    url: 'example.com',
    timeout: 5000,
    retries: 3,
  },
  logging: true,
};

simple = detailed; // ✅ Works - detailed has all required properties
```

## Structural Typing with Generics

Generics preserve structural relationships.

### Generic Structural Compatibility

```typescript
interface Container<T> {
  value: T;
}

interface Box<T> {
  value: T;
}

// Same structure, different names - still compatible!
let container: Container<string> = { value: 'hello' };
let box: Box<string> = container; // ✅ Works!

// Generic functions maintain structural typing
function processContainer<T>(c: Container<T>): T {
  return c.value;
}

function processBox<T>(b: Box<T>): T {
  return b.value;
}

// Can use interchangeably
const result1 = processContainer(box); // ✅ Works!
const result2 = processBox(container); // ✅ Works!
```

### React Component Generics

```typescript
// Generic props follow structural typing
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

interface CollectionProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

// Components with same shape are interchangeable
function List<T>(props: ListProps<T>) {
  return <>{props.items.map(props.renderItem)}</>;
}

function Collection<T>(props: CollectionProps<T>) {
  return <>{props.items.map(props.renderItem)}</>;
}

// Can use the same props for both
const props = {
  items: [1, 2, 3],
  renderItem: (n: number) => <span>{n}</span>
};

<List {...props} />      // ✅ Works!
<Collection {...props} /> // ✅ Works!
```

## Index Signatures and Structural Typing

Index signatures add flexibility to structural typing.

### Dynamic Property Names

```typescript
interface StringDictionary {
  [key: string]: string;
}

interface SpecificDictionary {
  name: string;
  email: string;
}

// SpecificDictionary is assignable to StringDictionary
let generic: StringDictionary;
let specific: SpecificDictionary = {
  name: 'Alice',
  email: 'alice@example.com',
};

generic = specific; // ✅ Works!

// But not vice versa
// specific = generic; // ❌ Error - generic might not have name/email
```

### React Props with Index Signatures

```typescript
// Common pattern for accepting arbitrary HTML attributes
interface FlexibleProps {
  className?: string;
  children?: React.ReactNode;
  [key: string]: any; // Accept any additional props
}

function FlexibleComponent(props: FlexibleProps) {
  const { className, children, ...rest } = props;

  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

// Can pass any props
<FlexibleComponent
  className="container"
  id="main"
  data-testid="component"
  aria-label="Flexible"
  customProp="anything"
/>
```

## Common Patterns and Use Cases

### Props Spreading Pattern

```typescript
interface BaseProps {
  id: string;
  className?: string;
}

interface ButtonProps extends BaseProps {
  label: string;
  onClick: () => void;
}

interface LinkProps extends BaseProps {
  href: string;
  label: string;
}

// Structural typing enables prop spreading
function Button({ id, className, label, onClick }: ButtonProps) {
  const baseProps: BaseProps = { id, className };

  return (
    <button {...baseProps} onClick={onClick}>
      {label}
    </button>
  );
}

// Can share props between components
const sharedProps: BaseProps = {
  id: 'shared',
  className: 'primary'
};

<Button {...sharedProps} label="Click" onClick={() => {}} />
<Link {...sharedProps} href="/home" label="Home" />
```

### Higher-Order Component Patterns

```typescript
// HOCs rely heavily on structural typing
interface WithLoadingProps {
  loading: boolean;
}

function withLoading<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P & WithLoadingProps> {
  return (props: P & WithLoadingProps) => {
    if (props.loading) {
      return <div>Loading...</div>;
    }

    // Structural typing ensures P is preserved
    return <Component {...props as P} />;
  };
}

// Works with any component that matches the shape
interface UserProps {
  name: string;
  age: number;
}

function User({ name, age }: UserProps) {
  return <div>{name} is {age}</div>;
}

const UserWithLoading = withLoading(User);

// Structural typing ensures both props are required
<UserWithLoading name="Alice" age={30} loading={false} />
```

### API Response Handling

```typescript
// Structural typing for flexible API responses
interface ApiResponse {
  data: unknown;
  status: number;
}

interface UserResponse {
  data: {
    id: string;
    name: string;
  };
  status: number;
  timestamp: number; // Extra property
}

function handleResponse(response: ApiResponse) {
  if (response.status === 200) {
    console.log('Success:', response.data);
  }
}

// UserResponse is structurally compatible
const userResponse: UserResponse = {
  data: { id: '1', name: 'Alice' },
  status: 200,
  timestamp: Date.now(),
};

handleResponse(userResponse); // ✅ Works!
```

## Best Practices

### Leverage Structural Typing for Flexibility

```typescript
// ✅ Good: Accept minimal required shape
interface Printable {
  toString(): string;
}

function print(obj: Printable) {
  console.log(obj.toString());
}

// Works with many types
print(42); // Numbers have toString
print('hello'); // Strings have toString
print([1, 2, 3]); // Arrays have toString
print(new Date()); // Dates have toString
```

### Use Nominal Typing When Needed

```typescript
// Sometimes you want to prevent structural compatibility
// Use brands/tags for nominal typing

type UserId = string & { __brand: 'UserId' };
type PostId = string & { __brand: 'PostId' };

function getUserById(id: UserId) {
  // ...
}

function getPostById(id: PostId) {
  // ...
}

const userId = 'user123' as UserId;
const postId = 'post456' as PostId;

getUserById(userId); // ✅ Works
getUserById(postId); // ❌ Error - different brands

// This prevents accidentally passing wrong IDs
// even though both are structurally strings
```

### Design Interfaces for Structural Compatibility

```typescript
// ✅ Good: Small, focused interfaces
interface Identifiable {
  id: string;
}

interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

interface Named {
  name: string;
}

// Combine as needed
type User = Identifiable & Named & Timestamped;
type Product = Identifiable & Named & { price: number };

// Functions can accept exactly what they need
function getById<T extends Identifiable>(item: T): string {
  return item.id;
}

function getRecent<T extends Timestamped>(items: T[]): T[] {
  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
```

## Common Gotchas and Solutions

### Empty Types

```typescript
// Empty types are compatible with everything!
interface Empty {}

let empty: Empty = { name: 'Alice' }; // ✅ Works!
empty = 42; // ✅ Works!
empty = 'hello'; // ✅ Works!
empty = null; // ❌ Only fails with strictNullChecks

// Be careful with empty interfaces
interface Props {} // Accepts any object!

// Better: Use explicit constraints
interface Props {
  children?: React.ReactNode;
}
```

### Comparing Functions

```typescript
// Functions with fewer parameters can be assigned to those with more
type OneParam = (a: string) => void;
type TwoParam = (a: string, b: number) => void;

let one: OneParam = (a) => console.log(a);
let two: TwoParam = (a, b) => console.log(a, b);

two = one; // ✅ Works! (ignoring second param is safe)
// one = two; // ❌ Error! (would lose the second param)

// This is why React event handlers are flexible
onClick={(e) => {}} // Can ignore event
onClick={() => {}}  // Can ignore all params
```

## Wrapping Up

Structural typing is the foundation of TypeScript's type system. It's what makes TypeScript feel natural for JavaScript and perfect for React. By focusing on shape rather than names, TypeScript gives you incredible flexibility while maintaining type safety.

Remember: TypeScript doesn't care what you call your types or where they come from—it only cares that they have the right shape. This enables powerful patterns like props spreading, component composition, and higher-order components that would be impossible in nominally-typed languages.

Master structural typing, and you'll write TypeScript that works with the language rather than fighting against it. Your React components will be more flexible, your APIs more adaptable, and your code more maintainable—all because you understand that in TypeScript, shape is everything.
