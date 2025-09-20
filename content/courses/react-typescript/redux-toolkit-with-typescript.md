---
title: Redux Toolkit with TypeScript
description: >-
  Master modern Redux patterns with RTK, createAsyncThunk, RTK Query, and
  type-safe state management
modified: '2025-09-20T15:36:56-06:00'
date: '2025-09-14T19:27:10.365Z'
---

Redux Toolkit (RTK) transformed Redux from a verbose, boilerplate-heavy state management solution into a modern, type-safe powerhouse. If you've been avoiding Redux because of the setup complexity, RTK changes everything. Let's explore how to build type-safe Redux applications with modern patterns that actually make development enjoyable.

## Why Redux Toolkit?

Redux Toolkit solves the main pain points of traditional Redux:

```typescript
// ❌ Old Redux - So much boilerplate
// Action types
const FETCH_USERS_REQUEST = 'FETCH_USERS_REQUEST';
const FETCH_USERS_SUCCESS = 'FETCH_USERS_SUCCESS';
const FETCH_USERS_FAILURE = 'FETCH_USERS_FAILURE';

// Action creators
const fetchUsersRequest = () => ({ type: FETCH_USERS_REQUEST });
const fetchUsersSuccess = (users: User[]) => ({ type: FETCH_USERS_SUCCESS, payload: users });
const fetchUsersFailure = (error: string) => ({ type: FETCH_USERS_FAILURE, payload: error });

// Reducer
const usersReducer = (state = initialState, action: AnyAction) => {
  switch (action.type) {
    case FETCH_USERS_REQUEST:
      return { ...state, loading: true };
    case FETCH_USERS_SUCCESS:
      return { ...state, loading: false, users: action.payload };
    case FETCH_USERS_FAILURE:
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

// ✅ Redux Toolkit - Clean and type-safe
const usersSlice = createSlice({
  name: 'users',
  initialState: {
    users: [] as User[],
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch users';
      });
  },
});

const fetchUsers = createAsyncThunk('users/fetchUsers', async () => {
  const response = await api.getUsers();
  return response.data;
});
```

## Setting Up Redux Toolkit with TypeScript

First, let's set up the store with proper types:

```typescript
// store.ts
import { configureStore } from '@reduxjs/toolkit';
import { usersSlice } from './slices/usersSlice';
import { postsSlice } from './slices/postsSlice';

export const store = configureStore({
  reducer: {
    users: usersSlice.reducer,
    posts: postsSlice.reducer,
  },
  // RTK includes redux-thunk and DevTools by default
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

// Infer types from the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

## Typed Hooks

Create typed versions of useSelector and useDispatch:

```typescript
// hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Custom hook for common patterns
export const useAsyncAction = () => {
  const dispatch = useAppDispatch();

  return <T extends (...args: any[]) => any>(action: T, ...args: Parameters<T>) => {
    return dispatch(action(...args));
  };
};
```

## Creating Type-Safe Slices

### Basic Slice with State Shape

```typescript
// slices/counterSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
  value: number;
  step: number;
  history: number[];
}

const initialState: CounterState = {
  value: 0,
  step: 1,
  history: [],
};

const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.history.push(state.value);
      state.value += state.step;
    },
    decrement: (state) => {
      state.history.push(state.value);
      state.value -= state.step;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.history.push(state.value);
      state.value += action.payload;
    },
    setStep: (state, action: PayloadAction<number>) => {
      if (action.payload > 0) {
        state.step = action.payload;
      }
    },
    reset: (state) => {
      state.value = 0;
      state.history = [];
    },
    undo: (state) => {
      const previousValue = state.history.pop();
      if (previousValue !== undefined) {
        state.value = previousValue;
      }
    },
  },
});

export const { increment, decrement, incrementByAmount, setStep, reset, undo } =
  counterSlice.actions;

export default counterSlice.reducer;
```

### Complex State with Normalized Data

```typescript
// slices/usersSlice.ts
import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  lastSeen: string;
  isOnline: boolean;
}

interface UsersState {
  loading: boolean;
  error: string | null;
  selectedUserId: string | null;
  filters: {
    search: string;
    onlineOnly: boolean;
  };
}

