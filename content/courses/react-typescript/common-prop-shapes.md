---
title: Common Prop Shapes and Patterns
description: Get fluent with primitives, arrays, objects, unions, indexed types, and functions in your props.
date: 2025-09-06T22:23:57.265Z
modified: 2025-09-06T22:23:57.265Z
published: true
tags: ['react', 'typescript', 'props', 'patterns', 'arrays', 'objects', 'unions', 'generics']
---

Props come in all shapes and sizes, and mastering the common patterns will make you fluent in React component APIs. Whether you're dealing with simple primitives, complex nested objects, or function callbacks, knowing how to type these patterns correctly saves you from runtime surprises and makes your components self-documenting. Let's explore the fundamental prop shapes you'll encounter (and create) in every React application.

Think of prop shapes as the vocabulary of component communication. Just like learning common sentence structures helps you speak a language fluently, understanding these patterns helps you design intuitive component APIs that feel natural to use.

## Primitive Props: The Building Blocks

Every React component starts with primitive props—strings, numbers, booleans. These are your bread and butter, but even simple primitives benefit from thoughtful typing:

```tsx
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

function Alert({ variant, timeout = 5000, dismissible = true, title }: AlertProps) {
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

Notice how we're not just using `string` for variant—we're using a union type that documents exactly which values are valid. This prevents typos and makes the component's capabilities immediately clear.

## Array Props: Collections and Lists

Arrays are everywhere in React—lists of items, sets of options, collections of data. The key is typing both the array structure and its contents precisely:

```tsx
// Simple array of primitives
interface TagListProps {
  tags: string[];
}

// Array of objects with consistent shape
interface UserListProps {
  users: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }>;
}

// More complex: array with discriminated unions
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
            <div key={index} className="notification notification--message">
              <strong>{notification.sender}:</strong> {notification.content}
            </div>
          );
        }

        if (notification.type === 'system') {
          return (
            <div key={index} className={`notification notification--${notification.level}`}>
              {notification.content}
            </div>
          );
        }

        // TypeScript knows this is the error type
        return (
          <div key={index} className="notification notification--error">
            {notification.content}
            {notification.code && <span> (Code: {notification.code})</span>}
          </div>
        );
      })}
    </div>
  );
}
```

For arrays of objects, always define the object shape explicitly rather than using `any[]` or `object[]`. Your future self will thank you when IntelliSense shows you exactly what properties are available.

## Object Props: Configuration and State

Objects are perfect for configuration, grouped settings, or complex state. The trick is balancing flexibility with type safety:

```tsx
interface ChartProps {
  data: Array<{ label: string; value: number; color?: string }>;

  // Configuration object with optional properties
  options?: {
    width?: number;
    height?: number;
    animation?: {
      duration: number;
      easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
    };
    legend?: {
      show: boolean;
      position: 'top' | 'bottom' | 'left' | 'right';
    };
  };

  // Event handlers as object methods
  callbacks?: {
    onHover?: (data: { label: string; value: number }) => void;
    onClick?: (data: { label: string; value: number }) => void;
    onLegendClick?: (label: string) => void;
  };
}

function Chart({ data, options = {}, callbacks = {} }: ChartProps) {
  const {
    width = 400,
    height = 300,
    animation = { duration: 300, easing: 'ease' },
    legend = { show: true, position: 'bottom' },
  } = options;

  // Implementation details...

  return (
    <svg
      width={width}
      height={height}
      onClick={(e) => {
        // Handle click and call callback if provided
        const clickedData = getClickedDataPoint(e);
        callbacks.onClick?.(clickedData);
      }}
    >
      {/* Chart rendering logic */}
    </svg>
  );
}
```

Notice how we're using destructuring with defaults to handle the optional configuration cleanly. This pattern scales well and keeps your component code readable.

## Function Props: Callbacks and Event Handlers

Function props are how components communicate upward. Type them precisely to document what data they receive and what they should return:

```tsx
interface FormProps<T> {
  // Simple event handlers
  onSubmit: (data: T) => void;
  onCancel?: () => void;

  // Event handlers with additional context
  onFieldChange?: (field: keyof T, value: T[keyof T]) => void;

