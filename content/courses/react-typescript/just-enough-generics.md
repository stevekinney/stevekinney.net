---
title: Just Enough Generics for React
description: Use generics to write reusable components and hooks—without disappearing into type wizardry.
date: 2025-09-06T22:23:57.279Z
modified: 2025-09-06T22:23:57.279Z
published: true
tags: ['react', 'typescript', 'generics', 'reusable-components']
---

Generics in React have a reputation for being intimidating—all those angle brackets and type parameters feel like advanced wizardry. But the truth is, you only need to understand a handful of patterns to unlock most of their power. Once you get the fundamentals, generics become your secret weapon for writing components that are both type-safe and flexible, without copying and pasting code across your app.

Let's focus on the practical patterns that actually matter in day-to-day React development. We'll build from simple examples to Real World Use Cases™ that you can apply immediately to make your components more reusable and your TypeScript experience more delightful.

## The Problem Generics Solve

Before diving into the syntax, let's establish why generics matter in React. Consider this common scenario: you need a dropdown component that works with different data types.

```tsx
// ❌ Without generics - you end up with this mess
interface StringDropdownProps {
  items: string[];
  value?: string;
  onChange: (value: string) => void;
}

interface NumberDropdownProps {
  items: number[];
  value?: number;
  onChange: (value: number) => void;
}

interface UserDropdownProps {
  items: User[];
  value?: User;
  onChange: (value: User) => void;
}

// Three nearly identical components... this doesn't scale
```

Generics let you write one component that works with any type:

```tsx
// ✅ With generics - one component to rule them all
interface DropdownProps<T> {
  items: T[];
  value?: T;
  onChange: (value: T) => void;
  getLabel?: (item: T) => string;
}

function Dropdown<T>({ items, value, onChange, getLabel }: DropdownProps<T>) {
  return (
    <select
      value={getLabel ? getLabel(value || items[0]) : String(value)}
      onChange={(e) => {
        const selectedItem = items.find(
          (item) => (getLabel ? getLabel(item) : String(item)) === e.target.value,
        );
        if (selectedItem) onChange(selectedItem);
      }}
    >
      {items.map((item, index) => (
        <option key={index} value={getLabel ? getLabel(item) : String(item)}>
          {getLabel ? getLabel(item) : String(item)}
        </option>
      ))}
    </select>
  );
}
```

Now you can use it with any type, and TypeScript ensures everything stays consistent:

```tsx
// ✅ All of these work and are fully type-safe
<Dropdown<string>
  items={['apple', 'banana', 'cherry']}
  onChange={(fruit) => console.log(fruit)} // fruit is string
/>

<Dropdown<User>
  items={users}
  getLabel={(user) => user.name}
  onChange={(user) => console.log(user.id)} // user is User
/>
```

## Generic Component Fundamentals

The anatomy of a generic React component follows a simple pattern:

```tsx
// The basic syntax
function ComponentName<TypeParameter>(props: ComponentProps<TypeParameter>) {
  // Implementation
}

// You can have multiple type parameters
function AdvancedComponent<T, K extends keyof T>(props: AdvancedProps<T, K>) {
  // Implementation
}
```

Let's start with a practical example—a `List` component that renders any array of data:

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T) => string | number;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor ? keyExtractor(item) : index}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}
```

Usage demonstrates how TypeScript infers the generic type automatically:

```tsx
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

// ✅ TypeScript infers T as User from the items prop
<List
  items={users}
  keyExtractor={(user) => user.id} // user is correctly typed as User
  renderItem={(
    user, // user is correctly typed as User
  ) => (
    <div>
      <strong>{user.name}</strong>
      <span>{user.email}</span>
    </div>
  )}
/>;
```

> [!TIP]
> Most of the time, you don't need to explicitly specify the generic type (`<User>`) because TypeScript can infer it from your props. This makes the component feel natural to use.

## Generic Constraints: Being Specific When Needed

Sometimes your component needs certain properties to exist on the generic type. Generic constraints let you say "T can be anything, but it must have these specific properties":

```tsx
// Constraint: T must have an 'id' property
interface TableProps<T extends { id: string | number }> {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    render?: (value: T[keyof T], item: T) => React.ReactNode;
  }>;
  onRowClick?: (item: T) => void;
}

