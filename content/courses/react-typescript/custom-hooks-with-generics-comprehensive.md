---
title: Custom Hooks with Generics
description: >-
  Build reusable hooks with proper generic constraints—type-safe data fetching,
  localStorage, and form management patterns.
date: 2025-09-06T22:23:57.314Z
modified: '2025-09-06T17:49:18-06:00'
published: true
tags:
  - react
  - typescript
  - hooks
  - generics
---

Custom hooks are one of React's most powerful features, and when combined with TypeScript generics, they become incredibly versatile tools for building reusable, type-safe abstractions. Instead of copying and pasting similar state logic across components, you can create hooks that adapt to different data types while maintaining complete type safety. Let's explore how to build custom hooks with generics that are both flexible and bulletproof.

## The Power of Generic Custom Hooks

Consider this common pattern—you've written similar data fetching logic in multiple components:

```tsx
// ❌ Repetitive code in every component
function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  return (/* render logic */);
}

function ProductsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nearly identical logic...
}
```

With generic custom hooks, you can eliminate this duplication:

```tsx
// ✅ Reusable generic hook
function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = (await response.json()) as T;
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [url]);

  return { data, loading, error };
}

// ✅ Clean component usage
function UsersList() {
  const { data: users, loading, error } = useApi<User[]>('/api/users');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {users?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

TypeScript infers the correct types throughout your component, and you get complete type safety with zero duplication.

## Generic Constraints for Better APIs

Sometimes you want to constrain your generic types to ensure they have certain properties. This makes your hooks more reliable and provides better error messages:

```tsx
// ✅ Constrain the generic to objects with an 'id' property
interface Identifiable {
  id: string | number;
}

function useSelection<T extends Identifiable>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<T['id']>>(new Set());

  const toggleSelection = (id: T['id']) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const isSelected = (id: T['id']) => selectedIds.has(id);

  return {
    selectedIds,
    selectedItems,
    isSelected,
    toggleSelection,
    clearSelection: () => setSelectedIds(new Set()),
  };
}

// ✅ Works with any objects that have an 'id'
interface User {
  id: number;
  name: string;
  email: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

function MyComponent() {
  const users: User[] = [
    /* ... */
  ];
  const products: Product[] = [
    /* ... */
  ];

  const userSelection = useSelection(users); // T['id'] is number
  const productSelection = useSelection(products); // T['id'] is string

  return (
    <div>
      {users.map((user) => (
        <div key={user.id}>
          <input
            type="checkbox"
            checked={userSelection.isSelected(user.id)}
            onChange={() => userSelection.toggleSelection(user.id)}
          />
          {user.name}
        </div>
      ))}
    </div>
  );
}
```

## Advanced Generic Patterns

### Conditional Types in Hooks

You can use conditional types to make your hooks adapt their behavior based on the type parameters:

```tsx
// ✅ Hook behavior changes based on whether data is an array
type UseDataResult<T> = T extends any[]
  ? {
      data: T | null;
      loading: boolean;
      error: string | null;
      addItem: (item: T[0]) => void;
      removeItem: (id: string | number) => void;
    }
  : {
      data: T | null;
      loading: boolean;
      error: string | null;
      refresh: () => void;
    };

function useData<T>(url: string): UseDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as T;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Return different interfaces based on whether T is an array
  if (Array.isArray(data)) {
    return {
      data,
      loading,
      error,
      addItem: (item: any) => {
        setData((prev) => (prev ? [...prev, item] : ([item] as any)));
      },
      removeItem: (id: string | number) => {
        setData((prev) => (prev ? prev.filter((item: any) => item.id !== id) : (null as any)));
      },
    } as UseDataResult<T>;
  } else {
    return {
      data,
      loading,
      error,
      refresh: fetchData,
    } as UseDataResult<T>;
  }
}

// Usage automatically provides the right interface
const userList = useData<User[]>('/api/users'); // Has addItem, removeItem
const userProfile = useData<User>('/api/user/123'); // Has refresh
```

### Generic Hooks with Default Types

Sometimes you want to provide sensible defaults while still allowing customization:

```tsx
// ✅ Default generic type with override capability
interface DefaultApiResponse {
  success: boolean;
  message: string;
}