// Entity adapter for normalized state management
const usersAdapter = createEntityAdapter<User>({
  selectId: (user) => user.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState<UsersState>({
    loading: false,
    error: null,
    selectedUserId: null,
    filters: {
      search: '',
      onlineOnly: false,
    },
  }),
  reducers: {
    setSelectedUser: (state, action: PayloadAction<string>) => {
      state.selectedUserId = action.payload;
    },
    clearSelectedUser: (state) => {
      state.selectedUserId = null;
    },
    updateFilters: (state, action: PayloadAction<Partial<UsersState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    userWentOnline: (state, action: PayloadAction<string>) => {
      usersAdapter.updateOne(state, {
        id: action.payload,
        changes: { isOnline: true, lastSeen: new Date().toISOString() },
      });
    },
    userWentOffline: (state, action: PayloadAction<string>) => {
      usersAdapter.updateOne(state, {
        id: action.payload,
        changes: { isOnline: false },
      });
    },
    updateUserAvatar: (state, action: PayloadAction<{ userId: string; avatar: string }>) => {
      usersAdapter.updateOne(state, {
        id: action.payload.userId,
        changes: { avatar: action.payload.avatar },
      });
    },
  },
});

export const {
  setSelectedUser,
  clearSelectedUser,
  updateFilters,
  userWentOnline,
  userWentOffline,
  updateUserAvatar,
} = usersSlice.actions;

// Export the adapter selectors
export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
  selectEntities: selectUserEntities,
  selectTotal: selectTotalUsers,
} = usersAdapter.getSelectors();

export default usersSlice.reducer;
```

## Async Actions with createAsyncThunk

### Basic Async Thunk

```typescript
// thunks/usersThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { User } from '../types';
import * as api from '../api';

// Fetch users with error handling
export const fetchUsers = createAsyncThunk('users/fetchUsers', async (_, { rejectWithValue }) => {
  try {
    const response = await api.getUsers();
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      return rejectWithValue(error.message);
    }
    return rejectWithValue('Unknown error occurred');
  }
});

// Fetch user with typed parameters
export const fetchUserById = createAsyncThunk(
  'users/fetchUserById',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await api.getUserById(userId);
      return response.data;
    } catch (error) {
      return rejectWithValue(`Failed to fetch user ${userId}`);
    }
  },
);

// Create user with typed input
export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData: Omit<User, 'id' | 'lastSeen' | 'isOnline'>, { rejectWithValue }) => {
    try {
      const response = await api.createUser(userData);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to create user');
    }
  },
);

// Update user with optimistic updates
export const updateUser = createAsyncThunk(
  'users/updateUser',
  async (
    { id, updates }: { id: string; updates: Partial<User> },
    { rejectWithValue, getState },
  ) => {
    try {
      const response = await api.updateUser(id, updates);
      return response.data;
    } catch (error) {
      return rejectWithValue('Failed to update user');
    }
  },
);
```

### Async Thunk with State Access

```typescript
// Access current state in thunk
export const fetchUserPostsIfNeeded = createAsyncThunk(
  'posts/fetchUserPostsIfNeeded',
  async (userId: string, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const userPosts = selectPostsByUserId(state, userId);

    // Only fetch if we don't have posts for this user
    if (userPosts.length === 0) {
      try {
        const response = await api.getUserPosts(userId);
        return { userId, posts: response.data };
      } catch (error) {
        return rejectWithValue('Failed to fetch posts');
      }
    }

    // Return existing data
    return { userId, posts: userPosts };
  },
);

