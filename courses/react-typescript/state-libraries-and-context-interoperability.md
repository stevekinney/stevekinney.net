---
title: Interoperability with State Libraries and Context
description: >-
  Type Redux Toolkit, Zustand, and context selectors—strongly typed stores that
  feel native in React.
date: 2025-09-06T22:04:44.940Z
modified: '2025-09-14T23:11:40.853Z'
published: true
tags:
  - react
  - typescript
  - state-libraries
  - context
  - interop
  - zustand
  - redux
---

When your React 19 app grows beyond useState and useReducer (and it will), you'll reach for state management libraries. The good news? Modern TypeScript plays beautifully with Redux Toolkit, Zustand, and Context—but only if you set them up right. Let's explore how to get bulletproof types that actually help you ship faster instead of fighting the compiler at every turn.

We'll cover the big three patterns you'll encounter: Redux Toolkit's slice-based approach, Zustand's minimal store pattern, and Context with proper selector typing. Each has its sweet spots, and by the end, you'll know exactly when to reach for which tool.

## Redux Toolkit: The Heavy Hitter

Redux Toolkit (RTK) has come a long way from the verbose Redux of yesteryear. With proper TypeScript setup, it gives you predictable state updates, excellent DevTools, and type safety that scales with your team.

### Setting Up the Store

First, let's create a properly typed store. The key is getting the TypeScript configuration right from the start:

```ts
// store.ts
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

import counterSlice from './features/counter/counterSlice';
import userSlice from './features/user/userSlice';

export const store = configureStore({
  reducer: {
    counter: counterSlice,
    user: userSlice,
  },
});

// Infer the RootState type from the store itself
export type RootState = ReturnType<typeof store.getState>;

// Infer the AppDispatch type from the store
export type AppDispatch = typeof store.dispatch;

// Create typed hooks - use these instead of plain useDispatch/useSelector
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

> [!TIP]
> Always export typed hooks (`useAppDispatch`, `useAppSelector`) instead of using the plain React-Redux hooks. This saves you from typing state selectors everywhere.

### Creating Typed Slices

Here's how to create slices that give you full type safety:

```ts
// features/counter/counterSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
  value: number;
  loading: boolean;
}

const initialState: CounterState = {
  value: 0,
  loading: false,
};

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    // ✅ PayloadAction<number> gives you typed payload
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
    // ✅ Multiple payload types work too
    setCounterState: (state, action: PayloadAction<Partial<CounterState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const { increment, decrement, incrementByAmount, setCounterState } = counterSlice.actions;
export default counterSlice.reducer;
```

### Async Actions with createAsyncThunk

For async operations, RTK's `createAsyncThunk` provides excellent TypeScript support:

```ts
// features/user/userSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserState {
  current: User | null;
  loading: boolean;
  error: string | null;
}

// ✅ Properly typed async thunk
export const fetchUser = createAsyncThunk<
  User, // Return type
  string, // Argument type (user ID)
  {
    rejectValue: string; // Error type
  }
>('user/fetchUser', async (userId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      return rejectWithValue('Failed to fetch user');
    }
    return await response.json();
  } catch (error) {
    return rejectWithValue('Network error');
  }
});

const initialState: UserState = {
  current: null,
  loading: false,
  error: null,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload; // ✅ Typed as User
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unknown error'; // ✅ Typed as string
      });
  },
});

export const { clearError } = userSlice.actions;
export default userSlice.reducer;
```

### Using RTK in Components

With your typed hooks, components become clean and type-safe:

```tsx
// components/Counter.tsx
import { useAppSelector, useAppDispatch } from '../store';
import { increment, decrement, incrementByAmount } from '../features/counter/counterSlice';

export function Counter() {
  // ✅ Fully typed - no manual type annotations needed
  const count = useAppSelector((state) => state.counter.value);
  const loading = useAppSelector((state) => state.counter.loading);
  const dispatch = useAppDispatch();

  const handleIncrementByFive = () => {
    // ✅ Payload is typed - TypeScript catches mistakes
    dispatch(incrementByAmount(5));
  };

  return (
    <div>
      <p>Count: {count}</p>
      {loading && <p>Loading...</p>}
      <button onClick={() => dispatch(increment())}>+</button>
      <button onClick={() => dispatch(decrement())}>-</button>
      <button onClick={handleIncrementByFive}>+5</button>
    </div>
  );
}
```

## Zustand: The Lightweight Champion

Zustand gives you the power of Redux with a fraction of the boilerplate. It's particularly nice for smaller apps or when you want fine-grained stores.

### Basic Store Setup

```ts
// stores/counterStore.ts
import { create } from 'zustand';

