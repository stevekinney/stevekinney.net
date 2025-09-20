---
title: Complete Guide to React Component Props with TypeScript
description: >-
  Master typing React props from basics to advanced patterns—required vs
  optional, defaults, unions, generics, and building self-documenting component
  APIs.
date: 2025-09-20T17:00:00.000Z
modified: '2025-09-20T21:03:21.400Z'
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

```typescript
interface SelectProps<T> {
  options: T[];
  value?: T;
  onChange: (value: T) => void;
  getLabel: (option: T) => string;
  getValue: (option: T) => string | number;
  placeholder?: string;
}

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
      }}
    >
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
```

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

## Related Topics

- **[TypeScript Discriminated Unions](typescript-discriminated-unions.md)** - Deep dive into union types for props
- **[JSX Types: ReactNode and ReactElement](jsx-types-reactnode-reactelement.md)** - Understanding children and render prop types
- **[Mirror DOM Props](mirror-dom-props.md)** - Extending HTML element props
- **[Polymorphic Components](polymorphic-components-and-as-prop.md)** - Building flexible component APIs

## Next Steps

Now that you understand prop patterns:

- Explore **[Generic Components](typescript-generics-deep-dive.md#generics-in-react-components)** for maximum reusability
- Learn about **[forwardRef and Component Types](forwardref-memo-and-displayname.md)**
- Master **[Custom Hooks with TypeScript](custom-hooks-with-generics-comprehensive.md)**
