---
title: Module Federation with TypeScript
description: Build type-safe micro-frontends with Webpack Module Federation and TypeScript
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T19:33:59.523Z'
---

Module Federation revolutionizes how we build and deploy React applications. Instead of monolithic bundles, you can create micro-frontends that share components, libraries, and even entire applications at runtime. But with great power comes great complexity, especially when adding TypeScript to the mix. Let's explore how to build type-safe federated applications.

## Understanding Module Federation

Module Federation allows you to:

- **Share dependencies** between applications at runtime
- **Load remote components** dynamically
- **Deploy independently** while maintaining integration
- **Scale teams** by owning separate micro-frontends

```typescript
// Host application loads remote components
import RemoteButton from 'remoteApp/Button';
import RemoteUserCard from 'remoteApp/UserCard';

const App = () => {
  return (
    <div>
      <h1>Host Application</h1>
      <RemoteButton onClick={() => console.log('clicked')}>
        Remote Button
      </RemoteButton>
      <RemoteUserCard userId="123" />
    </div>
  );
};
```

The challenge? TypeScript doesn't know about these remote modules at build time.

## Setting Up the Foundation

### Host Application Configuration

```typescript
// webpack.config.js (Host)
const ModuleFederationPlugin = require('@module-federation/webpack');

module.exports = {
  mode: 'development',
  devServer: {
    port: 3000,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        remoteApp: 'remoteApp@http://localhost:3001/remoteEntry.js',
        remoteLibrary: 'remoteLibrary@http://localhost:3002/remoteEntry.js',
      },
      shared: {
        react: {
          singleton: true,
          eager: true,
          requiredVersion: '^18.0.0',
        },
        'react-dom': {
          singleton: true,
          eager: true,
          requiredVersion: '^18.0.0',
        },
        '@types/react': {
          singleton: true,
          eager: true,
        },
      },
    }),
  ],
};
```

### Remote Application Configuration

```typescript
// webpack.config.js (Remote)
const ModuleFederationPlugin = require('@module-federation/webpack');

module.exports = {
  mode: 'development',
  devServer: {
    port: 3001,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'remoteApp',
      filename: 'remoteEntry.js',
      exposes: {
        './Button': './src/components/Button',
        './UserCard': './src/components/UserCard',
        './hooks/useUser': './src/hooks/useUser',
        './types': './src/types/index',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
      },
    }),
  ],
};
```

## Type Definitions for Remote Modules

### Manual Type Declarations

Create type definitions for remote modules:

```typescript
// types/remotes.d.ts
declare module 'remoteApp/Button' {
  import React from 'react';

  interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
  }

  const Button: React.FC<ButtonProps>;
  export default Button;
}

declare module 'remoteApp/UserCard' {
  import React from 'react';

  interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }

  interface UserCardProps {
    userId: string;
    onEdit?: (user: User) => void;
    onDelete?: (userId: string) => void;
    compact?: boolean;
  }

  const UserCard: React.FC<UserCardProps>;
  export default UserCard;
}

declare module 'remoteApp/hooks/useUser' {
  interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    lastSeen: Date;
  }

  interface UseUserResult {
    user: User | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
  }

  export function useUser(userId: string): UseUserResult;
}

declare module 'remoteApp/types' {
  export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    lastSeen: Date;
    preferences: {
      theme: 'light' | 'dark';
      notifications: boolean;
    };
  }

  export interface ApiResponse<T> {
    data: T;
    success: boolean;
    error?: string;
  }

  export type UserRole = 'admin' | 'user' | 'viewer';
}
```

## Automated Type Generation

### Type Extraction Script

