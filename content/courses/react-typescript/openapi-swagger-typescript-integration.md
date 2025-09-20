---
title: OpenAPI/Swagger TypeScript Integration
description: >-
  Generate type-safe API clients from OpenAPI specs and maintain synchronization
  between backend and frontend
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T19:36:46.083Z'
---

Imagine never having to manually write API types again. Imagine your frontend automatically knowing when your backend API changes. Imagine having 100% type safety between your React app and your API without any manual maintenance. This isn't a dream—it's the power of OpenAPI/Swagger with TypeScript code generation.

## The API Contract Problem

Traditional API development looks like this:

```typescript
// ❌ Manual API types - out of sync nightmare
interface User {
  id: number; // Backend changed to string, frontend doesn't know
  name: string;
  email: string;
  // Backend added 'role' field, frontend missing it
}

// ❌ Manual API client - prone to errors
async function getUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`); // Wrong endpoint
  return response.json(); // No validation
}
```

With OpenAPI integration:

```typescript
// ✅ Auto-generated from OpenAPI spec
import { UserApi, User } from './generated/api';

const userApi = new UserApi();

// ✅ Fully typed, always in sync
const user: User = await userApi.getUser({ id: '123' });
// TypeScript error if backend expects string but you pass number
```

## Setting Up OpenAPI Code Generation

### Install Required Tools

```bash
# Core tools for OpenAPI generation
npm install --save-dev @openapitools/openapi-generator-cli
npm install --save-dev openapi-typescript
npm install --save-dev swagger-typescript-api

# Runtime dependencies for generated client
npm install axios
npm install --save-dev @types/axios
```

### OpenAPI Specification Example

Here's a typical OpenAPI spec that we'll generate types from:

```yaml
# api-spec.yaml
openapi: 3.0.3
info:
  title: User Management API
  version: 1.0.0
  description: API for managing users and their data

servers:
  - url: https://api.example.com/v1
    description: Production server
  - url: http://localhost:3001/api/v1
    description: Development server

