---
title: Typing Context and Selector Patterns
description: Create fully typed contexts—state/actions split, selectors that minimize re-renders, and ergonomic Provider APIs.
date: 2025-09-06T22:04:44.911Z
modified: 2025-09-06T22:04:44.911Z
published: true
tags: ['react', 'typescript', 'context', 'state-management', 'selectors', 'performance']
---

Context in React is like that friend who knows everyone at the party—incredibly useful for sharing data across your component tree, but without proper typing, it can become a source of runtime surprises and debugging headaches. Let's explore how to build fully typed contexts with TypeScript that not only prevent bugs but also provide excellent developer ergonomics through state/action patterns and performance-optimized selectors.

We'll cover everything from basic typed contexts to advanced patterns like selector-based contexts that minimize unnecessary re-renders, plus some Real World Use Cases™ where these patterns shine.

## The Basic Typed Context Pattern

Let's start with the foundation—a properly typed context that catches errors at compile time rather than runtime. Here's what most folks reach for first:

```typescript
import { createContext, useContext, ReactNode } from 'react';

// ✅ Define your context value type explicitly
interface UserContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ✅ Create context with undefined as default
const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  // Your state logic here...
  const value: UserContextType = {
    currentUser,
    isLoading,
    login,
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// ✅ Custom hook with runtime safety check
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
```

This pattern gives us type safety and runtime checks, but there's room for improvement. The main issue? Every component that uses `useUser()` will re-render whenever _any_ part of the context value changes, even if they only care about `currentUser.name`.

> [!TIP]
> Always create a custom hook for your context rather than exposing `useContext` directly. This lets you add runtime checks and encapsulate the context usage pattern.

## State and Actions Split Pattern

For more complex state, splitting your context into separate state and actions can improve both performance and maintainability. This pattern borrows ideas from Redux but keeps things simpler:

```typescript
import { createContext, useContext, useReducer, ReactNode } from 'react';

// ✅ Separate state and actions
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
  loadTodos: () => Promise<void>;
}

// ✅ Create separate contexts
const TodoStateContext = createContext<TodoState | undefined>(undefined);
const TodoActionsContext = createContext<TodoActions | undefined>(undefined);

// ✅ Reducer for state management
type TodoAction =
  | { type: 'ADD_TODO'; payload: { id: string; text: string } }
  | { type: 'TOGGLE_TODO'; payload: { id: string } }
  | { type: 'DELETE_TODO'; payload: { id: string } }
  | { type: 'SET_FILTER'; payload: { filter: TodoState['filter'] } }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean } }
  | { type: 'SET_TODOS'; payload: { todos: Todo[] } };

function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: action.payload.id,
            text: action.payload.text,
            completed: false,
            createdAt: new Date(),
          },
        ],
      };
    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === action.payload.id
            ? { ...todo, completed: !todo.completed }
            : todo
        ),
      };
    // ... other cases
    default:
      return state;
  }
}

export function TodoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(todoReducer, {
    todos: [],
    filter: 'all',
    isLoading: false,
  });

  // ✅ Actions that use the dispatch function
  const actions: TodoActions = {
    addTodo: (text: string) => {
      dispatch({
        type: 'ADD_TODO',
        payload: { id: crypto.randomUUID(), text },
      });
    },
    toggleTodo: (id: string) => {
      dispatch({ type: 'TOGGLE_TODO', payload: { id } });
    },
    deleteTodo: (id: string) => {
      dispatch({ type: 'DELETE_TODO', payload: { id } });
    },
    setFilter: (filter: TodoState['filter']) => {
      dispatch({ type: 'SET_FILTER', payload: { filter } });
    },
    loadTodos: async () => {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: true } });
      try {
        const todos = await fetchTodos();
        dispatch({ type: 'SET_TODOS', payload: { todos } });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
      }
    },
  };

  return (
    <TodoStateContext.Provider value={state}>
      <TodoActionsContext.Provider value={actions}>
        {children}
      </TodoActionsContext.Provider>
    </TodoStateContext.Provider>
  );
}

// ✅ Separate hooks for state and actions
export function useTodoState(): TodoState {
  const context = useContext(TodoStateContext);
  if (context === undefined) {
    throw new Error('useTodoState must be used within a TodoProvider');
  }
  return context;
}

export function useTodoActions(): TodoActions {
  const context = useContext(TodoActionsContext);
  if (context === undefined) {
    throw new Error('useTodoActions must be used within a TodoProvider');
  }
  return context;
}
```

This approach has several advantages:

- **Performance**: Components that only trigger actions don't re-render when state changes
- **Clarity**: The separation makes it obvious what's state vs. what's behavior
- **Testing**: You can test actions independently from the components that use them