```typescript
// scripts/extract-types.ts
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

interface ExposedModule {
  name: string;
  path: string;
  exports: string[];
}

class TypeExtractor {
  private program: ts.Program;
  private checker: ts.TypeChecker;

  constructor(private configPath: string) {
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      path.dirname(configPath),
    );

    this.program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
    this.checker = this.program.getTypeChecker();
  }

  extractTypes(exposedModules: ExposedModule[]): string {
    let declarations = '';

    for (const module of exposedModules) {
      const sourceFile = this.program.getSourceFile(module.path);
      if (!sourceFile) continue;

      const moduleDeclaration = this.generateModuleDeclaration(module, sourceFile);
      declarations += moduleDeclaration + '\n\n';
    }

    return declarations;
  }

  private generateModuleDeclaration(module: ExposedModule, sourceFile: ts.SourceFile): string {
    const exports = this.extractExports(sourceFile);
    const imports = this.extractImports(sourceFile);

    let declaration = `declare module '${module.name}' {\n`;

    // Add imports
    for (const imp of imports) {
      declaration += `  ${imp}\n`;
    }

    if (imports.length > 0) {
      declaration += '\n';
    }

    // Add exports
    for (const exp of exports) {
      declaration += `  ${exp}\n`;
    }

    declaration += '}';
    return declaration;
  }

  private extractExports(sourceFile: ts.SourceFile): string[] {
    const exports: string[] = [];

    const visit = (node: ts.Node) => {
      // Extract export declarations
      if (ts.isExportDeclaration(node)) {
        const exportClause = node.exportClause;
        if (exportClause && ts.isNamedExports(exportClause)) {
          for (const element of exportClause.elements) {
            exports.push(`export { ${element.name.text} };`);
          }
        }
      }

      // Extract exported functions/components
      if (
        ts.isFunctionDeclaration(node) &&
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        const signature = this.checker.getSignatureFromDeclaration(node);
        if (signature) {
          const typeString = this.checker.typeToString(signature.getReturnType());
          exports.push(`export function ${node.name?.text}(...args: any[]): ${typeString};`);
        }
      }

      // Extract exported interfaces
      if (
        ts.isInterfaceDeclaration(node) &&
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        const interfaceText = node.getFullText().trim();
        exports.push(interfaceText);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return exports;
  }

  private extractImports(sourceFile: ts.SourceFile): string[] {
    const imports: string[] = [];

    sourceFile.statements.forEach((statement) => {
      if (ts.isImportDeclaration(statement)) {
        const importText = statement.getFullText().trim();
        imports.push(importText);
      }
    });

    return imports;
  }
}

// Usage
const extractor = new TypeExtractor('./tsconfig.json');
const exposedModules: ExposedModule[] = [
  { name: 'remoteApp/Button', path: './src/components/Button.tsx', exports: ['default'] },
  { name: 'remoteApp/UserCard', path: './src/components/UserCard.tsx', exports: ['default'] },
  { name: 'remoteApp/types', path: './src/types/index.ts', exports: ['User', 'ApiResponse'] },
];

const types = extractor.extractTypes(exposedModules);
fs.writeFileSync('./types/remote-types.d.ts', types);
```

## Runtime Type Safety

### Type Guards for Remote Components

```typescript
// utils/typeGuards.ts
export function isValidComponent<P = any>(component: any): component is React.ComponentType<P> {
  return (
    component &&
    (typeof component === 'function' || (typeof component === 'object' && component.$$typeof))
  );
}

export function hasRequiredProps<T extends Record<string, any>>(
  props: any,
  required: (keyof T)[],
): props is T {
  if (!props || typeof props !== 'object') return false;

  return required.every((key) => key in props);
}

// Validate remote component props at runtime
export function validateRemoteProps<T>(props: unknown, validator: (props: any) => props is T): T {
  if (!validator(props)) {
    throw new Error('Invalid props passed to remote component');
  }
  return props;
}
```

### Safe Remote Component Loader

```typescript
// components/RemoteComponentLoader.tsx
interface RemoteComponentLoaderProps<T = any> {
  module: string;
  fallback?: React.ComponentType;
  errorBoundary?: React.ComponentType<{ error: Error }>;
  props?: T;
  validator?: (component: any) => boolean;
  onLoad?: (component: React.ComponentType<T>) => void;
  onError?: (error: Error) => void;
}

interface LoaderState<T> {
  Component: React.ComponentType<T> | null;
  loading: boolean;
  error: Error | null;
}

export function RemoteComponentLoader<T = any>({
  module,
  fallback: Fallback,
  errorBoundary: ErrorBoundary,
  props,
  validator,
  onLoad,
  onError
}: RemoteComponentLoaderProps<T>) {
  const [state, setState] = useState<LoaderState<T>>({
    Component: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const loadComponent = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Dynamic import of remote module
        const remoteModule = await import(/* webpackIgnore: true */ module);
        const Component = remoteModule.default || remoteModule;

        if (!mounted) return;

        // Validate component
        if (!isValidComponent(Component)) {
          throw new Error(`Invalid component loaded from ${module}`);
        }

        // Custom validation
        if (validator && !validator(Component)) {
          throw new Error(`Component validation failed for ${module}`);
        }

        setState({
          Component,
          loading: false,
          error: null
        });

        onLoad?.(Component);

      } catch (error) {
        if (!mounted) return;

        const err = error instanceof Error ? error : new Error('Failed to load component');

        setState({
          Component: null,
          loading: false,
          error: err
        });

        onError?.(err);
      }
    };

    loadComponent();

    return () => {
      mounted = false;
    };
  }, [module, validator, onLoad, onError]);

  if (state.loading) {
    return Fallback ? <Fallback /> : <div>Loading component...</div>;
  }

  if (state.error) {
    if (ErrorBoundary) {
      return <ErrorBoundary error={state.error} />;
    }
    throw state.error;
  }

  if (!state.Component) {
    return null;
  }

  const Component = state.Component;
  return <Component {...(props as T)} />;
}
```

## Type-Safe Remote Hooks

### Remote Hook Loader

```typescript
// hooks/useRemoteHook.ts
interface RemoteHookResult<T> {
  hook: T | null;
  loading: boolean;
  error: Error | null;
}

export function useRemoteHook<T extends (...args: any[]) => any>(
  module: string,
  hookName: string = 'default'
): RemoteHookResult<T> {
  const [state, setState] = useState<RemoteHookResult<T>>({
    hook: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const loadHook = async () => {
      try {
        const remoteModule = await import(/* webpackIgnore: true */ module);
        const hook = hookName === 'default' ? remoteModule.default : remoteModule[hookName];

        if (!mounted) return;

        if (typeof hook !== 'function') {
          throw new Error(`Hook ${hookName} is not a function in ${module}`);
        }

        setState({
          hook: hook as T,
          loading: false,
          error: null
        });

      } catch (error) {
        if (!mounted) return;

        setState({
          hook: null,
          loading: false,
          error: error instanceof Error ? error : new Error('Failed to load hook')
        });
      }
    };

    loadHook();

    return () => {
      mounted = false;
    };
  }, [module, hookName]);

  return state;
}

// Usage example
const UserProfileWithRemoteData: React.FC<{ userId: string }> = ({ userId }) => {
  const { hook: useRemoteUser, loading: hookLoading, error: hookError } = useRemoteHook(
    'remoteApp/hooks/useUser'
  );

  const userResult = useRemoteUser?.(userId);

  if (hookLoading) return <div>Loading remote hook...</div>;
  if (hookError) return <div>Error loading hook: {hookError.message}</div>;
  if (!useRemoteUser) return <div>Hook not available</div>;

  const { user, loading, error } = userResult || { user: null, loading: true, error: null };

  if (loading) return <div>Loading user...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
};
```

## Shared Type Definitions

### Centralized Type Package

Create a shared package for common types:

```typescript
// packages/shared-types/src/index.ts
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  lastSeen: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  language: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: ApiError;
  meta?: {
    page?: number;
    totalPages?: number;
    total?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export type UserRole = 'admin' | 'user' | 'viewer' | 'editor';

export interface ComponentProps {
  className?: string;
  'data-testid'?: string;
}

// Event types for cross-app communication
export interface AppEvent<T = any> {
  type: string;
  payload: T;
  source: string;
  timestamp: Date;
}

export type UserEvent =
  | AppEvent<{ userId: string; action: 'login' }>
  | AppEvent<{ userId: string; action: 'logout' }>
  | AppEvent<{ userId: string; profile: Partial<User>; action: 'profile_update' }>;
```

### Package Configuration

```json
// packages/shared-types/package.json
{
  "name": "@myapp/shared-types",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

```json
// packages/shared-types/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Event-Driven Communication

### Type-Safe Event Bus

```typescript
// utils/eventBus.ts
import { UserEvent } from '@myapp/shared-types';

type EventHandler<T> = (event: T) => void;

class TypedEventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();

  subscribe<T extends UserEvent>(eventType: T['type'], handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
        }
      }
    };
  }

  emit<T extends UserEvent>(event: T): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      });
    }
  }

  // Type-safe emit helpers
  emitUserLogin(userId: string): void {
    this.emit({
      type: 'login',
      payload: { userId, action: 'login' },
      source: 'host-app',
      timestamp: new Date(),
    });
  }

  emitUserLogout(userId: string): void {
    this.emit({
      type: 'logout',
      payload: { userId, action: 'logout' },
      source: 'host-app',
      timestamp: new Date(),
    });
  }

  emitProfileUpdate(userId: string, profile: Partial<User>): void {
    this.emit({
      type: 'profile_update',
      payload: { userId, profile, action: 'profile_update' },
      source: 'host-app',
      timestamp: new Date(),
    });
  }
}

export const eventBus = new TypedEventBus();
```

### React Hook for Events

```typescript
// hooks/useEventBus.ts
export function useEventBus() {
  const subscribe = useCallback(
    <T extends UserEvent>(eventType: T['type'], handler: EventHandler<T>) => {
      return eventBus.subscribe(eventType, handler);
    },
    [],
  );

  const emit = useCallback(<T extends UserEvent>(event: T) => {
    eventBus.emit(event);
  }, []);

  return { subscribe, emit };
}

// Specific event hooks
export function useUserEvents() {
  const { subscribe } = useEventBus();

  const onUserLogin = useCallback(
    (handler: (userId: string) => void) => {
      return subscribe('login', (event) => {
        handler(event.payload.userId);
      });
    },
    [subscribe],
  );

  const onUserLogout = useCallback(
    (handler: (userId: string) => void) => {
      return subscribe('logout', (event) => {
        handler(event.payload.userId);
      });
    },
    [subscribe],
  );

  const onProfileUpdate = useCallback(
    (handler: (userId: string, profile: Partial<User>) => void) => {
      return subscribe('profile_update', (event) => {
        handler(event.payload.userId, event.payload.profile);
      });
    },
    [subscribe],
  );

  return { onUserLogin, onUserLogout, onProfileUpdate };
}
```

## Development and Testing

### Mock Remote Components for Development

```typescript
// __mocks__/remoteComponents.tsx
import React from 'react';
import { ComponentProps } from '@myapp/shared-types';

// Mock Button component
export const MockButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
} & ComponentProps> = ({ children, onClick, variant = 'primary', disabled, ...props }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`mock-button mock-button--${variant} ${props.className || ''}`}
      data-testid={props['data-testid']}
      style={{
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: variant === 'primary' ? '#007bff' : variant === 'danger' ? '#dc3545' : '#6c757d',
        color: 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1
      }}
    >
      {children} (Mock)
    </button>
  );
};

// Mock UserCard component
export const MockUserCard: React.FC<{
  userId: string;
  onEdit?: (user: any) => void;
  onDelete?: (userId: string) => void;
  compact?: boolean;
} & ComponentProps> = ({ userId, onEdit, onDelete, compact, ...props }) => {
  const mockUser = {
    id: userId,
    name: `Mock User ${userId}`,
    email: `user${userId}@example.com`,
    avatar: `https://via.placeholder.com/40/007bff/ffffff?text=${userId}`
  };

  return (
    <div
      className={`mock-user-card ${compact ? 'compact' : ''} ${props.className || ''}`}
      data-testid={props['data-testid']}
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: compact ? '8px' : '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
    >
      <img
        src={mockUser.avatar}
        alt={mockUser.name}
        style={{ width: compact ? '32px' : '48px', height: compact ? '32px' : '48px', borderRadius: '50%' }}
      />
      <div>
        <h4 style={{ margin: 0 }}>{mockUser.name} (Mock)</h4>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{mockUser.email}</p>
      </div>
      <div style={{ marginLeft: 'auto' }}>
        {onEdit && (
          <button onClick={() => onEdit(mockUser)} style={{ marginRight: '8px' }}>
            Edit
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(userId)}>Delete</button>
        )}
      </div>
    </div>
  );
};

