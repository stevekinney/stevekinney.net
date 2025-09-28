---
title: Full CRUD Todo App - Putting It All Together
description: >-
  Build a production-ready todo application with complete CRUD operations,
  optimistic updates, error handling, and TypeScript throughout—your complete
  guide to real-world React development.
date: 2025-09-27T12:00:00.000Z
modified: '2025-09-27T22:15:36.078Z'
published: true
tags:
  - react
  - typescript
  - crud
  - todo-app
  - production-ready
---

It's time to bring everything together. We've learned how to create, read, update, and delete todos with TypeScript. Now let's build a complete, production-ready todo application that combines all these operations with proper state management, error handling, and a great user experience.

This is the culmination of everything we've learned—a real-world application with all the features users expect.

## Project Setup and Types

First, let's define our comprehensive type system:

```tsx
// Core todo type matching JSONPlaceholder API
interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

// Extended todo with local state
interface LocalTodo extends Todo {
  isOptimistic?: boolean;
  isDeleting?: boolean;
  isUpdating?: boolean;
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// API response types
interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Filter and sort options
type FilterStatus = 'all' | 'active' | 'completed';
type SortField = 'id' | 'title' | 'completed' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface TodoFilters {
  status: FilterStatus;
  search: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}

// App state
interface AppState {
  todos: LocalTodo[];
  filters: TodoFilters;
  isLoading: boolean;
  error: string | null;
  selectedIds: Set<number>;
  undoStack: LocalTodo[];
}
```

## API Service Layer

Create a service layer for all API operations:

```tsx
class TodoAPI {
  private baseURL = 'https://jsonplaceholder.typicode.com';

  async fetchTodos(): Promise<Todo[]> {
    const response = await fetch(`${this.baseURL}/todos`);
    if (!response.ok) throw new Error('Failed to fetch todos');
    return response.json();
  }

  async createTodo(data: Omit<Todo, 'id'>): Promise<Todo> {
    const response = await fetch(`${this.baseURL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create todo');
    return response.json();
  }

  async updateTodo(id: number, updates: Partial<Todo>): Promise<Todo> {
    const response = await fetch(`${this.baseURL}/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update todo');
    return response.json();
  }

  async deleteTodo(id: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/todos/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete todo');
  }
}

const todoAPI = new TodoAPI();
```

## Main Todo App Component

Now the main application with all CRUD operations:

```tsx
function TodoApp() {
  const [todos, setTodos] = useState<LocalTodo[]>([]);
  const [filters, setFilters] = useState<TodoFilters>({
    status: 'all',
    search: '',
    sortBy: 'id',
    sortOrder: 'asc',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [undoStack, setUndoStack] = useState<LocalTodo[]>([]);

  // Load todos on mount
  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await todoAPI.fetchTodos();
      setTodos(
        data.map((todo) => ({
          ...todo,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load todos');
    } finally {
      setIsLoading(false);
    }
  };

  // CREATE
  const createTodo = async (title: string) => {
    if (!title.trim()) return;

    const tempId = -Date.now();
    const optimisticTodo: LocalTodo = {
      id: tempId,
      userId: 1,
      title: title.trim(),
      completed: false,
      isOptimistic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add optimistic todo
    setTodos((prev) => [optimisticTodo, ...prev]);

    try {
      const created = await todoAPI.createTodo({
        userId: 1,
        title: title.trim(),
        completed: false,
      });

      // Replace optimistic with real
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === tempId
            ? { ...created, createdAt: optimisticTodo.createdAt, updatedAt: new Date() }
            : todo,
        ),
      );
    } catch (err) {
      // Remove optimistic on failure
      setTodos((prev) => prev.filter((todo) => todo.id !== tempId));
      setError(err instanceof Error ? err.message : 'Failed to create todo');
    }
  };

  // UPDATE
  const updateTodo = async (id: number, updates: Partial<Todo>) => {
    const originalTodo = todos.find((t) => t.id === id);
    if (!originalTodo) return;

    // Optimistic update
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, ...updates, isUpdating: true, updatedAt: new Date() } : todo,
      ),
    );

    try {
      const updated = await todoAPI.updateTodo(id, updates);

      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...updated, isUpdating: false, updatedAt: new Date() } : todo,
        ),
      );
    } catch (err) {
      // Rollback on failure
      setTodos((prev) =>
        prev.map((todo) => (todo.id === id ? { ...originalTodo, error: 'Update failed' } : todo)),
      );
    }
  };

  // DELETE
  const deleteTodo = async (id: number) => {
    const todoToDelete = todos.find((t) => t.id === id);
    if (!todoToDelete) return;

    // Add to undo stack
    setUndoStack((prev) => [...prev, todoToDelete]);

    // Mark as deleting
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, isDeleting: true } : todo)));

    try {
      await todoAPI.deleteTodo(id);

      // Remove from todos
      setTodos((prev) => prev.filter((todo) => todo.id !== id));

      // Auto-clear undo after 5 seconds
      setTimeout(() => {
        setUndoStack((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    } catch (err) {
      // Restore on failure
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todoToDelete, isDeleting: false, error: 'Delete failed' } : todo,
        ),
      );
    }
  };

  // UNDO DELETE
  const undoDelete = (todo: LocalTodo) => {
    setTodos((prev) => [...prev, { ...todo, isDeleting: false }].sort((a, b) => a.id - b.id));
    setUndoStack((prev) => prev.filter((t) => t.id !== todo.id));
  };

  // BATCH OPERATIONS
  const toggleSelected = async () => {
    const todosToToggle = todos.filter((t) => selectedIds.has(t.id));
    const newCompletedState = !todosToToggle.every((t) => t.completed);

    // Optimistic update all selected
    setTodos((prev) =>
      prev.map((todo) =>
        selectedIds.has(todo.id)
          ? { ...todo, completed: newCompletedState, isUpdating: true }
          : todo,
      ),
    );

    // Update each on server
    const results = await Promise.allSettled(
      Array.from(selectedIds).map((id) => todoAPI.updateTodo(id, { completed: newCompletedState })),
    );

    // Handle results
    results.forEach((result, index) => {
      const todoId = Array.from(selectedIds)[index];
      if (result.status === 'fulfilled') {
        setTodos((prev) =>
          prev.map((todo) =>
            todo.id === todoId ? { ...todo, isUpdating: false, updatedAt: new Date() } : todo,
          ),
        );
      } else {
        setTodos((prev) =>
          prev.map((todo) =>
            todo.id === todoId ? { ...todo, isUpdating: false, error: 'Update failed' } : todo,
          ),
        );
      }
    });

    setSelectedIds(new Set());
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.size} todo${selectedIds.size > 1 ? 's' : ''}?`,
    );

    if (!confirmed) return;

    for (const id of selectedIds) {
      await deleteTodo(id);
    }

    setSelectedIds(new Set());
  };

  // FILTERING AND SORTING
  const filteredAndSortedTodos = useMemo(() => {
    let result = [...todos];

    // Filter by status
    if (filters.status === 'active') {
      result = result.filter((t) => !t.completed);
    } else if (filters.status === 'completed') {
      result = result.filter((t) => t.completed);
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(searchLower));
    }

    // Sort
    result.sort((a, b) => {
      let compareValue = 0;

      switch (filters.sortBy) {
        case 'title':
          compareValue = a.title.localeCompare(b.title);
          break;
        case 'completed':
          compareValue = Number(a.completed) - Number(b.completed);
          break;
        case 'createdAt':
          compareValue = (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
          break;
        default:
          compareValue = a.id - b.id;
      }

      return filters.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return result;
  }, [todos, filters]);

  return (
    <div className="todo-app">
      <Header />

      <CreateTodoForm onSubmit={createTodo} />

      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        todoCount={{
          total: todos.length,
          active: todos.filter((t) => !t.completed).length,
          completed: todos.filter((t) => t.completed).length,
        }}
      />

      {selectedIds.size > 0 && (
        <BulkActions
          selectedCount={selectedIds.size}
          onToggleComplete={toggleSelected}
          onDelete={deleteSelected}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error} onRetry={loadTodos} />
      ) : (
        <TodoList
          todos={filteredAndSortedTodos}
          selectedIds={selectedIds}
          onToggleSelect={(id) => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) {
                next.delete(id);
              } else {
                next.add(id);
              }
              return next;
            });
          }}
          onToggleComplete={(id) =>
            updateTodo(id, {
              completed: !todos.find((t) => t.id === id)?.completed,
            })
          }
          onUpdate={updateTodo}
          onDelete={deleteTodo}
        />
      )}

      {undoStack.length > 0 && <UndoNotification todos={undoStack} onUndo={undoDelete} />}
    </div>
  );
}
```

## Key Components

### Create Todo Form

```tsx
interface CreateTodoFormProps {
  onSubmit: (title: string) => void;
}

