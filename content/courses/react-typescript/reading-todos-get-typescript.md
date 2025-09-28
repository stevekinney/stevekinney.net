---
title: Reading Todos - GET Requests and Type Safety
description: >-
  Master GET requests with TypeScript—implement pagination, filtering, search,
  and caching strategies for efficient todo list management.
date: 2025-09-27T12:00:00.000Z
modified: '2025-09-27T22:09:27.825Z'
published: true
tags:
  - react
  - typescript
  - crud
  - get-requests
  - pagination
  - filtering
---

Reading and displaying data is the foundation of any application. While fetching todos might seem simple—just a GET request, right?—production apps need pagination, filtering, searching, sorting, and caching. TypeScript helps us build these features with confidence, ensuring type safety from API parameters to rendered components.

In this tutorial, we'll build a comprehensive todo reading system with all the features users expect in a modern application.

## Basic GET Request with Types

Let's start with the fundamentals:

```tsx
interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

interface TodosResponse {
  todos: Todo[];
  total: number;
  page: number;
  limit: number;
}

function BasicTodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const response = await fetch('https://jsonplaceholder.typicode.com/todos');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: Todo[] = await response.json();
        setTodos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch todos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodos();
  }, []);

  if (isLoading) return <div>Loading todos...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Todos ({todos.length})</h2>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <input type="checkbox" checked={todo.completed} readOnly />
            {todo.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Pagination with Type-Safe Parameters

Real applications need pagination for performance:

```tsx
interface PaginationParams {
  page: number;
  limit: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

function usePaginatedTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (params: PaginationParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = new URL('https://jsonplaceholder.typicode.com/todos');
      url.searchParams.set('_page', params.page.toString());
      url.searchParams.set('_limit', params.limit.toString());

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }

      const data: Todo[] = await response.json();

      // JSONPlaceholder returns total count in header
      const totalCount = response.headers.get('X-Total-Count');
      const total = totalCount ? parseInt(totalCount, 10) : 100;
      const totalPages = Math.ceil(total / params.limit);

