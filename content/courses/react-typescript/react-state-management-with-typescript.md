---
title: Complete Guide to React State Management with TypeScript
description: >-
  Master useState, useReducer, and action typing—from inference patterns to
  discriminated unions that prevent impossible states.
date: 2025-09-06T22:23:57.266Z
modified: '2025-09-28T15:41:40-06:00'
published: true
tags:
  - react
  - typescript
  - hooks
  - state-management
---

React's state management hooks are beautifully simple in JavaScript, but TypeScript transforms them into precision instruments that catch bugs before they happen. Instead of crossing your fingers and hoping your state updates work correctly, you can model your state with discriminated unions, use proper type guards, and build reducers that make impossible states literally impossible to represent. Let's explore how to wield these hooks with the full power of TypeScript's type system.

## `useState`: Inference, Patterns, and Pitfalls

TypeScript's inference with `useState` follows predictable patterns, but there are edge cases that can catch you off guard. Understanding these patterns helps you write more reliable state management code and avoid runtime surprises.

### How `useState` Inference Works

TypeScript infers the state type from the initial value you pass to `useState`. This works beautifully for straightforward cases:

```ts
const [count, setCount] = useState(0); // inferred as number
const [name, setName] = useState('Alice'); // inferred as string
const [isVisible, setVisible] = useState(true); // inferred as boolean
```

The setter functions get proper typing too. `setCount` expects a `number` or `(prev: number) => number`, and TypeScript will yell if you try to pass a string.

But here's where it gets interesting—TypeScript infers the _literal_ type from your initial value:

```ts
const [status, setStatus] = useState('idle'); // inferred as string, not 'idle'
const [theme, setTheme] = useState('light'); // inferred as string, not 'light'
```

This is usually what you want, but sometimes you need more specificity.

### Working with Union Types

When you want to constrain state to specific values, you need to guide TypeScript's inference. The most common approach is explicit typing:

```ts
// ✅ Explicit union type
const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

// ✅ Using const assertion for the initial value
const [theme, setTheme] = useState('light' as const);
// Note: This only constrains the initial value, not subsequent updates
```

The explicit typing approach is generally preferred because it constrains both the initial value and all future updates:

```ts
const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

// ✅ This works
setStatus('loading');

// ❌ TypeScript error: Argument of type '"pending"' is not assignable
setStatus('pending');
```

> [!TIP]
> When working with union types, define them separately for reusability and better error messages.

```ts
type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

const [status, setStatus] = useState<LoadingStatus>('idle');
```

### The Empty Array and Object Trap

Here's where many developers get caught: initializing state with an empty array or object.

```ts
// ❌ Inferred as never[] - you can't add anything!
const [items, setItems] = useState([]);

// ❌ This will cause a TypeScript error
setItems(['first item']); // Type 'string' is not assignable to type 'never'
```

TypeScript infers `never[]` because an empty array provides no clues about what types it should contain. You need to be explicit:

```ts
// ✅ Explicit typing
const [items, setItems] = useState<string[]>([]);
const [users, setUsers] = useState<User[]>([]);

// ✅ With interface for complex objects
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

const [todos, setTodos] = useState<Todo[]>([]);
```

The same principle applies to objects:

```ts
// ❌ Inferred as {}, which is not very useful
const [filters, setFilters] = useState({});

// ✅ Be explicit about the shape
interface FilterState {
  category: string;
  minPrice: number;
  maxPrice: number;
}

const [filters, setFilters] = useState<FilterState>({
  category: 'all',
  minPrice: 0,
  maxPrice: 1000,
});

// ✅ Or use Partial if some properties are optional initially
const [filters, setFilters] = useState<Partial<FilterState>>({});
```

### The Null/Undefined Initial State Pattern

Another common scenario is starting with `null` or `undefined` when data hasn't loaded yet:

```ts
// ❌ Inferred as null - you can never update it!
const [user, setUser] = useState(null);

// ✅ Explicit union with null
const [user, setUser] = useState<User | null>(null);

// ✅ Using undefined as the "not loaded" state
const [data, setData] = useState<ApiResponse | undefined>(undefined);
```

This pattern is especially common with async data loading:

```ts
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

const [profile, setProfile] = useState<UserProfile | null>(null);

useEffect(() => {
  async function loadProfile() {
    const userData = await fetchUserProfile();
    setProfile(userData); // ✅ TypeScript knows this should be UserProfile | null
  }

  loadProfile();
}, []);
```

