---
title: TypeScript Patterns for React Testing
description: >-
  Write type-safe tests for React components with Testing Library, mocks, and
  custom matchers
date: 2025-09-27T10:00:00.000Z
modified: '2025-09-27T19:39:31.332Z'
published: true
tags:
  - typescript
  - react
  - testing
  - react-testing-library
---

Testing React components with TypeScript adds an extra layer of confidence to your test suite. Not only do you verify behavior, but you also ensure type safety throughout your tests. This guide covers essential patterns for testing React components with TypeScript, from basic component tests to complex mocking scenarios.

## Setting Up TypeScript with React Testing Library

First, let's establish the foundation for type-safe React testing.

### Type Definitions and Configuration

```typescript
// test-utils.tsx
import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ThemeProvider } from './theme';
import { AuthProvider } from './auth';

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: 'light' | 'dark';
  user?: User | null;
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult {
  const { theme = 'light', user = null, ...renderOptions } = options ?? {};

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider theme={theme}>
        <AuthProvider user={user}>
          {children}
        </AuthProvider>
      </ThemeProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Type-safe queries
export function getByTestId<T extends HTMLElement = HTMLElement>(
  container: HTMLElement,
  testId: string
): T {
  const element = container.querySelector<T>(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Element with testId "${testId}" not found`);
  }
  return element;
}
```

### Jest Configuration with TypeScript

```typescript
// jest.config.ts
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/*.stories.tsx'],
};

export default config;
```

## Component Testing Patterns

### Basic Component Testing

```typescript
import { render, screen, fireEvent } from '../test-utils';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onClick handler', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Submit</Button>);

    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="primary">Test</Button>);

    let button = screen.getByRole('button');
    expect(button).toHaveClass('btn-primary');

    rerender(<Button variant="secondary">Test</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('btn-secondary');
  });
});
```

### Testing Props and Types

```typescript
// Type-safe prop testing
interface CardProps {
  title: string;
  description?: string;
  image?: string;
  onClick?: () => void;
}

function Card({ title, description, image, onClick }: CardProps) {
  return (
    <article onClick={onClick}>
      {image && <img src={image} alt="" />}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </article>
  );
}

describe('Card Component', () => {
  const defaultProps: CardProps = {
    title: 'Test Card',
  };

  it('renders with required props', () => {
    render(<Card {...defaultProps} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Test Card');
  });

  it('renders optional props when provided', () => {
    const props: CardProps = {
      ...defaultProps,
      description: 'Test description',
      image: '/test.jpg',
    };

    render(<Card {...props} />);

    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/test.jpg');
  });

  // Type-safe prop combinations
  it('handles different prop combinations', () => {
    const testCases: Array<[CardProps, string]> = [
      [{ title: 'Only title' }, 'minimal'],
      [{ title: 'With desc', description: 'Desc' }, 'with-description'],
      [{ title: 'Full', description: 'Desc', image: '/img.jpg' }, 'complete'],
    ];

    testCases.forEach(([props, testId]) => {
      const { container } = render(<Card {...props} />);
      expect(container.firstChild).toMatchSnapshot(testId);
    });
  });
});
```

## Testing Hooks

### Testing Custom Hooks

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCounter } from './useCounter';
import { useFetch } from './useFetch';

describe('useCounter Hook', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());

    expect(result.current.count).toBe(0);
  });

  it('increments counter', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(6);
  });

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.increment();
      result.current.increment();
    });

    expect(result.current.count).toBe(12);

    act(() => {
      result.current.reset();
    });

    expect(result.current.count).toBe(10);
  });
});

describe('useFetch Hook', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('fetches data successfully', async () => {
    const mockData = { id: 1, name: 'Test User' };
    fetchMock.mockResponseOnce(JSON.stringify(mockData));

    const { result } = renderHook(() => useFetch<typeof mockData>('/api/user'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch error', async () => {
    fetchMock.mockRejectOnce(new Error('Network error'));

    const { result } = renderHook(() => useFetch('/api/user'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual(new Error('Network error'));
  });
});
```

### Testing Hook State Changes

```typescript
interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  setValue: <K extends keyof T>(key: K, value: T[K]) => void;
  submit: () => Promise<void>;
}

function useForm<T extends Record<string, any>>(
  initialValues: T,
  validate: (values: T) => Partial<Record<keyof T, string>>,
): UseFormReturn<T> {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const setValue = <K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    const newErrors = validate(values);
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Submit logic
    }
  };

  return { values, errors, setValue, submit };
}

describe('useForm Hook', () => {
  interface FormData {
    email: string;
    password: string;
  }

  const validate = (values: FormData) => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!values.email.includes('@')) {
      errors.email = 'Invalid email';
    }
    if (values.password.length < 8) {
      errors.password = 'Password too short';
    }
    return errors;
  };

  it('manages form state with validation', async () => {
    const { result } = renderHook(() => useForm<FormData>({ email: '', password: '' }, validate));

    // Update values
    act(() => {
      result.current.setValue('email', 'test@example.com');
      result.current.setValue('password', 'short');
    });

    expect(result.current.values).toEqual({
      email: 'test@example.com',
      password: 'short',
    });

    // Submit and validate
    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errors).toEqual({
      password: 'Password too short',
    });
  });
});
```

## Mocking Patterns

### Type-Safe Module Mocks

```typescript
// __mocks__/api.ts
export const api = {
  getUser: jest.fn<Promise<User>, [string]>(),
  updateUser: jest.fn<Promise<User>, [string, Partial<User>]>(),
  deleteUser: jest.fn<Promise<void>, [string]>(),
};

// In test file
import { api } from '../api';
import { UserProfile } from './UserProfile';

jest.mock('../api');

describe('UserProfile Component', () => {
  const mockApi = api as jest.Mocked<typeof api>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and displays user data', async () => {
    const mockUser: User = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    };

    mockApi.getUser.mockResolvedValueOnce(mockUser);

    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(mockApi.getUser).toHaveBeenCalledWith('1');
  });
});
```

### Mocking React Components

```typescript
// Type-safe component mocks
jest.mock('./ComplexComponent', () => ({
  ComplexComponent: jest.fn(({ title, onAction }: ComplexComponentProps) => (
    <div data-testid="mock-complex">
      <span>{title}</span>
      <button onClick={onAction}>Action</button>
    </div>
  )),
}));

import { ComplexComponent } from './ComplexComponent';

describe('Parent Component', () => {
  it('renders with mocked child component', () => {
    const handleAction = jest.fn();

    render(
      <ParentComponent>
        <ComplexComponent title="Test" onAction={handleAction} />
      </ParentComponent>
    );

    expect(screen.getByTestId('mock-complex')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Action'));
    expect(handleAction).toHaveBeenCalled();
  });
});
```

### Mocking Hooks

```typescript
// Mock a custom hook
jest.mock('./useAuth', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from './useAuth';
import { ProtectedComponent } from './ProtectedComponent';

describe('ProtectedComponent', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  it('shows content when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User' },
      isLoading: false,
      error: null,
    });

    render(<ProtectedComponent />);

    expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
  });

  it('shows login prompt when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
    });

    render(<ProtectedComponent />);

    expect(screen.getByText('Please log in')).toBeInTheDocument();
  });
});
```

## Event Testing

### Type-Safe Event Simulation

```typescript
import { fireEvent, userEvent } from '@testing-library/react';

interface FormProps {
  onSubmit: (data: { email: string; password: string }) => void;
}

function LoginForm({ onSubmit }: FormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-label="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}

describe('LoginForm', () => {
  it('submits form data', async () => {
    const handleSubmit = jest.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={jest.fn()} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    emailInput.focus();
    expect(emailInput).toHaveFocus();

    await user.tab();
    expect(passwordInput).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
  });
});
```

## Async Testing

### Testing Async Components

```typescript
interface AsyncListProps<T> {
  fetchData: () => Promise<T[]>;
  renderItem: (item: T) => ReactNode;
}

function AsyncList<T extends { id: string }>({
  fetchData,
  renderItem,
}: AsyncListProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchData()
      .then(setItems)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [fetchData]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

describe('AsyncList', () => {
  interface TestItem {
    id: string;
    name: string;
  }

  it('loads and displays items', async () => {
    const mockItems: TestItem[] = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];

    const fetchData = jest.fn<Promise<TestItem[]>, []>()
      .mockResolvedValue(mockItems);

    render(
      <AsyncList
        fetchData={fetchData}
        renderItem={(item) => <span>{item.name}</span>}
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('handles fetch errors', async () => {
    const fetchData = jest.fn<Promise<TestItem[]>, []>()
      .mockRejectedValue(new Error('Network error'));

    render(
      <AsyncList
        fetchData={fetchData}
        renderItem={(item) => <span>{item.name}</span>}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});
```

## Custom Matchers

### Type-Safe Custom Matchers

```typescript
// custom-matchers.ts
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(min: number, max: number): R;
      toHaveStyle(style: Partial<CSSStyleDeclaration>): R;
      toBeValidEmail(): R;
    }
  }
}

expect.extend({
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be within range [${min}, ${max}]`
          : `Expected ${received} to be within range [${min}, ${max}]`,
    };
  },

  toHaveStyle(received: HTMLElement, style: Partial<CSSStyleDeclaration>) {
    const computedStyle = window.getComputedStyle(received);
    const entries = Object.entries(style);

    for (const [property, value] of entries) {
      const actualValue = computedStyle[property as any];
      if (actualValue !== value) {
        return {
          pass: false,
          message: () => `Expected element to have ${property}: ${value}, but got ${actualValue}`,
        };
      }
    }

    return {
      pass: true,
      message: () => 'Element has expected styles',
    };
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `Expected "${received}" not to be a valid email`
          : `Expected "${received}" to be a valid email`,
    };
  },
});

// Usage in tests
describe('Custom Matchers', () => {
  it('uses custom matchers', () => {
    expect(5).toBeWithinRange(1, 10);
    expect('test@example.com').toBeValidEmail();

    const element = document.createElement('div');
    element.style.color = 'red';
    element.style.fontSize = '16px';

    expect(element).toHaveStyle({
      color: 'red',
      fontSize: '16px',
    });
  });
});
```

## Testing Factory Patterns

### Component Test Factories

```typescript
// test-factories.ts
interface ComponentTestProps<P> {
  props?: Partial<P>;
  user?: User;
  renderOptions?: RenderOptions;
}

function createComponentTest<P extends object>(
  Component: ComponentType<P>,
  defaultProps: P
) {
  return function renderComponent({
    props = {},
    user,
    renderOptions,
  }: ComponentTestProps<P> = {}) {
    const mergedProps = { ...defaultProps, ...props } as P;

    const utils = render(
      <Component {...mergedProps} />,
      { ...renderOptions, user }
    );

    return {
      ...utils,
      props: mergedProps,
      // Custom queries
      getButton: (name?: string | RegExp) =>
        screen.getByRole('button', name ? { name } : undefined),
      queryButton: (name?: string | RegExp) =>
        screen.queryByRole('button', name ? { name } : undefined),
    };
  };
}

// Usage
const renderUserProfile = createComponentTest(UserProfile, {
  userId: 'default-id',
  onEdit: jest.fn(),
});

describe('UserProfile with Factory', () => {
  it('renders with custom props', () => {
    const { getButton, props } = renderUserProfile({
      props: {
        userId: 'custom-id',
      },
    });

    expect(props.userId).toBe('custom-id');
    expect(getButton(/edit/i)).toBeInTheDocument();
  });
});
```

### Test Data Builders

```typescript
// test-builders.ts
class UserBuilder {
  private user: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date('2024-01-01'),
  };

  withId(id: string): this {
    this.user.id = id;
    return this;
  }

  withName(name: string): this {
    this.user.name = name;
    return this;
  }

  withRole(role: User['role']): this {
    this.user.role = role;
    return this;
  }

  asAdmin(): this {
    this.user.role = 'admin';
    return this;
  }

  build(): User {
    return { ...this.user };
  }

  buildMany(count: number): User[] {
    return Array.from({ length: count }, (_, i) => ({
      ...this.user,
      id: `${this.user.id}-${i}`,
      name: `${this.user.name} ${i}`,
    }));
  }
}

// Usage
describe('User Components', () => {
  it('handles admin users', () => {
    const adminUser = new UserBuilder()
      .withName('Admin User')
      .asAdmin()
      .build();

    render(<UserCard user={adminUser} />);

    expect(screen.getByText(/admin/i)).toBeInTheDocument();
  });

  it('renders user list', () => {
    const users = new UserBuilder().buildMany(5);

    render(<UserList users={users} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });
});
```

## Best Practices

### Do's ✅

```typescript
// ✅ Use type-safe test utilities
const { getByRole } = render<ButtonProps>(<Button variant="primary" />);

// ✅ Type mock functions properly
const mockFn = jest.fn<ReturnType, [ArgType]>();

// ✅ Use testing-library queries
screen.getByRole('button', { name: /submit/i });

// ✅ Test user behavior, not implementation
await user.click(submitButton);

// ✅ Use async utilities for async operations
await waitFor(() => expect(mockApi).toHaveBeenCalled());
```

### Don'ts ❌

```typescript
// ❌ Don't use any in tests
const mockFn = jest.fn<any, any>();

// ❌ Don't test implementation details
expect(component.state.isOpen).toBe(true);

// ❌ Don't use container queries when better options exist
container.querySelector('.btn-primary');

// ❌ Don't forget to cleanup
// Always use cleanup or let Testing Library handle it

// ❌ Don't ignore TypeScript errors in tests
// @ts-ignore
expect(invalidCall()).toBe(true);
```

## Summary

Type-safe testing in React ensures your tests are as robust as your application code. By leveraging TypeScript's type system in your tests, you catch errors earlier, improve test maintainability, and create more reliable test suites. Remember: good tests focus on user behavior, not implementation details, and TypeScript helps ensure you're testing the right things in the right ways.