interface CounterState {
  count: number;
  loading: boolean;
  increment: () => void;
  decrement: () => void;
  incrementByAmount: (amount: number) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>()((set, get) => ({
  count: 0,
  loading: false,

  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  incrementByAmount: (amount) => set((state) => ({ count: state.count + amount })),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ count: 0, loading: false }),
}));
```

### Async Actions in Zustand

Zustand handles async operations naturally—just make your actions async:

```ts
// stores/userStore.ts
interface User {
  id: string;
  name: string;
  email: string;
}

interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
  fetchUser: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useUserStore = create<UserState>()((set, get) => ({
  user: null,
  loading: false,
  error: null,

  fetchUser: async (id) => {
    set({ loading: true, error: null });

    try {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) throw new Error('Failed to fetch user');

      const user = await response.json();
      set({ user, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
```

### Selectors and Performance

Zustand's selectors prevent unnecessary re-renders—use them liberally:

```tsx
// components/UserProfile.tsx
import { useUserStore } from '../stores/userStore';

export function UserProfile({ userId }: { userId: string }) {
  // ✅ Only re-renders when user changes, not loading/error
  const user = useUserStore((state) => state.user);

  // ✅ Separate selector for loading state
  const { loading, error, fetchUser } = useUserStore((state) => ({
    loading: state.loading,
    error: state.error,
    fetchUser: state.fetchUser,
  }));

  useEffect(() => {
    fetchUser(userId);
  }, [userId, fetchUser]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>No user found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Zustand with Immer for Complex State

For complex state updates, combine Zustand with Immer:

```ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
}

export const useTodoStore = create<TodoState>()(
  immer((set) => ({
    todos: [],

    addTodo: (text) =>
      set((state) => {
        // ✅ Immer lets you "mutate" - it handles immutability
        state.todos.push({
          id: crypto.randomUUID(),
          text,
          completed: false,
        });
      }),

    toggleTodo: (id) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.completed = !todo.completed;
        }
      }),

    removeTodo: (id) =>
      set((state) => {
        const index = state.todos.findIndex((t) => t.id === id);
        if (index !== -1) {
          state.todos.splice(index, 1);
        }
      }),
  })),
);
```

## Context: The Native Solution

For component-tree-scoped state, React's Context API with proper TypeScript setup is often the right tool. The key is making your context providers type-safe and performant.

### Setting Up Typed Context

```tsx
// contexts/ThemeContext.tsx
import { createContext, useContext, ReactNode, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('auto');

  // Derive computed values
  const isDark =
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>{children}</ThemeContext.Provider>
  );
}

// ✅ Custom hook with proper error handling
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

### Context with Reducers

For more complex state logic, combine Context with useReducer:

```tsx
// contexts/CartContext.tsx
import { createContext, useContext, useReducer, ReactNode } from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' };

interface CartContextType {
  state: CartState;
  dispatch: (action: CartAction) => void;
  // Convenience methods
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find((item) => item.id === action.payload.id);

      if (existingItem) {
        const updatedItems = state.items.map((item) =>
          item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
        return {
          items: updatedItems,
          total: calculateTotal(updatedItems),
        };
      }

      const newItems = [...state.items, { ...action.payload, quantity: 1 }];
      return {
        items: newItems,
        total: calculateTotal(newItems),
      };
    }

    case 'REMOVE_ITEM': {
      const filteredItems = state.items.filter((item) => item.id !== action.payload.id);
      return {
        items: filteredItems,
        total: calculateTotal(filteredItems),
      };
    }

    case 'UPDATE_QUANTITY': {
      const updatedItems = state.items
        .map((item) =>
          item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item,
        )
        .filter((item) => item.quantity > 0);

      return {
        items: updatedItems,
        total: calculateTotal(updatedItems),
      };
    }

    case 'CLEAR_CART':
      return { items: [], total: 0 };

    default:
      return state;
  }
}

function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });

  // ✅ Convenience methods that wrap dispatch
  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id } });
  };

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  return (
    <CartContext.Provider
      value={{
        state,
        dispatch,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
```

### Performance-Conscious Context

To prevent unnecessary re-renders, split your context or use selectors:

```tsx
// contexts/UserContext.tsx
import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  preferences: {
    notifications: boolean;
    theme: 'light' | 'dark';
  };
}

interface UserState {
  user: User | null;
  loading: boolean;
}

// ✅ Split state and actions to minimize re-renders
const UserStateContext = createContext<UserState | null>(null);
const UserActionsContext = createContext<{
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  updatePreferences: (preferences: Partial<User['preferences']>) => void;
} | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ Memoize actions to prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      setUser,
      setLoading,
      updatePreferences: (preferences: Partial<User['preferences']>) => {
        if (!user) return;
        setUser({
          ...user,
          preferences: { ...user.preferences, ...preferences },
        });
      },
    }),
    [user],
  );

  return (
    <UserStateContext.Provider value={{ user, loading }}>
      <UserActionsContext.Provider value={actions}>{children}</UserActionsContext.Provider>
    </UserStateContext.Provider>
  );
}

