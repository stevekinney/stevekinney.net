---
title: React-Specific TypeScript Patterns
description: >-
  Essential TypeScript patterns every React developer needs to know—from
  component typing to ref forwarding
date: 2025-09-27T10:00:00.000Z
modified: '2025-09-27T13:35:28-06:00'
published: true
tags:
  - typescript
  - react
  - patterns
  - components
---

TypeScript and React were made for each other, but there are specific patterns and conventions that can make or break your development experience. This guide covers the essential React-specific TypeScript patterns that every React developer should master.

## React 19 TypeScript Improvements

React 19 brings cleaner TypeScript patterns that reduce boilerplate and improve type inference. These improvements make React development more intuitive.

### Simplified Component Typing

React 19 embraces simpler component patterns, moving away from verbose type annotations:

```typescript
// ✅ React 19: Clean and simple
function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
}

// Still works, but often unnecessary
const UserCard: React.FC<{ user: User }> = ({ user }) => {
  return <div>{user.name}</div>;
};
```

### Improved Ref Type Inference

React 19's ref system works more naturally with TypeScript:

```typescript
// ✅ React 19: Refs just work
function TextInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus(); // TypeScript knows this might be null
  };

  return <input ref={inputRef} type="text" />;
}

// Cleaner forwardRef patterns
const FancyInput = forwardRef<HTMLInputElement, { placeholder: string }>(
  ({ placeholder }, ref) => {
    return <input ref={ref} placeholder={placeholder} />;
  }
);
FancyInput.displayName = 'FancyInput'; // TypeScript helps remind you
```

### Better Error Messages

React 19 with TypeScript 5+ provides more helpful error messages for common mistakes:

```typescript
// If you forget to pass required props:
<UserCard /> // Error: Property 'user' is missing in type '{}'

// If you pass wrong prop types:
<UserCard user="string" /> // Error: Type 'string' is not assignable to type 'User'

// If you return wrong type from component:
function BadComponent(): number {
  return 42; // Error: 'number' is not assignable to 'ReactNode'
}
```

## Component Type Declarations: FC vs Function Declarations

One of the first decisions you'll face is how to type your React components. Let's understand the trade-offs.

### React.FC: The Traditional Approach

```typescript
import { FC, ReactNode } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

// Using React.FC
const Button: FC<ButtonProps> = ({ variant = 'primary', onClick, children }) => {
  return (
    <button className={`btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
};

// What FC gives you:
// ✅ children prop is automatically included
// ✅ Return type is enforced as ReactElement | null
// ✅ displayName, defaultProps, propTypes are typed
```

### Function Declarations: The Modern Approach

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  children: ReactNode; // Explicitly define children
}

// Using function declaration
function Button({ variant = 'primary', onClick, children }: ButtonProps) {
  return (
    <button className={`btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
}

