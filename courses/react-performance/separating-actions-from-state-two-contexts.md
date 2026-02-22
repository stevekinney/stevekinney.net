---
title: Separating Actions from State with Two Contexts
description: >-
  Split read and write paths. Pass immutable state and stable actions to cut
  re-renders and improve testability.
date: 2025-09-06T21:51:43.345Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - context
  - state-management
---

React Context is powerful for sharing state across components, but it comes with a performance trap that catches most of us at some point: every time the context value changes, every consumer re-renders. This becomes particularly painful when you're passing both state and the functions to update that state through the same context—because creating those updater functions inline means the context value changes on every render, even when the actual state hasn't.

The solution? Split your contexts. Put your state in one context and your actions in another. This way, components that only need to read state won't re-render when action functions are recreated, and components that only need to dispatch actions won't re-render when state changes. Let's explore how to implement this pattern effectively.

## The Problem with Single Context

Here's what most of us do first—and why it hurts performance:

```tsx
// ❌ The performance trap
const TodoContext = createContext<{
  todos: Todo[];
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
} | null>(null);

function TodoProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>([]);

  // These functions are recreated on every render
  const addTodo = (text: string) => {
    setTodos((prev) => [...prev, { id: crypto.randomUUID(), text, completed: false }]);
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  // This value object is recreated on every render
  const value = { todos, addTodo, toggleTodo, deleteTodo };

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}
```

Every time `TodoProvider` renders—which happens whenever `todos` changes—new function references are created for `addTodo`, `toggleTodo`, and `deleteTodo`. Since the entire `value` object is also recreated, every component consuming this context will re-render, even if they only care about reading the current todos and don't need the action functions.

## The Two-Context Solution

Let's split this into separate contexts for state and actions:

```tsx
// ✅ Split contexts for better performance
const TodoStateContext = createContext<Todo[]>([]);
const TodoActionsContext = createContext<{
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
} | null>(null);

function TodoProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>([]);

  // Memoize actions so they have stable references
  const actions = useMemo(
    () => ({
      addTodo: (text: string) => {
        setTodos((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            text,
            completed: false,
          },
        ]);
      },

      toggleTodo: (id: string) => {
        setTodos((prev) =>
          prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
        );
      },

      deleteTodo: (id: string) => {
        setTodos((prev) => prev.filter((todo) => todo.id !== id));
      },
    }),
    [],
  ); // Empty dependency array since we only use setTodos

  return (
    <TodoStateContext.Provider value={todos}>
      <TodoActionsContext.Provider value={actions}>{children}</TodoActionsContext.Provider>
    </TodoStateContext.Provider>
  );
}
```

Now when the todos array changes, only components subscribed to `TodoStateContext` will re-render. Components that only need to dispatch actions stay untouched.

## Custom Hooks for Clean API

Wrap the context consumption in custom hooks to provide a cleaner API and better error handling:

```tsx
function useTodos() {
  const todos = useContext(TodoStateContext);
  if (todos === undefined) {
    throw new Error('useTodos must be used within a TodoProvider');
  }
  return todos;
}

function useTodoActions() {
  const actions = useContext(TodoActionsContext);
  if (!actions) {
    throw new Error('useTodoActions must be used within a TodoProvider');
  }
  return actions;
}

// Convenience hook for components that need both
function useTodosWithActions() {
  return {
    todos: useTodos(),
    actions: useTodoActions(),
  };
}
```

## Using the Split Contexts

Now your components can be more selective about what they subscribe to:

```tsx
// ✅ Only re-renders when todos array changes
function TodoList() {
  const todos = useTodos(); // Only subscribes to state

  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}

// ✅ Only re-renders when its own todo prop changes
function TodoItem({ todo }: { todo: Todo }) {
  const { toggleTodo, deleteTodo } = useTodoActions(); // Only subscribes to actions

  return (
    <li>
      <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
      <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>{todo.text}</span>
      <button onClick={() => deleteTodo(todo.id)}>Delete</button>
    </li>
  );
}

// ✅ Never re-renders after mount (stable action references)
function AddTodoForm() {
  const { addTodo } = useTodoActions();
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      addTodo(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a todo..." />
      <button type="submit">Add</button>
    </form>
  );
}
```

Notice how `TodoItem` and `AddTodoForm` never re-render when the todos array changes—they only care about the actions. Meanwhile, `TodoList` re-renders when todos change but isn't affected by action function recreation.

## Advanced Pattern: `useReducer` Alternative

For more complex state management, you can combine this pattern with `useReducer` for even more predictable updates:

```tsx
type TodoAction =
  | { type: 'ADD_TODO'; text: string }
  | { type: 'TOGGLE_TODO'; id: string }
  | { type: 'DELETE_TODO'; id: string };

function todoReducer(state: Todo[], action: TodoAction): Todo[] {
  switch (action.type) {
    case 'ADD_TODO':
      return [
        ...state,
        {
          id: crypto.randomUUID(),
          text: action.text,
          completed: false,
        },
      ];

    case 'TOGGLE_TODO':
      return state.map((todo) =>
        todo.id === action.id ? { ...todo, completed: !todo.completed } : todo,
      );

    case 'DELETE_TODO':
      return state.filter((todo) => todo.id !== action.id);

    default:
      return state;
  }
}

function TodoProvider({ children }: { children: React.ReactNode }) {
  const [todos, dispatch] = useReducer(todoReducer, []);

  // Actions stay completely stable across renders
  const actions = useMemo(
    () => ({
      addTodo: (text: string) => dispatch({ type: 'ADD_TODO', text }),
      toggleTodo: (id: string) => dispatch({ type: 'TOGGLE_TODO', id }),
      deleteTodo: (id: string) => dispatch({ type: 'DELETE_TODO', id }),
    }),
    [],
  );

  return (
    <TodoStateContext.Provider value={todos}>
      <TodoActionsContext.Provider value={actions}>{children}</TodoActionsContext.Provider>
    </TodoStateContext.Provider>
  );
}
```

