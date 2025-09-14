---
title: From Passing Dispatch to Context
description: Stop prop drilling—introduce a typed Context and migrate dispatch to a Provider with safety.
date: 2025-09-06T22:23:57.270Z
modified: 2025-09-06T22:23:57.270Z
published: true
tags: ['react', 'typescript', 'dispatch', 'context', 'state-management', 'reducers']
---

You've built a reasonably sized React application with TypeScript, and somewhere along the way, you started passing dispatch functions down through multiple component layers. Maybe it started innocently enough—just passing `dispatch` from your `useReducer` down one level. But now you're threading it through four components that don't even need it, just so it can reach the component that actually does.

We're going to walk through the refactoring journey from prop-drilled dispatch functions to a clean, typed Context-based solution. You'll learn how to migrate safely, maintain type safety throughout, and avoid the common pitfalls that make developers curse Context APIs.

## The Problem: Dispatch Prop Drilling in Action

Here's a typical scenario that grows organically in React applications. You start with a `useReducer` in your main component and need to pass the dispatch function down to deeply nested components:

```tsx
// Types for our todo application
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

type TodoAction =
  | { type: 'ADD_TODO'; payload: { text: string; priority: Todo['priority'] } }
  | { type: 'TOGGLE_TODO'; payload: { id: string } }
  | { type: 'DELETE_TODO'; payload: { id: string } }
  | { type: 'SET_PRIORITY'; payload: { id: string; priority: Todo['priority'] } };

// ❌ The problematic pattern - prop drilling dispatch everywhere
function App() {
  const [todos, dispatch] = useReducer(todoReducer, []);

  return (
    <div>
      <Header dispatch={dispatch} />
      <MainContent todos={todos} dispatch={dispatch} />
      <Sidebar dispatch={dispatch} />
    </div>
  );
}

function MainContent({ todos, dispatch }: { todos: Todo[]; dispatch: Dispatch<TodoAction> }) {
  return (
    <div>
      <TodoList todos={todos} dispatch={dispatch} />
      <TodoStats todos={todos} />
    </div>
  );
}

function TodoList({ todos, dispatch }: { todos: Todo[]; dispatch: Dispatch<TodoAction> }) {
  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} dispatch={dispatch} />
      ))}
    </ul>
  );
}

// Finally! The component that actually needs dispatch
function TodoItem({ todo, dispatch }: { todo: Todo; dispatch: Dispatch<TodoAction> }) {
  return (
    <li>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => dispatch({ type: 'TOGGLE_TODO', payload: { id: todo.id } })}
      />
      <span>{todo.text}</span>
      <button onClick={() => dispatch({ type: 'DELETE_TODO', payload: { id: todo.id } })}>
        Delete
      </button>
    </li>
  );
}
```

Notice how `MainContent` and `TodoList` don't actually _use_ the dispatch function—they're just passing it along like a hot potato. This is the classic prop drilling problem, and it gets worse as your component tree grows.

> [!WARNING]
> Prop drilling dispatch functions creates tight coupling between components and makes refactoring painful. Moving a component that needs dispatch becomes a major surgery involving every component in the tree.

## Step 1: Create Your Typed Context

The first step in our migration is creating a properly typed Context. We'll start by extracting our state and dispatch types, then creating the Context structure:

```tsx
import { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';

// ✅ First, centralize your action types
export type TodoAction =
  | { type: 'ADD_TODO'; payload: { text: string; priority: Todo['priority'] } }
  | { type: 'TOGGLE_TODO'; payload: { id: string } }
  | { type: 'DELETE_TODO'; payload: { id: string } }
  | { type: 'SET_PRIORITY'; payload: { id: string; priority: Todo['priority'] } };

// ✅ Define what our context will provide
interface TodoContextValue {
  todos: Todo[];
  dispatch: Dispatch<TodoAction>;
}

// ✅ Create context with undefined as default
const TodoContext = createContext<TodoContextValue | undefined>(undefined);

// ✅ Custom hook with runtime safety
export function useTodoContext(): TodoContextValue {
  const context = useContext(TodoContext);
  if (context === undefined) {
    throw new Error('useTodoContext must be used within a TodoProvider');
  }
  return context;
}
```

