---
title: Complete Guide to React Component Props with TypeScript
description: >-
  Master typing React props from basics to advanced patterns—required vs
  optional, defaults, unions, generics, and building self-documenting component
  APIs.
date: 2025-09-20T17:00:00.000Z
modified: '2025-09-28T15:41:40-06:00'
published: true
tags:
  - react
  - typescript
  - props
  - component-patterns
  - api-design
---

Props are the API of your React components—they're how other developers (including future you) will interact with what you've built. Getting the types right isn't just about avoiding runtime errors; it's about creating components that are intuitive to use, self-documenting, and impossible to misuse.

Good prop types tell a story about how your component should be used. They make the happy path obvious and the wrong path impossible. This guide covers everything from basic prop patterns to advanced type techniques that create delightful developer experiences.

## The Foundation: Required vs Optional Props

The most fundamental decision for any prop is whether it's required or optional. TypeScript makes this distinction explicit, and it's worth thinking carefully about each prop's necessity.

```typescript
interface ButtonProps {
  // Required props - must be provided
  children: React.ReactNode;
  onClick: () => void;

  // Optional props - can be omitted
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// ✅ Good - required props are provided
<Button onClick={() => alert('clicked')}>
  Click me
</Button>

// ❌ Bad - TypeScript error: missing required 'onClick'
<Button>
  Click me
</Button>
```

The rule of thumb: make props required when the component genuinely can't function without them. Everything else should be optional with sensible defaults.

> [!TIP]
> If you find yourself with many required props, consider whether your component is trying to do too much. Sometimes splitting into smaller, more focused components creates a better API.

## Providing Sensible Defaults

React's `defaultProps` are being phased out in favor of ES6 default parameters and destructuring defaults. This approach is more TypeScript-friendly and keeps your defaults close to where they're used.

```typescript
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  size = 'medium',
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn--${variant} btn--${size}`}
    >
      {children}
    </button>
  );
}
```

This pattern has several advantages:

- **Type safety**: TypeScript knows about your defaults at compile time
- **Locality**: Defaults are visible right where the component is defined
- **Performance**: No extra property merging at runtime
- **Future-proof**: Works with React's Compiler and other optimizations

## Primitive Props: The Building Blocks

Every React component starts with primitive props—strings, numbers, booleans. These are your bread and butter, but even simple primitives benefit from thoughtful typing:

```typescript
interface AlertProps {
  // String literals are often better than plain strings
  variant: 'success' | 'warning' | 'error' | 'info';

  // Numbers with constraints tell a story
  timeout?: number; // milliseconds

  // Booleans for toggles and states
  dismissible?: boolean;

  // Sometimes strings need constraints too
  title: string;
}

function Alert({
  variant,
  timeout = 5000,
  dismissible = true,
  title
}: AlertProps) {
  // TypeScript knows variant is one of four specific strings
  const iconName = variant === 'success' ? 'check' : 'alert';

  return (
    <div className={`alert alert--${variant}`}>
      <h3>{title}</h3>
      {dismissible && <button>×</button>}
    </div>
  );
}
```

## Array Props: Collections and Lists

Arrays are everywhere in React—lists of items, sets of options, collections of data. The key is typing both the array structure and its contents precisely:

```typescript
// Simple array of primitives
interface TagListProps {
  tags: string[];
}

// Array of objects with consistent shape
interface UserListProps {
  users: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }[];
}

// Array with discriminated unions
interface NotificationProps {
  notifications: Array<
    | { type: 'message'; content: string; sender: string }
    | { type: 'system'; content: string; level: 'info' | 'warning' }
    | { type: 'error'; content: string; code?: string }
  >;
}

function NotificationList({ notifications }: NotificationProps) {
  return (
    <div>
      {notifications.map((notification, index) => {
        // TypeScript knows the shape based on the type discriminant
        if (notification.type === 'message') {
          return (
            <div key={index} className="notification--message">
              <strong>{notification.sender}:</strong> {notification.content}
            </div>
          );
        }

        if (notification.type === 'system') {
          return (
            <div key={index} className={`notification--${notification.level}`}>
              {notification.content}
            </div>
          );
        }

        // Must be error type
        return (
          <div key={index} className="notification--error">
            Error {notification.code}: {notification.content}
          </div>
        );
      })}
    </div>
  );
}
```

## Object Props: Complex Data Structures

Object props require careful consideration. Sometimes you need strict shapes, other times flexibility is key:

```typescript
// Strict object shape
interface ConfigProps {
  settings: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
}