function useApiMutation<TData = DefaultApiResponse, TVariables = Record<string, unknown>>(
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const [state, setState] = useState<{
    data: TData | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(
    async (variables: TVariables) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await mutationFn(variables);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
        throw error;
      }
    },
    [mutationFn],
  );

  return { ...state, mutate };
}

// ✅ Use with defaults
const defaultMutation = useApiMutation((data: { name: string }) =>
  fetch('/api/create', { method: 'POST', body: JSON.stringify(data) }).then((res) => res.json()),
);

// ✅ Or with custom types
interface CreateUserResponse {
  user: User;
  token: string;
}

interface CreateUserVariables {
  name: string;
  email: string;
}

const createUserMutation = useApiMutation<CreateUserResponse, CreateUserVariables>(
  async (variables) => {
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(variables),
    });
    return response.json();
  },
);
```

## Real-World Examples

### Generic Form Hook

Here's a practical form hook that works with any form shape:

```tsx
type FormConfig<T> = {
  [K in keyof T]: {
    validate?: (value: T[K]) => string | undefined;
    transform?: (value: string) => T[K];
  };
};

function useForm<T extends Record<string, any>>(initialValues: T, config?: FormConfig<T>) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const setValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors],
  );

  const setFieldValue = useCallback(
    <K extends keyof T>(field: K) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = event.target.value;
        const transform = config?.[field]?.transform;
        const value = transform ? transform(rawValue) : (rawValue as T[K]);
        setValue(field, value);
      },
    [setValue, config],
  );

  const validateField = useCallback(
    <K extends keyof T>(field: K) => {
      const validator = config?.[field]?.validate;
      if (!validator) return;

      const error = validator(values[field]);
      setErrors((prev) => ({ ...prev, [field]: error }));
      return !error;
    },
    [values, config],
  );

  const handleBlur = useCallback(
    <K extends keyof T>(field: K) =>
      () => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        validateField(field);
      },
    [validateField],
  );

  const validateAll = useCallback(() => {
    if (!config) return true;

    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    (Object.keys(values) as (keyof T)[]).forEach((field) => {
      const validator = config[field]?.validate;
      if (validator) {
        const error = validator(values[field]);
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    setTouched(Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    return isValid;
  }, [values, config]);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldValue,
    handleBlur,
    validateField,
    validateAll,
    isValid: Object.keys(errors).length === 0,
  };
}

// ✅ Usage with full type safety
interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

function LoginComponent() {
  const form = useForm<LoginForm>(
    { email: '', password: '', rememberMe: false },
    {
      email: {
        validate: (value) => {
          if (!value) return 'Email is required';
          if (!/\S+@\S+\.\S+/.test(value)) return 'Email is invalid';
        },
      },
      password: {
        validate: (value) => {
          if (!value) return 'Password is required';
          if (value.length < 8) return 'Password must be at least 8 characters';
        },
      },
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.validateAll()) {
      // form.values is fully typed as LoginForm
      console.log('Submitting:', form.values);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={form.values.email}
        onChange={form.setFieldValue('email')}
        onBlur={form.handleBlur('email')}
      />
      {form.touched.email && form.errors.email && (
        <span className="error">{form.errors.email}</span>
      )}

      <input
        type="password"
        value={form.values.password}
        onChange={form.setFieldValue('password')}
        onBlur={form.handleBlur('password')}
      />
      {form.touched.password && form.errors.password && (
        <span className="error">{form.errors.password}</span>
      )}

      <button type="submit" disabled={!form.isValid}>
        Login
      </button>
    </form>
  );
}
```

### Generic Local Storage Hook

A localStorage hook that works with any serializable type:

```tsx
function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  }
) {
  // Default serialization functions
  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? JSON.parse;

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, serialize(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, serialize, storedValue]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}

// ✅ Usage examples with different types
function MyComponent() {
  // Simple types work automatically
  const [name, setName] = useLocalStorage('userName', '');
  const [count, setCount] = useLocalStorage('counter', 0);
  const [settings, setSettings] = useLocalStorage('appSettings', {
    theme: 'light' as const,
    notifications: true,
  });

  // Custom serialization for complex types
  const [user, setUser] = useLocalStorage<User | null>(
    'currentUser',
    null,
    {
      serialize: (user) => user ? JSON.stringify(user) : '',
      deserialize: (str) => str ? JSON.parse(str) as User : null,
    }
  );

  return (/* component JSX */);
}
```

## Testing Generic Hooks

Testing generic hooks requires thinking about the types you want to test:

```tsx
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('works with string values', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    expect(result.current[0]).toBe('initial');

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('test-key')).toBe('"updated"');
  });

  test('works with object values', () => {
    interface TestObject {
      id: number;
      name: string;
    }

    const initialValue: TestObject = { id: 1, name: 'Test' };
    const { result } = renderHook(() => useLocalStorage('test-object', initialValue));

    expect(result.current[0]).toEqual(initialValue);

    const updatedValue: TestObject = { id: 2, name: 'Updated' };
    act(() => {
      result.current[1](updatedValue);
    });

    expect(result.current[0]).toEqual(updatedValue);
  });

  test('handles functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });
});
```

## Common Pitfalls and Solutions

### 1. Over-constraining Generics

```tsx
// ❌ Too restrictive - only works with objects that have exactly these properties
function useBadSelection<T extends { id: string; name: string }>(items: T[]) {
  // Implementation...
}