paths:
  /users:
    get:
      summary: List users
      operationId: getUsers
      tags:
        - Users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: search
          in: query
          schema:
            type: string
            minLength: 1
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'

    post:
      summary: Create user
      operationId: createUser
      tags:
        - Users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          $ref: '#/components/responses/Conflict'

  /users/{userId}:
    get:
      summary: Get user by ID
      operationId: getUserById
      tags:
        - Users
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          $ref: '#/components/responses/NotFound'

    put:
      summary: Update user
      operationId: updateUser
      tags:
        - Users
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateUserRequest'
      responses:
        '200':
          description: User updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/BadRequest'
        '404':
          $ref: '#/components/responses/NotFound'

    delete:
      summary: Delete user
      operationId: deleteUser
      tags:
        - Users
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: User deleted successfully
        '404':
          $ref: '#/components/responses/NotFound'

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
        - name
        - createdAt
        - updatedAt
      properties:
        id:
          type: string
          format: uuid
          example: '123e4567-e89b-12d3-a456-426614174000'
        email:
          type: string
          format: email
          example: 'user@example.com'
        name:
          type: string
          minLength: 1
          maxLength: 100
          example: 'John Doe'
        avatar:
          type: string
          format: uri
          nullable: true
          example: 'https://example.com/avatars/john.jpg'
        role:
          $ref: '#/components/schemas/UserRole'
        preferences:
          $ref: '#/components/schemas/UserPreferences'
        createdAt:
          type: string
          format: date-time
          example: '2023-12-01T10:00:00Z'
        updatedAt:
          type: string
          format: date-time
          example: '2023-12-01T12:30:00Z'

    UserRole:
      type: string
      enum:
        - admin
        - user
        - viewer
        - editor
      default: user

    UserPreferences:
      type: object
      properties:
        theme:
          type: string
          enum:
            - light
            - dark
            - auto
          default: auto
        notifications:
          $ref: '#/components/schemas/NotificationSettings'
        language:
          type: string
          pattern: '^[a-z]{2}(-[A-Z]{2})?$'
          default: en
          example: 'en-US'

    NotificationSettings:
      type: object
      properties:
        email:
          type: boolean
          default: true
        push:
          type: boolean
          default: true
        sms:
          type: boolean
          default: false

    CreateUserRequest:
      type: object
      required:
        - email
        - name
      properties:
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 1
          maxLength: 100
        avatar:
          type: string
          format: uri
          nullable: true
        role:
          $ref: '#/components/schemas/UserRole'
        preferences:
          $ref: '#/components/schemas/UserPreferences'

    UpdateUserRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        avatar:
          type: string
          format: uri
          nullable: true
        preferences:
          $ref: '#/components/schemas/UserPreferences'

    UserListResponse:
      type: object
      required:
        - data
        - meta
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        meta:
          $ref: '#/components/schemas/PaginationMeta'

    PaginationMeta:
      type: object
      required:
        - page
        - limit
        - total
        - totalPages
      properties:
        page:
          type: integer
          minimum: 1
        limit:
          type: integer
          minimum: 1
        total:
          type: integer
          minimum: 0
        totalPages:
          type: integer
          minimum: 0

    ApiError:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          example: 'VALIDATION_ERROR'
        message:
          type: string
          example: 'The request data is invalid'
        details:
          type: object
          additionalProperties: true
          example:
            email: ['Email format is invalid']
            name: ['Name is required']

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ApiError'

    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ApiError'

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ApiError'

    Conflict:
      description: Resource conflict
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ApiError'

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - BearerAuth: []
```

## Code Generation Setup

### Using swagger-typescript-api

```bash
# Generate TypeScript types and API client
npx swagger-typescript-api -p ./api-spec.yaml -o ./src/generated --axios --module-name-index 1
```

### Package.json Scripts

```json
{
  "scripts": {
    "generate:api": "swagger-typescript-api -p ./api-spec.yaml -o ./src/generated --axios --module-name-index 1 --sort-types",
    "generate:api-watch": "swagger-typescript-api -p ./api-spec.yaml -o ./src/generated --axios --module-name-index 1 --sort-types --extract-request-params",
    "fetch-api-spec": "curl -o ./api-spec.yaml https://api.example.com/openapi.yaml",
    "build:api": "npm run fetch-api-spec && npm run generate:api",
    "prebuild": "npm run build:api",
    "dev": "npm run generate:api && next dev"
  }
}
```

### Advanced Configuration

```typescript
// codegen.config.ts
import type { ConfigFile } from '@rtk-query/codegen-openapi';

const config: ConfigFile = {
  schemaFile: './api-spec.yaml',
  apiFile: './src/store/api/baseApi.ts',
  apiImport: 'baseApi',
  outputFile: './src/store/api/generated.ts',
  exportName: 'generatedApi',
  hooks: true,
  tag: true,
};

export default config;
```

## Generated Code Structure

The generated code creates several files:

```typescript
// Generated: src/generated/Api.ts
export interface User {
  /** @format uuid */
  id: string;
  /** @format email */
  email: string;
  /** @maxLength 100 */
  name: string;
  /** @format uri */
  avatar?: string | null;
  role: UserRole;
  preferences: UserPreferences;
  /** @format date-time */
  createdAt: string;
  /** @format date-time */
  updatedAt: string;
}

export enum UserRole {
  Admin = 'admin',
  User = 'user',
  Viewer = 'viewer',
  Editor = 'editor',
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  notifications?: NotificationSettings;
  /** @pattern ^[a-z]{2}(-[A-Z]{2})?$ */
  language?: string;
}

export interface NotificationSettings {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
}

// Generated API client class
export class UsersApi {
  constructor(private http: AxiosInstance = axios) {}

