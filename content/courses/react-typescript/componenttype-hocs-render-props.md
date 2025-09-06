---
title: ComponentType, HOCs, and Render Props
description: Compose behavior without losing types—wrap components, infer injected props, or render via functions.
date: 2025-09-06T22:23:57.308Z
modified: 2025-09-06T22:23:57.308Z
published: true
tags: ['react', 'typescript', 'hocs', 'render-props', 'component-type', 'composition']
---

The `ComponentType` utility from React's TypeScript definitions is your secret weapon for building flexible, reusable component patterns. Whether you're wrapping components with Higher-Order Components (HOCs), building render prop components, or creating polymorphic components that can be anything from a button to a link, `ComponentType` helps TypeScript understand what you're doing and keeps your props flowing safely through the composition chain.

Think of `ComponentType` as TypeScript's way of saying "this could be any valid React component"—whether that's a function component, a class component, or a `forwardRef` component. It's the foundation that makes advanced composition patterns possible without sacrificing type safety.

## Understanding ComponentType

Before we dive into complex patterns, let's understand what `ComponentType` actually represents:

```typescript
// From React's type definitions
type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;

// This means ComponentType accepts either:
type FunctionComponent<P = {}> = (props: P) => ReactElement | null;
type ComponentClass<P = {}> = new (props: P) => Component<P, any>;
```

In practical terms, `ComponentType<Props>` represents any component that accepts `Props` and renders React elements. This is incredibly useful when you want to write functions that work with any component type:

```typescript
import { ComponentType } from 'react';

// ✅ This accepts any component that takes ButtonProps
function enhanceButton<P extends ButtonProps>(
  Component: ComponentType<P>
): ComponentType<P> {
  return function EnhancedButton(props: P) {
    return (
      <div className="button-wrapper">
        <Component {...props} />
      </div>
    );
  };
}

// Works with function components
const MyButton = ({ children, onClick }: ButtonProps) => (
  <button onClick={onClick}>{children}</button>
);

// Works with class components
class MyClassButton extends React.Component<ButtonProps> {
  render() {
    return <button onClick={this.props.onClick}>{this.props.children}</button>;
  }
}

// Works with forwardRef components
const MyForwardRefButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <button ref={ref} {...props} />
);

// All of these work seamlessly
const EnhancedFunctionButton = enhanceButton(MyButton);
const EnhancedClassButton = enhanceButton(MyClassButton);
const EnhancedForwardRefButton = enhanceButton(MyForwardRefButton);
```

This flexibility is what makes `ComponentType` the backbone of advanced composition patterns.

## Higher-Order Components with ComponentType

HOCs are functions that take a component and return a new component with enhanced functionality. `ComponentType` makes it possible to write HOCs that work with any kind of component while preserving type safety:

```typescript
interface WithLoadingProps {
  isLoading?: boolean;
  loadingText?: string;
}

// Generic HOC that adds loading functionality to any component
function withLoading<P extends {}>(
  WrappedComponent: ComponentType<P>
): ComponentType<P & WithLoadingProps> {
  return function WithLoadingComponent(props: P & WithLoadingProps) {
    const { isLoading = false, loadingText = 'Loading...', ...restProps } = props;

    if (isLoading) {
      return <div className="loading-spinner">{loadingText}</div>;
    }

    return <WrappedComponent {...(restProps as P)} />;
  };
}

// Usage preserves all original component props
interface UserProfileProps {
  userId: string;
  showAvatar?: boolean;
}

const UserProfile = ({ userId, showAvatar = true }: UserProfileProps) => (
  <div>
    <h2>User {userId}</h2>
    {showAvatar && <img src={`/avatars/${userId}`} alt="Avatar" />}
  </div>
);

const LoadingUserProfile = withLoading(UserProfile);

// TypeScript knows this component accepts userId, showAvatar, isLoading, and loadingText
<LoadingUserProfile
  userId="123"
  showAvatar={true}
  isLoading={false}
  loadingText="Fetching user data..."
/>
```

### Advanced HOC Pattern: Injecting Props

Sometimes you want your HOC to inject props that the wrapped component expects, but consumers shouldn't have to provide:

```typescript
interface WithUserProps {
  user: User | null;
  isLoadingUser: boolean;
}

interface UserContextValue {
  user: User | null;
  isLoading: boolean;
}

// HOC that injects user context
function withUser<P extends WithUserProps>(
  WrappedComponent: ComponentType<P>
): ComponentType<Omit<P, keyof WithUserProps>> {
  return function WithUserComponent(props: Omit<P, keyof WithUserProps>) {
    const { user, isLoading } = useContext(UserContext);

    // Cast is necessary because TypeScript can't prove the intersection
    const enhancedProps = {
      ...props,
      user,
      isLoadingUser: isLoading
    } as P;

    return <WrappedComponent {...enhancedProps} />;
  };
}

// Component that expects user props
interface DashboardProps extends WithUserProps {
  title: string;
}

const Dashboard = ({ title, user, isLoadingUser }: DashboardProps) => {
  if (isLoadingUser) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return (
    <div>
      <h1>{title}</h1>
      <p>Welcome back, {user.name}!</p>
    </div>
  );
};

const ConnectedDashboard = withUser(Dashboard);

// Consumers only provide title - user props are injected
<ConnectedDashboard title="My Dashboard" />
```

The key insight here is using `Omit<P, keyof WithUserProps>` to remove the injected props from the consumer-facing interface while ensuring the wrapped component receives everything it expects.

## Render Props with ComponentType

Render props flip the control—instead of wrapping a component, you provide a function that gets called with data and returns JSX. `ComponentType` helps when you want to support both render prop patterns and direct component usage:

```typescript
interface DataFetcherState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface DataFetcherProps<T> {
  url: string;
  // Support both render props and component prop patterns
  children?: (state: DataFetcherState<T>) => React.ReactNode;
  component?: ComponentType<DataFetcherState<T>>;
  render?: (state: DataFetcherState<T>) => React.ReactNode;
}

function DataFetcher<T>({ url, children, component: Component, render }: DataFetcherProps<T>) {
  const [state, setState] = useState<Omit<DataFetcherState<T>, 'refetch'>>({
    data: null,
    loading: true,
    error: null
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stateWithRefetch: DataFetcherState<T> = {
    ...state,
    refetch: fetchData
  };

  // Support multiple render patterns
  if (Component) return <Component {...stateWithRefetch} />;
  if (render) return <>{render(stateWithRefetch)}</>;
  if (children) return <>{children(stateWithRefetch)}</>;

  return null;
}

// Usage with render prop
<DataFetcher<User[]> url="/api/users">
  {({ data: users, loading, error }) => {
    if (loading) return <div>Loading users...</div>;
    if (error) return <div>Error: {error}</div>;
    return (
      <ul>
        {users?.map(user => <li key={user.id}>{user.name}</li>)}
      </ul>
    );
  }}
</DataFetcher>

// Usage with component prop
const UsersList = ({ data: users, loading, error }: DataFetcherState<User[]>) => {
  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;
  return (
    <ul>
      {users?.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
};

<DataFetcher<User[]> url="/api/users" component={UsersList} />
```

This pattern gives consumers maximum flexibility—they can use whichever render pattern feels most natural for their use case.

## Building Component Factories

Sometimes you want to create components dynamically based on configuration. `ComponentType` makes this possible while maintaining type safety:

```typescript
interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

interface ComponentConfig<P extends BaseComponentProps> {
  component: ComponentType<P>;
  defaultProps?: Partial<P>;
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
}

function createFactory<P extends BaseComponentProps>(config: ComponentConfig<P>) {
  const { component: Component, defaultProps = {}, wrapperProps = {} } = config;

  return function FactoryComponent(props: P) {
    const mergedProps = { ...defaultProps, ...props } as P;

    if (Object.keys(wrapperProps).length > 0) {
      return (
        <div {...wrapperProps}>
          <Component {...mergedProps} />
        </div>
      );
    }

    return <Component {...mergedProps} />;
  };
}

// Create specialized button factories
const PrimaryButton = createFactory({
  component: ({ className, children, ...props }: BaseComponentProps & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button className={`btn btn-primary ${className || ''}`} {...props}>
      {children}
    </button>
  ),
  defaultProps: { className: 'font-semibold' }
});

const CardButton = createFactory({
  component: PrimaryButton,
  wrapperProps: { className: 'card-actions' }
});

// Usage maintains full type safety
<PrimaryButton onClick={() => console.log('clicked')}>
  Click me
</PrimaryButton>

<CardButton disabled={false}>
  Card Action
</CardButton>
```