      setTodos(data);
      setPagination({
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
        hasNext: params.page < totalPages,
        hasPrev: params.page > 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const goToPage = (page: number) => {
    fetchPage({ page, limit: pagination.limit });
  };

  const nextPage = () => {
    if (pagination.hasNext) {
      goToPage(pagination.page + 1);
    }
  };

  const prevPage = () => {
    if (pagination.hasPrev) {
      goToPage(pagination.page - 1);
    }
  };

  useEffect(() => {
    fetchPage({ page: 1, limit: 10 });
  }, [fetchPage]);

  return {
    todos,
    pagination,
    isLoading,
    error,
    goToPage,
    nextPage,
    prevPage,
  };
}

function PaginatedTodoList() {
  const { todos, pagination, isLoading, error, goToPage, nextPage, prevPage } = usePaginatedTodos();

  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>
        Todos (Page {pagination.page} of {pagination.totalPages})
      </h2>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>
              {todo.completed ? '✅' : '⭕'} {todo.title}
            </li>
          ))}
        </ul>
      )}

      <div className="pagination">
        <button onClick={prevPage} disabled={!pagination.hasPrev || isLoading}>
          Previous
        </button>

        <span>
          Page {pagination.page} of {pagination.totalPages}
        </span>

        <button onClick={nextPage} disabled={!pagination.hasNext || isLoading}>
          Next
        </button>
      </div>

      <div className="page-selector">
        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => (
          <button key={i + 1} onClick={() => goToPage(i + 1)} disabled={pagination.page === i + 1}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## Filtering with Type-Safe Query Parameters

Add filtering capabilities with proper TypeScript types:

```tsx
type FilterStatus = 'all' | 'completed' | 'active';
type SortField = 'id' | 'title' | 'completed';
type SortOrder = 'asc' | 'desc';

interface TodoFilters {
  status: FilterStatus;
  userId?: number;
  search?: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}

function buildQueryParams(filters: TodoFilters, pagination: PaginationParams): URLSearchParams {
  const params = new URLSearchParams();

  // Pagination
  params.set('_page', pagination.page.toString());
  params.set('_limit', pagination.limit.toString());

  // Filtering
  if (filters.status === 'completed') {
    params.set('completed', 'true');
  } else if (filters.status === 'active') {
    params.set('completed', 'false');
  }

  if (filters.userId) {
    params.set('userId', filters.userId.toString());
  }

  if (filters.search) {
    params.set('q', filters.search);
  }

  // Sorting
  params.set('_sort', filters.sortBy);
  params.set('_order', filters.sortOrder);

  return params;
}

function FilteredTodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filters, setFilters] = useState<TodoFilters>({
    status: 'all',
    sortBy: 'id',
    sortOrder: 'asc',
  });
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 10,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFilteredTodos = async () => {
      setIsLoading(true);

      try {
        const params = buildQueryParams(filters, pagination);
        const url = `https://jsonplaceholder.typicode.com/todos?${params}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch');

        const data: Todo[] = await response.json();

        // Apply client-side filtering for search (JSONPlaceholder doesn't support it)
        const filtered = filters.search
          ? data.filter((todo) => todo.title.toLowerCase().includes(filters.search!.toLowerCase()))
          : data;

        setTodos(filtered);
      } catch (error) {
        console.error('Error fetching todos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredTodos();
  }, [filters, pagination]);

  const updateFilter = <K extends keyof TodoFilters>(key: K, value: TodoFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  return (
    <div>
      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value as FilterStatus)}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>

        <input
          type="text"
          placeholder="Search todos..."
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value)}
        />

        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter('sortBy', e.target.value as SortField)}
        >
          <option value="id">ID</option>
          <option value="title">Title</option>
          <option value="completed">Status</option>
        </select>

        <button
          onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          {filters.sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {isLoading ? (
        <div>Loading filtered todos...</div>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>
              <input type="checkbox" checked={todo.completed} readOnly />
              {todo.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Infinite Scroll Pattern

For modern UX, implement infinite scrolling:

```tsx
function useInfiniteScroll<T>(fetchMore: () => Promise<void>, hasMore: boolean) {
  const observer = useRef<IntersectionObserver>();
  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchMore();
        }
      });

      if (node) observer.current.observe(node);
    },
    [fetchMore, hasMore],
  );

  return lastElementRef;
}

function InfiniteScrollTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://jsonplaceholder.typicode.com/todos?_page=${page}&_limit=20`,
      );

      const newTodos: Todo[] = await response.json();

      if (newTodos.length === 0) {
        setHasMore(false);
      } else {
        setTodos((prev) => [...prev, ...newTodos]);
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error loading more todos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, isLoading]);

  const lastTodoRef = useInfiniteScroll(loadMore, hasMore && !isLoading);

  useEffect(() => {
    loadMore();
  }, []); // Load first page

  return (
    <div>
      <h2>Infinite Scroll Todos</h2>
      <ul>
        {todos.map((todo, index) => {
          const isLast = index === todos.length - 1;
          return (
            <li key={todo.id} ref={isLast ? lastTodoRef : undefined}>
              {todo.completed ? '✅' : '⭕'} {todo.title}
            </li>
          );
        })}
      </ul>

      {isLoading && <div>Loading more...</div>}
      {!hasMore && <div>No more todos to load</div>}
    </div>
  );
}
```

## Caching Strategy

Implement caching to reduce API calls:

```tsx
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class TodoCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const todoCache = new TodoCache();

function useCachedTodos(userId?: number) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);

  const fetchTodos = useCallback(
    async (forceRefresh = false) => {
      const cacheKey = userId ? `todos-user-${userId}` : 'todos-all';

      // Check cache first
      if (!forceRefresh) {
        const cached = todoCache.get<Todo[]>(cacheKey);
        if (cached) {
          setTodos(cached);
          setIsLoading(false);
          setIsCached(true);
          return;
        }
      }

      setIsLoading(true);
      setIsCached(false);

      try {
        const url = userId
          ? `https://jsonplaceholder.typicode.com/todos?userId=${userId}`
          : 'https://jsonplaceholder.typicode.com/todos';

        const response = await fetch(url);
        const data: Todo[] = await response.json();

        // Cache the result
        todoCache.set(cacheKey, data);

        setTodos(data);
      } catch (error) {
        console.error('Error fetching todos:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const refresh = () => {
    fetchTodos(true);
  };

  return { todos, isLoading, isCached, refresh };
}

function CachedTodoList() {
  const { todos, isLoading, isCached, refresh } = useCachedTodos();

  return (
    <div>
      <div>
        <h2>Todos {isCached && <span>(Cached)</span>}</h2>
        <button onClick={refresh}>Refresh</button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {todos.slice(0, 10).map((todo) => (
            <li key={todo.id}>{todo.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Search with Debouncing

Implement efficient search with debouncing:

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

function SearchableTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Todo[]>([]);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Load all todos initially
  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/todos')
      .then((res) => res.json())
      .then(setTodos);
  }, []);

  // Search when debounced term changes
  useEffect(() => {
    if (!debouncedSearchTerm) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Simulate API search (JSONPlaceholder doesn't have real search)
    const results = todos.filter((todo) =>
      todo.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
    );

    // Simulate network delay
    setTimeout(() => {
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  }, [debouncedSearchTerm, todos]);

  const displayTodos = searchTerm ? searchResults : todos.slice(0, 20);

  return (
    <div>
      <input
        type="text"
        placeholder="Search todos..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {isSearching && <div>Searching...</div>}

      {searchTerm && !isSearching && <div>Found {searchResults.length} results</div>}

      <ul>
        {displayTodos.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Complete Example: Advanced Todo Reader

Here's everything combined into a production-ready component:

```tsx
interface TodoQueryOptions {
  page?: number;
  limit?: number;
  userId?: number;
  completed?: boolean;
  search?: string;
  sortBy?: 'id' | 'title' | 'completed';
  sortOrder?: 'asc' | 'desc';
}

interface TodoQueryResult {
  todos: Todo[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useTodoQuery(options: TodoQueryOptions = {}): TodoQueryResult {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const {
    page = 1,
    limit = 10,
    userId,
    completed,
    search,
    sortBy = 'id',
    sortOrder = 'asc',
  } = options;

  const fetchTodos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('_page', page.toString());
      params.set('_limit', limit.toString());
      params.set('_sort', sortBy);
      params.set('_order', sortOrder);

      if (userId !== undefined) params.set('userId', userId.toString());
      if (completed !== undefined) params.set('completed', completed.toString());
      if (search) params.set('q', search);

      const response = await fetch(`https://jsonplaceholder.typicode.com/todos?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }

      const data: Todo[] = await response.json();
      const totalCount = response.headers.get('X-Total-Count');

      setTodos(data);
      setTotal(totalCount ? parseInt(totalCount, 10) : data.length);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, userId, completed, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  return {
    todos,
    total,
    page,
    pageSize: limit,
    isLoading,
    error,
    refetch: fetchTodos,
  };
}

function AdvancedTodoReader() {
  const [queryOptions, setQueryOptions] = useState<TodoQueryOptions>({
    page: 1,
    limit: 10,
    sortBy: 'id',
    sortOrder: 'asc',
  });

  const { todos, total, page, pageSize, isLoading, error, refetch } = useTodoQuery(queryOptions);

  const totalPages = Math.ceil(total / pageSize);

  const updateOption = <K extends keyof TodoQueryOptions>(key: K, value: TodoQueryOptions[K]) => {
    setQueryOptions((prev) => ({
      ...prev,
      [key]: value,
      // Reset to page 1 when filters change
      ...(key !== 'page' ? { page: 1 } : {}),
    }));
  };

  if (error) {
    return (
      <div>
        <p>Error: {error.message}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Advanced Todo Reader</h2>

      {/* Controls */}
      <div className="controls">
        <input
          type="text"
          placeholder="Search..."
          onChange={(e) => updateOption('search', e.target.value)}
        />

        <select
          onChange={(e) =>
            updateOption(
              'completed',
              e.target.value === 'all' ? undefined : e.target.value === 'true',
            )
          }
        >
          <option value="all">All</option>
          <option value="true">Completed</option>
          <option value="false">Active</option>
        </select>

        <select
          value={queryOptions.sortBy}
          onChange={(e) => updateOption('sortBy', e.target.value as 'id' | 'title' | 'completed')}
        >
          <option value="id">Sort by ID</option>
          <option value="title">Sort by Title</option>
          <option value="completed">Sort by Status</option>
        </select>

        <button
          onClick={() =>
            updateOption('sortOrder', queryOptions.sortOrder === 'asc' ? 'desc' : 'asc')
          }
        >
          {queryOptions.sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Results */}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div>
            Showing {todos.length} of {total} todos (Page {page} of {totalPages})
          </div>

          <ul>
            {todos.map((todo) => (
              <li key={todo.id}>
                <input type="checkbox" checked={todo.completed} readOnly />
                <span>
                  {todo.id}. {todo.title}
                </span>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          <div className="pagination">
            <button
              onClick={() => updateOption('page', Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => updateOption('page', Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

## Best Practices

1. **Use proper loading states** - Always show feedback during fetching
2. **Handle errors gracefully** - Provide retry options and helpful messages
3. **Implement caching** - Reduce unnecessary API calls
4. **Debounce search inputs** - Prevent excessive API requests
5. **Type your API responses** - Don't trust external data without validation
6. **Consider pagination early** - Don't load thousands of items at once

## Summary

Reading todos efficiently requires:

- Type-safe query parameters
- Proper pagination implementation
- Filtering and sorting capabilities
- Search with debouncing
- Caching strategies
- Error handling and retry logic

## What's Next?

Now that we can create and read todos, let's implement updating with optimistic updates and proper rollback strategies.

## See Also

- [Updating Todos: PUT/PATCH with Optimistic Updates](updating-todos-optimistic.md) - Next tutorial
- [Fetching Data with useState and useEffect](fetching-data-usestate.md) - Data fetching basics
- [React Query TRPC](react-query-trpc.md) - Advanced data fetching patterns