This gives us a typed context with runtime safety. The `undefined` default value forces us to provide a custom hook that checks if we're actually inside a provider.

> [!TIP]
> Always use `undefined` as your context default value and provide a custom hook. This prevents accidentally using the context outside a provider, which would silently fail with a default object.

## Step 2: Implement the Provider

Now let's create the Provider component that will replace our prop drilling. The key insight is that this Provider should encapsulate all the state management logic:

```tsx
interface TodoProviderProps {
  children: ReactNode;
  initialTodos?: Todo[];
}

export function TodoProvider({ children, initialTodos = [] }: TodoProviderProps) {
  const [todos, dispatch] = useReducer(todoReducer, initialTodos);

  // ✅ Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ todos, dispatch }), [todos]);

  return <TodoContext.Provider value={contextValue}>{children}</TodoContext.Provider>;
}

// ✅ Your reducer stays the same
function todoReducer(state: Todo[], action: TodoAction): Todo[] {
  switch (action.type) {
    case 'ADD_TODO':
      return [
        ...state,
        {
          id: crypto.randomUUID(),
          text: action.payload.text,
          priority: action.payload.priority,
          completed: false,
        },
      ];
    case 'TOGGLE_TODO':
      return state.map((todo) =>
        todo.id === action.payload.id ? { ...todo, completed: !todo.completed } : todo,
      );
    case 'DELETE_TODO':
      return state.filter((todo) => todo.id !== action.payload.id);
    case 'SET_PRIORITY':
      return state.map((todo) =>
        todo.id === action.payload.id ? { ...todo, priority: action.payload.priority } : todo,
      );
    default:
      return state;
  }
}
```

Notice that we're using `useMemo` for the context value. This is crucial—without it, every render would create a new object, causing all consuming components to re-render unnecessarily.

## Step 3: Gradual Migration Strategy

Here's the beauty of this approach: you can migrate component by component without breaking anything. Start from the deepest components and work your way up:

```tsx
// ✅ Step 3a: First, wrap your app with the provider
function App() {
  return (
    <TodoProvider>
      <div>
        <Header />
        <MainContent />
        <Sidebar />
      </div>
    </TodoProvider>
  );
}

// ✅ Step 3b: Update the leaf components first
function TodoItem({ todo }: { todo: Todo }) {
  const { dispatch } = useTodoContext();

  return (
    <li>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => dispatch({ type: 'TOGGLE_TODO', payload: { id: todo.id } })}
      />
      <span>{todo.text}</span>
      <button onClick={() => dispatch({ type: 'DELETE_TODO', payload: { id: todo.id } })}>
        Delete
      </button>
    </li>
  );
}

// ✅ Step 3c: Remove props from parent components
function TodoList() {
  const { todos } = useTodoContext();

  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}

// ✅ Step 3d: Clean up intermediate components
function MainContent() {
  const { todos } = useTodoContext();

  return (
    <div>
      <TodoList />
      <TodoStats todos={todos} />
    </div>
  );
}
```

The migration is gradual and safe—you can deploy after each step without breaking existing functionality.

> [!NOTE]
> Start migrating from the leaf components (the ones that actually use dispatch) and work your way up. This ensures you always have a working application during the migration.

## Step 4: Enhanced Patterns for Better Ergonomics

Once you have the basic context working, you can enhance it with more ergonomic patterns. One common improvement is separating your dispatch into semantic action creators:

```tsx
// ✅ Create action creators for better developer experience
export function useTodoActions() {
  const { dispatch } = useTodoContext();

  return useMemo(
    () => ({
      addTodo: (text: string, priority: Todo['priority']) => {
        dispatch({ type: 'ADD_TODO', payload: { text, priority } });
      },
      toggleTodo: (id: string) => {
        dispatch({ type: 'TOGGLE_TODO', payload: { id } });
      },
      deleteTodo: (id: string) => {
        dispatch({ type: 'DELETE_TODO', payload: { id } });
      },
      setPriority: (id: string, priority: Todo['priority']) => {
        dispatch({ type: 'SET_PRIORITY', payload: { id, priority } });
      },
    }),
    [dispatch],
  );
}

// ✅ Now your components become much cleaner
function TodoItem({ todo }: { todo: Todo }) {
  const { toggleTodo, deleteTodo } = useTodoActions();

  return (
    <li>
      <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
      <span>{todo.text}</span>
      <button onClick={() => deleteTodo(todo.id)}>Delete</button>
    </li>
  );
}

function AddTodoForm() {
  const { addTodo } = useTodoActions();
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Todo['priority']>('medium');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      addTodo(text.trim(), priority);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a todo..." />
      <select value={priority} onChange={(e) => setPriority(e.target.value as Todo['priority'])}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <button type="submit">Add</button>
    </form>
  );
}
```