## `useReducer`: Advanced State with Type Safety

`useReducer` shines when your state logic gets complex. With proper typing, you get compile-time guarantees about your actions and state transitions.

### Basic `useReducer` Typing

The simplest case of `useReducer` with TypeScript:

```ts
interface CounterState {
  count: number;
  step: number;
}

// Define all possible actions with discriminated union
type CounterAction =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'set'; payload: number }
  | { type: 'setStep'; payload: number }
  | { type: 'reset' };

function counterReducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step };
    case 'decrement':
      return { ...state, count: state.count - state.step };
    case 'set':
      return { ...state, count: action.payload }; // TypeScript knows payload exists
    case 'setStep':
      return { ...state, step: action.payload };
    case 'reset':
      return { count: 0, step: 1 };
    default:
      // This ensures we handle all action types
      const _exhaustive: never = action;
      return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(counterReducer, { count: 0, step: 1 });

  // TypeScript validates these action objects
  const increment = () => dispatch({ type: 'increment' });
  const setCount = (value: number) => dispatch({ type: 'set', payload: value });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={increment}>+{state.step}</button>
    </div>
  );
}
```

The `never` type in the default case is a neat trick—if you add a new action type but forget to handle it, TypeScript will yell at you.

### Discriminated Unions for Complex State

Instead of modeling loading states with separate boolean flags (which can lead to impossible combinations), use discriminated unions to make invalid states unrepresentable:

```ts
// ❌ Problematic approach - allows impossible states
interface BadAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
// What if loading=true AND error=true? What if data exists but loading=true?

// ✅ Better approach - impossible states are impossible
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

function useAsyncData<T>(fetchFn: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });

  const fetchData = async () => {
    setState({ status: 'loading' });

    try {
      const data = await fetchFn();
      setState({ status: 'success', data });
    } catch (error) {
      setState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return { state, fetchData };
}
```

This approach forces you to handle each state explicitly and prevents bugs like showing loading spinners while displaying error messages.

## Advanced Action Typing Patterns

When building complex applications, your action types become critical for maintainability. Here are battle-tested patterns for scaling your reducer logic.

### The Union-Based Solution

Instead of string constants, define your actions as a discriminated union. This gives you compile-time safety for both action creators and reducer logic:

```ts
// ✅ Type-safe actions with discriminated union
type CounterAction =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'set'; value: number }
  | { type: 'incrementBy'; amount: number };

function counterReducer(state: number, action: CounterAction): number {
  switch (action.type) {
    case 'increment':
      return state + 1;
    case 'decrement':
      return state - 1;
    case 'set':
      // TypeScript knows `value` exists here
      return action.value;
    case 'incrementBy':
      // TypeScript knows `amount` exists here
      return state + action.amount;
    default:
      // This ensures exhaustive handling
      const _exhaustive: never = action;
      return state;
  }
}
```

### Action Creators with Type Safety

Create type-safe action creators that prevent malformed actions:

```tsx
// Action creators with proper typing
const counterActions = {
  increment: (): CounterAction => ({ type: 'increment' }),
  decrement: (): CounterAction => ({ type: 'decrement' }),
  set: (value: number): CounterAction => ({ type: 'set', value }),
  incrementBy: (amount: number): CounterAction => ({ type: 'incrementBy', amount }),
} as const;

// Usage in component
function Counter() {
  const [count, dispatch] = useReducer(counterReducer, 0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => dispatch(counterActions.increment())}>+1</button>
      <button onClick={() => dispatch(counterActions.incrementBy(5))}>+5</button>
      <button onClick={() => dispatch(counterActions.set(0))}>Reset</button>
    </div>
  );
}
```

### Generic Actions for Common Patterns

For actions that follow similar patterns, you can create generic action types:

```ts
// Generic action patterns
type AsyncAction<T extends string, TData = undefined> = TData extends undefined
  ? { type: `${T}_PENDING` } | { type: `${T}_FULFILLED` } | { type: `${T}_REJECTED`; error: string }
  :
      | { type: `${T}_PENDING` }
      | { type: `${T}_FULFILLED`; data: TData }
      | { type: `${T}_REJECTED`; error: string };

// Usage for API calls
type UserAction = AsyncAction<'FETCH_USER', User> | AsyncAction<'DELETE_USER'>;

// This generates:
// | { type: 'FETCH_USER_PENDING' }
// | { type: 'FETCH_USER_FULFILLED'; data: User }
// | { type: 'FETCH_USER_REJECTED'; error: string }
// | { type: 'DELETE_USER_PENDING' }
// | { type: 'DELETE_USER_FULFILLED' }
// | { type: 'DELETE_USER_REJECTED'; error: string }
```