// ✅ Better - works with any object that has at least an 'id'
function useGoodSelection<T extends { id: string }>(items: T[]) {
  // Implementation...
}
```

### 2. Not Providing Good Defaults

```tsx
// ❌ Forces users to always specify the type
function useApiData<T>(url: string): { data: T | null } {
  // Implementation...
}

// ✅ Provides sensible default
function useApiData<T = any>(url: string): { data: T | null } {
  // Implementation...
}
```

### 3. Complex Return Types

```tsx
// ❌ Hard to understand return type
function useComplexHook<T>() {
  return [data, setData, loading, error, refetch] as const;
}

// ✅ Clear object return type
function useComplexHook<T>() {
  return {
    data,
    setData,
    loading,
    error,
    refetch,
  };
}
```

## Best Practices

1. **Start simple**: Begin with basic generics and add constraints as needed
2. **Use meaningful constraints**: `T extends Identifiable` is better than `T extends object`
3. **Provide good defaults**: Let users omit generic parameters when possible
4. **Return objects, not tuples**: Object returns are more maintainable and discoverable
5. **Document your constraints**: Use JSDoc to explain what types work with your hook
6. **Test with multiple types**: Ensure your hook works with different generic parameters

## Summary

Generic custom hooks unlock incredible reusability while maintaining full type safety. They let you:

- Eliminate code duplication across components
- Create flexible, reusable abstractions
- Maintain complete type safety
- Provide great developer experience with IntelliSense

The key is to think about the common patterns in your application and abstract them into generic hooks that can work with any relevant data type. Your components stay clean, your logic stays DRY, and TypeScript keeps everything type-safe.

Start with simple generic hooks and gradually add more sophisticated type constraints and conditional logic as your needs grow. The payoff in code reusability and maintainability is enormous.

## Creating Type-Safe Custom Hooks

Custom hooks in React 19 + TypeScript can be incredibly powerful when properly typed. Here's a practical example of a hook for managing API state:

```tsx
// src/hooks/useApiState.ts
import { useState, useEffect, useCallback } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiStateOptions {
  immediate?: boolean;
}

export function useApiState<T>(apiCall: () => Promise<T>, options: UseApiStateOptions = {}) {
  const { immediate = true } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, [apiCall]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.loading,
    hasError: !!state.error,
    hasData: !!state.data,
  };
}
```

Usage example:

```tsx
// src/components/UserProfile.tsx
interface User {
  id: string;
  name: string;
  email: string;
}

async function fetchUser(userId: string): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
}

export function UserProfile({ userId }: { userId: string }) {
  const {
    data: user,
    isLoading,
    hasError,
    error,
    execute,
  } = useApiState(() => fetchUser(userId), { immediate: true });

  if (isLoading) return <div>Loading user...</div>;
  if (hasError) return <div>Error: {error}</div>;
  if (!user) return <div>No user found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
      <button onClick={execute}>Refresh</button>
    </div>
  );
}
```