// Conditional thunk execution
export const refreshUserDataIfStale = createAsyncThunk(
  'users/refreshUserDataIfStale',
  async (userId: string, { getState, dispatch }) => {
    const state = getState() as RootState;
    const user = selectUserById(state, userId);

    if (!user) {
      // User doesn't exist, fetch it
      return dispatch(fetchUserById(userId));
    }

    const lastUpdated = new Date(user.lastSeen);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

    if (hoursSinceUpdate > 1) {
      // Data is stale, refresh it
      return dispatch(fetchUserById(userId));
    }

    // Data is fresh
    return user;
  },
);
```

## Handling Async Actions in Slices

```typescript
// Update the users slice to handle async actions
const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState<UsersState>({
    loading: false,
    error: null,
    selectedUserId: null,
    filters: { search: '', onlineOnly: false },
  }),
  reducers: {
    // ... regular reducers
  },
  extraReducers: (builder) => {
    builder
      // Fetch users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        usersAdapter.setAll(state, action.payload);
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch single user
      .addCase(fetchUserById.fulfilled, (state, action) => {
        usersAdapter.upsertOne(state, action.payload);
      })
      // Create user
      .addCase(createUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        usersAdapter.addOne(state, action.payload);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update user with optimistic update
      .addCase(updateUser.pending, (state, action) => {
        // Optimistically update the user
        const { id, updates } = action.meta.arg;
        usersAdapter.updateOne(state, { id, changes: updates });
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        // Confirm the update with server data
        usersAdapter.upsertOne(state, action.payload);
      })
      .addCase(updateUser.rejected, (state, action) => {
        // Revert optimistic update
        const { id } = action.meta.arg;
        // In a real app, you'd store the original data to revert to
        state.error = action.payload as string;
      });
  },
});
```

## Selectors with Reselect

Create efficient, memoized selectors:

```typescript
// selectors/usersSelectors.ts
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { selectAllUsers } from '../slices/usersSlice';

// Basic selectors
export const selectUsersState = (state: RootState) => state.users;
export const selectUsersLoading = (state: RootState) => state.users.loading;
export const selectUsersError = (state: RootState) => state.users.error;
export const selectSelectedUserId = (state: RootState) => state.users.selectedUserId;
export const selectUsersFilters = (state: RootState) => state.users.filters;

// Memoized complex selectors
export const selectSelectedUser = createSelector(
  [selectAllUsers, selectSelectedUserId],
  (users, selectedId) => {
    return selectedId ? users.find((user) => user.id === selectedId) : null;
  },
);

export const selectOnlineUsers = createSelector([selectAllUsers], (users) =>
  users.filter((user) => user.isOnline),
);

export const selectFilteredUsers = createSelector(
  [selectAllUsers, selectUsersFilters],
  (users, filters) => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email.toLowerCase().includes(filters.search.toLowerCase());
      const matchesOnlineFilter = !filters.onlineOnly || user.isOnline;

      return matchesSearch && matchesOnlineFilter;
    });
  },
);

// Selector factory for user by ID
export const makeSelectUserById = () =>
  createSelector(
    [
      (state: RootState, userId: string) =>
        selectAllUsers(state).find((user) => user.id === userId),
    ],
    (user) => user,
  );

// Parameterized selector
export const selectUsersByIds = createSelector(
  [(state: RootState) => selectAllUsers(state), (_: RootState, userIds: string[]) => userIds],
  (users, userIds) => users.filter((user) => userIds.includes(user.id)),
);
```

## Using Redux in React Components

### Basic Usage

```typescript
// components/UserList.tsx
import React from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  fetchUsers,
  setSelectedUser,
  updateFilters
} from '../store/slices/usersSlice';
import {
  selectFilteredUsers,
  selectUsersLoading,
  selectUsersError,
  selectUsersFilters
} from '../store/selectors/usersSelectors';