// Development mode detection
const isDevelopment = process.env.NODE_ENV === 'development';

// Mock module factory
export function createMockModule(moduleName: string) {
  switch (moduleName) {
    case 'remoteApp/Button':
      return { default: MockButton };
    case 'remoteApp/UserCard':
      return { default: MockUserCard };
    default:
      throw new Error(`No mock available for ${moduleName}`);
  }
}
```

### Testing Federated Components

```typescript
// __tests__/RemoteComponentLoader.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RemoteComponentLoader } from '../components/RemoteComponentLoader';
import { createMockModule } from '../__mocks__/remoteComponents';

// Mock dynamic imports
jest.mock('../../utils/dynamicImport', () => ({
  importRemoteModule: jest.fn()
}));

import { importRemoteModule } from '../../utils/dynamicImport';
const mockImportRemoteModule = importRemoteModule as jest.MockedFunction<typeof importRemoteModule>;

describe('RemoteComponentLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load and render remote component', async () => {
    const mockComponent = createMockModule('remoteApp/Button');
    mockImportRemoteModule.mockResolvedValue(mockComponent);

    render(
      <RemoteComponentLoader
        module="remoteApp/Button"
        props={{ children: 'Click me', variant: 'primary' }}
      />
    );

    expect(screen.getByText('Loading component...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Click me (Mock)')).toBeInTheDocument();
    });

    expect(mockImportRemoteModule).toHaveBeenCalledWith('remoteApp/Button');
  });

  it('should show error when component fails to load', async () => {
    mockImportRemoteModule.mockRejectedValue(new Error('Network error'));

    const ErrorBoundary = ({ error }: { error: Error }) => (
      <div>Error: {error.message}</div>
    );

    render(
      <RemoteComponentLoader
        module="remoteApp/Button"
        errorBoundary={ErrorBoundary}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });
  });

  it('should validate component before rendering', async () => {
    const invalidComponent = { notAComponent: true };
    mockImportRemoteModule.mockResolvedValue(invalidComponent);

    const validator = (component: any) => typeof component.default === 'function';

    render(
      <RemoteComponentLoader
        module="remoteApp/Button"
        validator={validator}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Component validation failed/)).toBeInTheDocument();
    });
  });
});