## The Selector Pattern: Performance That Actually Matters

Here's where things get interesting. The selector pattern lets components subscribe only to the specific slices of state they care about, dramatically reducing unnecessary re-renders:

```typescript
import { createContext, useContext, useCallback, useSyncExternalStore } from 'react';

// ✅ State store with subscription capabilities
class AppStateStore {
  private state: AppState;
  private listeners = new Set<() => void>();

  constructor(initialState: AppState) {
    this.state = initialState;
  }

  getState = (): AppState => {
    return this.state;
  };

  setState = (newState: Partial<AppState>): void => {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((listener) => listener());
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

// ✅ Context that provides the store
const AppStateContext = createContext<AppStateStore | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const store = useMemo(
    () =>
      new AppStateStore({
        user: null,
        todos: [],
        theme: 'light',
        notifications: [],
        isLoading: false,
      }),
    []
  );

  return (
    <AppStateContext.Provider value={store}>
      {children}
    </AppStateContext.Provider>
  );
}

// ✅ Selector hook that prevents unnecessary re-renders
export function useAppState<T>(selector: (state: AppState) => T): T {
  const store = useContext(AppStateContext);
  if (!store) {
    throw new Error('useAppState must be used within AppStateProvider');
  }

  return useSyncExternalStore(
    store.subscribe,
    useCallback(() => selector(store.getState()), [selector, store])
  );
}

// ✅ Actions hook for state updates
export function useAppActions() {
  const store = useContext(AppStateContext);
  if (!store) {
    throw new Error('useAppActions must be used within AppStateProvider');
  }

  return {
    setUser: (user: User | null) => store.setState({ user }),
    addTodo: (todo: Todo) => {
      const currentState = store.getState();
      store.setState({ todos: [...currentState.todos, todo] });
    },
    setTheme: (theme: 'light' | 'dark') => store.setState({ theme }),
    setLoading: (isLoading: boolean) => store.setState({ isLoading }),
  };
}
```

Now components can subscribe to exactly what they need:

```typescript
// ✅ This component only re-renders when the user changes
function UserProfile() {
  const user = useAppState((state) => state.user);
  const { setUser } = useAppActions();

  if (!user) return <LoginPrompt />;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <button onClick={() => setUser(null)}>Logout</button>
    </div>
  );
}

// ✅ This component only re-renders when todos change
function TodoCount() {
  const todoCount = useAppState((state) => state.todos.length);
  const completedCount = useAppState((state) =>
    state.todos.filter(todo => todo.completed).length
  );

  return (
    <div>
      {completedCount} of {todoCount} completed
    </div>
  );
}

// ✅ This component only re-renders when theme changes
function ThemeToggle() {
  const theme = useAppState((state) => state.theme);
  const { setTheme } = useAppActions();

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Current theme: {theme}
    </button>
  );
}
```

> [!NOTE]
> The `useSyncExternalStore` hook is React 18's recommended way to subscribe to external stores. It handles the tricky bits of ensuring your selectors work correctly with React's concurrent features.

## Advanced Typing with Discriminated Unions

For even more type safety, you can use discriminated unions to ensure your context state is always in a valid configuration:

```typescript
// ✅ Use discriminated unions for complex state
type AuthState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'authenticated'; user: User }
  | { status: 'error'; error: string };

interface AppContextType {
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
}

// ✅ Type-safe state transitions
export function useAuth() {
  const { auth, setAuth } = useAppContext();

  const login = async (credentials: LoginCredentials) => {
    setAuth({ status: 'loading' });
    try {
      const user = await authApi.login(credentials);
      setAuth({ status: 'authenticated', user });
    } catch (error) {
      setAuth({
        status: 'error',
        error: error instanceof Error ? error.message : 'Login failed'
      });
    }
  };

  const logout = () => {
    setAuth({ status: 'idle' });
  };

  return { auth, login, logout };
}

// ✅ Components get full type narrowing
function AuthenticatedApp() {
  const { auth } = useAuth();

  switch (auth.status) {
    case 'idle':
      return <LoginForm />;
    case 'loading':
      return <LoadingSpinner />;
    case 'authenticated':
      // TypeScript knows auth.user exists here!
      return <Dashboard user={auth.user} />;
    case 'error':
      // TypeScript knows auth.error exists here!
      return <ErrorMessage error={auth.error} />;
  }
}
```

## Real World Use Cases™

Here are some scenarios where these patterns really shine:

### 1. Shopping Cart with Performance Optimization