// Flexible with index signatures
interface DataTableProps {
  columns: Array<{
    key: string;
    label: string;
    width?: number;
  }>;
  // Flexible row data
  data: Array<{
    id: string | number;
    [key: string]: any; // Allow any additional properties
  }>;
}

// Nested with optional properties
interface FormProps {
  initialValues: {
    user: {
      firstName: string;
      lastName: string;
      email: string;
      address?: {
        street: string;
        city: string;
        country: string;
        postalCode?: string;
      };
    };
  };
}
```

## Function Props: Callbacks and Event Handlers

Functions as props need careful typing to ensure type safety for both arguments and return values:

```typescript
interface SearchProps {
  // Simple callback
  onSearch: (query: string) => void;

  // Async callback with error handling
  onSubmit: (query: string) => Promise<void>;

  // Callback with multiple parameters
  onFilter: (category: string, tags: string[]) => void;

  // Optional callback with event
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;

  // Callback that returns a value
  validator?: (value: string) => string | undefined; // Returns error message
}

function Search({ onSearch, onSubmit, onChange }: SearchProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(query);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange?.(e); // Optional chaining for optional callback
        }}
      />
      <button type="submit">Search</button>
    </form>
  );
}
```

## Conditional Props with Discriminated Unions

Sometimes props depend on each other—when one prop is present, others become required or forbidden. Discriminated unions help model these relationships precisely:

```typescript
type ButtonProps = {
  children: React.ReactNode;
} & (
  | {
      variant: 'button';
      onClick: () => void;
      disabled?: boolean;
    }
  | {
      variant: 'link';
      href: string;
      target?: '_blank' | '_self';
    }
  | {
      variant: 'submit';
      form?: string;
      disabled?: boolean;
    }
);

function Button(props: ButtonProps) {
  const { children } = props;

  switch (props.variant) {
    case 'button':
      return (
        <button onClick={props.onClick} disabled={props.disabled}>
          {children}
        </button>
      );

    case 'link':
      return (
        <a href={props.href} target={props.target}>
          {children}
        </a>
      );

    case 'submit':
      return (
        <button type="submit" form={props.form} disabled={props.disabled}>
          {children}
        </button>
      );
  }
}

// TypeScript ensures correct prop combinations
<Button variant="button" onClick={() => {}}>Click</Button>
<Button variant="link" href="/home">Home</Button>
<Button variant="submit" form="myForm">Submit</Button>
```

## Generic Props for Reusable Components

Generics make components truly reusable while maintaining type safety:

````typescript
interface SelectProps<T> {
  options: T[];
  value?: T;
  onChange: (value: T) => void;
  getLabel: (option: T) => string;
  getValue: (option: T) => string | number;
  placeholder?: string;
}

## Generic TextField with Typed onChange

Create a `TextField` that accepts `value`/`defaultValue` generically and narrows `onChange` to the right event based on the underlying element.

```tsx
type TextFieldAs = 'input' | 'textarea';

type TextFieldCommon = {
  label: string;
  error?: string;
  as?: TextFieldAs;
};