// Test federated app integration
describe('Federated App Integration', () => {
  it('should handle cross-app events', () => {
    const eventHandler = jest.fn();

    // Simulate event from remote app
    eventBus.emit({
      type: 'login',
      payload: { userId: '123', action: 'login' },
      source: 'remote-app',
      timestamp: new Date()
    });

    expect(eventHandler).not.toHaveBeenCalled();

    const unsubscribe = eventBus.subscribe('login', eventHandler);

    eventBus.emit({
      type: 'login',
      payload: { userId: '456', action: 'login' },
      source: 'remote-app',
      timestamp: new Date()
    });

    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'login',
        payload: { userId: '456', action: 'login' }
      })
    );

    unsubscribe();
  });
});
```

## Production Considerations

### Environment-Specific Configuration

```typescript
// config/federation.ts
interface FederationConfig {
  remotes: Record<string, string>;
  shared: Record<string, any>;
  fallbackUrls?: Record<string, string[]>;
}

const configs: Record<string, FederationConfig> = {
  development: {
    remotes: {
      remoteApp: 'http://localhost:3001/remoteEntry.js',
      remoteLibrary: 'http://localhost:3002/remoteEntry.js',
    },
    shared: {
      react: { singleton: true, eager: true },
      'react-dom': { singleton: true, eager: true },
    },
  },

  staging: {
    remotes: {
      remoteApp: 'https://staging-remote.myapp.com/remoteEntry.js',
      remoteLibrary: 'https://staging-library.myapp.com/remoteEntry.js',
    },
    shared: {
      react: { singleton: true, eager: false },
      'react-dom': { singleton: true, eager: false },
    },
    fallbackUrls: {
      remoteApp: [
        'https://staging-remote-fallback.myapp.com/remoteEntry.js',
        'https://staging-remote-backup.myapp.com/remoteEntry.js',
      ],
    },
  },

  production: {
    remotes: {
      remoteApp: 'https://remote.myapp.com/remoteEntry.js',
      remoteLibrary: 'https://library.myapp.com/remoteEntry.js',
    },
    shared: {
      react: { singleton: true, eager: false, requiredVersion: '^18.0.0' },
      'react-dom': { singleton: true, eager: false, requiredVersion: '^18.0.0' },
    },
    fallbackUrls: {
      remoteApp: [
        'https://cdn-fallback.myapp.com/remote/remoteEntry.js',
        'https://backup.myapp.com/remote/remoteEntry.js',
      ],
    },
  },
};