// ✅ Separate hooks for state and actions
export function useUserState() {
  const context = useContext(UserStateContext);
  if (!context) {
    throw new Error('useUserState must be used within a UserProvider');
  }
  return context;
}

export function useUserActions() {
  const context = useContext(UserActionsContext);
  if (!context) {
    throw new Error('useUserActions must be used within a UserProvider');
  }
  return context;
}
```

## Choosing the Right Tool

Each approach has its strengths:

**Use Redux Toolkit when:**

- You need predictable state updates across a large app
- Time-travel debugging is valuable
- You're working with a team that benefits from strict patterns
- You have complex async logic with dependencies

**Use Zustand when:**

- You want minimal boilerplate
- You need multiple independent stores
- Performance is critical (selective subscriptions)
- You're building a smaller to medium app

**Use Context when:**

- State is scoped to a component subtree
- You're building a design system or reusable component library
- You need to avoid prop drilling for just a few values
- The state doesn't change frequently

> [!WARNING]
> Don't use Context for frequently-changing global state—it can cause performance issues. Prefer Zustand or RTK for high-frequency updates.

## Real-World Patterns

### Combining Approaches

You don't have to choose just one! Here's a pattern that works well:

```tsx
// App.tsx - Multiple providers for different concerns
function App() {
  return (
    <Provider store={store}>
      {' '}
      {/* RTK for global app state */}
      <ThemeProvider>
        {' '}
        {/* Context for theme */}
        <UserProvider>
          {' '}
          {/* Context for user session */}
          <Router>
            <Routes>{/* Zustand stores used locally in route components */}</Routes>
          </Router>
        </UserProvider>
      </ThemeProvider>
    </Provider>
  );
}
```

### Type-Safe Selectors

Create reusable selectors for complex state access:

```ts
// selectors/userSelectors.ts
import type { RootState } from '../store';

export const selectCurrentUser = (state: RootState) => state.user.current;
export const selectUserLoading = (state: RootState) => state.user.loading;
export const selectUserError = (state: RootState) => state.user.error;

// ✅ Derived selectors
export const selectIsAuthenticated = (state: RootState) => selectCurrentUser(state) !== null;

export const selectUserDisplayName = (state: RootState) => {
  const user = selectCurrentUser(state);
  return user ? user.name : 'Anonymous';
};
```

---

The beauty of modern TypeScript with React is that you get to choose the right tool for each piece of state. Start simple with useState and Context, reach for Zustand when you need more power, and bring in RTK when you need the full Redux experience. With proper typing, they all integrate seamlessly into your React 19 applications.

The patterns we've covered here will scale from prototype to production, giving you the confidence to refactor and evolve your state management as your app grows. Pick the approach that fits your current needs—you can always migrate later with TypeScript ensuring you don't miss anything along the way.
