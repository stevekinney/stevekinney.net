---
title: TypeScript Patterns for React Hooks
description: >-
  Master TypeScript with React Hooks—from useState generics to custom hook
  patterns that scale
date: 2025-09-27T10:00:00.000Z
modified: '2025-09-27T19:30:05.343Z'
published: true
tags:
  - typescript
  - react
  - hooks
  - patterns
---

React Hooks and TypeScript together enable incredibly powerful patterns, but they also come with unique typing challenges. This guide covers everything from basic hook typing to advanced custom hook patterns that you'll use in production applications.

## useState: Getting the Types Right

The most common hook needs careful typing for complex state.

### Basic useState Patterns

```typescript
import { useState } from 'react';

function Component() {
  // TypeScript infers from initial value
  const [count, setCount] = useState(0); // number
  const [text, setText] = useState(''); // string
  const [isOpen, setIsOpen] = useState(false); // boolean

  // Explicit typing for complex types
  const [user, setUser] = useState<User | null>(null);

  // Array state
  const [items, setItems] = useState<string[]>([]);

  // Object state with specific shape
  const [form, setForm] = useState<{
    name: string;
    email: string;
    age?: number;
  }>({
    name: '',
    email: '',
  });

  return null;
}
```

### Complex State Patterns

```typescript
// Union types for state
type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function useFetch<T>(url: string) {
  const [state, setState] = useState<LoadingState<T>>({ status: 'idle' });

  const fetch = async () => {
    setState({ status: 'loading' });
    try {
      const response = await window.fetch(url);
      const data = await response.json();
      setState({ status: 'success', data });
    } catch (error) {
      setState({ status: 'error', error: error as Error });
    }
  };

  return { state, fetch };
}

// Functional updates with proper typing
function Counter() {
  const [count, setCount] = useState(0);

  // TypeScript infers prevCount as number
  const increment = () => setCount((prevCount) => prevCount + 1);

  // Complex functional update
  const [items, setItems] = useState<Item[]>([]);

  const updateItem = (id: string, updates: Partial<Item>) => {
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  return null;
}
```

### State Initialization Patterns

```typescript
// Lazy initial state for expensive computations
function ExpensiveComponent() {
  // ✅ Function is only called once
  const [data, setData] = useState<ComplexData>(() => {
    return computeExpensiveInitialData();
  });

  // ❌ Computed on every render (bad!)
  const [badData, setBadData] = useState<ComplexData>(computeExpensiveInitialData());

  return null;
}

// Generic initial state helper
function useStateWithStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  const setStateAndStore = (value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const nextState = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
      localStorage.setItem(key, JSON.stringify(nextState));
      return nextState;
    });
  };

  return [state, setStateAndStore];
}
```

## useReducer: Type-Safe State Management

For complex state logic, useReducer with TypeScript provides excellent type safety.

### Basic useReducer Pattern

```typescript
import { useReducer } from 'react';

// Define state shape
interface CounterState {
  count: number;
  step: number;
}

// Define action types with discriminated unions
type CounterAction =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'incrementBy'; payload: number }
  | { type: 'reset' }
  | { type: 'setStep'; payload: number };

// Reducer with exhaustive checking
function counterReducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step };
    case 'decrement':
      return { ...state, count: state.count - state.step };
    case 'incrementBy':
      return { ...state, count: state.count + action.payload };
    case 'reset':
      return { ...state, count: 0 };
    case 'setStep':
      return { ...state, step: action.payload };
    default:
      // Exhaustiveness check
      const exhaustive: never = action;
      throw new Error(`Unhandled action: ${exhaustive}`);
  }
}

function Counter() {
  const [state, dispatch] = useReducer(counterReducer, {
    count: 0,
    step: 1,
  });

  return (
    <div>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <span>{state.count}</span>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
    </div>
  );
}
```

### Advanced useReducer Patterns

