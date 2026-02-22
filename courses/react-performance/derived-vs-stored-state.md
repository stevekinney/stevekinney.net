---
title: Derived vs Stored State
description: >-
  Store less, derive more. Compute on demand to avoid desyncs, extra memory, and
  unnecessary re-renders.
date: 2025-09-06T21:49:55.844Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - state-management
  - architecture
---

State management in React often feels like a balancing act between "store everything" and "compute everything." But here's the thing—most developers lean too heavily toward storing state when they should be deriving it. When you store redundant state that can be computed from other values, you're signing up for synchronization bugs, extra memory usage, and unnecessary re-renders. Let's explore when to store state versus when to derive it, and how making the right choice can dramatically improve your app's performance and reliability.

The golden rule? **Store the minimal amount of state needed, then derive everything else.** Think of it like a well-designed database schema—you normalize your data to eliminate redundancy, then use queries (or in React's case, computations) to get the views you need.

## The Problem with Over-Storing State

Let's start with a common anti-pattern. Imagine you're building a shopping cart component that needs to display items, total price, and item count:

```tsx
// ❌ Storing too much state
function ShoppingCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const addItem = (item: CartItem) => {
    const newItems = [...items, item];
    setItems(newItems);
    setTotal(newItems.reduce((sum, i) => sum + i.price, 0));
    setItemCount(newItems.length);
  };

  // ... more methods that need to keep everything in sync
}
```

This approach has several problems:

1. **Synchronization bugs**: If you forget to update `total` or `itemCount` in any method, your UI becomes inconsistent
2. **Extra re-renders**: Each `setState` call triggers a re-render, so adding one item causes three re-renders
3. **Memory overhead**: You're storing data that could be computed on demand
4. **Brittle code**: Every time you add a new computed value, you need to remember to update it everywhere

## The Derived State Solution

Here's the same component using derived state:

```tsx
// ✅ Store minimal state, derive the rest
function ShoppingCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  // Derive everything else from the single source of truth
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const itemCount = items.length;

  const addItem = (item: CartItem) => {
    setItems((prev) => [...prev, item]);
    // That's it! No need to manually update derived values
  };

  return (
    <div>
      <p>Items: {itemCount}</p>
      <p>Total: ${total.toFixed(2)}</p>
      {items.map((item) => (
        <CartItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

Now you have a single source of truth (`items`), and everything else is computed from it. No synchronization bugs, fewer re-renders, and much simpler code to maintain.

## When to Store vs. When to Derive

Here's a practical framework for making the decision:

### Store state when:

- **It's user input**: Form fields, toggles, selections
- **It's fetched from external sources**: API responses, local storage data
- **It represents a distinct piece of application state**: Current user, active tab, modal open/closed
- **Computing it is expensive**: Complex calculations that would hurt performance if run on every render

### Derive state when:

- **It can be computed from existing state**: Totals, counts, filtered lists
- **It's a transformation of existing data**: Formatted dates, uppercase text, validation results
- **It's a boolean condition**: "Is the form valid?", "Are all items selected?"
- **The computation is cheap**: Simple math, array operations, string manipulation

## Real-World Example: User Management

Let's look at a more realistic example—a user management interface that displays users with filtering and sorting:

```tsx
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  lastLogin: Date;
  isActive: boolean;
}

