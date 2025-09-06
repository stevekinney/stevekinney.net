---
title: Safer Context: Custom createContext and Hooks
description: No more maybe‑undefined context—return a typed hook and Provider tuple that never lies.
date: 2025-09-06T22:23:57.272Z
modified: 2025-09-06T22:23:57.272Z
published: true
tags: ['react', 'typescript', 'context', 'create-context', 'helpers', 'type-safety']
---

React Context is powerful, but the default `createContext` API leaves you with an uncomfortable truth: your context value might be `undefined` if someone forgets to wrap their component tree in a Provider. This leads to defensive programming, runtime checks, and the occasional late-night debugging session when you realize why your app is throwing errors in production.

Let's build some helper functions that give you bulletproof context with TypeScript—where the types guarantee your context is always available, and you never have to write another "context must be used within Provider" error again.

## The Problem with Default createContext

Here's what most developers reach for when creating typed context:

```typescript
import { createContext, useContext, ReactNode } from 'react';

interface UserContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ❌ The context value could be undefined
const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  // ... your state logic here
  const value: UserContextType = {
    user: currentUser,
    login,
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  // ❌ You have to remember this check everywhere
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
```

This pattern works, but it's brittle. Every custom hook needs that runtime check, TypeScript can't help you catch missing Providers at compile time, and you're always one forgotten Provider away from a runtime error.

## A Safer createContext Helper

Let's build a helper that eliminates these problems:

```typescript
import {
  createContext,
  useContext,
  Context,
  ReactNode
} from 'react';

/**
 * Creates a context that never returns undefined and provides a typed hook
 * @param displayName - Name for debugging and error messages
 * @returns Tuple of [hook, Provider component, raw context]
 */
export function createSafeContext<T>(displayName: string) {
  // ✅ No undefined in the type - we're confident about this
  const context = createContext<T | null>(null);

  if (process.env.NODE_ENV !== 'production') {
    context.displayName = displayName;
  }

  // ✅ Custom hook that guarantees a value
  function useContextHook(): T {
    const contextValue = useContext(context);

    if (contextValue === null) {
      throw new Error(
        `use${displayName} must be used within a ${displayName}Provider. ` +
        `Make sure your component is wrapped with <${displayName}Provider>.`
      );
    }

    return contextValue;
  }

  // ✅ Provider component that prevents null values
  function ContextProvider({
    children,
    value
  }: {
    children: ReactNode;
    value: T;
  }) {
    return (
      <context.Provider value={value}>
        {children}
      </context.Provider>
    );
  }

  // Set display names for better debugging
  if (process.env.NODE_ENV !== 'production') {
    useContextHook.displayName = `use${displayName}`;
    ContextProvider.displayName = `${displayName}Provider`;
  }

  return [useContextHook, ContextProvider, context] as const;
}
```

Now your context creation becomes clean and safe:

```typescript
interface UserContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ✅ Returns exactly what you need: hook, Provider, and raw context
const [useUser, UserProvider] = createSafeContext<UserContextType>('User');

// ✅ Your component logic stays focused on business logic
export function UserManager({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const user = await authApi.login(email, password);
    setCurrentUser(user);
  };

  const logout = () => {
    authApi.logout();
    setCurrentUser(null);
  };

  const value: UserContextType = {
    user: currentUser,
    login,
    logout,
  };

  return <UserProvider value={value}>{children}</UserProvider>;
}

// ✅ Components can use the hook without fear
function UserProfile() {
  const { user, logout } = useUser(); // Never undefined!

  if (!user) return <LoginPrompt />;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Advanced: Context with Actions Pattern

For more complex state, you might want separate contexts for state and actions (this prevents unnecessary re-renders when components only need to dispatch actions):

```typescript
/**
 * Creates separate state and actions contexts for performance optimization
 */