```typescript
// Separate contexts for cart data and UI state
const CartDataContext = createContext<CartState | undefined>(undefined);
const CartUIContext = createContext<CartUIActions | undefined>(undefined);

// Components that show cart count don't re-render when UI state changes
function CartBadge() {
  const itemCount = useCartData(state => state.items.length);
  return <Badge count={itemCount} />;
}

// Cart drawer only re-renders when UI state changes
function CartDrawer() {
  const isOpen = useCartUI(state => state.isDrawerOpen);
  const { closeDrawer } = useCartActions();

  return <Drawer isOpen={isOpen} onClose={closeDrawer} />;
}
```

### 2. Multi-Step Form with Validation State

```typescript
type FormState = {
  currentStep: number;
  formData: Partial<RegistrationData>;
  validation: ValidationErrors;
  isSubmitting: boolean;
};

// Each step component only subscribes to its relevant data
function PersonalInfoStep() {
  const personalInfo = useFormState((state) => state.formData.personalInfo);
  const errors = useFormState((state) => state.validation.personalInfo);

  // Component only re-renders when personal info or its validation changes
}
```

### 3. Real-Time Dashboard

```typescript
// Dashboard components can subscribe to specific metrics
function MetricCard({ metric }: { metric: keyof DashboardMetrics }) {
  const value = useDashboardState(state => state.metrics[metric]);
  const isLoading = useDashboardState(state => state.loading[metric]);

  // Only re-renders when this specific metric changes
  return <Card value={value} loading={isLoading} />;
}
```

## Performance Gotchas and How to Avoid Them

When implementing these patterns, watch out for these common pitfalls:

### Selector Reference Equality

```typescript
// ❌ This creates a new array on every selector call
function TodoList() {
  const activeTodos = useAppState((state) => state.todos.filter((todo) => !todo.completed));
  // This will cause re-renders even when the actual active todos haven't changed
}

// ✅ Use useMemo for expensive computations
function TodoList() {
  const todos = useAppState((state) => state.todos);
  const activeTodos = useMemo(() => todos.filter((todo) => !todo.completed), [todos]);
}

// ✅ Or move the memoization into a custom selector
function useActiveTodos() {
  return useAppState(useCallback((state) => state.todos.filter((todo) => !todo.completed), []));
}
```

### Context Provider Re-creation

```typescript
// ❌ This creates a new context value object on every render
function AppProvider({ children }) {
  const [state, setState] = useState(initialState);

  return (
    <AppContext.Provider value={{ state, setState }}>
      {children}
    </AppContext.Provider>
  );
}

// ✅ Memoize the context value
function AppProvider({ children }) {
  const [state, setState] = useState(initialState);

  const contextValue = useMemo(
    () => ({ state, setState }),
    [state]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
```

## Testing Your Typed Contexts

Testing contexts becomes much easier with proper TypeScript patterns:

```typescript
import { render, screen } from '@testing-library/react';
import { TodoProvider, useTodoState, useTodoActions } from './TodoContext';

// ✅ Create test wrapper
function TestComponent() {
  const { todos, isLoading } = useTodoState();
  const { addTodo } = useTodoActions();

  return (
    <div>
      <div data-testid="todo-count">{todos.length}</div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <button onClick={() => addTodo('New todo')}>Add Todo</button>
    </div>
  );
}

test('adds todo correctly', async () => {
  render(
    <TodoProvider>
      <TestComponent />
    </TodoProvider>
  );

  expect(screen.getByTestId('todo-count')).toHaveTextContent('0');

  fireEvent.click(screen.getByText('Add Todo'));

  expect(screen.getByTestId('todo-count')).toHaveTextContent('1');
});

// ✅ Test context hooks in isolation
test('useTodoActions provides expected methods', () => {
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <TodoProvider>{children}</TodoProvider>
  );

  const { result } = renderHook(() => useTodoActions(), {
    wrapper: TestWrapper,
  });

  expect(typeof result.current.addTodo).toBe('function');
  expect(typeof result.current.toggleTodo).toBe('function');
  expect(typeof result.current.deleteTodo).toBe('function');
});
```

## Wrapping Up

Typed contexts with selector patterns give you the best of both worlds: the simplicity of React Context with the performance characteristics of more sophisticated state management solutions. The key insights:

- **Split state and actions** for better performance and maintainability
- **Use selectors** to minimize re-renders and subscribe only to needed data
- **Leverage discriminated unions** for type-safe state transitions
- **Create custom hooks** that encapsulate context usage and provide runtime safety
- **Test contexts thoroughly** to ensure your type contracts hold at runtime

These patterns might feel like overkill for simple cases (and they probably are—use `useState` for local component state!), but when you're managing complex application state that needs to be shared across many components, they'll save you from both performance headaches and late-night debugging sessions.

The patterns we've covered here scale well from medium-sized applications to large enterprise codebases, and they play nicely with other tools in the React ecosystem. Your future self (and your teammates) will thank you for the compile-time safety and runtime performance these approaches provide.