This pattern gives you several benefits:

- **Better autocomplete**: Your IDE can suggest `addTodo` instead of making you remember the exact action shape
- **Type safety**: TypeScript ensures you're passing the right parameters
- **Easier refactoring**: Change the action shape in one place rather than throughout your components

## Step 5: Advanced Type Safety with Action Builders

For even better type safety, you can create action builders that ensure your actions are always well-formed:

```tsx
// ✅ Action builders with full type safety
export const todoActions = {
  addTodo: (text: string, priority: Todo['priority']): TodoAction => ({
    type: 'ADD_TODO',
    payload: { text, priority },
  }),
  toggleTodo: (id: string): TodoAction => ({
    type: 'TOGGLE_TODO',
    payload: { id },
  }),
  deleteTodo: (id: string): TodoAction => ({
    type: 'DELETE_TODO',
    payload: { id },
  }),
  setPriority: (id: string, priority: Todo['priority']): TodoAction => ({
    type: 'SET_PRIORITY',
    payload: { id, priority },
  }),
} as const;

// ✅ Enhanced actions hook using builders
export function useTodoActions() {
  const { dispatch } = useTodoContext();

  return useMemo(
    () => ({
      addTodo: (text: string, priority: Todo['priority']) =>
        dispatch(todoActions.addTodo(text, priority)),
      toggleTodo: (id: string) => dispatch(todoActions.toggleTodo(id)),
      deleteTodo: (id: string) => dispatch(todoActions.deleteTodo(id)),
      setPriority: (id: string, priority: Todo['priority']) =>
        dispatch(todoActions.setPriority(id, priority)),
    }),
    [dispatch],
  );
}
```

This approach makes testing easier too—you can test your action builders independently from your components:

```tsx
// ✅ Easy to test action builders
import { todoActions } from './TodoContext';

describe('todoActions', () => {
  test('addTodo creates correct action', () => {
    const action = todoActions.addTodo('Buy groceries', 'high');
    expect(action).toEqual({
      type: 'ADD_TODO',
      payload: { text: 'Buy groceries', priority: 'high' },
    });
  });

  test('toggleTodo creates correct action', () => {
    const action = todoActions.toggleTodo('todo-123');
    expect(action).toEqual({
      type: 'TOGGLE_TODO',
      payload: { id: 'todo-123' },
    });
  });
});
```

## Real World Migration Example: Form State Management

Here's a more complex example showing how to migrate form state management from prop drilling to context. This pattern is especially useful for multi-step forms or wizards:

```tsx
// Before: Prop drilling form dispatch through multiple steps
interface RegistrationFormState {
  currentStep: number;
  userData: {
    personalInfo?: PersonalInfo;
    accountDetails?: AccountDetails;
    preferences?: UserPreferences;
  };
  validation: {
    personalInfo?: ValidationErrors;
    accountDetails?: ValidationErrors;
    preferences?: ValidationErrors;
  };
  isSubmitting: boolean;
}

type FormAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'UPDATE_PERSONAL_INFO'; payload: PersonalInfo }
  | { type: 'UPDATE_ACCOUNT_DETAILS'; payload: AccountDetails }
  | { type: 'UPDATE_PREFERENCES'; payload: UserPreferences }
  | { type: 'SET_VALIDATION_ERRORS'; payload: { step: string; errors: ValidationErrors } }
  | { type: 'SET_SUBMITTING'; payload: boolean };

// ✅ After: Clean context-based approach
const RegistrationContext = createContext<
  | {
      state: RegistrationFormState;
      dispatch: Dispatch<FormAction>;
    }
  | undefined
>(undefined);

export function useRegistrationForm() {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistrationForm must be used within RegistrationProvider');
  }
  return context;
}

export function useRegistrationActions() {
  const { dispatch } = useRegistrationForm();

  return useMemo(
    () => ({
      nextStep: () => dispatch({ type: 'NEXT_STEP' }),
      prevStep: () => dispatch({ type: 'PREV_STEP' }),
      updatePersonalInfo: (info: PersonalInfo) =>
        dispatch({ type: 'UPDATE_PERSONAL_INFO', payload: info }),
      updateAccountDetails: (details: AccountDetails) =>
        dispatch({ type: 'UPDATE_ACCOUNT_DETAILS', payload: details }),
      updatePreferences: (prefs: UserPreferences) =>
        dispatch({ type: 'UPDATE_PREFERENCES', payload: prefs }),
      setValidationErrors: (step: string, errors: ValidationErrors) =>
        dispatch({ type: 'SET_VALIDATION_ERRORS', payload: { step, errors } }),
      setSubmitting: (isSubmitting: boolean) =>
        dispatch({ type: 'SET_SUBMITTING', payload: isSubmitting }),
    }),
    [dispatch],
  );
}

// ✅ Now form steps are clean and focused
function PersonalInfoStep() {
  const { state } = useRegistrationForm();
  const { updatePersonalInfo, nextStep } = useRegistrationActions();

  // Only concerned with personal info, no prop drilling needed
  const handleSubmit = (data: PersonalInfo) => {
    updatePersonalInfo(data);
    nextStep();
  };

  return <PersonalInfoForm onSubmit={handleSubmit} data={state.userData.personalInfo} />;
}
```

## Performance Considerations and Gotchas

When migrating from prop drilling to context, be aware of these performance implications:

### Context Value Memoization

```tsx
// ❌ This causes all consumers to re-render on every provider render
function TodoProvider({ children }: { children: ReactNode }) {
  const [todos, dispatch] = useReducer(todoReducer, []);

  return <TodoContext.Provider value={{ todos, dispatch }}>{children}</TodoContext.Provider>;
}

// ✅ Memoize the context value
function TodoProvider({ children }: { children: ReactNode }) {
  const [todos, dispatch] = useReducer(todoReducer, []);

  const contextValue = useMemo(
    () => ({ todos, dispatch }),
    [todos, dispatch], // dispatch is stable from useReducer
  );

  return <TodoContext.Provider value={contextValue}>{children}</TodoContext.Provider>;
}
```

### Selective Context Subscriptions

For better performance with large state objects, consider splitting your context:

```tsx
// ✅ Split state and actions for better performance
const TodoStateContext = createContext<Todo[] | undefined>(undefined);
const TodoDispatchContext = createContext<Dispatch<TodoAction> | undefined>(undefined);

export function useTodoState() {
  const context = useContext(TodoStateContext);
  if (context === undefined) {
    throw new Error('useTodoState must be used within TodoProvider');
  }
  return context;
}

export function useTodoDispatch() {
  const context = useContext(TodoDispatchContext);
  if (context === undefined) {
    throw new Error('useTodoDispatch must be used within TodoProvider');
  }
  return context;
}

// Components that only dispatch actions won't re-render when state changes
function AddTodoButton() {
  const dispatch = useTodoDispatch();
  return (
    <button onClick={() => dispatch(todoActions.addTodo('New todo', 'medium'))}>Add Todo</button>
  );
}
```

## Testing Your Context Migration

Proper testing becomes more straightforward after the migration:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TodoProvider, useTodoActions, useTodoState } from './TodoContext';

// ✅ Test wrapper for components that use context
function TestWrapper({ children }: { children: ReactNode }) {
  return <TodoProvider>{children}</TodoProvider>;
}

// ✅ Test component that exercises the context
function TestComponent() {
  const todos = useTodoState();
  const { addTodo, toggleTodo } = useTodoActions();

  return (
    <div>
      <span data-testid="todo-count">{todos.length}</span>
      <button onClick={() => addTodo('Test todo', 'high')}>Add Todo</button>
      {todos.map((todo) => (
        <div key={todo.id}>
          <span data-testid={`todo-${todo.id}`}>{todo.text}</span>
          <button onClick={() => toggleTodo(todo.id)}>Toggle</button>
        </div>
      ))}
    </div>
  );
}