export function createStateActionContext<State, Actions>(
  displayName: string
) {
  const StateContext = createContext<State | null>(null);
  const ActionsContext = createContext<Actions | null>(null);

  if (process.env.NODE_ENV !== 'production') {
    StateContext.displayName = `${displayName}State`;
    ActionsContext.displayName = `${displayName}Actions`;
  }

  function useStateHook(): State {
    const state = useContext(StateContext);
    if (state === null) {
      throw new Error(
        `use${displayName}State must be used within a ${displayName}Provider`
      );
    }
    return state;
  }

  function useActionsHook(): Actions {
    const actions = useContext(ActionsContext);
    if (actions === null) {
      throw new Error(
        `use${displayName}Actions must be used within a ${displayName}Provider`
      );
    }
    return actions;
  }

  function Provider({
    children,
    state,
    actions,
  }: {
    children: ReactNode;
    state: State;
    actions: Actions;
  }) {
    return (
      <StateContext.Provider value={state}>
        <ActionsContext.Provider value={actions}>
          {children}
        </ActionsContext.Provider>
      </StateContext.Provider>
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    useStateHook.displayName = `use${displayName}State`;
    useActionsHook.displayName = `use${displayName}Actions`;
    Provider.displayName = `${displayName}Provider`;
  }

  return [useStateHook, useActionsHook, Provider] as const;
}
```

Here's how you'd use it with a todo list:

```typescript
interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  isLoading: boolean;
}

interface TodoActions {
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  setFilter: (filter: TodoState['filter']) => void;
}

const [useTodoState, useTodoActions, TodoProvider] =
  createStateActionContext<TodoState, TodoActions>('Todo');

export function TodoManager({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(todoReducer, {
    todos: [],
    filter: 'all',
    isLoading: false,
  });

  const actions: TodoActions = {
    addTodo: (text) => dispatch({ type: 'ADD_TODO', payload: { text } }),
    toggleTodo: (id) => dispatch({ type: 'TOGGLE_TODO', payload: { id } }),
    deleteTodo: (id) => dispatch({ type: 'DELETE_TODO', payload: { id } }),
    setFilter: (filter) => dispatch({ type: 'SET_FILTER', payload: { filter } }),
  };

  return (
    <TodoProvider state={state} actions={actions}>
      {children}
    </TodoProvider>
  );
}

// ✅ Components only re-render when their specific slice changes
function TodoFilters() {
  const { filter } = useTodoState(); // Only re-renders when filter changes
  const { setFilter } = useTodoActions(); // Never re-renders

  return (
    <div>
      {(['all', 'active', 'completed'] as const).map((filterOption) => (
        <button
          key={filterOption}
          onClick={() => setFilter(filterOption)}
          className={filter === filterOption ? 'active' : ''}
        >
          {filterOption}
        </button>
      ))}
    </div>
  );
}
```

## Runtime Validation with Zod

For extra safety, you can combine this pattern with runtime validation:

```typescript
import { z } from 'zod';

const UserContextSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }).nullable(),
  login: z.function(),
  logout: z.function(),
});

type UserContextType = z.infer<typeof UserContextSchema>;

export function createValidatedContext<T>(
  displayName: string,
  schema: z.ZodSchema<T>
) {
  const context = createContext<T | null>(null);

  function useContextHook(): T {
    const contextValue = useContext(context);

    if (contextValue === null) {
      throw new Error(
        `use${displayName} must be used within a ${displayName}Provider`
      );
    }

    // ✅ Runtime validation ensures the context value matches your schema
    const validationResult = schema.safeParse(contextValue);

    if (!validationResult.success) {
      console.error(`${displayName} context validation failed:`, validationResult.error);
      throw new Error(
        `${displayName} context value is invalid. Check the console for details.`
      );
    }

    return validationResult.data;
  }

  function ContextProvider({
    children,
    value
  }: {
    children: ReactNode;
    value: T;
  }) {
    return (
      <context.Provider value={value}>
        {children}
      </context.Provider>
    );
  }

  return [useContextHook, ContextProvider, context] as const;
}