function UserList() {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectFilteredUsers);
  const loading = useAppSelector(selectUsersLoading);
  const error = useAppSelector(selectUsersError);
  const filters = useAppSelector(selectUsersFilters);

  React.useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleSearchChange = (search: string) => {
    dispatch(updateFilters({ search }));
  };

  const handleUserSelect = (userId: string) => {
    dispatch(setSelectedUser(userId));
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="user-list">
      <input
        type="text"
        placeholder="Search users..."
        value={filters.search}
        onChange={(e) => handleSearchChange(e.target.value)}
      />

      <div className="filters">
        <label>
          <input
            type="checkbox"
            checked={filters.onlineOnly}
            onChange={(e) => dispatch(updateFilters({ onlineOnly: e.target.checked }))}
          />
          Online only
        </label>
      </div>

      <ul>
        {users.map(user => (
          <li
            key={user.id}
            onClick={() => handleUserSelect(user.id)}
            className={user.isOnline ? 'online' : 'offline'}
          >
            <img src={user.avatar} alt={user.name} />
            <span>{user.name}</span>
            <span>{user.email}</span>
            {user.isOnline && <span className="online-indicator">●</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### Advanced Component with Local State

```typescript
// components/UserProfile.tsx
import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { updateUser, fetchUserById } from '../store/thunks/usersThunks';
import { selectSelectedUser } from '../store/selectors/usersSelectors';

function UserProfile() {
  const dispatch = useAppDispatch();
  const selectedUser = useAppSelector(selectSelectedUser);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: ''
  });

  React.useEffect(() => {
    if (selectedUser) {
      setEditForm({
        name: selectedUser.name,
        email: selectedUser.email
      });
    }
  }, [selectedUser]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    try {
      await dispatch(updateUser({
        id: selectedUser.id,
        updates: editForm
      })).unwrap(); // unwrap() for error handling

      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleCancel = () => {
    if (selectedUser) {
      setEditForm({
        name: selectedUser.name,
        email: selectedUser.email
      });
    }
    setIsEditing(false);
  };

  if (!selectedUser) {
    return <div>No user selected</div>;
  }

  return (
    <div className="user-profile">
      <div className="avatar-section">
        <img src={selectedUser.avatar} alt={selectedUser.name} />
        <span className={`status ${selectedUser.isOnline ? 'online' : 'offline'}`}>
          {selectedUser.isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {isEditing ? (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="Name"
          />
          <input
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            placeholder="Email"
          />
          <div className="actions">
            <button type="submit">Save</button>
            <button type="button" onClick={handleCancel}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="user-info">
          <h2>{selectedUser.name}</h2>
          <p>{selectedUser.email}</p>
          <p>Last seen: {new Date(selectedUser.lastSeen).toLocaleString()}</p>
          <button onClick={handleEdit}>Edit</button>
        </div>
      )}
    </div>
  );
};
```

## RTK Query for API State Management

RTK Query takes API management to the next level:

```typescript
// api/usersApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { User } from '../types';

interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/',
    prepareHeaders: (headers, { getState }) => {
      // Add auth token if available
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    // Query endpoints
    getUsers: builder.query<UsersResponse, GetUsersParams>({
      query: ({ page = 1, limit = 10, search }) => ({
        url: 'users',
        params: { page, limit, search },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.users.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    getUserById: builder.query<User, string>({
      query: (id) => `users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    // Mutation endpoints
    createUser: builder.mutation<User, Partial<User>>({
      query: (newUser) => ({
        url: 'users',
        method: 'POST',
        body: newUser,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    updateUser: builder.mutation<User, { id: string; updates: Partial<User> }>({
      query: ({ id, updates }) => ({
        url: `users/${id}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
      // Optimistic update
      async onQueryStarted({ id, updates }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          usersApi.util.updateQueryData('getUserById', id, (draft) => {
            Object.assign(draft, updates);
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    deleteUser: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = usersApi;
```

### Using RTK Query in Components

```typescript
// components/UserListRTK.tsx
import React, { useState } from 'react';
import {
  useGetUsersQuery,
  useUpdateUserMutation,
  useDeleteUserMutation
} from '../api/usersApi';

function UserListRTK() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const {
    data: usersData,
    error,
    isLoading,
    isFetching,
    refetch
  } = useGetUsersQuery({ page, search, limit: 10 });

  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const handleToggleOnline = async (user: User) => {
    try {
      await updateUser({
        id: user.id,
        updates: { isOnline: !user.isOnline }
      }).unwrap();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteUser(userId).unwrap();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading users</div>;

  return (
    <div className="user-list-rtk">
      <div className="controls">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={() => refetch()}>Refresh</button>
        {isFetching && <span>Updating...</span>}
      </div>

      <div className="users">
        {usersData?.users.map(user => (
          <div key={user.id} className="user-card">
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <div className="actions">
              <button
                onClick={() => handleToggleOnline(user)}
                className={user.isOnline ? 'online' : 'offline'}
              >
                {user.isOnline ? 'Go Offline' : 'Go Online'}
              </button>
              <button
                onClick={() => handleDeleteUser(user.id)}
                className="delete"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page} of {usersData?.totalPages}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page >= (usersData?.totalPages || 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

## Advanced RTK Patterns

### Custom Base Query with Authentication

```typescript
// api/baseQuery.ts
import { fetchBaseQuery } from '@reduxjs/toolkit/query';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { logout, setCredentials } from '../slices/authSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: '/api/',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Try to get a new token
    const refreshResult = await baseQuery('/auth/refresh', api, extraOptions);

    if (refreshResult.data) {
      const { token } = refreshResult.data as { token: string };
      // Store the new token
      api.dispatch(setCredentials({ token }));

      // Retry the original query with new token
      result = await baseQuery(args, api, extraOptions);
    } else {
      // Refresh failed, logout user
      api.dispatch(logout());
    }
  }

  return result;
};
```

### Conditional Queries

```typescript
// Conditional fetching
function UserProfile({ userId }: { userId?: string }) {
  const {
    data: user,
    error,
    isLoading
  } = useGetUserByIdQuery(userId!, {
    skip: !userId, // Skip query if no userId
    pollingInterval: userId ? 30000 : 0, // Poll every 30s if userId exists
    refetchOnMountOrArgChange: true,
  });

  // ... component logic
};

// Lazy queries
function SearchUsers() {
  const [search, setSearch] = useState('');
  const [trigger, result] = useLazyGetUsersQuery();

  const handleSearch = () => {
    if (search.trim()) {
      trigger({ search });
    }
  };

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button onClick={handleSearch}>Search</button>

      {result.isFetching && <div>Searching...</div>}
      {result.data && (
        <div>
          {result.data.users.map(user => (
            <div key={user.id}>{user.name}</div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Testing Redux Toolkit

### Testing Slices

```typescript
// __tests__/counterSlice.test.ts
import counterReducer, { increment, decrement, incrementByAmount } from '../slices/counterSlice';

describe('counter slice', () => {
  const initialState = {
    value: 0,
    step: 1,
    history: [],
  };

  it('should return the initial state', () => {
    expect(counterReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle increment', () => {
    const actual = counterReducer(initialState, increment());
    expect(actual.value).toEqual(1);
    expect(actual.history).toEqual([0]);
  });

  it('should handle decrement', () => {
    const actual = counterReducer(initialState, decrement());
    expect(actual.value).toEqual(-1);
    expect(actual.history).toEqual([0]);
  });

  it('should handle incrementByAmount', () => {
    const actual = counterReducer(initialState, incrementByAmount(2));
    expect(actual.value).toEqual(2);
    expect(actual.history).toEqual([0]);
  });
});
```

### Testing Async Thunks

```typescript
// __tests__/usersThunks.test.ts
import { configureStore } from '@reduxjs/toolkit';
import { fetchUsers } from '../thunks/usersThunks';
import usersReducer from '../slices/usersSlice';
import * as api from '../api';

// Mock the API
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('fetchUsers thunk', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        users: usersReducer,
      },
    });
  });

  it('should fetch users successfully', async () => {
    const mockUsers = [{ id: '1', name: 'John', email: 'john@example.com' }];

    mockedApi.getUsers.mockResolvedValue({ data: mockUsers });

    await store.dispatch(fetchUsers());

    const state = store.getState();
    expect(state.users.loading).toBe(false);
    expect(state.users.entities['1']).toEqual(mockUsers[0]);
  });

  it('should handle fetch users error', async () => {
    mockedApi.getUsers.mockRejectedValue(new Error('API Error'));

    await store.dispatch(fetchUsers());

    const state = store.getState();
    expect(state.users.loading).toBe(false);
    expect(state.users.error).toBe('API Error');
  });
});
```

### Testing Components with Redux

```typescript
// __tests__/UserList.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import UserList from '../components/UserList';
import usersReducer from '../slices/usersSlice';

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      users: usersReducer,
    },
    preloadedState: initialState,
  });
};

describe('UserList', () => {
  it('should display loading state', () => {
    const store = createMockStore({
      users: {
        loading: true,
        entities: {},
        ids: [],
        error: null,
      },
    });

    render(
      <Provider store={store}>
        <UserList />
      </Provider>
    );

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('should display users', () => {
    const store = createMockStore({
      users: {
        loading: false,
        entities: {
          '1': { id: '1', name: 'John', email: 'john@example.com' }
        },
        ids: ['1'],
        error: null,
      },
    });

    render(
      <Provider store={store}>
        <UserList />
      </Provider>
    );

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

## Performance Optimization

### Memoized Selectors

```typescript
// Expensive computation in selector
export const selectUserStatistics = createSelector([selectAllUsers], (users) => {
  // This expensive calculation only runs when users change
  const stats = {
    total: users.length,
    online: users.filter((u) => u.isOnline).length,
    byDomain: users.reduce(
      (acc, user) => {
        const domain = user.email.split('@')[1];
        acc[domain] = (acc[domain] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
    averageLastSeen:
      users.length > 0
        ? users.reduce((sum, user) => sum + new Date(user.lastSeen).getTime(), 0) / users.length
        : 0,
  };

  return stats;
});
```

### Component Optimization

```typescript
// Avoid re-renders with selective subscriptions
const UserCard = React.memo(function UserCard({ userId }: { userId: string }) {
  // Only re-render when this specific user changes
  const user = useAppSelector((state) => selectUserById(state, userId));
  const isSelected = useAppSelector((state) => selectSelectedUserId(state) === userId);

  // ... component logic
});

// Use shallowEqual for object comparisons
import { shallowEqual } from 'react-redux';

function UserFilters() {
  const filters = useAppSelector(selectUsersFilters, shallowEqual);

  // Component only re-renders when filter values actually change
  // not when the filters object is recreated with same values
}
```

## Best Practices

### 1. State Shape Design

```typescript
// ✅ Good: Normalized state
interface UsersState {
  entities: Record<string, User>;
  ids: string[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
}

// ❌ Bad: Denormalized state
interface UsersState {
  users: User[]; // Hard to update individual users
  loading: boolean;
  error: string | null;
}
```

### 2. Action Design

```typescript
// ✅ Good: Specific actions
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    userWentOnline: (state, action: PayloadAction<string>) => {
      // Specific, clear intent
    },
    userUpdatedProfile: (state, action: PayloadAction<{ id: string; profile: Partial<User> }>) => {
      // Clear what changed
    },
  },
});

// ❌ Bad: Generic actions
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    updateUser: (state, action: PayloadAction<any>) => {
      // Unclear what changed or why
    },
  },
});
```

### 3. Error Handling

```typescript
// ✅ Good: Structured error handling
interface ErrorState {
  message: string;
  code?: string;
  field?: string;
  timestamp: string;
}

const handleAsyncError = (state: any, action: any) => {
  state.loading = false;
  state.error = {
    message: action.payload || action.error.message,
    code: action.error.code,
    timestamp: new Date().toISOString(),
  };
};
```

### 4. TypeScript Configuration

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true  // Helps catch array/object access errors
  }
}
```

## Migration from Legacy Redux

If you have existing Redux code, here's how to migrate gradually:

```typescript
// 1. Keep existing reducers, gradually convert to slices
const store = configureStore({
  reducer: {
    // New RTK slices
    users: usersSlice.reducer,
    posts: postsSlice.reducer,

    // Legacy reducers
    oldCounter: oldCounterReducer,
    oldTodos: oldTodosReducer,
  },
});

// 2. Convert action creators to createAsyncThunk
// Old way
const fetchUsersStart = () => ({ type: 'FETCH_USERS_START' });
const fetchUsersSuccess = (users) => ({ type: 'FETCH_USERS_SUCCESS', payload: users });

// New way
const fetchUsers = createAsyncThunk('users/fetchUsers', async () => {
  const response = await api.getUsers();
  return response.data;
});

// 3. Gradually move selectors to use createSelector
// Old selector
const getVisibleTodos = (state) => {
  // Direct computation every time
  return state.todos.filter((todo) => todo.visible);
};

// New memoized selector
const selectVisibleTodos = createSelector([(state) => state.todos], (todos) =>
  todos.filter((todo) => todo.visible),
);
```

## Summary

Redux Toolkit transforms Redux from a verbose, error-prone state management solution into a modern, type-safe powerhouse:

1. **createSlice** - Eliminates boilerplate with Immer integration
2. **createAsyncThunk** - Handles async logic with automatic pending/fulfilled/rejected actions
3. **RTK Query** - Complete data fetching solution with caching and invalidation
4. **Entity Adapter** - Normalized state management made easy
5. **Type-safe patterns** - Full TypeScript support with minimal type annotations

With these tools, you can build complex, maintainable React applications with confidence that your state management is both powerful and type-safe!