function CreateTodoForm({ onSubmit }: CreateTodoFormProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (title.length < 3) {
      setError('Title must be at least 3 characters');
      return;
    }

    onSubmit(title);
    setTitle('');
    setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="create-todo-form">
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setError('');
        }}
        placeholder="What needs to be done?"
        className={error ? 'error' : ''}
      />
      <button type="submit">Add Todo</button>
      {error && <span className="error-text">{error}</span>}
    </form>
  );
}
```

### Todo List Item

```tsx
interface TodoListItemProps {
  todo: LocalTodo;
  isSelected: boolean;
  onToggleSelect: () => void;
  onToggleComplete: () => void;
  onUpdate: (updates: Partial<Todo>) => void;
  onDelete: () => void;
}

function TodoListItem({
  todo,
  isSelected,
  onToggleSelect,
  onToggleComplete,
  onUpdate,
  onDelete,
}: TodoListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle !== todo.title) {
      onUpdate({ title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(todo.title);
    setIsEditing(false);
  };

  return (
    <li
      className={`todo-item ${todo.isOptimistic ? 'optimistic' : ''} ${
        todo.isDeleting ? 'deleting' : ''
      }`}
    >
      <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />

      <input
        type="checkbox"
        checked={todo.completed}
        onChange={onToggleComplete}
        disabled={todo.isUpdating}
      />

      {isEditing ? (
        <div className="edit-form">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') handleCancelEdit();
            }}
            autoFocus
          />
          <button onClick={handleSaveEdit}>Save</button>
          <button onClick={handleCancelEdit}>Cancel</button>
        </div>
      ) : (
        <span
          className={`title ${todo.completed ? 'completed' : ''}`}
          onDoubleClick={() => setIsEditing(true)}
        >
          {todo.title}
        </span>
      )}

      <div className="actions">
        <button onClick={() => setIsEditing(true)}>Edit</button>
        <button onClick={onDelete} disabled={todo.isDeleting}>
          Delete
        </button>
      </div>

      {todo.error && <span className="error">{todo.error}</span>}
      {todo.isOptimistic && <span className="status">Saving...</span>}
      {todo.isUpdating && <span className="status">Updating...</span>}
      {todo.isDeleting && <span className="status">Deleting...</span>}
    </li>
  );
}
```

### Filter Bar

```tsx
interface FilterBarProps {
  filters: TodoFilters;
  onFilterChange: (filters: TodoFilters) => void;
  todoCount: {
    total: number;
    active: number;
    completed: number;
  };
}