// Usage with validation
const [useValidatedUser, ValidatedUserProvider] = createValidatedContext(
  'User',
  UserContextSchema
);
```

> [!WARNING]
> Runtime validation adds overhead, so use it judiciously. It's great during development and for contexts that receive data from external sources, but you might want to disable it in production builds.

## Real World Use Cases™

### Theme Context with System Preference Detection

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const [useTheme, ThemeProvider] = createSafeContext<ThemeContextType>('Theme');

export function ThemeManager({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
  };

  return <ThemeProvider value={value}>{children}</ThemeProvider>;
}

// Components can safely assume theme context exists
function ThemeToggle() {
  const { theme, setTheme } = useTheme(); // Never undefined!

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Toggle Theme
    </button>
  );
}
```

### Shopping Cart with Optimistic Updates

```typescript
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
  isUpdating: boolean;
}

interface CartActions {
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const [useCartState, useCartActions, CartProvider] =
  createStateActionContext<CartState, CartActions>('Cart');

// Usage in components
function CartBadge() {
  const { items } = useCartState(); // Only re-renders when items change
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return <Badge count={itemCount} />;
}

function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCartActions(); // Never re-renders

  return (
    <button onClick={() => addItem(product)}>
      Add to Cart
    </button>
  );
}
```

## Testing Your Safe Contexts

Testing becomes much cleaner when you're not dealing with undefined context values:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { UserProvider, useUser } from './UserContext';

function TestComponent() {
  const { user, logout } = useUser();

  return (
    <div>
      <div data-testid="user-name">{user?.name || 'No user'}</div>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

test('provides user context correctly', () => {
  const mockUser = { id: '1', name: 'Alice', email: 'alice@example.com' };
  const mockLogout = jest.fn();

  render(
    <UserProvider
      value={{
        user: mockUser,
        login: jest.fn(),
        logout: mockLogout
      }}
    >
      <TestComponent />
    </UserProvider>
  );

  expect(screen.getByTestId('user-name')).toHaveTextContent('Alice');

  fireEvent.click(screen.getByText('Logout'));
  expect(mockLogout).toHaveBeenCalledTimes(1);
});

test('throws helpful error when used outside provider', () => {
  // Use error boundary to catch the error
  expect(() => {
    render(<TestComponent />);
  }).toThrow('useUser must be used within a UserProvider');
});
```

## Performance Considerations

These helper functions add minimal overhead, but here are some tips for optimal performance:

### Provider Value Memoization

```typescript
export function OptimizedUserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // ✅ Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user: currentUser,
    login: async (email: string, password: string) => {
      const user = await authApi.login(email, password);
      setCurrentUser(user);
    },
    logout: () => {
      authApi.logout();
      setCurrentUser(null);
    },
  }), [currentUser]);

  return <UserProvider value={contextValue}>{children}</UserProvider>;
}
```

### Callback Stability

```typescript
export function StableCallbackProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // ✅ Stable callbacks don't cause unnecessary re-renders
  const login = useCallback(async (email: string, password: string) => {
    const user = await authApi.login(email, password);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <UserProvider value={value}>{children}</UserProvider>;
}
```

## Wrapping Up

Safe context helpers eliminate a whole class of React bugs while providing better developer ergonomics. The key benefits:

- **Type safety**: Context values are never undefined—TypeScript knows this
- **Better error messages**: Clear, actionable error messages when Providers are missing
- **Performance**: Separate state/actions contexts prevent unnecessary re-renders
- **Developer experience**: Less boilerplate, more focus on your actual logic
- **Runtime safety**: Optional validation ensures your context contracts hold

These patterns scale from simple theme toggles to complex application state management. They work especially well in design systems and component libraries where you want to provide foolproof APIs to other developers.

The investment in creating these helpers pays dividends as your application grows—you'll spend less time debugging context-related issues and more time building features that matter to your users.