type InputFieldProps = TextFieldCommon & Omit<JSX.IntrinsicElements['input'], 'onChange'> & {
  as?: 'input';
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

type TextareaFieldProps = TextFieldCommon & Omit<JSX.IntrinsicElements['textarea'], 'onChange'> & {
  as: 'textarea';
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

type TextFieldProps = InputFieldProps | TextareaFieldProps;

export function TextField(props: TextFieldProps) {
  const { label, error, as = 'input', ...rest } = props as TextFieldProps & { as: TextFieldAs };

  return (
    <label className={`text-field ${error ? 'has-error' : ''}`}>
      <span className="label">{label}</span>
      {as === 'textarea' ? (
        <textarea {...(rest as TextareaFieldProps)} />
      ) : (
        <input {...(rest as InputFieldProps)} />
      )}
      {error && <span className="error">{error}</span>}
    </label>
  );
}

// Usage with correct event narrowing
<TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
<TextField as="textarea" label="Bio" defaultValue={bio} onChange={(e) => setBio(e.target.value)} />

function Select<T>({
options,
value,
onChange,
getLabel,
getValue,
placeholder = 'Select an option'
}: SelectProps<T>) {
return (
<select
value={value ? getValue(value) : ''}
onChange={(e) => {
const selected = options.find(
opt => String(getValue(opt)) === e.target.value
);
if (selected) onChange(selected);
}} >
<option value="">{placeholder}</option>
{options.map((option, index) => (
<option key={index} value={getValue(option)}>
{getLabel(option)}
</option>
))}
</select>
);
}

// Type-safe usage with different types
interface User {
id: number;
name: string;
email: string;
}

<Select<User>
options={users}
value={selectedUser}
onChange={setSelectedUser}
getLabel={(user) => user.name}
getValue={(user) => user.id}
/>

<Select<string>
options={['Red', 'Green', 'Blue']}
value={color}
onChange={setColor}
getLabel={(c) => c}
getValue={(c) => c}
/>

````

## Extending HTML Element Props

Often you want your components to accept all standard HTML attributes plus your custom props:

```typescript
// Extending button props
interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

function CustomButton({
  variant = 'primary',
  loading,
  children,
  disabled,
  ...rest
}: CustomButtonProps) {
  return (
    <button
      className={`btn btn--${variant}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}

// Omitting specific HTML props
interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange'
> {
  type?: 'text' | 'email' | 'password'; // Restrict to specific types
  onChange: (value: string) => void; // Simplify onChange signature
}

function Input({ onChange, ...props }: InputProps) {
  return (
    <input
      {...props}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
```

## React's Built-in Helper Types

React provides several utility types that eliminate boilerplate and make your component props more expressive. These helpers handle common patterns that every React developer encounters, from adding children props to managing refs.

### PropsWithChildren: The Children Helper

Ever get tired of manually adding `children` to every container component? `PropsWithChildren` has your back:

```typescript
import { PropsWithChildren } from 'react';

// ❌ The old way: manually adding children
interface CardProps {
  title: string;
  variant?: 'default' | 'highlighted';
  children?: React.ReactNode;
}

// ✅ The clean way: using PropsWithChildren
interface CardProps {
  title: string;
  variant?: 'default' | 'highlighted';
}

function Card({ title, variant = 'default', children }: PropsWithChildren<CardProps>) {
  return (
    <div className={`card card--${variant}`}>
      <h2>{title}</h2>
      <div className="card-content">{children}</div>
    </div>
  );
}
```

`PropsWithChildren` is exactly equivalent to adding `children?: ReactNode` to your props:

```typescript
// These are identical:
type WithChildrenManual = CardProps & { children?: ReactNode };
type WithChildrenHelper = PropsWithChildren<CardProps>;

// The actual implementation is simple:
type PropsWithChildren<P> = P & { children?: ReactNode };
```

Use `PropsWithChildren` when:

- Your component is a container that wraps other content
- You want consistent children typing across your codebase
- You're building layout or wrapper components

### PropsWithoutChildren: The Explicit Leaf

Sometimes you need to be explicit that a component shouldn't have children. While rarely used directly, `PropsWithoutChildren` makes your intent clear:

```typescript
import { PropsWithoutChildren } from 'react';

// Components that should never have children
type InputProps = PropsWithoutChildren<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}>;

function Input({ value, onChange, placeholder }: InputProps) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

// ❌ TypeScript error if someone tries to add children
<Input value="test" onChange={setValue}>
  This will cause a type error!
</Input>
```

The real power of `PropsWithoutChildren` comes when building type utilities:

```typescript
// Creating a type helper that strips children from any props
type LeafComponent<P> = React.FC<PropsWithoutChildren<P>>;

// Now you can create leaf components with guaranteed no children
const StatusBadge: LeafComponent<{ status: 'online' | 'offline' }> = ({ status }) => {
  return <span className={`badge badge--${status}`}>{status}</span>;
};
```

### RefAttributes: Type-Safe Refs

When you need to expose refs from your components, `RefAttributes` provides the correct typing:

```typescript
import { forwardRef, RefAttributes } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

// RefAttributes adds the optional ref prop with proper typing
type ButtonPropsWithRef = ButtonProps & RefAttributes<HTMLButtonElement>;

// Using with forwardRef
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', onClick, children }, ref) => {
    return (
      <button ref={ref} className={`btn btn--${variant}`} onClick={onClick}>
        {children}
      </button>
    );
  }
);

// The ref is properly typed
function App() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <Button
      ref={buttonRef}
      onClick={() => buttonRef.current?.focus()}
    >
      Focus me!
    </Button>
  );
}
```

`RefAttributes` is particularly useful when composing complex prop types:

```typescript
// Combining multiple type helpers
type CompleteButtonProps = PropsWithChildren<
  ButtonProps & RefAttributes<HTMLButtonElement>
>;