function FilterBar({ filters, onFilterChange, todoCount }: FilterBarProps) {
  const updateFilter = <K extends keyof TodoFilters>(key: K, value: TodoFilters[K]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="filter-bar">
      <div className="status-filters">
        <button
          className={filters.status === 'all' ? 'active' : ''}
          onClick={() => updateFilter('status', 'all')}
        >
          All ({todoCount.total})
        </button>
        <button
          className={filters.status === 'active' ? 'active' : ''}
          onClick={() => updateFilter('status', 'active')}
        >
          Active ({todoCount.active})
        </button>
        <button
          className={filters.status === 'completed' ? 'active' : ''}
          onClick={() => updateFilter('status', 'completed')}
        >
          Completed ({todoCount.completed})
        </button>
      </div>

      <input
        type="search"
        placeholder="Search todos..."
        value={filters.search}
        onChange={(e) => updateFilter('search', e.target.value)}
      />

      <div className="sort-controls">
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter('sortBy', e.target.value as SortField)}
        >
          <option value="id">Sort by ID</option>
          <option value="title">Sort by Title</option>
          <option value="completed">Sort by Status</option>
          <option value="createdAt">Sort by Date</option>
        </select>

        <button
          onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {filters.sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  );
}
```

## Custom Hooks

### useTodoState Hook

```tsx
function useTodoState() {
  const [todos, setTodos] = useState<LocalTodo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (operation: () => Promise<void>) => {
    setIsLoading(true);
    setError(null);

    try {
      await operation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    todos,
    setTodos,
    isLoading,
    error,
    execute,
  };
}
```

### useDebounce Hook

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

## Styling (CSS Modules)

```css
/* TodoApp.module.css */
.todo-app {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  transition: all 0.3s ease;
}

.todo-item.optimistic {
  opacity: 0.6;
}

.todo-item.deleting {
  opacity: 0.3;
  transform: translateX(-10px);
}

.title {
  flex: 1;
  cursor: text;
}

.title.completed {
  text-decoration: line-through;
  opacity: 0.6;
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin: 2rem 0;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.status-filters button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
}

.status-filters button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.error {
  color: red;
  font-size: 0.875rem;
}

.status {
  color: #666;
  font-style: italic;
  margin-left: 0.5rem;
}
```

## Testing

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('TodoApp', () => {
  it('creates a todo optimistically', async () => {
    render(<TodoApp />);

    const input = screen.getByPlaceholderText('What needs to be done?');
    const button = screen.getByText('Add Todo');

    fireEvent.change(input, { target: { value: 'New Todo' } });
    fireEvent.click(button);

    // Should show immediately (optimistic)
    expect(screen.getByText('New Todo')).toBeInTheDocument();
    expect(screen.getByText('Saving...')).toBeInTheDocument();

    // Wait for server response
    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });
  });

  it('handles delete with undo', async () => {
    render(<TodoApp />);

    // Wait for todos to load
    await waitFor(() => {
      expect(screen.getByText('Sample Todo')).toBeInTheDocument();
    });

    // Delete a todo
    const deleteButton = screen.getAllByText('Delete')[0];
    fireEvent.click(deleteButton);

    // Should show undo option
    expect(screen.getByText('Undo')).toBeInTheDocument();

    // Click undo
    fireEvent.click(screen.getByText('Undo'));

    // Todo should be restored
    expect(screen.getByText('Sample Todo')).toBeInTheDocument();
  });
});
```

## Performance Optimizations

```tsx
// Memoize expensive computations
const stats = useMemo(
  () => ({
    total: todos.length,
    completed: todos.filter((t) => t.completed).length,
    active: todos.filter((t) => !t.completed).length,
    percentComplete:
      todos.length > 0
        ? Math.round((todos.filter((t) => t.completed).length / todos.length) * 100)
        : 0,
  }),
  [todos],
);

// Virtualize long lists
import { FixedSizeList } from 'react-window';

function VirtualTodoList({ todos }: { todos: LocalTodo[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TodoListItem todo={todos[index]} />
    </div>
  );

  return (
    <FixedSizeList height={600} itemCount={todos.length} itemSize={80} width="100%">
      {Row}
    </FixedSizeList>
  );
}
```

## Deployment Considerations

1. **Environment Variables**: Use `.env` for API URLs
2. **Error Tracking**: Integrate Sentry for production errors
3. **Analytics**: Track user interactions
4. **PWA**: Add service worker for offline support
5. **SEO**: Add meta tags and structured data

## Summary

We've built a complete, production-ready todo application with:

- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Optimistic updates for instant feedback
- ✅ Undo functionality for deletions
- ✅ Batch operations for efficiency
- ✅ Search, filter, and sort capabilities
- ✅ Error handling and recovery
- ✅ Loading states and user feedback
- ✅ TypeScript throughout for type safety
- ✅ Clean architecture with service layer
- ✅ Reusable components and hooks
- ✅ Performance optimizations
- ✅ Comprehensive testing

This application demonstrates real-world React development with TypeScript, showing how to handle complex state management, async operations, and user interactions in a type-safe manner.

## What You've Learned

Through this series, you've mastered:

1. **useState with TypeScript** - Type inference and explicit typing
2. **Data Fetching** - Async operations with proper error handling
3. **Loading States** - Discriminated unions for async state
4. **CRUD Operations** - Create, Read, Update, Delete patterns
5. **Optimistic Updates** - Instant UI feedback with rollback
6. **State Management** - Complex state with TypeScript
7. **Real-world Patterns** - Production-ready code architecture

## Next Steps

- Add authentication and user-specific todos
- Implement real-time updates with WebSockets
- Add drag-and-drop reordering
- Create a mobile app with React Native
- Deploy to production with CI/CD

Congratulations! You now have the knowledge to build production-ready React applications with TypeScript. The patterns you've learned here apply to any data-driven application, not just todos.

## See Also

- [React State Management with TypeScript](react-state-management-with-typescript.md)
- [Data Fetching and Runtime Validation](data-fetching-and-runtime-validation.md)
- [React Query TRPC](react-query-trpc.md) - Advanced data fetching patterns
- [Testing React TypeScript](testing-react-typescript.md) - Comprehensive testing guide