```typescript
// Generic reducer for CRUD operations
interface Entity {
  id: string;
}

interface CrudState<T extends Entity> {
  items: T[];
  loading: boolean;
  error: string | null;
}

type CrudAction<T extends Entity> =
  | { type: 'SET_ITEMS'; payload: T[] }
  | { type: 'ADD_ITEM'; payload: T }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<T> } }
  | { type: 'DELETE_ITEM'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

function createCrudReducer<T extends Entity>() {
  return function crudReducer(state: CrudState<T>, action: CrudAction<T>): CrudState<T> {
    switch (action.type) {
      case 'SET_ITEMS':
        return { ...state, items: action.payload, loading: false };
      case 'ADD_ITEM':
        return { ...state, items: [...state.items, action.payload] };
      case 'UPDATE_ITEM':
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id ? { ...item, ...action.payload.updates } : item,
          ),
        };
      case 'DELETE_ITEM':
        return {
          ...state,
          items: state.items.filter((item) => item.id !== action.payload),
        };
      case 'SET_LOADING':
        return { ...state, loading: action.payload };
      case 'SET_ERROR':
        return { ...state, error: action.payload };
      default:
        return state;
    }
  };
}

// Usage with specific type
interface User extends Entity {
  name: string;
  email: string;
}

function UserManager() {
  const [state, dispatch] = useReducer(createCrudReducer<User>(), {
    items: [],
    loading: false,
    error: null,
  });

  return null;
}
```

## useRef: Beyond DOM References

useRef has multiple uses, each with different typing requirements.

### DOM Element References

```typescript
import { useRef, useEffect } from 'react';

function AutoFocusInput() {
  // Specific element type with null initial value
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // TypeScript knows current might be null
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
}

// Multiple element types
function MediaPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const playVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  return (
    <>
      <video ref={videoRef} />
      <audio ref={audioRef} />
      <canvas ref={canvasRef} />
    </>
  );
}
```

### Mutable Values with useRef

```typescript
// Storing mutable values that don't trigger re-renders
function Timer() {
  // Store interval ID
  const intervalRef = useRef<NodeJS.Timeout>();

  // Store previous values
  const prevCountRef = useRef<number>(0);

  // Store callbacks without re-renders
  const callbackRef = useRef<() => void>();

  // Store complex state
  const stateRef = useRef<{
    startTime: number;
    endTime?: number;
    duration?: number;
  }>({
    startTime: Date.now(),
  });

  const start = () => {
    intervalRef.current = setInterval(() => {
      // Timer logic
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      stateRef.current.endTime = Date.now();
      stateRef.current.duration = stateRef.current.endTime - stateRef.current.startTime;
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null;
}
```

## useCallback and useMemo: Optimized Typing

These hooks require careful typing for their dependencies and return values.

### useCallback Patterns

```typescript
import { useCallback, useState } from 'react';

interface User {
  id: string;
  name: string;
}

function UserList({ users }: { users: User[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // TypeScript infers return type and parameter types
  const handleSelect = useCallback((user: User) => {
    setSelectedId(user.id);
    console.log(`Selected ${user.name}`);
  }, []); // Empty deps because setSelectedId is stable

  // Generic callback
  const createHandler = useCallback(
    <T extends { id: string }>(item: T) =>
      () => {
        console.log(`Clicked item ${item.id}`);
      },
    [],
  );

  // Callback with dependencies
  const handleDelete = useCallback(
    (userId: string) => {
      if (selectedId === userId) {
        setSelectedId(null);
      }
      // Delete logic
    },
    [selectedId],
  );

  return null;
}

// Callback with proper dependency typing
function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);

  // Debounced search with proper typing
  const search = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 3) {
        setResults([]);
        return;
      }

      const response = await fetch(`/api/search?q=${searchQuery}`);
      const data = await response.json();
      setResults(data);
    },
    [], // No dependencies needed
  );

  return null;
}
```

### useMemo Patterns

