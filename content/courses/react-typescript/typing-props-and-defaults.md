---
title: Typing Props, Defaults, and Requiredness
description: Design ergonomic props—optional vs required, defaults, unions, and doc-ready types that guide usage.
date: 2025-09-06T22:04:44.909Z
modified: 2025-09-06T22:04:44.909Z
published: true
tags: ['react', 'typescript', 'props', 'defaults', 'optional-props', 'api-design']
---

Props are the API of your React components—they're how other developers (including future you) will interact with what you've built. Getting the types right isn't just about avoiding runtime errors; it's about creating components that are intuitive to use, self-documenting, and impossible to misuse. We'll explore how to design prop interfaces that guide usage through the type system itself.

Good prop types tell a story about how your component should be used. They make the happy path obvious and the wrong path impossible (or at least really difficult). By the end of this guide, you'll know how to craft props that feel natural to use and catch problems before they ship.

## The Foundation: Required vs Optional Props

The most fundamental decision for any prop is whether it's required or optional. TypeScript makes this distinction explicit, and it's worth thinking carefully about each prop's necessity.

```tsx
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

```tsx
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
    <button onClick={onClick} disabled={disabled} className={`btn btn--${variant} btn--${size}`}>
      {children}
    </button>
  );
}
```

This pattern has several advantages over the old `defaultProps` approach:

- **Type safety**: TypeScript knows about your defaults at compile time
- **Locality**: Defaults are visible right where the component is defined
- **Performance**: No extra property merging at runtime
- **Future-proof**: Works with React's Compiler and other optimizations

## Conditional Props with Discriminated Unions

Sometimes props depend on each other—when one prop is present, others become required or forbidden. Discriminated unions help model these relationships precisely.

```tsx
// ✅ Good - models mutual exclusivity
interface LoadingButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

interface AsyncButtonProps {
  children: React.ReactNode;
  onAsyncClick: () => Promise<void>;
  loadingText?: string;
}

type ButtonProps = LoadingButtonProps | AsyncButtonProps;

function Button(props: ButtonProps) {
  if ('onAsyncClick' in props) {
    // TypeScript knows this is AsyncButtonProps
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
      setIsLoading(true);
      try {
        await props.onAsyncClick();
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <button onClick={handleClick} disabled={isLoading}>
        {isLoading ? (props.loadingText ?? 'Loading...') : props.children}
      </button>
    );
  }

  // TypeScript knows this is LoadingButtonProps
  return <button onClick={props.onClick}>{props.children}</button>;
}

// ✅ Usage is clear and type-safe
<Button onClick={() => console.log('sync')}>Sync Button</Button>
<Button onAsyncClick={() => fetch('/api')} loadingText="Saving...">
  Async Button
</Button>
```

This pattern prevents impossible states—you can't accidentally provide both `onClick` and `onAsyncClick`, because TypeScript won't let you.

## Advanced Pattern: Conditional Prop Dependencies

For more complex conditional logic, you can use template literal types and conditional types to model sophisticated prop relationships:

```tsx
interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

interface ConfirmationModalProps extends BaseModalProps {
  variant: 'confirmation';
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface InfoModalProps extends BaseModalProps {
  variant: 'info';
  // No confirmation props needed
}

type ModalProps = ConfirmationModalProps | InfoModalProps;

function Modal(props: ModalProps) {
  return (
    <div className="modal" style={{ display: props.isOpen ? 'block' : 'none' }}>
      <div className="modal-content">
        {props.children}
        {props.variant === 'confirmation' && (
          <div className="modal-actions">
            <button onClick={props.onConfirm}>{props.confirmText ?? 'Confirm'}</button>
            <button onClick={props.onClose}>{props.cancelText ?? 'Cancel'}</button>
          </div>
        )}
        {props.variant === 'info' && <button onClick={props.onClose}>Close</button>}
      </div>
    </div>
  );
}
```

The discriminant property (`variant` in this case) acts as a type guard, telling TypeScript which other props are available.

## Making Props Self-Documenting

Good TypeScript props serve as documentation. Use descriptive names, union types for enums, and JSDoc comments for complex behavior:

```tsx
interface DataTableProps<T> {
  /**
   * The data to display in the table
   */
  data: T[];

  /**
   * Configuration for each column
   */
  columns: Array<{
    /**
     * Unique identifier for the column
     */
    key: keyof T;

    /**
     * Display name for the column header
     */
    title: string;

    /**
     * Custom renderer for cell content
     * @param value - The cell value
     * @param row - The entire row data
     * @param index - Row index
     */
    render?: (value: T[keyof T], row: T, index: number) => React.ReactNode;

    /**
     * Whether this column can be sorted
     * @default false
     */
    sortable?: boolean;
  }>;