## Real-World Example: Complex Form State

Here's a practical example that showcases advanced typing patterns for form management:

```ts
interface FormState {
  fields: {
    email: string;
    password: string;
    confirmPassword: string;
  };
  errors: Partial<Record<keyof FormState['fields'], string>>;
  isSubmitting: boolean;
  submitCount: number;
}
```

## Reducer-Driven Form with Derived Action/Dispatch Types

Derive `Action` and `Dispatch` directly from action creators to keep everything in sync and prove exhaustiveness with `never`.

```tsx
// 1) State
interface LoginState {
  email: string;
  password: string;
  status: 'idle' | 'submitting' | 'success' | 'error';
  error?: string;
}

// 2) Action creators (as const for literal types)
const loginActions = {
  updateEmail: (value: string) => ({ type: 'updateEmail', value }) as const,
  updatePassword: (value: string) => ({ type: 'updatePassword', value }) as const,
  submit: () => ({ type: 'submit' }) as const,
  success: () => ({ type: 'success' }) as const,
  failure: (message: string) => ({ type: 'failure', message }) as const,
};

// 3) Derive Action and Dispatch from creators
type LoginAction = ReturnType<(typeof loginActions)[keyof typeof loginActions]>;
type LoginDispatch = React.Dispatch<LoginAction>;

// 4) Reducer with exhaustive check
function loginReducer(state: LoginState, action: LoginAction): LoginState {
  switch (action.type) {
    case 'updateEmail':
      return { ...state, email: action.value };
    case 'updatePassword':
      return { ...state, password: action.value };
    case 'submit':
      return { ...state, status: 'submitting', error: undefined };
    case 'success':
      return { ...state, status: 'success' };
    case 'failure':
      return { ...state, status: 'error', error: action.message };
    default: {
      const _exhaustive: never = action;
      return state;
    }
  }
}

// 5) Hook that exposes typed dispatch
function useLoginForm() {
  const [state, dispatch] = useReducer(loginReducer, {
    email: '',
    password: '',
    status: 'idle',
  });

  const onEmailChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    dispatch(loginActions.updateEmail(e.target.value));
  const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    dispatch(loginActions.updatePassword(e.target.value));

  const submit = async () => {
    dispatch(loginActions.submit());
    try {
      await fakeLogin(state.email, state.password);
      dispatch(loginActions.success());
    } catch (e) {
      dispatch(loginActions.failure(e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  return { state, dispatch: dispatch as LoginDispatch, onEmailChange, onPasswordChange, submit };
}
```

```ts
type FormAction =
| { type: 'updateField'; field: keyof FormState['fields']; value: string }
| { type: 'setError'; field: keyof FormState['fields']; error: string }
| { type: 'clearError'; field: keyof FormState['fields'] }
| { type: 'setSubmitting'; isSubmitting: boolean }
| { type: 'submitAttempt' }
| { type: 'reset' };

function formReducer(state: FormState, action: FormAction): FormState {
switch (action.type) {
case 'updateField':
return {
...state,
fields: {
...state.fields,
[action.field]: action.value,
},
// Clear error when user starts typing
errors: {
...state.errors,
[action.field]: undefined,
},
};
case 'setError':
return {
...state,
errors: {
...state.errors,
[action.field]: action.error,
},
};
case 'clearError':
return {
...state,
errors: {
...state.errors,
[action.field]: undefined,
},
};
case 'setSubmitting':
return { ...state, isSubmitting: action.isSubmitting };
case 'submitAttempt':
return { ...state, submitCount: state.submitCount + 1 };
case 'reset':
return {
fields: { email: '', password: '', confirmPassword: '' },
errors: {},
isSubmitting: false,
submitCount: 0,
};
default:
const \_exhaustive: never = action;
return state;
}
}

function useForm() {
const [state, dispatch] = useReducer(formReducer, {
fields: { email: '', password: '', confirmPassword: '' },
errors: {},
isSubmitting: false,
submitCount: 0,
});

const updateField = (field: keyof FormState['fields'], value: string) => {
dispatch({ type: 'updateField', field, value });
};

const validateAndSubmit = async () => {
// Validation logic here...
dispatch({ type: 'submitAttempt' });
dispatch({ type: 'setSubmitting', isSubmitting: true });

    try {
      // Submit logic...
      console.log('Form submitted:', state.fields);
    } catch (error) {
      dispatch({ type: 'setError', field: 'email', error: 'Submission failed' });
    } finally {
      dispatch({ type: 'setSubmitting', isSubmitting: false });
    }

};

return { state, updateField, validateAndSubmit, dispatch };
}

```