```typescript
import { useMemo } from 'react';

interface DataItem {
  id: string;
  value: number;
  category: string;
}

function DataProcessor({ items }: { items: DataItem[] }) {
  // Computed values with proper typing
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.value, 0);
  }, [items]);

  // Complex transformations
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, DataItem[]> = {};

    items.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    return groups;
  }, [items]);

  // Generic memoization helper
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => b.value - a.value);
  }, [items]);

  // Expensive component tree
  const expensiveComponent = useMemo(
    () => <ExpensiveVisualization data={items} />,
    [items]
  );

  return <div>{expensiveComponent}</div>;
}
```

## Custom Hook Patterns

Creating reusable, type-safe custom hooks.

### Basic Custom Hook

```typescript
// Simple custom hook with proper return type
function useCounter(initialValue = 0): {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
} {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);

  return { count, increment, decrement, reset };
}

// Using tuple returns for simpler API
function useToggle(initialValue = false): [boolean, () => void, (value: boolean) => void] {
  const [state, setState] = useState(initialValue);

  const toggle = useCallback(() => setState((s) => !s), []);
  const set = useCallback((value: boolean) => setState(value), []);

  return [state, toggle, set];
}
```

### Generic Custom Hooks

```typescript
// Generic fetch hook
interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

function useFetch<T = unknown>(
  url: string,
  options?: RequestInit
): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState({ data: null, loading: true, error: null });

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// Usage with type parameter
function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error } = useFetch<User>(
    `/api/users/${userId}`
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return <div>{data.name}</div>;
}
```

### Advanced Custom Hook Patterns

```typescript
// Hook with configuration options
interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  initialData?: T;
  enabled?: boolean;
}

function useAsync<T>(asyncFunction: () => Promise<T>, options: UseAsyncOptions<T> = {}) {
  const { onSuccess, onError, initialData, enabled = true } = options;

  const [state, setState] = useState<{
    data: T | undefined;
    loading: boolean;
    error: Error | null;
  }>({
    data: initialData,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    if (!enabled) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await asyncFunction();
      setState({ data, loading: false, error: null });
      onSuccess?.(data);
      return data;
    } catch (error) {
      const err = error as Error;
      setState((prev) => ({ ...prev, loading: false, error: err }));
      onError?.(err);
      throw err;
    }
  }, [asyncFunction, enabled, onSuccess, onError]);

  useEffect(() => {
    execute();
  }, [execute]);

  return { ...state, execute };
}
```

## useImperativeHandle: Exposing Component APIs

Creating component APIs with proper typing.

```typescript
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

// Define the exposed API
interface FormHandle {
  submit: () => void;
  reset: () => void;
  validate: () => boolean;
  getValue: (fieldName: string) => string | undefined;
}

interface FormProps {
  onSubmit: (data: Record<string, string>) => void;
  fields: Array<{ name: string; label: string; required?: boolean }>;
}

const Form = forwardRef<FormHandle, FormProps>(({ onSubmit, fields }, ref) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useImperativeHandle(
    ref,
    () => ({
      submit: () => {
        if (validate()) {
          onSubmit(values);
        }
      },
      reset: () => {
        setValues({});
        setErrors({});
      },
      validate: () => {
        const newErrors: Record<string, string> = {};

        fields.forEach(field => {
          if (field.required && !values[field.name]) {
            newErrors[field.name] = `${field.label} is required`;
          }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
      },
      getValue: (fieldName: string) => values[fieldName],
    }),
    [values, fields, onSubmit]
  );

  return (
    <form>
      {fields.map(field => (
        <div key={field.name}>
          <label>{field.label}</label>
          <input
            value={values[field.name] || ''}
            onChange={e =>
              setValues(prev => ({
                ...prev,
                [field.name]: e.target.value,
              }))
            }
          />
          {errors[field.name] && (
            <span className="error">{errors[field.name]}</span>
          )}
        </div>
      ))}
    </form>
  );
});

Form.displayName = 'Form';

// Usage
function App() {
  const formRef = useRef<FormHandle>(null);

  const handleExternalSubmit = () => {
    formRef.current?.submit();
  };

  const validateForm = () => {
    const isValid = formRef.current?.validate();
    console.log('Form is valid:', isValid);
  };

  return (
    <>
      <Form
        ref={formRef}
        fields={[
          { name: 'username', label: 'Username', required: true },
          { name: 'email', label: 'Email', required: true },
        ]}
        onSubmit={data => console.log('Submitted:', data)}
      />
      <button onClick={handleExternalSubmit}>Submit from outside</button>
      <button onClick={validateForm}>Validate</button>
    </>
  );
}
```