// ✅ Storing only what we need, deriving the rest
function UserManagement() {
  // Stored state - the minimal set we need
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState<keyof User>('name');

  // Derived state - computed from the stored state
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
  });

  const activeUserCount = users.filter((user) => user.isActive).length;
  const adminCount = users.filter((user) => user.role === 'admin').length;

  return (
    <div>
      <div className="stats">
        <span>Total Users: {users.length}</span>
        <span>Active: {activeUserCount}</span>
        <span>Admins: {adminCount}</span>
        <span>Showing: {sortedUsers.length}</span>
      </div>

      <SearchAndFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <UserList users={sortedUsers} />
    </div>
  );
}
```

Notice how we only store the essential state:

- `users`: The source data
- `searchQuery`: User input for filtering
- `selectedRole`: User's filter choice
- `sortBy`: User's sort preference

Everything else is derived on each render. This keeps our component simple and eliminates synchronization issues.

## Performance Considerations with `useMemo`

Sometimes derived state computations can be expensive. That's where `useMemo` comes in:

```tsx
function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  // Expensive filtering operation - memoize it
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Imagine this involves complex logic or API calls
      const matchesSearch = performExpensiveSearchMatch(user, searchQuery);
      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, selectedRole]);

  // Cheap computation - no need to memoize
  const userCount = users.length;
  const activeCount = users.filter((user) => user.isActive).length;

  return (
    <div>
      <p>
        Filtered: {filteredUsers.length} of {userCount}
      </p>
      <p>Active: {activeCount}</p>
      {/* ... */}
    </div>
  );
}
```

> [!TIP]
> Don't reach for `useMemo` immediately. Profile first, then optimize. Most computations in typical React apps are fast enough to run on every render.

## Common Patterns and Pitfalls

### Pattern: Form Validation

```tsx
// ✅ Good: Derive validation state
function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // Derived validation state
  const isNameValid = name.length > 0;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isMessageValid = message.length >= 10;
  const isFormValid = isNameValid && isEmailValid && isMessageValid;

  return (
    <form>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={isNameValid ? '' : 'error'}
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={isEmailValid ? '' : 'error'}
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className={isMessageValid ? '' : 'error'}
      />
      <button type="submit" disabled={!isFormValid}>
        Send Message
      </button>
    </form>
  );
}
```

### Anti-Pattern: Storing Computed Values

```tsx
// ❌ Bad: Storing what should be derived
function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [discountedProducts, setDiscountedProducts] = useState<Product[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  const addProduct = (product: Product) => {
    const newProducts = [...products, product];
    setProducts(newProducts);

    // Now you have to remember to update these derived values!
    setDiscountedProducts(newProducts.filter((p) => p.discount > 0));
    setTotalValue(newProducts.reduce((sum, p) => sum + p.price, 0));
  };

  // What happens if you forget to update derived state in removeProduct?
  // Your UI becomes inconsistent!
}
```

### Pattern: Conditional Rendering

```tsx
// ✅ Good: Derive UI state
function Dashboard({ user }: { user: User }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Derive UI state from stored data
  const hasUnreadNotifications = notifications.some((n) => !n.read);
  const overdueTasks = tasks.filter((task) => task.dueDate < new Date() && !task.completed);
  const showUrgentAlert = overdueTasks.length > 0;
  const greetingMessage = `Good ${getTimeOfDay()}, ${user.name}!`;

  return (
    <div>
      <header>
        <h1>{greetingMessage}</h1>
        <NotificationBell hasUnread={hasUnreadNotifications} />
      </header>

      {showUrgentAlert && (
        <Alert type="warning">You have {overdueTasks.length} overdue tasks!</Alert>
      )}

      {/* ... */}
    </div>
  );
}
```

## Advanced: Custom Hooks for Derived State

For complex derived state logic, consider extracting it into custom hooks:

```tsx
function useFilteredAndSortedData<T>(data: T[], filterFn: (item: T) => boolean, sortKey: keyof T) {
  return useMemo(() => {
    const filtered = data.filter(filterFn);
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });
  }, [data, filterFn, sortKey]);
}

function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState<keyof Product>('name');

  const filteredProducts = useFilteredAndSortedData(
    products,
    (product) => category === 'all' || product.category === category,
    sortBy,
  );

  return (
    <div>
      <CategoryFilter value={category} onChange={setCategory} />
      <SortControls value={sortBy} onChange={setSortBy} />
      <ProductGrid products={filteredProducts} />
    </div>
  );
}
```

## The Performance Trade-offs

### Deriving State (Pros and Cons)

**Pros:**

- Single source of truth eliminates sync bugs
- Fewer state updates mean fewer re-renders
- Less memory usage
- Simpler, more maintainable code

**Cons:**

- Computation happens on every render
- Can be expensive for complex calculations
- No control over when computation happens

### Storing Computed State (Pros and Cons)

**Pros:**

- Control over when expensive computations run
- Can optimize with techniques like debouncing
- Immediate access to computed values

**Cons:**

- Risk of synchronization bugs
- More complex code to maintain
- Higher memory usage
- More re-renders from multiple state updates

## Guidelines for Real-World Applications

1. **Start with derived state by default**. Only move to stored state when you have a performance problem.

2. **Profile before optimizing**. Most computations are fast enough to run on every render.

3. **Use `useMemo` for expensive computations**, but don't overuse it—it has its own overhead.

4. **Consider the user experience**. A slight computation delay might be better than a sync bug that shows wrong data.

5. **Test your state management**. Write tests that verify your computed values stay in sync with your stored state.
