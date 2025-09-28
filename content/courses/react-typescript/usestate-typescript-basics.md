---
title: useState with TypeScript - The Basics
description: >-
  Master TypeScript with React's useState hook—from type inference patterns to
  explicit typing strategies for bulletproof state management.
date: 2025-09-27T12:00:00.000Z
modified: '2025-09-27T22:02:11.457Z'
published: true
tags:
  - react
  - typescript
  - hooks
  - state-management
  - useState
---

When you combine React's `useState` hook with TypeScript, you get a powerful duo that catches bugs before they happen. But there's more to it than just slapping types on your state variables. Understanding how TypeScript infers types, when to be explicit, and how to handle complex state shapes will transform your React development experience from "hoping it works" to "knowing it works."

In this tutorial, we'll build up from the simplest useState patterns to handling complex state shapes, using the JSONPlaceholder todos API as our real-world example throughout.

## Type Inference: When TypeScript Just Knows

TypeScript is smart about inferring types from initial values. For simple primitives, you often don't need explicit types:

```tsx
import { useState } from 'react';

function TodoCounter() {
  // TypeScript infers these types automatically
  const [count, setCount] = useState(0); // number
  const [title, setTitle] = useState(''); // string
  const [isDone, setIsDone] = useState(false); // boolean

  return (
    <div>
      <p>Todos completed: {count}</p>
      <button onClick={() => setCount(count + 1)}>Mark one complete</button>

      {/* TypeScript ensures type safety */}
      <button onClick={() => setCount('five')}>
        {' '}
        {/* ❌ Error: string not assignable to number */}
        This won't compile
      </button>
    </div>
  );
}
```

The beauty here? TypeScript automatically types `setCount` to only accept numbers or a function that returns a number. You get compile-time safety without writing a single type annotation.

## When Inference Isn't Enough: Being Explicit

While inference is great for primitives, you'll need to be explicit in several common scenarios:

### Empty Arrays: The Classic Trap

```tsx
function TodoList() {
  // ❌ Bad: TypeScript infers never[] - you can't add anything!
  const [items, setItems] = useState([]);

  // This will cause a TypeScript error
  setItems(['Buy milk']); // Error: Type 'string' is not assignable to type 'never'
}
```

The fix? Be explicit about what the array will contain:

```tsx
function TodoList() {
  // ✅ Good: Explicitly typed array
  const [items, setItems] = useState<string[]>([]);

  // Now this works perfectly
  setItems(['Buy milk', 'Walk the dog']);

  // TypeScript still protects you
  setItems([1, 2, 3]); // ❌ Error: number[] not assignable to string[]
}
```

### Union Types for Constrained Values

When your state should only be certain specific values, guide TypeScript with union types:

```tsx
type FilterStatus = 'all' | 'active' | 'completed';

function TodoFilter() {
  // Without explicit typing, TypeScript infers 'string'
  const [filter, setFilter] = useState<FilterStatus>('all');

  // TypeScript ensures only valid values
  setFilter('completed'); // ✅ Works
  setFilter('pending'); // ❌ Error: 'pending' not assignable to FilterStatus

  return (
    <div>
      <button onClick={() => setFilter('all')}>All</button>
      <button onClick={() => setFilter('active')}>Active</button>
      <button onClick={() => setFilter('completed')}>Completed</button>
    </div>
  );
}
```

## Working with Objects: The Todo Type

Let's define our Todo type based on the JSONPlaceholder API structure:

```tsx
interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

function TodoItem() {
  // Single todo item (can be null initially)
  const [todo, setTodo] = useState<Todo | null>(null);

  // Array of todos
  const [todos, setTodos] = useState<Todo[]>([]);

  // Example: Adding a new todo
  const addTodo = (title: string) => {
    const newTodo: Todo = {
      userId: 1,
      id: Date.now(), // Temporary ID
      title,
      completed: false,
    };

    setTodos((prev) => [...prev, newTodo]);
  };

  // Example: Toggling completion
  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
    );
  };

  return (
    <div>
      {todos.map((todo) => (
        <div key={todo.id}>
          <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
          <span>{todo.title}</span>
        </div>
      ))}
    </div>
  );
}
```

## The Null/Undefined Pattern for Async Data

When data hasn't loaded yet, using `null` or `undefined` as initial state is a common pattern:

```tsx
function TodoDetail({ todoId }: { todoId: number }) {
  // null indicates "not loaded yet"
  const [todo, setTodo] = useState<Todo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load todo on mount
  useEffect(() => {
    fetch(`https://jsonplaceholder.typicode.com/todos/${todoId}`)
      .then((res) => res.json())
      .then((data: Todo) => setTodo(data))
      .catch((err) => setError(err.message));
  }, [todoId]);

  // TypeScript makes you handle all cases
  if (error) return <div>Error: {error}</div>;
  if (!todo) return <div>Loading...</div>;

  // TypeScript knows todo is definitely Todo here (not null)
  return (
    <div>
      <h2>{todo.title}</h2>
      <p>Status: {todo.completed ? 'Done' : 'Pending'}</p>
    </div>
  );
}
```

## Functional Updates: The Safe Way

When your next state depends on the previous state, use the functional update pattern. TypeScript automatically infers the parameter type:

```tsx
function TodoStats() {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    active: 0,
  });

  // TypeScript knows 'prev' has the shape of our stats object
  const incrementCompleted = () => {
    setStats((prev) => ({
      ...prev,
      completed: prev.completed + 1,
      active: prev.active - 1,
    }));
  };

  // This pattern prevents stale closure bugs
  const batchUpdate = () => {
    // All three updates will use the latest state
    setStats((prev) => ({ ...prev, total: prev.total + 1 }));
    setStats((prev) => ({ ...prev, active: prev.active + 1 }));
    setStats((prev) => ({ ...prev, total: prev.total + 1 }));
  };

  return (
    <div>
      <p>Total: {stats.total}</p>
      <p>Completed: {stats.completed}</p>
      <p>Active: {stats.active}</p>
    </div>
  );
}
```

## Complex State: When to Split vs. Combine

Deciding whether to use multiple `useState` calls or combine state into an object depends on how the values relate:

```tsx
// ✅ Good: Related values that change together
function TodoForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // All form data is together
    console.log('Submitting:', formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.title}
        onChange={(e) =>
          setFormData((prev) => ({
            ...prev,
            title: e.target.value,
          }))
        }
      />
      {/* Other fields... */}
    </form>
  );
}

// ✅ Good: Separate concerns that change independently
function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Each piece of state has a single responsibility
  // They can be updated independently without affecting others
}
```

## Generic Custom Hooks with useState

Create reusable stateful logic with generic custom hooks:

```tsx
// Generic hook for any toggleable value
function useToggle<T>(initialValue: T, alternateValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  const toggle = useCallback(() => {
    setValue((current) => (current === initialValue ? alternateValue : initialValue));
  }, [initialValue, alternateValue]);

  return [value, toggle, setValue] as const;
}

// Usage with different types
function TodoControls() {
  const [view, toggleView] = useToggle('list', 'grid');
  const [isDark, toggleTheme] = useToggle(false, true);
  const [sortOrder, toggleSort] = useToggle<'asc' | 'desc'>('asc', 'desc');

  return (
    <div>
      <button onClick={toggleView}>View: {view}</button>
      <button onClick={toggleTheme}>Theme: {isDark ? 'Dark' : 'Light'}</button>
      <button onClick={toggleSort}>Sort: {sortOrder}</button>
    </div>
  );
}
```

## Common Pitfalls and How to Avoid Them

### Pitfall 1: Mutating State Directly

```tsx
function TodoMutationBug() {
  const [todos, setTodos] = useState<Todo[]>([]);

  // ❌ Bad: Mutating state directly
  const buggyAddTodo = (newTodo: Todo) => {
    todos.push(newTodo); // This mutates the existing array
    setTodos(todos); // React won't re-render!
  };

  // ✅ Good: Creating a new array
  const correctAddTodo = (newTodo: Todo) => {
    setTodos([...todos, newTodo]); // New array reference
  };

  // ✅ Better: Using functional update
  const bestAddTodo = (newTodo: Todo) => {
    setTodos((prev) => [...prev, newTodo]); // Always uses latest state
  };
}
```

### Pitfall 2: Stale Closures in Event Handlers

```tsx
function StaleClosureExample() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // ❌ Bad: count is captured and becomes stale
    const timer = setInterval(() => {
      setCount(count + 1); // Always adds to the initial count!
    }, 1000);

    return () => clearInterval(timer);
  }, []); // Empty deps means count is captured once

  // ✅ Good: Using functional update
  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prev) => prev + 1); // Always uses current value
    }, 1000);

    return () => clearInterval(timer);
  }, []); // Now the empty deps array is safe
}
```

### Pitfall 3: Over-specifying Types

```tsx
// ❌ Unnecessary: TypeScript can infer this
const [name, setName] = useState<string>('');