export const getFederationConfig = (): FederationConfig => {
  const env = process.env.NODE_ENV || 'development';
  return configs[env] || configs.development;
};
```

### Error Recovery and Fallbacks

```typescript
// utils/resilientLoader.ts
interface LoadOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackUrls?: string[];
  timeout?: number;
}

export class ResilientRemoteLoader {
  async loadRemoteModule(primaryUrl: string, options: LoadOptions = {}): Promise<any> {
    const { maxRetries = 3, retryDelay = 1000, fallbackUrls = [], timeout = 10000 } = options;

    const allUrls = [primaryUrl, ...fallbackUrls];
    let lastError: Error | null = null;

    for (const url of allUrls) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const module = await this.loadWithTimeout(url, timeout);
          return module;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');

          // Wait before retry
          if (attempt < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }
    }

    throw new Error(`Failed to load remote module from all URLs: ${lastError?.message}`);
  }

  private async loadWithTimeout(url: string, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;

      const timeoutId = setTimeout(() => {
        document.head.removeChild(script);
        reject(new Error(`Timeout loading ${url}`));
      }, timeout);

      script.onload = () => {
        clearTimeout(timeoutId);
        resolve(window[url.split('/').pop()?.split('.')[0] || 'unknown']);
      };

      script.onerror = () => {
        clearTimeout(timeoutId);
        document.head.removeChild(script);
        reject(new Error(`Failed to load ${url}`));
      };

      document.head.appendChild(script);
    });
  }
}