## Polymorphic Components with ComponentType

One of the most powerful uses of `ComponentType` is building polymorphic components—components that can render as different HTML elements or other components while maintaining type safety:

```typescript
interface PolymorphicProps<C extends ElementType> {
  as?: C;
  children?: React.ReactNode;
}

type PolymorphicComponentProps<C extends ElementType, P = {}> =
  PolymorphicProps<C> &
  P &
  Omit<React.ComponentPropsWithoutRef<C>, keyof (PolymorphicProps<C> & P)>;

// Generic polymorphic component
function createPolymorphicComponent<DefaultElement extends ElementType>(
  defaultElement: DefaultElement
) {
  return function PolymorphicComponent<C extends ElementType = DefaultElement, P = {}>(
    { as, children, ...props }: PolymorphicComponentProps<C, P>
  ) {
    const Component = as || defaultElement;
    return <Component {...props}>{children}</Component>;
  };
}

// Create a flexible Box component
const Box = createPolymorphicComponent('div');

// Usage - TypeScript understands the props based on the 'as' prop
<Box>Default div</Box>
<Box as="section" className="container">Section box</Box>
<Box as="button" onClick={() => console.log('clicked')} disabled={false}>
  Button box
</Box>
<Box as={Link} to="/home" className="nav-link">
  Link box
</Box>
```

The magic here is that TypeScript automatically infers the correct props based on the `as` prop value, giving you perfect autocomplete and type checking for whatever element or component you're rendering as.

## Real-World Example: Modal System

Let's put it all together with a practical example—a flexible modal system that supports multiple render patterns:

```typescript
interface ModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

interface ModalProps {
  // Support multiple patterns
  children?: (state: ModalState) => React.ReactNode;
  component?: ComponentType<ModalState>;
  render?: (state: ModalState) => React.ReactNode;

  // Modal configuration
  initialOpen?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

function Modal({
  children,
  component: Component,
  render,
  initialOpen = false,
  closeOnOverlayClick = true,
  closeOnEscape = true
}: ModalProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const state: ModalState = { isOpen, open, close };

  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, close, closeOnEscape]);

  // Render using the preferred pattern
  const content = Component ? <Component {...state} />
                 : render ? render(state)
                 : children ? children(state)
                 : null;

  return (
    <>
      {content}
      {isOpen && (
        <div
          className="modal-overlay"
          onClick={closeOnOverlayClick ? close : undefined}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={close} className="modal-close">
              ×
            </button>
            {/* Portal content would go here in a real implementation */}
          </div>
        </div>
      )}
    </>
  );
}

// Usage with render props
function UserProfileModal() {
  return (
    <Modal closeOnEscape={true}>
      {({ isOpen, open, close }) => (
        <>
          <button onClick={open}>View Profile</button>
          {isOpen && (
            <div>
              <h2>User Profile</h2>
              <button onClick={close}>Close</button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

// Usage with component prop
const ConfirmationModal = ({ isOpen, open, close }: ModalState) => (
  <>
    <button onClick={open} className="btn-danger">
      Delete Account
    </button>
    {isOpen && (
      <div>
        <h3>Are you sure?</h3>
        <button onClick={close}>Cancel</button>
        <button onClick={() => { /* delete logic */ close(); }}>
          Confirm Delete
        </button>
      </div>
    )}
  </>
);

<Modal component={ConfirmationModal} closeOnOverlayClick={false} />
```

## Performance Considerations

When using these patterns, there are a few performance considerations to keep in mind:

### Memoization with ComponentType

