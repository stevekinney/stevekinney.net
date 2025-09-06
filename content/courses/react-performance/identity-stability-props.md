---
title: Identity Stability: Taming Objects, Arrays, and Functions as Props
description: Stop accidental re-renders from unstable references. Learn where identity matters and how to keep it stable without over-caching.
date: 2025-09-06T21:14:12.379Z
modified: 2025-09-06T21:14:12.379Z
published: true
tags: ['react', 'performance', 'props', 'references']
---

React's performance model is built on comparing values to decide when components need to re-render. When you pass objects, arrays, or functions as props, their **identity**—not just their contents—determines whether React considers them "the same." Get this wrong, and you'll trigger unnecessary re-renders that can cascade through your component tree. Get it right, and your app stays snappy even as it grows.

The tricky part isn't understanding the concept (reference equality vs. deep equality), it's knowing when it actually matters and how to fix it without over-engineering your codebase with `useMemo` and `useCallback` everywhere.

## When Identity Actually Matters

Not every unstable reference causes performance problems. React is pretty fast at re-rendering components that haven't actually changed. But identity stability becomes critical in a few specific scenarios:

### Memoized Components with Object Props

When you've wrapped a component in `React.memo()`, it does a shallow comparison of props. If you pass a new object reference every render—even with identical contents—the memoization fails.

```tsx
// ❌ This will re-render every time, despite React.memo
const ExpensiveList = React.memo(
  ({ items, config }: { items: string[]; config: { sortBy: string; filterBy: string } }) => {
    console.log('Rendering expensive list...');
    return (
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  },
);

function App() {
  const [count, setCount] = useState(0);
  const items = ['apple', 'banana', 'cherry'];

  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>
      {/* New config object created every render! */}
      <ExpensiveList items={items} config={{ sortBy: 'name', filterBy: 'all' }} />
    </div>
  );
}
```

### useEffect Dependencies

Unstable references in dependency arrays cause effects to run on every render, even when the actual data hasn't changed:

```tsx
// ❌ Effect runs on every render
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUserData(userId, {
      fields: ['name', 'email', 'avatar'],
      cache: true,
    }).then(setUser);
  }, [userId, { fields: ['name', 'email', 'avatar'], cache: true }]);
  //           ^^^^ New object every render!

  return <div>{user?.name}</div>;
}
```

### Context Values

Perhaps the most insidious case—when context values change identity, every consumer re-renders:

```tsx
// ❌ All consumers re-render when App re-renders
function App() {
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        user,
        updateUser: (data) => setUser((prev) => ({ ...prev, ...data })),
      }}
    >
      <Dashboard />
    </AppContext.Provider>
  );
}
```

## The Anatomy of Unstable References

Let's look at the most common ways developers accidentally create new references:

### Inline Object Literals

Every time you write `{}` in JSX, you're creating a new object:

```tsx
// ❌ New object every render
<Component config={{ theme: 'dark', timeout: 5000 }} />;

// ✅ Stable reference
const config = { theme: 'dark', timeout: 5000 };
<Component config={config} />;

// ✅ Or memoize if it depends on props/state
const config = useMemo(
  () => ({
    theme: currentTheme,
    timeout: 5000,
  }),
  [currentTheme],
);
```

### Array Methods That Return New Arrays

Operations like `.filter()`, `.map()`, and `.slice()` always return new arrays, even if the contents are identical:

```tsx
function TodoList({ todos }: { todos: Todo[] }) {
  // ❌ Creates new array every render, even if no todos are completed
  const completedTodos = todos.filter((todo) => todo.completed);

  // ✅ Memoize when the operation might be expensive or affects children
  const completedTodos = useMemo(() => todos.filter((todo) => todo.completed), [todos]);

  return <ExpensiveCompletedList todos={completedTodos} />;
}
```

### Function Definitions

Functions defined inside components are recreated every render:

```tsx
// ❌ New function every render
function SearchResults({ query }: { query: string }) {
  const handleSort = (field: string) => {
    // sorting logic
  };

  return <SortableTable onSort={handleSort} />;
}

// ✅ Stable callback
function SearchResults({ query }: { query: string }) {
  const handleSort = useCallback((field: string) => {
    // sorting logic
  }, []); // No dependencies = same function every time

  return <SortableTable onSort={handleSort} />;
}
```

## Strategies for Stable Identity

The key is applying the right technique at the right time. Here's your toolkit:

### 1. Move Static Values Outside Components

If the value never changes, define it outside the component:

```tsx
// ✅ Defined once, never recreated
const DEFAULT_FILTERS = {
  category: 'all',
  sortBy: 'date',
  ascending: true,
};

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
  },
};

function Dashboard() {
  return (
    <div>
      <FilterPanel config={DEFAULT_FILTERS} />
      <Chart options={CHART_OPTIONS} />
    </div>
  );
}
```

### 2. useMemo for Expensive Computations

Use `useMemo` when you're doing work that you genuinely don't want to repeat:

```tsx
function ProductGrid({ products, filters, sortBy }: Props) {
  // ✅ Only recompute when inputs change
  const filteredAndSorted = useMemo(() => {
    return products
      .filter((product) => matchesFilters(product, filters))
      .sort((a, b) => compareBy(a, b, sortBy));
  }, [products, filters, sortBy]);

  return (
    <Grid>
      {filteredAndSorted.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </Grid>
  );
}
```

### 3. useCallback for Function Stability

Use `useCallback` when the function identity affects child component rendering:

```tsx
function DataTable({ data }: { data: TableRow[] }) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // ✅ Function identity stable unless data changes
  const handleRowToggle = useCallback((rowId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []); // No dependencies - function never changes

  return (
    <table>
      {data.map((row) => (
        <MemoizedRow
          key={row.id}
          row={row}
          isSelected={selectedRows.has(row.id)}
          onToggle={handleRowToggle}
        />
      ))}
    </table>
  );
}
```

### 4. Extract Child Components

Sometimes the cleanest solution is to pull complex JSX into separate components:

```tsx
// ❌ Recreates complex config object every render
function Dashboard({ user }: { user: User }) {
  return (
    <UserChart
      user={user}
      config={{
        showTooltips: true,
        animationDuration: 300,
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
        legend: { position: 'bottom', fontSize: 12 },
      }}
    />
  );
}

// ✅ Stable component with stable config
const CHART_CONFIG = {
  showTooltips: true,
  animationDuration: 300,
  colors: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
  legend: { position: 'bottom' as const, fontSize: 12 },
};

function UserChartSection({ user }: { user: User }) {
  return <UserChart user={user} config={CHART_CONFIG} />;
}

function Dashboard({ user }: { user: User }) {
  return <UserChartSection user={user} />;
}
```

## Context Value Patterns

Context is where identity stability matters most, because unstable values cause every consumer to re-render. Here are patterns that work:

### Split Context by Update Frequency

Instead of one big context, split values that change at different rates:

```tsx
// ✅ Theme rarely changes - separate context
const ThemeContext = createContext<{
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}>(null!);

// ✅ User data changes more frequently - separate context
const UserContext = createContext<{
  user: User | null;
  updateUser: (data: Partial<User>) => void;
}>(null!);

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState<User | null>(null);

  // ✅ Stable theme context value
  const themeValue = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
    }),
    [theme],
  );

  // ✅ Stable user context value
  const userValue = useMemo(
    () => ({
      user,
      updateUser: (data: Partial<User>) => setUser((prev) => (prev ? { ...prev, ...data } : null)),
    }),
    [user],
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <UserContext.Provider value={userValue}>
        <Dashboard />
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}
```

### Use Reducers for Complex State

When context manages complex state with multiple update patterns, reducers provide stable dispatch functions:

```tsx
type AppState = {
  user: User | null;
  settings: Settings;
  notifications: Notification[];
};

type AppAction =
  | { type: 'SET_USER'; user: User }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<Settings> }
  | { type: 'ADD_NOTIFICATION'; notification: Notification };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.user };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.notification],
      };
    default:
      return state;
  }
}

function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
    user: null,
    settings: {},
    notifications: [],
  });

  // ✅ dispatch is always stable - no useMemo needed!
  const value = useMemo(
    () => ({
      ...state,
      dispatch,
    }),
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
```

## Common Anti-Patterns to Avoid

### Don't Memoize Everything

The cure can be worse than the disease. Only memoize when there's a real performance benefit:

```tsx
// ❌ Unnecessary memoization for simple values
const userName = useMemo(() => user?.name ?? 'Guest', [user]);
const isLoggedIn = useMemo(() => !!user, [user]);

// ✅ Simple derivations don't need memoization
const userName = user?.name ?? 'Guest';
const isLoggedIn = !!user;
```

### Don't Memoize Props You Pass Down Immediately

If you're just passing memoized values as props, you might not need the memoization:

```tsx
// ❌ Memoizing just to pass down immediately
function Parent({ data }: { data: Item[] }) {
  const sortedData = useMemo(() => data.sort((a, b) => a.name.localeCompare(b.name)), [data]);

  return <Child data={sortedData} />;
}

// ✅ Let the child decide if it needs memoization
function Parent({ data }: { data: Item[] }) {
  return <Child data={data} />;
}

const Child = React.memo(({ data }: { data: Item[] }) => {
  const sortedData = useMemo(() => data.sort((a, b) => a.name.localeCompare(b.name)), [data]);

  return <div>{/* render sorted data */}</div>;
});
```

### Don't Over-Extract Dependencies

Including more dependencies than necessary defeats the purpose:

```tsx
// ❌ Too many dependencies
const expensiveValue = useMemo(() => {
  return data.filter((item) => item.category === selectedCategory);
}, [data, selectedCategory, user, theme, router]);
//     ^^^ user, theme, router don't affect the computation!

// ✅ Only include what actually matters
const expensiveValue = useMemo(() => {
  return data.filter((item) => item.category === selectedCategory);
}, [data, selectedCategory]);
```

## Debugging Identity Issues

When you suspect identity instability is causing performance problems, here's how to track it down:

### Use React DevTools Profiler

The Profiler shows you which components are re-rendering and why:

1. Install React DevTools browser extension
2. Open the Profiler tab
3. Click "Start profiling"
4. Interact with your app
5. Look for components that render more than expected

### Add Debug Logs

Temporarily log when expensive operations run:

```tsx
const expensiveComputation = useMemo(() => {
  console.log('🔄 Recomputing expensive value');
  return data.reduce((acc, item) => {
    // expensive work
    return acc + item.value;
  }, 0);
}, [data]);
```

### Use why-did-you-render

The [`why-did-you-render`](https://github.com/welldone-software/why-did-you-render) library can automatically detect and log unnecessary re-renders:

```tsx
// Install: npm install @welldone-software/why-did-you-render

// In development only:
if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}

// Then flag components you want to monitor:
const MyComponent = React.memo(() => <div>Hello</div>);
MyComponent.whyDidYouRender = true;
```

## Real-World Example: Shopping Cart

Let's put it all together with a realistic shopping cart example that demonstrates both problems and solutions:

```tsx
// ❌ Problematic version with identity issues
function ShoppingApp() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  return (
    <CartContext.Provider
      value={{
        items: cartItems,
        addItem: (item) => setCartItems((prev) => [...prev, item]),
        removeItem: (id) => setCartItems((prev) => prev.filter((i) => i.id !== id)),
        total: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        user,
        discounts: discounts.filter((d) => d.isActive), // New array every render!
      }}
    >
      <ShoppingCart />
    </CartContext.Provider>
  );
}
```

```tsx
// ✅ Optimized version with stable identities
type CartState = {
  items: CartItem[];
  user: User | null;
  discounts: Discount[];
};

type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'SET_USER'; user: User | null }
  | { type: 'SET_DISCOUNTS'; discounts: Discount[] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.item] };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.id),
      };
    case 'SET_USER':
      return { ...state, user: action.user };
    case 'SET_DISCOUNTS':
      return { ...state, discounts: action.discounts };
    default:
      return state;
  }
}

function ShoppingApp() {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    user: null,
    discounts: [],
  });

  // ✅ Memoize expensive computations
  const total = useMemo(
    () => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [state.items],
  );

  const activeDiscounts = useMemo(
    () => state.discounts.filter((discount) => discount.isActive),
    [state.discounts],
  );

  // ✅ Stable context value
  const contextValue = useMemo(
    () => ({
      ...state,
      total,
      activeDiscounts,
      dispatch,
    }),
    [state, total, activeDiscounts],
  );

  return (
    <CartContext.Provider value={contextValue}>
      <ShoppingCart />
    </CartContext.Provider>
  );
}
```

## When Performance Actually Matters

Remember, premature optimization is still the root of all evil. Focus on identity stability when:

1. **You've identified actual performance problems** through profiling
2. **You're working with large datasets** (hundreds or thousands of items)
3. **You have deeply nested component trees** where re-renders cascade
4. **Users report sluggish interactions** during typing, scrolling, or animations

For small applications with simple component trees, the overhead of `useMemo` and `useCallback` might outweigh their benefits. Start simple, measure performance, then optimize where it matters.

Identity stability is a powerful tool in your React performance toolkit. Use it judiciously, and your applications will stay responsive as they grow in complexity. The goal isn't to eliminate every re-render—it's to eliminate the ones that hurt your user experience.