  /**
   * @description List users
   * @tags Users
   * @name GetUsers
   * @summary List users
   * @request GET:/users
   */
  getUsers = (
    query?: {
      /** @min 1 */
      page?: number;
      /** @min 1 @max 100 */
      limit?: number;
      /** @minLength 1 */
      search?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<UserListResponse>({
      path: `/users`,
      method: 'GET',
      query: query,
      ...params,
    });

  /**
   * @description Create user
   * @tags Users
   * @name CreateUser
   * @summary Create user
   * @request POST:/users
   */
  createUser = (data: CreateUserRequest, params: RequestParams = {}) =>
    this.http.request<User>({
      path: `/users`,
      method: 'POST',
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Get user by ID
   * @tags Users
   * @name GetUserById
   * @summary Get user by ID
   * @request GET:/users/{userId}
   */
  getUserById = (userId: string, params: RequestParams = {}) =>
    this.http.request<User>({
      path: `/users/${userId}`,
      method: 'GET',
      ...params,
    });

  // ... more methods
}
```

## React Integration Patterns

### Creating Type-Safe Hooks

```typescript
// hooks/useUsersApi.ts
import { useState, useEffect, useCallback } from 'react';
import { UsersApi, User, CreateUserRequest, ApiError } from '../generated/Api';
import { AxiosError } from 'axios';

const usersApi = new UsersApi();

export function useUsers(params?: { page?: number; limit?: number; search?: string }) {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [meta, setMeta] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await usersApi.getUsers(params);
      setData(response.data.data);
      setMeta(response.data.meta);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      setError(
        error.response?.data || {
          code: 'NETWORK_ERROR',
          message: 'Failed to fetch users',
        },
      );
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users: data,
    loading,
    error,
    meta,
    refetch: fetchUsers,
  };
}

export function useUser(userId: string | undefined) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchUser = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await usersApi.getUserById(userId);
      setUser(response.data);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      setError(
        error.response?.data || {
          code: 'NETWORK_ERROR',
          message: 'Failed to fetch user',
        },
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const updateUser = useCallback(
    async (updates: UpdateUserRequest) => {
      if (!userId) return;

      try {
        const response = await usersApi.updateUser(userId, updates);
        setUser(response.data);
        return response.data;
      } catch (err) {
        const error = err as AxiosError<ApiError>;
        throw (
          error.response?.data || {
            code: 'NETWORK_ERROR',
            message: 'Failed to update user',
          }
        );
      }
    },
    [userId],
  );

  const deleteUser = useCallback(async () => {
    if (!userId) return;

    try {
      await usersApi.deleteUser(userId);
      setUser(null);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      throw (
        error.response?.data || {
          code: 'NETWORK_ERROR',
          message: 'Failed to delete user',
        }
      );
    }
  }, [userId]);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
    updateUser,
    deleteUser,
  };
}

export function useCreateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const createUser = useCallback(async (userData: CreateUserRequest): Promise<User> => {
    setLoading(true);
    setError(null);

    try {
      const response = await usersApi.createUser(userData);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      const apiError = error.response?.data || {
        code: 'NETWORK_ERROR',
        message: 'Failed to create user',
      };
      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createUser,
    loading,
    error,
  };
}
```

### Components Using Generated Types

```typescript
// components/UserList.tsx
import React, { useState } from 'react';
import { useUsers } from '../hooks/useUsersApi';
import { User } from '../generated/Api';

interface UserListProps {
  onUserSelect?: (user: User) => void;
}

const UserList: React.FC<UserListProps> = ({ onUserSelect }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { users, loading, error, meta, refetch } = useUsers({
    page,
    limit,
    search: search || undefined
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    refetch();
  };

  if (loading && !users.length) {
    return <div className="loading">Loading users...</div>;
  }

  if (error && !users.length) {
    return (
      <div className="error">
        <h3>Error loading users</h3>
        <p>{error.message}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <div className="user-list">
      <form onSubmit={handleSearchSubmit} className="search-form">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="search-input"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="error-banner">
          Error: {error.message}
          <button onClick={refetch}>Retry</button>
        </div>
      )}

      <div className="users-grid">
        {users.map(user => (
          <UserCard
            key={user.id}
            user={user}
            onClick={() => onUserSelect?.(user)}
          />
        ))}
      </div>

      {meta && meta.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
};

// components/UserCard.tsx
interface UserCardProps {
  user: User;
  onClick?: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onClick }) => {
  return (
    <div className="user-card" onClick={onClick}>
      {user.avatar && (
        <img src={user.avatar} alt={user.name} className="avatar" />
      )}
      <div className="user-info">
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        <span className={`role role-${user.role}`}>
          {user.role}
        </span>
        <div className="preferences">
          <span>Theme: {user.preferences.theme}</span>
          {user.preferences.notifications?.email && (
            <span className="notification-badge">Email notifications</span>
          )}
        </div>
      </div>
    </div>
  );
};
```

### Form Components with Validation

```typescript
// components/UserForm.tsx
import React, { useState } from 'react';
import { CreateUserRequest, UpdateUserRequest, UserRole } from '../generated/Api';

interface UserFormProps {
  initialData?: Partial<UpdateUserRequest>;
  mode: 'create' | 'edit';
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  loading?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({
  initialData = {},
  mode,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    email: mode === 'create' ? '' : undefined,
    avatar: initialData.avatar || '',
    role: mode === 'create' ? UserRole.User : undefined,
    preferences: {
      theme: initialData.preferences?.theme || 'auto',
      notifications: {
        email: initialData.preferences?.notifications?.email ?? true,
        push: initialData.preferences?.notifications?.push ?? true,
        sms: initialData.preferences?.notifications?.sms ?? false,
      },
      language: initialData.preferences?.language || 'en'
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation (required, 1-100 chars as per OpenAPI spec)
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    // Email validation (only for create mode)
    if (mode === 'create') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Avatar validation (optional, but must be valid URI if provided)
    if (formData.avatar) {
      try {
        new URL(formData.avatar);
      } catch {
        newErrors.avatar = 'Please enter a valid URL';
      }
    }

    // Language validation (pattern from OpenAPI spec)
    const languagePattern = /^[a-z]{2}(-[A-Z]{2})?$/;
    if (!languagePattern.test(formData.preferences.language)) {
      newErrors.language = 'Language must be in format "en" or "en-US"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submitData = mode === 'create'
        ? {
            name: formData.name,
            email: formData.email!,
            avatar: formData.avatar || undefined,
            role: formData.role!,
            preferences: formData.preferences
          } as CreateUserRequest
        : {
            name: formData.name,
            avatar: formData.avatar || undefined,
            preferences: formData.preferences
          } as UpdateUserRequest;

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updatePreferences = (updates: Partial<typeof formData.preferences>) => {
    setFormData(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...updates }
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="user-form">
      <div className="form-section">
        <h3>Basic Information</h3>

        <div className="form-field">
          <label htmlFor="name">Name *</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            maxLength={100}
            className={errors.name ? 'error' : ''}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        {mode === 'create' && (
          <div className="form-field">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData({ email: e.target.value })}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
        )}

        <div className="form-field">
          <label htmlFor="avatar">Avatar URL</label>
          <input
            id="avatar"
            type="url"
            value={formData.avatar}
            onChange={(e) => updateFormData({ avatar: e.target.value })}
            className={errors.avatar ? 'error' : ''}
            placeholder="https://example.com/avatar.jpg"
          />
          {errors.avatar && <span className="field-error">{errors.avatar}</span>}
        </div>

        {mode === 'create' && (
          <div className="form-field">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => updateFormData({ role: e.target.value as UserRole })}
            >
              {Object.values(UserRole).map(role => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="form-section">
        <h3>Preferences</h3>

        <div className="form-field">
          <label htmlFor="theme">Theme</label>
          <select
            id="theme"
            value={formData.preferences.theme}
            onChange={(e) => updatePreferences({
              theme: e.target.value as 'light' | 'dark' | 'auto'
            })}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="language">Language</label>
          <input
            id="language"
            type="text"
            value={formData.preferences.language}
            onChange={(e) => updatePreferences({ language: e.target.value })}
            pattern="^[a-z]{2}(-[A-Z]{2})?$"
            placeholder="en or en-US"
            className={errors.language ? 'error' : ''}
          />
          {errors.language && <span className="field-error">{errors.language}</span>}
        </div>

        <div className="form-section">
          <h4>Notifications</h4>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.preferences.notifications.email}
              onChange={(e) => updatePreferences({
                notifications: {
                  ...formData.preferences.notifications,
                  email: e.target.checked
                }
              })}
            />
            Email notifications
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.preferences.notifications.push}
              onChange={(e) => updatePreferences({
                notifications: {
                  ...formData.preferences.notifications,
                  push: e.target.checked
                }
              })}
            />
            Push notifications
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.preferences.notifications.sms}
              onChange={(e) => updatePreferences({
                notifications: {
                  ...formData.preferences.notifications,
                  sms: e.target.checked
                }
              })}
            />
            SMS notifications
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          disabled={loading}
          className="submit-button"
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create User' : 'Update User'}
        </button>
      </div>
    </form>
  );
};
```

## RTK Query Integration

### Auto-Generated RTK Query API

```typescript
// store/api/generatedApi.ts (auto-generated)
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

export const generatedApi = createApi({
  reducerPath: 'generatedApi',
  baseQuery: baseQuery,
  tagTypes: ['User'],
  endpoints: (builder) => ({
    getUsers: builder.query<
      UserListResponse,
      {
        page?: number;
        limit?: number;
        search?: string;
      }
    >({
      query: (params) => ({
        url: '/users',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    getUserById: builder.query<User, string>({
      query: (userId) => `/users/${userId}`,
      providesTags: (result, error, userId) => [{ type: 'User', id: userId }],
    }),

    createUser: builder.mutation<User, CreateUserRequest>({
      query: (userData) => ({
        url: '/users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    updateUser: builder.mutation<User, { userId: string; updates: UpdateUserRequest }>({
      query: ({ userId, updates }) => ({
        url: `/users/${userId}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { userId }) => [{ type: 'User', id: userId }],
    }),

    deleteUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, userId) => [
        { type: 'User', id: userId },
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
} = generatedApi;
```

### Using RTK Query Hooks in Components

```typescript
// components/UserManagement.tsx
import React, { useState } from 'react';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from '../store/api/generatedApi';
import { CreateUserRequest, UpdateUserRequest, User } from '../generated/Api';

const UserManagement: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const {
    data: usersData,
    error,
    isLoading,
    isFetching,
  } = useGetUsersQuery({
    page,
    limit: 10,
    search: search || undefined,
  });

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const handleCreateUser = async (userData: CreateUserRequest) => {
    try {
      await createUser(userData).unwrap();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdateUser = async (updates: UpdateUserRequest) => {
    if (!editingUser) return;

    try {
      await updateUser({
        userId: editingUser.id,
        updates,
      }).unwrap();
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteUser(userId).unwrap();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error loading users</div>;

  return (
    <div className="user-management">
      <div className="header">
        <h1>User Management</h1>
        <button onClick={() => setShowCreateForm(true)}>
          Add New User
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
        />
        {isFetching && <span>Updating...</span>}
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersData?.data.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="user-cell">
                    {user.avatar && (
                      <img src={user.avatar} alt={user.name} className="avatar-sm" />
                    )}
                    {user.name}
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <div className="actions">
                    <button
                      onClick={() => setEditingUser(user)}
                      disabled={isUpdating}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={isDeleting}
                      className="danger"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {usersData && (
          <div className="pagination">
            <span>
              Page {usersData.meta.page} of {usersData.meta.totalPages}
            </span>
            <div className="pagination-controls">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= usersData.meta.totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <Modal onClose={() => setShowCreateForm(false)}>
          <h2>Create New User</h2>
          <UserForm
            mode="create"
            onSubmit={handleCreateUser}
            loading={isCreating}
          />
        </Modal>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <Modal onClose={() => setEditingUser(null)}>
          <h2>Edit User</h2>
          <UserForm
            mode="edit"
            initialData={editingUser}
            onSubmit={handleUpdateUser}
            loading={isUpdating}
          />
        </Modal>
      )}
    </div>
  );
};
```

## Advanced Patterns

### Type-Safe Error Handling

```typescript
// utils/apiErrorHandler.ts
import { ApiError } from '../generated/Api';
import { SerializedError } from '@reduxjs/toolkit';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

export function extractApiError(
  error: FetchBaseQueryError | SerializedError | undefined,
): ApiError | null {
  if (!error) return null;

  // Handle RTK Query fetch errors
  if ('status' in error && error.data) {
    if (isApiError(error.data)) {
      return error.data;
    }
  }

  // Handle serialized errors
  if ('message' in error) {
    return {
      code: 'SERIALIZED_ERROR',
      message: error.message || 'An error occurred',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
  };
}

// Hook for consistent error handling
export function useApiErrorHandler() {
  const handleError = useCallback((error: unknown) => {
    const apiError = extractApiError(error as any);

    if (apiError) {
      switch (apiError.code) {
        case 'VALIDATION_ERROR':
          // Handle validation errors
          if (apiError.details) {
            return Object.entries(apiError.details)
              .map(([field, messages]) => `${field}: ${messages}`)
              .join(', ');
          }
          break;

        case 'UNAUTHORIZED':
          // Redirect to login
          window.location.href = '/login';
          break;

        case 'FORBIDDEN':
          // Show permission error
          return 'You do not have permission to perform this action';

        case 'NOT_FOUND':
          return 'The requested resource was not found';

        default:
          return apiError.message;
      }
    }

    return 'An unexpected error occurred';
  }, []);

  return { handleError };
}
```

### Custom Transformations

```typescript
// utils/apiTransforms.ts
import { User, CreateUserRequest } from '../generated/Api';

// Transform API dates to Date objects
export function transformUser(user: User): User & {
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    ...user,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

// Transform form data for API
export function transformCreateUserRequest(formData: any): CreateUserRequest {
  return {
    name: formData.name.trim(),
    email: formData.email.toLowerCase().trim(),
    avatar: formData.avatar || null,
    role: formData.role,
    preferences: {
      theme: formData.preferences.theme,
      notifications: formData.preferences.notifications,
      language: formData.preferences.language.toLowerCase(),
    },
  };
}

// Add transforms to RTK Query
export const enhancedApi = generatedApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsersWithTransform: builder.query<
      (User & { createdAt: Date; updatedAt: Date })[],
      Parameters<typeof generatedApi.endpoints.getUsers.initiate>[0]
    >({
      queryFn: async (params, api, extraOptions, baseQuery) => {
        const result = await generatedApi.endpoints.getUsers.initiate(params)(
          api.dispatch,
          api.getState,
          extraOptions,
        );

        if (result.data) {
          return {
            data: result.data.data.map(transformUser),
          };
        }

        return result;
      },
    }),
  }),
});
```

## Automated Workflow Setup

### GitHub Actions for API Sync

```yaml
# .github/workflows/sync-api-types.yml
name: Sync API Types

on:
  schedule:
    # Run every hour during business hours
    - cron: '0 9-17 * * 1-5'
  workflow_dispatch:
  repository_dispatch:
    types: [api-updated]

jobs:
  sync-api-types:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Fetch latest API spec
        run: |
          curl -H "Authorization: Bearer ${{ secrets.API_TOKEN }}" \
               -o api-spec.yaml \
               https://api.example.com/openapi.yaml

      - name: Generate API types
        run: npm run generate:api

      - name: Check for changes
        id: git-check
        run: |
          git diff --exit-code || echo "changed=true" >> $GITHUB_OUTPUT

      - name: Commit and push changes
        if: steps.git-check.outputs.changed == 'true'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .
          git commit -m "Update API types from latest OpenAPI spec"
          git push

      - name: Create PR for breaking changes
        if: steps.git-check.outputs.changed == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: Update API types - potential breaking changes
          title: '🚨 API Types Update - Review Required'
          body: |
            ## API Types Updated

            The OpenAPI specification has been updated. Please review the changes carefully:

            - Check for any breaking changes in existing endpoints
            - Update components that use the modified types
            - Test the application thoroughly

            Generated at: ${{ github.event.head_commit.timestamp }}
          branch: api-types-update
```

### Pre-commit Hook

```typescript
// scripts/validate-api-usage.ts
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

interface ApiUsageCheck {
  file: string;
  line: number;
  issue: string;
}

class ApiUsageValidator {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private issues: ApiUsageCheck[] = [];

  constructor() {
    const configPath = ts.findConfigFile('.', ts.sys.fileExists, 'tsconfig.json');
    const config = ts.readConfigFile(configPath!, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      path.dirname(configPath!),
    );

    this.program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
    this.checker = this.program.getTypeChecker();
  }

  validate(): ApiUsageCheck[] {
    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.fileName.includes('node_modules')) continue;
      this.visitNode(sourceFile);
    }

    return this.issues;
  }

  private visitNode(node: ts.Node) {
    // Check for deprecated API usage
    if (ts.isCallExpression(node)) {
      const signature = this.checker.getResolvedSignature(node);
      if (signature) {
        const declaration = signature.getDeclaration();
        if (declaration && this.hasDeprecatedTag(declaration)) {
          this.issues.push({
            file: node.getSourceFile().fileName,
            line: node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1,
            issue: 'Usage of deprecated API method',
          });
        }
      }
    }

    // Check for missing error handling
    if (this.isApiCall(node) && !this.hasErrorHandling(node)) {
      this.issues.push({
        file: node.getSourceFile().fileName,
        line: node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1,
        issue: 'API call without error handling',
      });
    }

    ts.forEachChild(node, (child) => this.visitNode(child));
  }

  private hasDeprecatedTag(node: ts.Node): boolean {
    const jsDoc = (node as any).jsDoc;
    if (!jsDoc) return false;
    return jsDoc.some((doc: any) =>
      doc.tags?.some((tag: any) => tag.tagName?.text === 'deprecated'),
    );
  }

  private isApiCall(node: ts.Node): boolean {
    // Simplified check for API calls
    return ts.isCallExpression(node) && node.expression.getText().includes('Api');
  }

  private hasErrorHandling(node: ts.Node): boolean {
    // Check if the call is wrapped in try-catch or has .catch()
    let parent = node.parent;
    while (parent) {
      if (ts.isTryStatement(parent)) return true;
      if (ts.isCallExpression(parent) && parent.expression.getText().includes('catch')) return true;
      parent = parent.parent;
    }
    return false;
  }
}

// Run validation
const validator = new ApiUsageValidator();
const issues = validator.validate();

if (issues.length > 0) {
  console.error('API Usage Issues Found:');
  issues.forEach((issue) => {
    console.error(`${issue.file}:${issue.line} - ${issue.issue}`);
  });
  process.exit(1);
}

console.log('✅ API usage validation passed');
```

## Best Practices

### 1. Keep Specs and Code in Sync

```bash
# Package.json script to enforce sync
{
  "scripts": {
    "predev": "npm run build:api",
    "prebuild": "npm run build:api",
    "pretest": "npm run build:api"
  }
}
```

### 2. Version Your API Specs

```typescript
// Track API spec versions
const API_SPEC_VERSION = '1.2.3';

// Include version in generated client
export const apiClient = new UsersApi(undefined, undefined, API_SPEC_VERSION);
```

### 3. Handle Backward Compatibility

```typescript
// Feature flags for API versions
const useNewUserFields = process.env.REACT_APP_API_VERSION >= '2.0.0';

interface LegacyUser {
  id: string;
  name: string;
  email: string;
}

interface NewUser extends LegacyUser {
  role: UserRole;
  preferences: UserPreferences;
}

function adaptUser(user: any): NewUser {
  return {
    ...user,
    role: user.role || UserRole.User,
    preferences: user.preferences || {
      theme: 'auto',
      notifications: { email: true, push: true, sms: false },
      language: 'en',
    },
  };
}
```

### 4. Mock API for Development

```typescript
// Mock server setup
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { User, UserListResponse } from '../generated/Api';

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.Admin,
    preferences: {
      theme: 'dark',
      notifications: { email: true, push: false, sms: false },
      language: 'en',
    },
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

const handlers = [
  rest.get('/api/users', (req, res, ctx) => {
    const page = Number(req.url.searchParams.get('page')) || 1;
    const limit = Number(req.url.searchParams.get('limit')) || 20;
    const search = req.url.searchParams.get('search');

    let filteredUsers = mockUsers;
    if (search) {
      filteredUsers = mockUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedUsers = filteredUsers.slice(start, end);

    const response: UserListResponse = {
      data: paginatedUsers,
      meta: {
        page,
        limit,
        total: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / limit),
      },
    };

    return res(ctx.json(response));
  }),
];

export const server = setupServer(...handlers);
```

## Summary

OpenAPI/Swagger integration with TypeScript provides:

1. **Automatic type generation** - Never write API types manually again
2. **Always-in-sync contracts** - Frontend automatically knows about backend changes
3. **Compile-time safety** - Catch API mismatches before runtime
4. **Developer productivity** - Full autocomplete and IntelliSense
5. **Documentation** - Self-documenting API usage
6. **Testing benefits** - Type-safe mocks and fixtures

The investment in setting up proper OpenAPI integration pays dividends in reduced bugs, faster development, and better maintainability. Your frontend and backend will never be out of sync again!