export const resilientLoader = new ResilientRemoteLoader();
```

### Monitoring and Analytics

```typescript
// utils/federationMonitoring.ts
interface LoadMetrics {
  module: string;
  url: string;
  loadTime: number;
  success: boolean;
  error?: string;
  attempt: number;
  fallback: boolean;
}

class FederationMonitor {
  private metrics: LoadMetrics[] = [];

  recordLoad(metrics: LoadMetrics): void {
    this.metrics.push(metrics);

    // Send to analytics
    this.sendToAnalytics(metrics);

    // Trim old metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  private sendToAnalytics(metrics: LoadMetrics): void {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'remote_module_load', {
        event_category: 'module_federation',
        event_label: metrics.module,
        value: Math.round(metrics.loadTime),
        custom_map: {
          success: metrics.success,
          attempt: metrics.attempt,
          fallback: metrics.fallback,
          error: metrics.error,
        },
      });
    }
  }

  getStats() {
    const total = this.metrics.length;
    const successful = this.metrics.filter((m) => m.success).length;
    const avgLoadTime =
      this.metrics.filter((m) => m.success).reduce((sum, m) => sum + m.loadTime, 0) / successful;

    return {
      total,
      successful,
      failureRate: ((total - successful) / total) * 100,
      avgLoadTime: Math.round(avgLoadTime),
    };
  }
}

export const federationMonitor = new FederationMonitor();
```

## Best Practices

### 1. Type Safety First

```typescript
// ✅ Always define types for remote modules
declare module 'remoteApp/Component' {
  interface Props {
    /* ... */
  }
  const Component: React.FC<Props>;
  export default Component;
}

// ✅ Use type guards for runtime safety
if (!isValidComponent(RemoteComponent)) {
  throw new Error('Invalid remote component');
}

// ✅ Validate props before passing to remote components
const validatedProps = validateRemoteProps(props, isValidProps);
```

### 2. Error Boundaries Everywhere

```typescript
// ✅ Wrap remote components in error boundaries
<ErrorBoundary fallback={LocalFallback}>
  <RemoteComponent {...props} />
</ErrorBoundary>

// ✅ Provide meaningful fallbacks
const FallbackComponent = () => (
  <div className="remote-fallback">
    This feature is temporarily unavailable
  </div>
);
```

### 3. Performance Optimization

```typescript
// ✅ Lazy load remote components
const RemoteComponent = React.lazy(() =>
  import('remoteApp/Component').catch(() => ({
    default: FallbackComponent
  }))
);

// ✅ Preload critical remote modules
useEffect(() => {
  import('remoteApp/CriticalComponent');
}, []);

// ✅ Use Suspense for loading states
<Suspense fallback={<Loading />}>
  <RemoteComponent />
</Suspense>
```

### 4. Version Management

```typescript
// ✅ Use semantic versioning in shared dependencies
shared: {
  react: {
    singleton: true,
    requiredVersion: '^18.0.0',
    strictVersion: true
  }
}

// ✅ Handle version mismatches gracefully
if (remoteVersion !== hostVersion) {
  console.warn(`Version mismatch: host(${hostVersion}) vs remote(${remoteVersion})`);
}
```

## Summary

Module Federation with TypeScript enables:

1. **Independent deployment** of micro-frontends
2. **Runtime sharing** of dependencies and components
3. **Type safety** across application boundaries
4. **Graceful fallbacks** when remote modules fail
5. **Event-driven communication** between federated apps

The key is balancing the flexibility of runtime module loading with the safety of compile-time type checking. Use type declarations, runtime validation, and robust error handling to build resilient federated applications that scale across teams and deployments.