// ✅ Let inference work for simple cases
const [name, setName] = useState('');

// ✅ Be explicit only when needed
const [user, setUser] = useState<User | null>(null);
const [items, setItems] = useState<string[]>([]);
```

## Performance Tips

### Tip 1: Lazy Initial State

When initial state requires expensive computation, use a function:

```tsx
function ExpensiveComponent() {
  // ❌ This runs on every render
  const [data, setData] = useState(expensiveComputation());

  // ✅ This runs only once
  const [data, setData] = useState(() => expensiveComputation());

  // Real example: parsing localStorage
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('todos');
    return saved ? JSON.parse(saved) : [];
  });
}
```

### Tip 2: Batching State Updates

React automatically batches updates in event handlers:

```tsx
function TodoBatching() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [count, setCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleClick = () => {
    // These are automatically batched - one re-render
    setTodos([]);
    setCount(0);
    setLastUpdate(new Date());
  };

  // In async code, updates are also batched in React 18+
  const handleAsync = async () => {
    const response = await fetch('https://jsonplaceholder.typicode.com/todos');
    const data = await response.json();

    // Still batched in React 18+
    setTodos(data);
    setCount(data.length);
    setLastUpdate(new Date());
  };
}
```

## Putting It Together: A Complete Example

Here's everything we've learned in a practical todo list component:

```tsx
interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

type FilterStatus = 'all' | 'active' | 'completed';

function TodoManager() {
  // Multiple pieces of state with proper typing
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed value based on state
  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  // Add a new todo
  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    const newTodo: Todo = {
      userId: 1,
      id: Date.now(),
      title: newTodoTitle,
      completed: false,
    };

    setTodos((prev) => [...prev, newTodo]);
    setNewTodoTitle('');
  };

  // Toggle todo completion
  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
    );
  };

  // Delete a todo
  const deleteTodo = (id: number) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  return (
    <div>
      <h1>Todo Manager</h1>

      {/* Add new todo form */}
      <form onSubmit={addTodo}>
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit">Add</button>
      </form>

      {/* Filter buttons */}
      <div>
        <button onClick={() => setFilter('all')} disabled={filter === 'all'}>
          All ({todos.length})
        </button>
        <button onClick={() => setFilter('active')} disabled={filter === 'active'}>
          Active ({todos.filter((t) => !t.completed).length})
        </button>
        <button onClick={() => setFilter('completed')} disabled={filter === 'completed'}>
          Completed ({todos.filter((t) => t.completed).length})
        </button>
      </div>

      {/* Todo list */}
      {error && <div>Error: {error}</div>}
      {isLoading && <div>Loading...</div>}

      <ul>
        {filteredTodos.map((todo) => (
          <li key={todo.id}>
            <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
            <span
              style={{
                textDecoration: todo.completed ? 'line-through' : 'none',
              }}
            >
              {todo.title}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Key Takeaways

1. **Let TypeScript infer when possible** - For simple primitives, TypeScript's inference is usually sufficient
2. **Be explicit with complex types** - Arrays, objects, and unions need explicit typing
3. **Use union types with null** - The `Type | null` pattern is perfect for async data
4. **Prefer functional updates** - They prevent stale closure bugs and are more predictable
5. **Split state by concern** - Keep unrelated state separate for cleaner code
6. **Initialize expensive state lazily** - Use functions for expensive initial computations

## What's Next?

Now that you understand the fundamentals of useState with TypeScript, you're ready to tackle async data fetching. In the next tutorial, we'll combine useState with useEffect to fetch real todos from the JSONPlaceholder API, handle loading states, and manage errors—all with complete type safety.

## See Also

- [React State Management with TypeScript](react-state-management-with-typescript.md) - Deep dive into useReducer and complex state patterns
- [Fetching Data with useState and useEffect](fetching-data-usestate.md) - Next tutorial in this series
- [TypeScript Type Inference Mastery](typescript-type-inference-mastery.md) - Understanding how TypeScript infers types