  // Validation functions that return results
  onValidate?: (data: T) => {
    isValid: boolean;
    errors: Partial<Record<keyof T, string>>;
  };

  // Async operations
  onSave?: (data: T) => Promise<void>;

  // Render props (functions that return JSX)
  renderError?: (error: string) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
}

function GenericForm<T>({
  onSubmit,
  onCancel,
  onFieldChange,
  onValidate,
  onSave,
  renderError,
  renderLoading,
}: FormProps<T>) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (data: T) => {
    if (onValidate) {
      const validation = onValidate(data);
      if (!validation.isValid) {
        setErrors(Object.values(validation.errors).filter(Boolean));
        return;
      }
    }

    if (onSave) {
      setIsLoading(true);
      try {
        await onSave(data);
        onSubmit(data);
      } catch (error) {
        // Handle error
      } finally {
        setIsLoading(false);
      }
    } else {
      onSubmit(data);
    }
  };

  if (isLoading && renderLoading) {
    return renderLoading();
  }

  return (
    <form>
      {errors.length > 0 && (
        <div className="errors">
          {errors.map((error, index) => (
            <div key={index}>{renderError ? renderError(error) : error}</div>
          ))}
        </div>
      )}
      {/* Form fields */}
    </form>
  );
}
```

> [!TIP]
> Use optional chaining (`?.`) when calling function props that might be undefined. It's cleaner than checking `if (callback)` every time.

## Union Types: Multiple Valid Shapes

Sometimes a prop can be one of several different types. Union types let you model this precisely:

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Union of different content shapes
  content:
    | string // Simple text content
    | React.ReactNode // Any React content
    | {
        title: string;
        body: string;
        actions?: Array<{
          label: string;
          action: () => void;
          variant?: 'primary' | 'secondary' | 'danger';
        }>;
      }; // Structured content object
}

function Modal({ isOpen, onClose, content }: ModalProps) {
  if (!isOpen) return null;

  // Type guards to handle different content shapes
  const renderContent = () => {
    if (typeof content === 'string') {
      return <p>{content}</p>;
    }

    if (React.isValidElement(content)) {
      return content;
    }

    // TypeScript knows this must be the object shape
    return (
      <div>
        <h2>{content.title}</h2>
        <div>{content.body}</div>
        {content.actions && (
          <div className="modal-actions">
            {content.actions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`btn btn--${action.variant || 'secondary'}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {renderContent()}
      </div>
    </div>
  );
}
```

Union types are particularly powerful when combined with type guards—they let you handle different prop shapes gracefully while maintaining type safety.

## Indexed Types: Dynamic Property Access

Sometimes you need to access object properties dynamically. TypeScript's indexed access types help you do this safely:

```tsx
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'moderator';
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

interface UserFieldProps<T extends keyof User> {
  user: User;
  field: T;

  // The value type depends on which field is selected
  onEdit: (field: T, value: User[T]) => void;

  // Render function knows the specific type
  renderValue?: (value: User[T]) => React.ReactNode;
}

function UserField<T extends keyof User>({ user, field, onEdit, renderValue }: UserFieldProps<T>) {
  const value = user[field];

  const handleEdit = () => {
    // This would typically open an edit modal or inline editor
    // TypeScript knows the exact type of value based on the field
    if (field === 'preferences') {
      // value is User['preferences'] here
      onEdit(field, { ...value, theme: value.theme === 'light' ? 'dark' : 'light' });
    } else if (field === 'name') {
      // value is User['name'] (string) here
      const newName = prompt('Enter new name:', value);
      if (newName) onEdit(field, newName);
    }
  };

  return (
    <div className="user-field">
      <label>{field}:</label>
      <span>{renderValue ? renderValue(value) : String(value)}</span>
      <button onClick={handleEdit}>Edit</button>
    </div>
  );
}

// Usage with full type safety
<UserField
  user={currentUser}
  field="name"
  onEdit={(field, value) => {
    // TypeScript knows field is "name" and value is string
    updateUser({ [field]: value });
  }}