With `useReducer`, the `dispatch` function reference is always stable, so your memoized actions object never needs to change—making this approach even more performance-friendly.

## Real-World Example: User Authentication

Here's how this pattern looks with a more complex, realistic example:

```tsx
interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: User }
  | { type: 'LOGIN_ERROR'; error: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const AuthStateContext = createContext<AuthState | undefined>(undefined);
const AuthActionsContext = createContext<{
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
} | null>(null);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { user: action.user, loading: false, error: null };
    case 'LOGIN_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'LOGOUT':
      return { user: null, loading: false, error: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: false,
    error: null,
  });

  const actions = useMemo(
    () => ({
      login: async (email: string, password: string) => {
        dispatch({ type: 'LOGIN_START' });
        try {
          const user = await authenticateUser(email, password);
          dispatch({ type: 'LOGIN_SUCCESS', user });
        } catch (error) {
          dispatch({
            type: 'LOGIN_ERROR',
            error: error instanceof Error ? error.message : 'Login failed',
          });
        }
      },

      logout: () => {
        dispatch({ type: 'LOGOUT' });
      },

      clearError: () => {
        dispatch({ type: 'CLEAR_ERROR' });
      },
    }),
    [],
  );

  return (
    <AuthStateContext.Provider value={state}>
      <AuthActionsContext.Provider value={actions}>{children}</AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
}

// Custom hooks
function useAuthState() {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within an AuthProvider');
  }
  return context;
}

function useAuthActions() {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error('useAuthActions must be used within an AuthProvider');
  }
  return context;
}
```

Now components can be surgical about what they subscribe to:

```tsx
// ✅ Only re-renders when auth state changes
function UserProfile() {
  const { user, loading } = useAuthState();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>{user.email}</p>
    </div>
  );
}

// ✅ Never re-renders after mount
function LoginForm() {
  const { login } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Log In</button>
    </form>
  );
}
```

## Testing Benefits

One underappreciated benefit of this pattern is how much easier it makes testing. You can test your state logic and action logic independently:

```tsx
// Test state transformations in isolation
describe('todoReducer', () => {
  it('adds a todo', () => {
    const initialState: Todo[] = [];
    const action = { type: 'ADD_TODO', text: 'Learn React' } as const;
    const newState = todoReducer(initialState, action);

    expect(newState).toHaveLength(1);
    expect(newState[0].text).toBe('Learn React');
    expect(newState[0].completed).toBe(false);
  });

  it('toggles a todo', () => {
    const initialState: Todo[] = [{ id: '1', text: 'Learn React', completed: false }];
    const action = { type: 'TOGGLE_TODO', id: '1' } as const;
    const newState = todoReducer(initialState, action);

    expect(newState[0].completed).toBe(true);
  });
});

// Test components with mock contexts
const MockTodoProvider = ({
  children,
  todos = [],
}: {
  children: React.ReactNode;
  todos?: Todo[];
}) => {
  const mockActions = {
    addTodo: vi.fn(),
    toggleTodo: vi.fn(),
    deleteTodo: vi.fn(),
  };

  return (
    <TodoStateContext.Provider value={todos}>
      <TodoActionsContext.Provider value={mockActions}>{children}</TodoActionsContext.Provider>
    </TodoStateContext.Provider>
  );
};

test('TodoList renders todos', () => {
  const todos = [
    { id: '1', text: 'Learn React', completed: false },
    { id: '2', text: 'Build an app', completed: true },
  ];

  render(
    <MockTodoProvider todos={todos}>
      <TodoList />
    </MockTodoProvider>,
  );

  expect(screen.getByText('Learn React')).toBeInTheDocument();
  expect(screen.getByText('Build an app')).toBeInTheDocument();
});
```

## When to Use This Pattern

This two-context pattern shines when:

- **You have many consumers**: Multiple components need either state or actions (but not necessarily both)
- **Frequent state updates**: Your state changes often and you want to minimize re-renders
- **Complex action logic**: Your actions involve async operations or complex state transformations
- **Performance is critical**: You're optimizing for minimal re-renders in a large component tree

It might be overkill for:

- **Simple, infrequent state**: A toggle that changes once in a while doesn't need this complexity
- **Small component trees**: If you only have a few components, the performance benefit isn't worth the extra code
- **State and actions are always used together**: If every component needs both reading and writing capabilities

## Tradeoffs to Consider

**Pros:**

- Surgical re-renders: Components only update when their specific dependencies change
- Stable action references: Action functions don't cause unnecessary re-renders
- Better testability: State logic and actions can be tested independently
- Clear separation of concerns: Read and write paths are explicitly separate

**Cons:**

- More boilerplate: You need separate contexts, providers, and hooks
- Slightly more complex mental model: Developers need to understand the split
- Potential over-engineering: Can be overkill for simple state scenarios