## Functional Updates and Type Safety

TypeScript's inference shines with functional state updates. The callback parameter gets the correct type automatically:

```ts
const [items, setItems] = useState<string[]>([]);

// ✅ TypeScript knows `prev` is string[]
setItems((prev) => [...prev, 'new item']);

// ✅ Works with complex objects too
interface FormState {
  email: string;
  password: string;
  errors: string[];
}

const [form, setForm] = useState<FormState>({
  email: '',
  password: '',
  errors: [],
});

setForm((prev) => ({
  ...prev,
  errors: [...prev.errors, 'Email is required'], // TypeScript validates everything
}));
```

> [!WARNING]
> Be careful not to mutate state directly, even with functional updates. Always return a new object or array.

## Custom Hooks with State Management

Custom hooks that use `useState` internally benefit from generic typing to make them reusable:

```ts
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

// Usage with proper type inference
const [settings, setSettings] = useLocalStorage('userSettings', {
  theme: 'light' as const,
  notifications: true,
});
```

## Performance Considerations

Proper typing doesn't just prevent bugs—it can also guide performance optimizations. When you model state precisely, you can use React's optimization hooks more effectively:

```ts
interface OptimizedState {
  expensiveData: ComplexObject[];
  uiState: {
    selectedId: string | null;
    isModalOpen: boolean;
  };
}

function useOptimizedState() {
  const [state, setState] = useState<OptimizedState>({
    expensiveData: [],
    uiState: { selectedId: null, isModalOpen: false },
  });

  // Separate setters for different concerns
  const updateUiState = useCallback((updates: Partial<OptimizedState['uiState']>) => {
    setState((prev) => ({
      ...prev,
      uiState: { ...prev.uiState, ...updates },
    }));
  }, []);

  const updateExpensiveData = useCallback((data: ComplexObject[]) => {
    setState((prev) => ({ ...prev, expensiveData: data }));
  }, []);

  return { state, updateUiState, updateExpensiveData };
}
```

## Common Pitfalls and Best Practices

### Over-specifying Generic Types

```ts
// ❌ Unnecessary - TypeScript can infer this
const [name, setName] = useState<string>('');

// ✅ Let TypeScript infer simple types
const [name, setName] = useState('');

// ✅ But be explicit when necessary
const [user, setUser] = useState<User | null>(null);
```

### Not Exhausting Discriminated Unions

```ts
type Status = 'loading' | 'success' | 'error' | 'idle';

function handleStatus(status: Status) {
  switch (status) {
    case 'loading':
      return 'Loading...';
    case 'success':
      return 'Success!';
    case 'error':
      return 'Error occurred';
    // ❌ Missing 'idle' case - but TypeScript won't catch this without...
  }

  // ✅ Add this to catch missing cases
  const _exhaustive: never = status;
  throw new Error(`Unhandled status: ${status}`);
}
```

### Forgetting About Stale Closures

```ts
function Timer() {
  const [count, setCount] = useState(0);

  // ❌ Use functional updates to avoid stale closures
  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prev) => prev + 1); // Always gets current value
    }, 1000);

    return () => clearInterval(timer);
  }, []); // Now the empty deps array is safe
}
```

## Best Practices Summary

1. **Let inference work for primitives**: `useState(0)`, `useState('')`, `useState(false)`
2. **Be explicit with unions**: `useState<Status>('idle')`
3. **Always type empty containers**: `useState<T[]>([])`, `useState<Partial<T>>({})`
4. **Use discriminated unions for complex state**: Prevent impossible state combinations
5. **Prefer functional updates**: They're safer and get better type checking
6. **Define types separately**: Make them reusable and improve error messages
7. **Use exhaustive checking**: Add `never` checks in your reducers

With these patterns, you'll write React state management code that's both type-safe and maintainable. The key is thinking about your state shape upfront and modeling it with TypeScript's type system in mind.

Your future self (and your teammates) will thank you for the extra type safety when that tricky state bug doesn't make it to production.