// Or arrow function without FC
const Button = ({ variant = 'primary', onClick, children }: ButtonProps) => {
  return (
    <button className={`btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
};
```

### Which Should You Use?

```typescript
// ✅ Prefer function declarations or typed arrow functions
// More explicit, better inference, no hidden behavior
function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

// ❌ Avoid FC unless you specifically need its features
// Adds overhead, implicit children, less flexible
const Card: FC<CardProps> = ({ title, children }) => {
  // ...
};
```

## The Children Prop: Getting It Right

Understanding how to type children is crucial for component composition.

### Different Children Types

```typescript
import { ReactNode, ReactElement, JSX } from 'react';

// ReactNode: Most flexible, accepts everything
interface ContainerProps {
  children: ReactNode; // string | number | boolean | null | undefined | ReactElement | ReactFragment | ReactPortal
}

// ReactElement: Only JSX elements
interface WrapperProps {
  children: ReactElement; // Must be a JSX element
}

// Specific element types
interface ListProps {
  children: ReactElement<HTMLLIElement> | ReactElement<HTMLLIElement>[];
}

// Function as children (render prop)
interface RenderProps<T> {
  children: (data: T) => ReactNode;
}

// Optional children
interface CardProps {
  title: string;
  children?: ReactNode;
}

// No children allowed
interface IconProps {
  name: string;
  children?: never; // Explicitly disallow children
}
```

### Constraining Children

```typescript
// Only allow specific components as children
interface TabsProps {
  children: ReactElement<TabProps> | ReactElement<TabProps>[];
}

interface TabProps {
  label: string;
  children: ReactNode;
}

function Tabs({ children }: TabsProps) {
  // TypeScript ensures only Tab components are passed
  const tabs = React.Children.toArray(children) as ReactElement<TabProps>[];

  return (
    <div className="tabs">
      {tabs.map((tab, index) => (
        <div key={index}>{tab}</div>
      ))}
    </div>
  );
}

// Usage
<Tabs>
  <Tab label="First">Content 1</Tab>
  <Tab label="Second">Content 2</Tab>
  {/* <div>Not allowed!</div> */} {/* ❌ Type error */}
</Tabs>
```

## Ref Forwarding with TypeScript

Refs are tricky in TypeScript. Here's how to handle them properly.

### Basic Ref Forwarding

```typescript
import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...props }, ref) => {
    return (
      <div>
        <label>{label}</label>
        <input ref={ref} {...props} />
      </div>
    );
  }
);

// Must add display name for debugging
Input.displayName = 'Input';

// Usage
function Form() {
  const inputRef = useRef<HTMLInputElement>(null);

  return <Input ref={inputRef} label="Name" />;
}
```

### Generic Ref Forwarding

```typescript
// Generic component with ref forwarding
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
}

// Create a typed forwardRef helper
function typedForwardRef<T, P = {}>(
  render: (props: P, ref: React.Ref<T>) => React.ReactElement | null
) {
  return forwardRef<T, P>(render);
}

const List = typedForwardRef<HTMLUListElement, ListProps<any>>(
  ({ items, renderItem }, ref) => {
    return (
      <ul ref={ref}>
        {items.map((item, index) => (
          <li key={index}>{renderItem(item)}</li>
        ))}
      </ul>
    );
  }
);
```

### Imperative Handle Pattern

```typescript
import { forwardRef, useImperativeHandle, useRef } from 'react';

interface ModalHandle {
  open: () => void;
  close: () => void;
}

interface ModalProps {
  title: string;
  children: ReactNode;
}

const Modal = forwardRef<ModalHandle, ModalProps>(
  ({ title, children }, ref) => {
    const [isOpen, setIsOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }), []);

    if (!isOpen) return null;

    return (
      <div className="modal">
        <h2>{title}</h2>
        {children}
      </div>
    );
  }
);

// Usage
function App() {
  const modalRef = useRef<ModalHandle>(null);

  return (
    <>
      <button onClick={() => modalRef.current?.open()}>
        Open Modal
      </button>
      <Modal ref={modalRef} title="Example">
        Modal content
      </Modal>
    </>
  );
}
```

## React.memo with TypeScript

Optimizing components with memo requires proper typing.

### Basic Memo Usage

```typescript
interface ExpensiveListProps {
  items: string[];
  onItemClick: (item: string) => void;
}

const ExpensiveList = memo<ExpensiveListProps>(({ items, onItemClick }) => {
  console.log('ExpensiveList rendered');

  return (
    <ul>
      {items.map(item => (
        <li key={item} onClick={() => onItemClick(item)}>
          {item}
        </li>
      ))}
    </ul>
  );
});

// With custom comparison
const ExpensiveList = memo<ExpensiveListProps>(
  ({ items, onItemClick }) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    return (
      prevProps.items.length === nextProps.items.length &&
      prevProps.items.every((item, index) => item === nextProps.items[index])
    );
  }
);
```

### Memo with Generic Components

```typescript
// Generic memoized component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
}

// Helper for generic memo
function typedMemo<T extends ComponentType<any>>(
  Component: T,
  propsAreEqual?: (
    prevProps: ComponentProps<T>,
    nextProps: ComponentProps<T>
  ) => boolean
): T {
  return memo(Component, propsAreEqual) as T;
}

function ListComponent<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map(item => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

const MemoizedList = typedMemo(ListComponent);
```

## Higher-Order Component Patterns

HOCs are complex to type but follow predictable patterns.

### Basic HOC Pattern

```typescript
// HOC that adds loading state
interface WithLoadingProps {
  loading: boolean;
}

function withLoading<P extends object>(
  Component: ComponentType<P>
): ComponentType<P & WithLoadingProps> {
  return ({ loading, ...props }: P & WithLoadingProps) => {
    if (loading) {
      return <div>Loading...</div>;
    }

    return <Component {...props as P} />;
  };
}

// Usage
interface UserProps {
  name: string;
  age: number;
}

function User({ name, age }: UserProps) {
  return <div>{name} is {age}</div>;
}

const UserWithLoading = withLoading(User);

// Now requires loading prop
<UserWithLoading name="Alice" age={30} loading={false} />
```

### HOC with Injected Props

```typescript
// HOC that injects props
interface WithAuthProps {
  user: { id: string; name: string } | null;
}

function withAuth<P extends WithAuthProps>(
  Component: ComponentType<P>
): ComponentType<Omit<P, keyof WithAuthProps>> {
  return (props: Omit<P, keyof WithAuthProps>) => {
    const user = useAuth(); // Custom hook

    return <Component {...props as P} user={user} />;
  };
}

// Component expects user prop
function Profile({ user }: WithAuthProps) {
  if (!user) return <div>Please log in</div>;
  return <div>Welcome, {user.name}</div>;
}

// Wrapped component doesn't need user prop
const ProfileWithAuth = withAuth(Profile);
<ProfileWithAuth /> // No user prop needed!
```

## Event Handler Patterns

React events need special attention in TypeScript.

### Typed Event Handlers

```typescript
import { MouseEvent, ChangeEvent, FormEvent, KeyboardEvent } from 'react';

interface FormProps {
  onSubmit: (data: FormData) => void;
}

function Form({ onSubmit }: FormProps) {
  // Inline event handlers with inferred types
  return (
    <form onSubmit={(e) => {
      // e is inferred as FormEvent<HTMLFormElement>
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      onSubmit(formData);
    }}>
      <input
        onChange={(e) => {
          // e is inferred as ChangeEvent<HTMLInputElement>
          console.log(e.target.value);
        }}
      />

      <button
        onClick={(e) => {
          // e is inferred as MouseEvent<HTMLButtonElement>
          e.stopPropagation();
        }}
      >
        Submit
      </button>
    </form>
  );
}

// Extracted event handlers
function SearchBar() {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Handle change
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Handle enter
    }
  };

  return (
    <input
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
}
```

### Generic Event Handlers

```typescript
// Generic click handler for any element
type ClickHandler<T = HTMLElement> = (
  event: MouseEvent<T>
) => void;

interface ClickableProps<T = HTMLElement> {
  onClick?: ClickHandler<T>;
  children: ReactNode;
}

function Clickable<T = HTMLElement>({
  onClick,
  children
}: ClickableProps<T>) {
  return (
    <div onClick={onClick as any}>
      {children}
    </div>
  );
}

// Usage with specific element types
<Clickable<HTMLButtonElement>
  onClick={(e) => {
    // e.currentTarget is HTMLButtonElement
    console.log(e.currentTarget.disabled);
  }}
>
  Click me
</Clickable>
```

## Component Props Patterns

### Extending HTML Element Props

```typescript
import { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';

// Button that extends native button props
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
}

function Button({
  variant = 'primary',
  size = 'medium',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// Polymorphic component (can be button or anchor)
type ButtonOrLinkProps =
  | (ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' })
  | (AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a'; href: string });

function ButtonOrLink(props: ButtonOrLinkProps) {
  if (props.as === 'a') {
    return <a {...props} />;
  }

  return <button {...props} />;
}
```

### Discriminated Union Props

```typescript
// Component with mutually exclusive props
type AlertProps =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string; retry?: () => void }
  | { type: 'info'; message: string; details?: string };

function Alert(props: AlertProps) {
  switch (props.type) {
    case 'success':
      return <div className="alert-success">{props.message}</div>;

    case 'error':
      return (
        <div className="alert-error">
          {props.message}
          {props.retry && (
            <button onClick={props.retry}>Retry</button>
          )}
        </div>
      );

    case 'info':
      return (
        <div className="alert-info">
          {props.message}
          {props.details && <p>{props.details}</p>}
        </div>
      );
  }
}
```

## Compound Component Patterns

```typescript
// Compound components with TypeScript
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

interface TabsProps {
  children: ReactNode;
  defaultTab?: string;
}

interface TabListProps {
  children: ReactElement<TabProps> | ReactElement<TabProps>[];
}

interface TabProps {
  value: string;
  children: ReactNode;
}

interface TabPanelProps {
  value: string;
  children: ReactNode;
}

// Main component
function Tabs({ children, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || '');

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}

// Sub-components
Tabs.List = function TabList({ children }: TabListProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabList must be used within Tabs');

  return <div className="tab-list">{children}</div>;
};

Tabs.Tab = function Tab({ value, children }: TabProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');

  return (
    <button
      className={context.activeTab === value ? 'active' : ''}
      onClick={() => context.setActiveTab(value)}
    >
      {children}
    </button>
  );
};

Tabs.Panel = function TabPanel({ value, children }: TabPanelProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');

  if (context.activeTab !== value) return null;

  return <div className="tab-panel">{children}</div>;
};

// Usage with full type safety
<Tabs defaultTab="tab1">
  <Tabs.List>
    <Tabs.Tab value="tab1">First</Tabs.Tab>
    <Tabs.Tab value="tab2">Second</Tabs.Tab>
  </Tabs.List>

  <Tabs.Panel value="tab1">First content</Tabs.Panel>
  <Tabs.Panel value="tab2">Second content</Tabs.Panel>
</Tabs>
```

## Best Practices

### Do's ✅

```typescript
// ✅ Explicitly type children when needed
interface Props {
  children: ReactNode;
}

// ✅ Use function declarations for components
function Component(props: Props) {
  return <div>{props.children}</div>;
}

// ✅ Extend HTML element props when appropriate
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

// ✅ Use discriminated unions for conditional props
type Props =
  | { type: 'text'; value: string }
  | { type: 'number'; value: number; min?: number; max?: number };

// ✅ Type event handlers explicitly when extracted
const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
  // ...
};
```

### Don'ts ❌

```typescript
// ❌ Don't use React.FC unnecessarily
const Component: React.FC = () => { };

// ❌ Don't use any for event handlers
onClick={(e: any) => { }}

// ❌ Don't forget display names on forwardRef
const Input = forwardRef((props, ref) => { });
// Input.displayName = 'Input'; // Don't forget this!

// ❌ Don't overuse type assertions
const element = document.getElementById('id') as HTMLInputElement; // Dangerous!

// ❌ Don't ignore TypeScript errors in components
// @ts-ignore // Never do this in components!
```

## Summary

These React-specific TypeScript patterns form the foundation of type-safe React development. Master these patterns and you'll write components that are not only type-safe but also more maintainable and easier to refactor. Remember: the goal isn't to add types everywhere, but to add the right types in the right places to catch errors early and improve your development experience.