## useContext with TypeScript

Type-safe context patterns for global state.

```typescript
import { createContext, useContext, useState, ReactNode } from 'react';

// Define context value type
interface AuthContextValue {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

// Create context with undefined default
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (credentials: Credentials) => {
    setLoading(true);
    try {
      const user = await authenticateUser(credentials);
      setUser(user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook with type guard
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// Generic context factory
function createContextWithHook<T>(name: string) {
  const Context = createContext<T | undefined>(undefined);

  const Provider = Context.Provider;

  const useContextHook = (): T => {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error(`use${name} must be used within a ${name}Provider`);
    }
    return context;
  };

  return [Provider, useContextHook] as const;
}

// Usage
const [ThemeProvider, useTheme] = createContextWithHook<{
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}>('Theme');
```

## Hook Composition Patterns

Combining hooks for complex functionality.

```typescript
// Composing multiple hooks
function useUserProfile(userId: string) {
  const { data: user, loading: userLoading } = useFetch<User>(`/api/users/${userId}`);

  const { data: posts, loading: postsLoading } = useFetch<Post[]>(`/api/users/${userId}/posts`);

  const [isFollowing, setIsFollowing] = useState(false);

  const checkFollowing = useCallback(async () => {
    if (!user) return;
    const response = await fetch(`/api/users/${user.id}/is-following`);
    const { following } = await response.json();
    setIsFollowing(following);
  }, [user]);

  useEffect(() => {
    checkFollowing();
  }, [checkFollowing]);

  const toggleFollow = useCallback(async () => {
    if (!user) return;

    const method = isFollowing ? 'DELETE' : 'POST';
    await fetch(`/api/users/${user.id}/follow`, { method });
    setIsFollowing((prev) => !prev);
  }, [user, isFollowing]);

  return {
    user,
    posts,
    loading: userLoading || postsLoading,
    isFollowing,
    toggleFollow,
  };
}

// Hook that returns other hooks conditionally
function useConditionalFeature(enabled: boolean) {
  // Always call hooks, but make their behavior conditional
  const websocket = useWebSocket(enabled ? 'ws://localhost:3000' : null);
  const polling = usePolling(enabled ? null : '/api/data');

  return enabled ? websocket : polling;
}
```

## Best Practices

### Do's ✅

```typescript
// ✅ Type state explicitly when needed
const [user, setUser] = useState<User | null>(null);

// ✅ Use const assertions for reducer actions
const action = { type: 'INCREMENT' } as const;

// ✅ Properly type ref.current checks
if (inputRef.current) {
  inputRef.current.focus();
}

// ✅ Use generics for reusable hooks
function useAsync<T>(asyncFn: () => Promise<T>) {}

// ✅ Return consistent types from custom hooks
function useApi(): { data: Data | null; loading: boolean } {}
```

### Don'ts ❌

```typescript
// ❌ Don't use any for hook state
const [data, setData] = useState<any>();

// ❌ Don't ignore dependency arrays
useEffect(() => {}, []); // Missing dependency!

// ❌ Don't mutate refs directly in render
inputRef.current = document.createElement('input'); // Wrong!

// ❌ Don't call hooks conditionally
if (condition) {
  useState(); // Error!
}

// ❌ Don't forget cleanup in effects
useEffect(() => {
  const timer = setTimeout(() => {}, 1000);
  // return () => clearTimeout(timer); // Don't forget!
}, []);
```

## Summary

React Hooks with TypeScript provide a powerful foundation for building type-safe, reusable logic. The key is understanding when to be explicit with types and when to let TypeScript's inference do the work. Focus on creating hooks that are both type-safe and ergonomic to use, and remember that good typing helps prevent bugs before they happen.