function Table<T extends { id: string | number }>({ data, columns, onRowClick }: TableProps<T>) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={String(column.key)}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr
            key={item.id} // ✅ We know 'id' exists because of the constraint
            onClick={() => onRowClick?.(item)}
          >
            {columns.map((column) => (
              <td key={String(column.key)}>
                {column.render ? column.render(item[column.key], item) : String(item[column.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

The constraint ensures your component only accepts data with the required shape:

```tsx
// ✅ Works - has required id property
const products = [
  { id: 1, name: 'Widget', price: 29.99 },
  { id: 2, name: 'Gadget', price: 49.99 },
];

<Table
  data={products}
  columns={[
    { key: 'name', header: 'Product Name' },
    { key: 'price', header: 'Price', render: (price) => `$${price}` },
  ]}
/>;

// ❌ Won't compile - missing id property
const invalidData = [{ name: 'No ID' }];
// <Table data={invalidData} ... /> // Type error!
```

## Conditional Rendering with Generic Types

Generic components often need to handle different rendering scenarios based on the data type. Union types and type guards make this elegant:

```tsx
type CardData =
  | { type: 'user'; user: User }
  | { type: 'product'; product: Product }
  | { type: 'article'; article: Article };

interface CardProps<T extends CardData> {
  data: T;
  onClick?: (data: T) => void;
}

function Card<T extends CardData>({ data, onClick }: CardProps<T>) {
  const handleClick = () => onClick?.(data);

  // TypeScript narrows the type based on the discriminant
  switch (data.type) {
    case 'user':
      return (
        <div className="card user-card" onClick={handleClick}>
          <h3>{data.user.name}</h3>
          <p>{data.user.email}</p>
        </div>
      );
    case 'product':
      return (
        <div className="card product-card" onClick={handleClick}>
          <h3>{data.product.name}</h3>
          <p>${data.product.price}</p>
        </div>
      );
    case 'article':
      return (
        <div className="card article-card" onClick={handleClick}>
          <h3>{data.article.title}</h3>
          <p>{data.article.summary}</p>
        </div>
      );
  }
}
```

> [!NOTE]
> Discriminated unions (like `type: 'user'`) are TypeScript's way of handling different shapes of data safely. The `type` field acts as a "tag" that tells TypeScript which shape you're dealing with.

## Generic Hooks: State That Adapts

Custom hooks become incredibly powerful when combined with generics. Let's build a `useLocalStorage` hook that maintains type safety:

```tsx
import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;

        try {
          window.localStorage.setItem(key, JSON.stringify(newValue));
        } catch (error) {
          console.warn(`Error setting localStorage key "${key}":`, error);
        }

        return newValue;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
```

The hook automatically infers and maintains the correct type:

```tsx
// ✅ TypeScript knows these are strongly typed
const [count, setCount] = useLocalStorage('count', 0); // number
const [user, setUser] = useLocalStorage('user', null as User | null); // User | null
const [settings, setSettings] = useLocalStorage('settings', { theme: 'dark' }); // object

// ✅ All operations are type-safe
setCount(42); // ✅ number
setCount((c) => c + 1); // ✅ function that takes/returns number
// setCount('invalid'); // ❌ Type error!

setUser({ id: 1, name: 'Alice', email: 'alice@example.com' }); // ✅ User
// setUser('invalid'); // ❌ Type error!
```

## Advanced Pattern: Polymorphic Components

Sometimes you want components that can render as different HTML elements while maintaining type safety. This is common in design systems:

```tsx
import { ComponentPropsWithoutRef, ElementType } from 'react';

interface PolymorphicProps<T extends ElementType> {
  as?: T;
  children: React.ReactNode;
}

// This type merges our component props with the native element props
type Props<T extends ElementType> = PolymorphicProps<T> & ComponentPropsWithoutRef<T>;

function Button<T extends ElementType = 'button'>({ as, children, ...props }: Props<T>) {
  const Component = as || 'button';

  return (
    <Component className="btn" {...props}>
      {children}
    </Component>
  );
}
```

This pattern lets your component adapt to different use cases:

```tsx
// ✅ Renders as button with button props
<Button onClick={() => console.log('clicked')}>
  Click me
</Button>

// ✅ Renders as link with anchor props
<Button as="a" href="/home" target="_blank">
  Go Home
</Button>

// ✅ Renders as div with div props
<Button as="div" onMouseEnter={() => console.log('hovered')}>
  Hover me
</Button>

// ❌ TypeScript catches invalid prop combinations
// <Button as="a" onClick={() => {}}>Invalid</Button> // Type error!
```

> [!WARNING]
> Polymorphic components can get complex quickly. Use them judiciously—often a simple component with clear responsibilities is better than an overly flexible one.

## Generic Event Handlers

Form components often need to handle different types of values while maintaining type safety:

```tsx
interface FormFieldProps<T> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  parse: (input: string) => T;
  format?: (value: T) => string;
  validate?: (value: T) => string | undefined;
}

function FormField<T>({
  label,
  value,
  onChange,
  parse,
  format = String,
  validate,
}: FormFieldProps<T>) {
  const [error, setError] = useState<string>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const parsedValue = parse(e.target.value);
      const validationError = validate?.(parsedValue);

      setError(validationError);
      if (!validationError) {
        onChange(parsedValue);
      }
    } catch (parseError) {
      setError('Invalid format');
    }
  };

  return (
    <div className="form-field">
      <label>{label}</label>
      <input type="text" value={format(value)} onChange={handleChange} />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

Now you can create type-safe form fields for any data type:

```tsx
// ✅ Number field
<FormField<number>
  label="Age"
  value={age}
  onChange={setAge}
  parse={(input) => {
    const num = parseInt(input, 10);
    if (isNaN(num)) throw new Error('Not a number');
    return num;
  }}
  validate={(num) => num < 0 ? 'Must be positive' : undefined}
/>

// ✅ Date field
<FormField<Date>
  label="Birth Date"
  value={birthDate}
  onChange={setBirthDate}
  parse={(input) => new Date(input)}
  format={(date) => date.toISOString().split('T')[0]}
  validate={(date) => date > new Date() ? 'Cannot be in future' : undefined}
/>
```

## Common Pitfalls and Solutions

### Avoid Generic Overload

Don't make everything generic just because you can:

```tsx
// ❌ Over-engineered - this doesn't need generics
interface ButtonProps<T extends string> {
  label: T;
  onClick: () => void;
}

// ✅ Keep it simple when generics don't add value
interface ButtonProps {
  label: string;
  onClick: () => void;
}
```

### Default Generic Parameters

Provide sensible defaults to reduce boilerplate:

```tsx
// ✅ Default to 'any' for maximum flexibility
function DataFetcher<T = any>({ url, onSuccess }: { url: string; onSuccess: (data: T) => void }) {
  // Implementation...
}

// Usage becomes cleaner
<DataFetcher url="/api/users" onSuccess={(users) => setUsers(users)} />;
```

### Generic Context

When using React Context with generics, define it properly:

```tsx
interface DataContextValue<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function createDataContext<T>() {
  const DataContext = React.createContext<DataContextValue<T> | null>(null);

  const useDataContext = () => {
    const context = React.useContext(DataContext);
    if (!context) {
      throw new Error('useDataContext must be used within DataProvider');
    }
    return context;
  };

  return { DataContext, useDataContext };
}

// Usage
const { DataContext: UserContext, useDataContext: useUserContext } = createDataContext<User>();
```

## Real-World Example: A Complete Generic Modal

Let's combine all these patterns in a production-ready modal component:

```tsx
interface ModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data?: T;
  renderContent: (data: T, onClose: () => void) => React.ReactNode;
  renderFooter?: (data: T, onClose: () => void) => React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

function Modal<T>({
  isOpen,
  onClose,
  title,
  data,
  renderContent,
  renderFooter,
  size = 'md',
}: ModalProps<T>) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal modal-${size}`} onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose}>×</button>
        </header>

        <main className="modal-content">{data && renderContent(data, onClose)}</main>

        {renderFooter && data && (
          <footer className="modal-footer">{renderFooter(data, onClose)}</footer>
        )}
      </div>
    </div>
  );
}
```

This modal works with any data type while maintaining full type safety:

```tsx
// ✅ User editing modal
<Modal<User>
  isOpen={showUserModal}
  onClose={() => setShowUserModal(false)}
  title="Edit User"
  data={selectedUser}
  renderContent={(user, onClose) => (
    <UserForm user={user} onSave={() => onClose()} />
  )}
  renderFooter={(user, onClose) => (
    <>
      <button onClick={onClose}>Cancel</button>
      <button onClick={() => deleteUser(user.id)}>Delete</button>
    </>
  )}
/>

// ✅ Product confirmation modal
<Modal<Product>
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Confirm Purchase"
  data={selectedProduct}
  renderContent={(product, onClose) => (
    <p>Are you sure you want to buy {product.name} for ${product.price}?</p>
  )}
  renderFooter={(product, onClose) => (
    <>
      <button onClick={onClose}>Cancel</button>
      <button onClick={() => purchaseProduct(product.id)}>Confirm</button>
    </>
  )}
/>
```

## When to Use Generics (And When Not To)

Generics shine when you have:

- **Repeated patterns** across different data types (forms, lists, modals)
- **Type relationships** that need to be preserved (input type should match output type)
- **Reusable utilities** that work with multiple types (API hooks, validation, storage)

Avoid generics when:

- **The component is too simple** (a basic button doesn't need generics)
- **You only use it in one place** (generics add complexity without benefit)
- **The types are unrelated** (don't force generics where they don't belong)

## Next Steps

You now have the essential patterns for using generics effectively in React. The key is starting simple and adding complexity only when it provides clear benefits. Begin by identifying repeated patterns in your codebase—those are perfect candidates for generic components.

Focus on making your components feel natural to use. The best generic components are ones where developers barely notice the generics are there, they just work intuitively with strong type safety. That's when you know you've struck the right balance between flexibility and simplicity.