// For function components that accept refs
interface FancyInputProps extends RefAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const FancyInput = forwardRef<HTMLInputElement, FancyInputProps>(
  ({ label, error }, ref) => {
    return (
      <div>
        <label>{label}</label>
        <input ref={ref} className={error ? 'error' : ''} />
        {error && <span>{error}</span>}
      </div>
    );
  }
);
```

### Combining Helper Types: Real-World Patterns

These helper types shine when combined to create expressive, reusable prop patterns:

```typescript
// A card component that needs children and refs
interface CardBaseProps {
  title: string;
  footer?: ReactNode;
}

type CardProps = PropsWithChildren<CardBaseProps> & RefAttributes<HTMLDivElement>;

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ title, footer, children }, ref) => {
    return (
      <div ref={ref} className="card">
        <header>{title}</header>
        <main>{children}</main>
        {footer && <footer>{footer}</footer>}
      </div>
    );
  }
);

// A form field that explicitly has no children
type FieldProps = PropsWithoutChildren<{
  name: string;
  value: string;
  onChange: (value: string) => void;
}> & RefAttributes<HTMLInputElement>;

// A layout component with optional children
interface LayoutProps {
  sidebar?: ReactNode;
  header?: ReactNode;
}

function Layout({ sidebar, header, children }: PropsWithChildren<LayoutProps>) {
  return (
    <div className="layout">
      {header && <header>{header}</header>}
      <div className="layout-body">
        {sidebar && <aside>{sidebar}</aside>}
        <main>{children}</main>
      </div>
    </div>
  );
}
```

### Helper Types vs Manual Definitions

When should you use these helpers versus defining props manually?

```typescript
// ✅ Use PropsWithChildren for consistency
interface ContainerProps {
  className?: string;
}
function Container({ className, children }: PropsWithChildren<ContainerProps>) {
  return <div className={className}>{children}</div>;
}

// ✅ Define manually when children need special typing
interface ListProps {
  children: ReactElement<ItemProps>[] | ReactElement<ItemProps>;
  ordered?: boolean;
}

// ✅ Use RefAttributes for standard ref forwarding
const Input = forwardRef<HTMLInputElement, InputProps & RefAttributes<HTMLInputElement>>(
  (props, ref) => <input ref={ref} {...props} />
);

// ✅ Define manually for custom ref-like props
interface VideoPlayerProps {
  videoRef?: RefObject<HTMLVideoElement>;
  controlsRef?: RefObject<VideoControls>;
}
```

> [!TIP]
> These helper types are about clarity and consistency. They make your code more readable by clearly expressing intent—a component either expects children or it doesn't, it forwards refs or it doesn't. Use them to make your component APIs more predictable.

## Props Documentation with JSDoc

TypeScript types are documentation, but sometimes you need more context:

```typescript
interface ChartProps {
  /**
   * Data points to display in the chart
   * @example
   * [
   *   { x: 0, y: 10 },
   *   { x: 1, y: 20 }
   * ]
   */
  data: Array<{ x: number; y: number }>;

  /**
   * Chart dimensions in pixels
   * @default { width: 600, height: 400 }
   */
  size?: {
    width: number;
    height: number;
  };

  /**
   * Enable interactive tooltips
   * @default true
   */
  interactive?: boolean;

  /**
   * Callback fired when a data point is clicked
   * @param point - The clicked data point
   * @param index - Index of the point in the data array
   */
  onPointClick?: (point: { x: number; y: number }, index: number) => void;
}
```

## Common Patterns and Anti-Patterns

### ✅ Good Patterns

```typescript
// Use string literals for known values
type Size = 'small' | 'medium' | 'large';

// Make impossible states impossible
type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Group related props
interface FormFieldProps {
  field: {
    name: string;
    value: string;
    error?: string;
  };
  label: string;
  required?: boolean;
}
```

### ❌ Anti-Patterns to Avoid

```typescript
// Don't use 'any' for props
interface BadProps {
  data: any; // ❌ No type safety
}

// Don't make everything optional
interface TooFlexible {
  title?: string;
  content?: string;
  onClick?: () => void;
  // Component can't function without any props!
}

// Don't use boolean flags for multiple states
interface ConfusingStates {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  // These can conflict!
}
```

## Best Practices

1. **Start strict, loosen when needed**: Begin with strict types and relax them only when flexibility is genuinely required
2. **Use discriminated unions for mutually exclusive props**: Model your domain accurately
3. **Provide defaults for optional props**: Make the common case easy
4. **Document complex props**: Use JSDoc comments for additional context
5. **Keep props flat when possible**: Deeply nested props are harder to use
6. **Use generics for truly reusable components**: But don't over-engineer