/>;
```

This pattern is incredibly useful for building generic CRUD interfaces, form builders, or any component that needs to work with object properties dynamically.

## Generic Props: Reusable Components

Generics let you build components that work with any type while preserving type information:

```tsx
interface DataTableProps<T> {
  data: T[];

  // Column definitions that know about T's properties
  columns: Array<{
    key: keyof T;
    title: string;
    sortable?: boolean;

    // Renderer function gets the correct type for the column
    render?: (value: T[keyof T], row: T) => React.ReactNode;
  }>;

  // Event handlers with typed parameters
  onRowClick?: (row: T, index: number) => void;
  onSort?: (column: keyof T, direction: 'asc' | 'desc') => void;

  // Selection state
  selection?: {
    selectedIds: Set<T extends { id: infer I } ? I : never>;
    onSelectionChange: (selectedIds: Set<T extends { id: infer I } ? I : never>) => void;
  };
}

function DataTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  onSort,
  selection,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: keyof T) => {
    const direction = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(direction);
    onSort?.(column, direction);
  };

  return (
    <table>
      <thead>
        <tr>
          {selection && <th>Select</th>}
          {columns.map((column) => (
            <th key={String(column.key)}>
              {column.sortable ? (
                <button onClick={() => handleSort(column.key)}>
                  {column.title}
                  {sortColumn === column.key && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                </button>
              ) : (
                column.title
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={String(row.id)} onClick={() => onRowClick?.(row, index)}>
            {selection && (
              <td>
                <input
                  type="checkbox"
                  checked={selection.selectedIds.has(row.id)}
                  onChange={() => {
                    const newSelection = new Set(selection.selectedIds);
                    if (newSelection.has(row.id)) {
                      newSelection.delete(row.id);
                    } else {
                      newSelection.add(row.id);
                    }
                    selection.onSelectionChange(newSelection);
                  }}
                />
              </td>
            )}
            {columns.map((column) => (
              <td key={String(column.key)}>
                {column.render ? column.render(row[column.key], row) : String(row[column.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Generic components require more upfront thinking, but they pay dividends in reusability and type safety.

## Conditional Props with Template Literals

Modern TypeScript lets you create sophisticated conditional prop relationships using template literal types:

```tsx
// Define available icon names
type IconName = 'home' | 'user' | 'settings' | 'search' | 'bell';

// Size variants
type Size = 'small' | 'medium' | 'large';

interface BaseButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

// Icon button requires icon, text is optional
interface IconButtonProps extends BaseButtonProps {
  variant: 'icon';
  icon: IconName;
  size?: Size;
  'aria-label': string; // Required for accessibility
}

// Text button doesn't need icon
interface TextButtonProps extends BaseButtonProps {
  variant: 'text';
  size?: Size;
}

// Icon-text combo requires both
interface IconTextButtonProps extends BaseButtonProps {
  variant: 'icon-text';
  icon: IconName;
  size?: Size;
}

type ButtonProps = IconButtonProps | TextButtonProps | IconTextButtonProps;

function Button(props: ButtonProps) {
  const baseClasses = `btn btn--${props.variant} btn--${props.size || 'medium'}`;

  if (props.variant === 'icon') {
    return (
      <button
        className={baseClasses}
        onClick={props.onClick}
        disabled={props.disabled}
        aria-label={props['aria-label']}
      >
        <Icon name={props.icon} />
      </button>
    );
  }

  if (props.variant === 'icon-text') {
    return (
      <button
        className={baseClasses}
        onClick={props.onClick}
        disabled={props.disabled}
      >
        <Icon name={props.icon} />
        {props.children}
      </button>
    );
  }

  // Text variant
  return (
    <button
      className={baseClasses}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}

// Usage is completely type-safe
<Button variant="icon" icon="home" aria-label="Go home" onClick={() => {}} />
<Button variant="text" onClick={() => {}}>Click me</Button>
<Button variant="icon-text" icon="search" onClick={() => {}}>Search</Button>
```

This pattern prevents impossible states (like an icon button without an icon) while keeping the API clean and discoverable.

## Common Patterns in the Wild

Let's look at some Real World Use Cases™ that combine multiple prop patterns:

```tsx
// A complex but realistic component
interface InfiniteScrollListProps<T> {
  // Core data
  items: T[];

  // Render functions (function props)
  renderItem: (item: T, index: number) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderError?: (error: Error) => React.ReactNode;

  // Loading states (discriminated union)
  loadingState:
    | { type: 'idle' }
    | { type: 'loading'; hasMore: boolean }
    | { type: 'error'; error: Error }
    | { type: 'complete' };

  // Event handlers (function props)
  onLoadMore: () => void;
  onItemClick?: (item: T, index: number) => void;

  // Configuration (object prop)
  options?: {
    threshold?: number; // How close to bottom before loading
    pageSize?: number;
    estimatedItemHeight?: number;
  };

  // Generic constraints
  keyExtractor: (item: T) => string | number;
}

function InfiniteScrollList<T>({
  items,
  renderItem,
  renderEmpty,
  renderError,
  loadingState,
  onLoadMore,
  onItemClick,
  options = {},
  keyExtractor,
}: InfiniteScrollListProps<T>) {
  const { threshold = 100, estimatedItemHeight = 50 } = options;

  // Intersection Observer logic for infinite scrolling
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && loadingState.type === 'idle') {
          onLoadMore();
        }
      },
      { rootMargin: `${threshold}px` },
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, loadingState.type, onLoadMore]);

  if (loadingState.type === 'error') {
    return renderError ? (
      renderError(loadingState.error)
    ) : (
      <div>Error: {loadingState.error.message}</div>
    );
  }

  if (items.length === 0 && loadingState.type === 'idle') {
    return renderEmpty ? renderEmpty() : <div>No items found</div>;
  }

  return (
    <div className="infinite-scroll-list">
      {items.map((item, index) => (
        <div
          key={keyExtractor(item)}
          onClick={() => onItemClick?.(item, index)}
          style={{ minHeight: estimatedItemHeight }}
        >
          {renderItem(item, index)}
        </div>
      ))}

      {loadingState.type === 'loading' && <div className="loading-indicator">Loading more...</div>}

      <div ref={observerRef} className="scroll-trigger" />
    </div>
  );
}
```

This component demonstrates how multiple prop patterns work together to create a flexible, type-safe API that handles complex real-world requirements.

> [!WARNING]
> Don't over-engineer your prop shapes. Start simple and add complexity only when you need it. The best prop API is the one that makes the common case easy and the complex case possible.

## Avoiding Common Prop Shape Pitfalls

### The `any` Escape Hatch Trap

It's tempting to use `any` for complex props, but resist:

```tsx
// ❌ Bad - loses all type safety
interface BadProps {
  config: any;
  data: any[];
  onEvent: any;
}

// ✅ Good - preserves type information
interface GoodProps {
  config: {
    theme: 'light' | 'dark';
    locale: string;
  };
  data: Array<{ id: string; name: string }>;
  onEvent: (eventType: string, payload: unknown) => void;
}
```

### Over-Nesting Object Props

Deep nesting makes props hard to use:

```tsx
// ❌ Bad - too deeply nested
interface OverNestedProps {
  config: {
    ui: {
      theme: {
        colors: {
          primary: {
            main: string;
            hover: string;
          };
        };
      };
    };
  };
}

// ✅ Good - flatter structure
interface FlatProps {
  theme: 'light' | 'dark';
  primaryColor?: string;
  primaryHoverColor?: string;
}
```

### Making Everything Optional

Optional props should be truly optional:

```tsx
// ❌ Bad - component can't function without these
interface BadModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

// ✅ Good - required props are required
interface GoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string; // This is truly optional
}
```

## Wrapping Up

Mastering common prop shapes is about more than just getting TypeScript to compile—it's about creating components that are intuitive to use, impossible to misuse, and self-documenting. The patterns we've covered form the foundation of great React component APIs.

Start with simple primitives and build up complexity as needed. Use union types for mutually exclusive states, generic types for reusable components, and always prefer explicit types over `any`. Your components will be more reliable, your development experience will be smoother, and your teammates will actually enjoy using what you've built.

**Next up**: We'll explore advanced prop patterns like render props, compound components, and polymorphic APIs that build on these foundational shapes to create even more powerful component abstractions.