test('context works correctly', () => {
  render(<TestComponent />, { wrapper: TestWrapper });

  expect(screen.getByTestId('todo-count')).toHaveTextContent('0');

  fireEvent.click(screen.getByText('Add Todo'));

  expect(screen.getByTestId('todo-count')).toHaveTextContent('1');
  expect(screen.getByText('Test todo')).toBeInTheDocument();
});

// ✅ Test hooks in isolation using renderHook
import { renderHook, act } from '@testing-library/react';

test('useTodoActions provides expected interface', () => {
  const { result } = renderHook(() => useTodoActions(), {
    wrapper: TestWrapper,
  });

  expect(typeof result.current.addTodo).toBe('function');
  expect(typeof result.current.toggleTodo).toBe('function');
  expect(typeof result.current.deleteTodo).toBe('function');
  expect(typeof result.current.setPriority).toBe('function');
});
```

## Common Migration Pitfalls and Solutions

### Pitfall 1: Forgetting to Memoize Action Creators

```tsx
// ❌ This causes infinite re-renders
function useTodoActions() {
  const { dispatch } = useTodoContext();

  return {
    addTodo: (text: string, priority: Todo['priority']) => {
      dispatch({ type: 'ADD_TODO', payload: { text, priority } });
    },
    // ... other actions
  };
}

// ✅ Memoize action creators
function useTodoActions() {
  const { dispatch } = useTodoContext();

  return useMemo(
    () => ({
      addTodo: (text: string, priority: Todo['priority']) => {
        dispatch({ type: 'ADD_TODO', payload: { text, priority } });
      },
      // ... other actions
    }),
    [dispatch],
  );
}
```

### Pitfall 2: Context Provider Placement

```tsx
// ❌ Provider too low in the tree
function App() {
  return (
    <div>
      <Header /> {/* This can't access TodoContext */}
      <main>
        <TodoProvider>
          <TodoList />
        </TodoProvider>
      </main>
    </div>
  );
}

// ✅ Provider at the right level
function App() {
  return (
    <TodoProvider>
      <div>
        <Header /> {/* Now this can access TodoContext if needed */}
        <main>
          <TodoList />
        </main>
      </div>
    </TodoProvider>
  );
}
```

### Pitfall 3: Over-using Context

```tsx
// ❌ Don't put everything in global context
function AppProvider() {
  return (
    <TodoProvider>
      <UserProvider>
        <ThemeProvider>
          <NotificationProvider>
            <ShoppingCartProvider>
              <AnalyticsProvider>
                {/* This is getting ridiculous */}
                <App />
              </AnalyticsProvider>
            </ShoppingCartProvider>
          </NotificationProvider>
        </ThemeProvider>
      </UserProvider>
    </TodoProvider>
  );
}

// ✅ Use context judiciously - compose providers where needed
function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </UserProvider>
  );
}

function TodoSection() {
  return (
    <TodoProvider>
      <TodoList />
      <AddTodoForm />
    </TodoProvider>
  );
}
```

## When NOT to Use This Pattern

Context isn't always the right solution. Stick with prop passing when:

- **The dispatch only needs to go down 1-2 levels**: Context adds complexity for simple cases
- **The state is truly local**: Don't make component-specific state global
- **Performance is critical and you have frequent updates**: Context causes all consumers to re-render
- **You're building a reusable component library**: Props provide better flexibility for library consumers

## Wrapping Up

Migrating from prop-drilled dispatch functions to a typed Context pattern gives you:

- **Cleaner component interfaces**: No more passing through props that components don't use
- **Better developer experience**: Semantic action creators instead of remembering dispatch shapes
- **Easier refactoring**: Move components without updating the entire prop chain
- **Type safety throughout**: TypeScript ensures your actions and state stay in sync
- **Testability**: Context hooks are easy to test in isolation

The migration can be done gradually, component by component, without breaking your existing functionality. Start with the components that actually use dispatch, work your way up the component tree, and remember to memoize your context values and action creators.

This pattern works particularly well for form state, shopping carts, user authentication, and any other scenarios where you find yourself passing the same dispatch function through multiple component layers. Your components become more focused on their actual responsibilities instead of being courier services for dispatch functions they never use.