  /**
   * Loading state behavior
   * - 'spinner': Show a loading spinner
   * - 'skeleton': Show skeleton placeholders
   * - 'overlay': Show overlay on existing data
   */
  loadingState?: 'spinner' | 'skeleton' | 'overlay';

  /**
   * Called when a row is clicked
   * @param row - The clicked row data
   * @param index - The row index
   */
  onRowClick?: (row: T, index: number) => void;
}
```

Notice how the prop names and union types make the component's capabilities immediately clear. Anyone using this component knows exactly what options are available without reading implementation code.

## Handling Generic Props Safely

Generic props let you build reusable components while maintaining type safety. The key is constraining your generics appropriately:

```tsx
// ✅ Good - constrains T to have an 'id' field
interface ListProps<T extends { id: string }> {
  items: T[];
  onItemClick: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  keyExtractor?: (item: T) => string;
}

function List<T extends { id: string }>({
  items,
  onItemClick,
  renderItem,
  keyExtractor = (item) => item.id, // TypeScript knows 'id' exists
}: ListProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={keyExtractor(item)} onClick={() => onItemClick(item)}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}

// Usage is type-safe and ergonomic
const users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
];

<List
  items={users}
  onItemClick={(user) => {
    // TypeScript knows user has id, name, email
    console.log(user.email);
  }}
  renderItem={(user) => <span>{user.name}</span>}
/>;
```

## Validating Props at Runtime with Zod

While TypeScript provides compile-time safety, runtime validation ensures your components handle unexpected data gracefully. Zod pairs beautifully with TypeScript props:

```tsx
import { z } from 'zod';

const ButtonPropsSchema = z.object({
  children: z.union([z.string(), z.number()]).or(z.any()), // React.ReactNode is complex
  onClick: z.function().returns(z.void()),
  variant: z.enum(['primary', 'secondary', 'danger']).optional(),
  disabled: z.boolean().optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
});

type ButtonProps = z.infer<typeof ButtonPropsSchema>;

function Button(props: ButtonProps) {
  // Validate props in development
  if (process.env.NODE_ENV !== 'production') {
    const result = ButtonPropsSchema.safeParse(props);
    if (!result.success) {
      console.warn('Invalid Button props:', result.error.errors);
    }
  }

  const { children, onClick, variant = 'primary', disabled = false, size = 'medium' } = props;

  return (
    <button onClick={onClick} disabled={disabled} className={`btn btn--${variant} btn--${size}`}>
      {children}
    </button>
  );
}
```

This approach gives you both compile-time and runtime safety, catching mismatched props during development while maintaining performance in production.

## Common Pitfalls and How to Avoid Them

### Over-Using Optional Props

Making everything optional might seem user-friendly, but it often leads to components that don't work properly with default values:

```tsx
// ❌ Bad - too many optional props
interface BadModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

// ✅ Good - required props that the component needs
interface GoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string; // Truly optional enhancement
}
```

### Using `any` for Complex Props

It's tempting to use `any` for complex props like event handlers, but specific types catch more bugs:

```tsx
// ❌ Bad - loses all type safety
interface BadFormProps {
  onSubmit: any;
}

// ✅ Good - specific about what the handler receives
interface GoodFormProps {
  onSubmit: (data: FormData, event: React.FormEvent) => void;
}
```

### Ignoring Prop Mutation

Props should be treated as immutable. If you need to modify prop data, create local state:

```tsx
// ❌ Bad - mutating props
function BadList({ items }: { items: string[] }) {
  const sortedItems = items.sort(); // Mutates the original array!
  return (
    <ul>
      {sortedItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

// ✅ Good - local copy for mutations
function GoodList({ items }: { items: string[] }) {
  const sortedItems = [...items].sort(); // Safe copy
  return (
    <ul>
      {sortedItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
```

## Building Component APIs That Scale

As your component library grows, consistent prop patterns become crucial. Establish conventions for your team:

```tsx
// Establish consistent patterns across your component library
interface BaseComponentProps {
  className?: string;
  'data-testid'?: string;
  'aria-label'?: string;
}

interface ButtonProps extends BaseComponentProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

interface InputProps extends BaseComponentProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}
```

This consistency makes your components predictable and easier to adopt across teams.

## Looking Forward

Well-typed props are the foundation of maintainable React applications. They serve as contracts between components, catch bugs early, and make your code self-documenting. The patterns we've covered—from basic optional props to complex discriminated unions—give you the tools to model any component API clearly and safely.

Remember: the goal isn't just to make TypeScript happy, but to create components that are impossible to misuse and delightful to work with. Your future self (and your teammates) will thank you for the extra thought you put into these interfaces.

**Next up**: We'll dive into advanced prop patterns, including render props, compound components, and polymorphic component APIs that work seamlessly with TypeScript's type system.