```typescript
// ✅ Memoize components created by HOCs
const MemoizedWithLoading = React.memo(withLoading(ExpensiveComponent));

// ✅ Use useCallback for render prop functions
function UserList() {
  const renderUsers = useCallback(({ data: users, loading }: DataFetcherState<User[]>) => {
    if (loading) return <LoadingSpinner />;
    return (
      <div>
        {users?.map(user => <UserCard key={user.id} user={user} />)}
      </div>
    );
  }, []);

  return (
    <DataFetcher<User[]> url="/api/users">
      {renderUsers}
    </DataFetcher>
  );
}

// ✅ Extract components when possible
const UsersRenderer = ({ data: users, loading }: DataFetcherState<User[]>) => {
  if (loading) return <LoadingSpinner />;
  return (
    <div>
      {users?.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
};

// More performant than inline render prop
<DataFetcher<User[]> url="/api/users" component={UsersRenderer} />
```

### Avoiding Unnecessary Re-renders

```typescript
// ❌ Creates new function on every render
<Modal>
  {({ isOpen, open, close }) => (
    <SomeExpensiveComponent onOpen={open} onClose={close} />
  )}
</Modal>

// ✅ Stable component reference
const ModalContent = React.memo(({ isOpen, open, close }: ModalState) => (
  <SomeExpensiveComponent onOpen={open} onClose={close} />
));

<Modal component={ModalContent} />
```

## When to Use Each Pattern

Here's a practical guide for choosing the right approach:

**Use HOCs when:**

- You need to enhance existing components with additional behavior
- You're working with third-party components that you can't modify
- You need to conditionally render different components based on logic
- You want to inject context or external data transparently

**Use Render Props when:**

- You need fine-grained control over what gets rendered
- The logic involves complex state that consumers need to access
- You're building data-fetching or state management utilities
- You want maximum flexibility in how consumers use your component

**Use Polymorphic Components when:**

- You're building design system components that need to be flexible
- You want one component interface that can render as different elements
- You need proper TypeScript support for element-specific props

**Use Component Factories when:**

- You need to create variations of components programmatically
- You're building theming or configuration-driven component systems
- You want to provide sensible defaults while allowing customization

## Common Gotchas

### Generic Constraints Matter

```typescript
// ❌ Too permissive
function badHOC<T>(Component: ComponentType<T>) {
  // TypeScript can't guarantee T has object properties
}

// ✅ Proper constraint
function goodHOC<T extends {}>(Component: ComponentType<T>) {
  // Now TypeScript knows T is an object type
}
```

### Ref Forwarding with ComponentType

```typescript
// ✅ Handle ref forwarding properly
function withRefForwarding<T extends {}, R = any>(
  WrappedComponent: ComponentType<T & { ref?: React.ForwardedRef<R> }>
) {
  return React.forwardRef<R, T>((props, ref) => (
    <WrappedComponent {...props} ref={ref} />
  ));
}
```

### Type Assertions in HOCs

```typescript
// Sometimes necessary, but use judiciously
function withInjectedProps<T extends {}>(WrappedComponent: ComponentType<T & InjectedProps>) {
  return function EnhancedComponent(props: Omit<T, keyof InjectedProps>) {
    const injectedProps = useInjectedProps();

    // Type assertion is necessary here because TypeScript can't prove the intersection
    const fullProps = { ...props, ...injectedProps } as T & InjectedProps;

    return <WrappedComponent {...fullProps} />;
  };
}
```

## Wrapping Up

`ComponentType` is the foundation that makes advanced React composition patterns possible in TypeScript. Whether you're building HOCs that enhance existing components, render prop components that provide flexible data access, or polymorphic components that adapt to different contexts, `ComponentType` ensures your code remains type-safe and your APIs stay intuitive.

The key is understanding that `ComponentType<Props>` represents "any component that accepts these props"—this simple concept unlocks powerful patterns for code reuse, composition, and flexibility. As React continues to evolve, these patterns provide stable, type-safe ways to build reusable component logic that works across any component type.

Start small—maybe enhance a single component with a simple HOC, then gradually explore more complex patterns as your needs grow. The investment in understanding these patterns pays dividends in component reusability and API design.
