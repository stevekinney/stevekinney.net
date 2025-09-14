---
title: Testing React Components with TypeScript
description: Configure Jest/Vitest and RTL for TypeScript—type-safe queries, user events, and mock helpers.
date: 2025-09-06T22:04:44.939Z
modified: 2025-09-06T22:04:44.939Z
published: true
tags: ['react', 'typescript', 'testing', 'jest', 'vitest', 'rtl', 'mocking']
---

Testing React components can feel like a chore when you're deep in the flow of building features. But when you're working with TypeScript, testing becomes your safety net—not just for catching bugs, but for ensuring your component APIs work as expected and your types actually match reality. We'll explore how to set up a robust testing environment with Jest or Vitest, leverage React Testing Library's type-safe queries, and write tests that catch the kinds of issues TypeScript alone can't prevent.

By the end of this, you'll have a testing setup that feels natural with TypeScript—complete with proper mocking, user event simulation, and techniques for testing async behavior without losing type safety.

## Why Testing Matters More with TypeScript

TypeScript gives you compile-time guarantees, but there's a gap between "this compiles" and "this actually works." Your component might accept the right props, but does it render correctly? Does it handle user interactions properly? Does it behave the same way at runtime as your types suggest?

Here's what TypeScript can't catch:

- **Runtime behavior**: Your component compiles but crashes when a user clicks a button
- **Integration issues**: Props are typed correctly but the component doesn't respond to changes
- **Async timing**: Your useEffect dependencies are typed but create infinite loops
- **User experience**: The component works but is completely unusable

Testing fills these gaps while working _with_ your TypeScript setup, not against it.

## Setting Up Your Testing Environment

### Option 1: Vitest (Recommended for New Projects)

If you're starting fresh or can migrate easily, [Vitest](https://vitest.dev/) provides excellent TypeScript support out of the box and plays nicely with Vite-based React setups.

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @vitejs/plugin-react jsdom
```

Create a `vitest.config.ts`:

```tsx
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
});
```

### Option 2: Jest (For Existing Projects)

For projects already using Jest, you'll need a bit more configuration to get TypeScript working smoothly.

```bash
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D jest-environment-jsdom
```

Create a `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapping: {
    // Handle CSS modules and other assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
```

### Test Setup File

Both approaches need a setup file (`src/test-setup.ts`) to configure React Testing Library:

```tsx
import '@testing-library/jest-dom';
```

This gives you typed matchers like `toBeInTheDocument()` and `toHaveTextContent()`.

## Writing Your First Type-Safe Test

Let's start with a simple component and build up complexity:

```tsx
// Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn--${variant}`}
      data-testid="button"
    >
      {children}
    </button>
  );
};
```

Now let's test it with full type safety:

```tsx
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button onClick={() => {}}>Click me</Button>);

    // ✅ Type-safe query - TypeScript knows this returns HTMLElement | null
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn(); // or jest.fn() for Jest
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('applies variant classes correctly', () => {
    render(
      <Button onClick={() => {}} variant="secondary">
        Click me
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn--secondary');
  });
});
```

Notice how TypeScript catches issues at compile time:

```tsx
// ❌ TypeScript error: Type 'string' is not assignable to type '() => void'
render(<Button onClick="invalid">Click me</Button>);

// ❌ TypeScript error: Type '"invalid"' is not assignable to type '"primary" | "secondary"'
render(
  <Button onClick={() => {}} variant="invalid">
    Click me
  </Button>,
);
```

## Type-Safe Queries and Matchers

React Testing Library provides several query methods, each with different TypeScript implications:

```tsx
import { render, screen } from '@testing-library/react';

// Most specific queries return HTMLElement (never null)
const button = screen.getByRole('button'); // HTMLElement
const input = screen.getByLabelText('Email'); // HTMLElement

// "find" queries are async and return promises
const asyncElement = await screen.findByText('Loading...'); // HTMLElement

// "query" methods can return null
const maybeElement = screen.queryByText('Optional text'); // HTMLElement | null

// Working with specific element types
const textInput = screen.getByRole('textbox') as HTMLInputElement;
expect(textInput.value).toBe('expected value');

// Better: Use more specific queries when available
const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
expect(emailInput.type).toBe('email');
```

## Testing Props and Component APIs

TypeScript really shines when testing component contracts:

```tsx
// UserCard.tsx
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  showEmail?: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit, showEmail = false }) => {
  return (
    <div data-testid="user-card">
      <img src={user.avatar || '/default-avatar.png'} alt={`${user.name} avatar`} />
      <h3>{user.name}</h3>
      {showEmail && <p>{user.email}</p>}
      <button onClick={() => onEdit(user)}>Edit User</button>
    </div>
  );
};
```

Testing this component with proper TypeScript safety:

```tsx
// UserCard.test.tsx
describe('UserCard', () => {
  const mockUser: User = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://example.com/avatar.jpg',
  };

  it('displays user information correctly', () => {
    const onEdit = vi.fn();

    render(<UserCard user={mockUser} onEdit={onEdit} showEmail />);

    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();

    const avatar = screen.getByRole('img') as HTMLImageElement;
    expect(avatar.src).toBe(mockUser.avatar);
    expect(avatar.alt).toBe(`${mockUser.name} avatar`);
  });

  it('calls onEdit with correct user data', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();

    render(<UserCard user={mockUser} onEdit={onEdit} />);

    await user.click(screen.getByRole('button', { name: /edit user/i }));

    // TypeScript ensures onEdit receives the right argument type
    expect(onEdit).toHaveBeenCalledWith(mockUser);
  });

  it('hides email when showEmail is false', () => {
    render(<UserCard user={mockUser} onEdit={vi.fn()} />);

    expect(screen.queryByText(mockUser.email)).not.toBeInTheDocument();
  });
});
```

## Testing Hooks with TypeScript

Custom hooks need testing too, and TypeScript helps ensure you're testing the right contract:

```tsx
// useCounter.ts
import { useState, useCallback } from 'react';

interface UseCounterReturn {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounter = (initialValue = 0): UseCounterReturn => {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);

  return { count, increment, decrement, reset };
};
```

Testing hooks with React Testing Library's `renderHook`:

```tsx
// useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());

    // TypeScript knows result.current has the correct shape
    expect(result.current.count).toBe(0);
    expect(typeof result.current.increment).toBe('function');
  });

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('increments count correctly', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.increment();
      result.current.increment();
    });

    expect(result.current.count).toBe(7);

    act(() => {
      result.current.reset();
    });

    expect(result.current.count).toBe(5);
  });
});
```

## Type-Safe Mocking

Mocking in TypeScript requires extra care to maintain type safety. Here are patterns that work well:

### Mocking External Dependencies

```tsx
// api.ts
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

export const fetchUser = async (id: string): Promise<ApiResponse<User>> => {
  // Implementation...
};
```

```tsx
// UserProfile.test.tsx
import { vi } from 'vitest';
import { fetchUser } from '../api';
import { UserProfile } from './UserProfile';

// Type-safe mock
vi.mock('../api', () => ({
  fetchUser: vi.fn(),
}));

const mockFetchUser = vi.mocked(fetchUser);

describe('UserProfile', () => {
  beforeEach(() => {
    mockFetchUser.mockClear();
  });

  it('displays user data when API call succeeds', async () => {
    const mockResponse: ApiResponse<User> = {
      data: { id: '1', name: 'Jane Doe', email: 'jane@example.com' },
      status: 200,
      message: 'Success',
    };

    mockFetchUser.mockResolvedValue(mockResponse);

    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    expect(mockFetchUser).toHaveBeenCalledWith('1');
  });

  it('handles API errors gracefully', async () => {
    mockFetchUser.mockRejectedValue(new Error('Network error'));

    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/error loading user/i)).toBeInTheDocument();
    });
  });
});
```

### Creating Mock Factories

For complex objects, create type-safe factories:

```tsx
// test-utils.ts
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides,
});

export const createMockApiResponse = <T>(data: T): ApiResponse<T> => ({
  data,
  status: 200,
  message: 'Success',
});
```

```tsx
// Usage in tests
const mockUser = createMockUser({ name: 'Alice' });
const mockResponse = createMockApiResponse(mockUser);
```

## Testing Async Components

TypeScript helps catch timing issues and async behavior problems:

```tsx
// AsyncUserList.tsx
interface AsyncUserListProps {
  onUserSelect: (user: User) => void;
}

export const AsyncUserList: React.FC<AsyncUserListProps> = ({ onUserSelect }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers()
      .then((response) => {
        setUsers(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          <button onClick={() => onUserSelect(user)}>{user.name}</button>
        </li>
      ))}
    </ul>
  );
};
```

```tsx
// AsyncUserList.test.tsx
import { waitFor, waitForElementToBeRemoved } from '@testing-library/react';

describe('AsyncUserList', () => {
  it('shows loading state initially', () => {
    mockFetchUsers.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AsyncUserList onUserSelect={vi.fn()} />);

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('displays users after loading', async () => {
    const mockUsers = [
      createMockUser({ id: '1', name: 'Alice' }),
      createMockUser({ id: '2', name: 'Bob' }),
    ];

    mockFetchUsers.mockResolvedValue(createMockApiResponse(mockUsers));

    render(<AsyncUserList onUserSelect={vi.fn()} />);

    // Wait for loading to disappear
    await waitForElementToBeRemoved(() => screen.queryByText('Loading users...'));

    // Check users are displayed
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('calls onUserSelect when user is clicked', async () => {
    const onUserSelect = vi.fn();
    const mockUsers = [createMockUser({ name: 'Alice' })];

    mockFetchUsers.mockResolvedValue(createMockApiResponse(mockUsers));

    const user = userEvent.setup();
    render(<AsyncUserList onUserSelect={onUserSelect} />);

    await waitFor(() => screen.getByText('Alice'));

    await user.click(screen.getByRole('button', { name: 'Alice' }));

    expect(onUserSelect).toHaveBeenCalledWith(mockUsers[0]);
  });
});
```

## Common Testing Patterns and Gotchas

### Avoiding `any` in Tests

```tsx
// ❌ Loses type safety
const mockProps: any = { user: mockUser, onEdit: vi.fn() };

// ✅ Maintains type safety
const mockProps: UserCardProps = {
  user: mockUser,
  onEdit: vi.fn(),
};

// ✅ Even better: Use Partial for optional props
const mockProps: Partial<UserCardProps> = { user: mockUser };
```

### Testing Error Boundaries

```tsx
// ErrorBoundary test
it('catches and displays errors', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  // Suppress console.error for this test
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>,
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

  spy.mockRestore();
});
```

### Testing Context Providers

```tsx
// Custom render with context
const renderWithUserContext = (ui: React.ReactElement, user: User) => {
  return render(
    <UserContext.Provider value={{ user, setUser: vi.fn() }}>{ui}</UserContext.Provider>,
  );
};

// Usage
it('displays user name from context', () => {
  const user = createMockUser({ name: 'Context User' });
  renderWithUserContext(<UserGreeting />, user);

  expect(screen.getByText('Hello, Context User!')).toBeInTheDocument();
});
```

## Performance Testing Considerations

While not strictly about TypeScript, testing performance-sensitive components requires type-aware approaches:

```tsx
// MemoizedExpensiveComponent.test.tsx
import { render } from '@testing-library/react';
import { MemoizedExpensiveComponent } from './MemoizedExpensiveComponent';

describe('MemoizedExpensiveComponent', () => {
  it('only re-renders when props actually change', () => {
    const expensiveCalculation = vi.fn().mockReturnValue('calculated');

    const { rerender } = render(
      <MemoizedExpensiveComponent data={[1, 2, 3]} calculate={expensiveCalculation} />,
    );

    expect(expensiveCalculation).toHaveBeenCalledOnce();

    // Re-render with same props
    rerender(<MemoizedExpensiveComponent data={[1, 2, 3]} calculate={expensiveCalculation} />);

    // Should not call expensive calculation again
    expect(expensiveCalculation).toHaveBeenCalledOnce();
  });
});
```

## Next Steps and Best Practices

Here are the key takeaways for maintaining type safety in your React tests:

### Do:

- Use `vi.mocked()` or `jest.mocked()` for type-safe mocks
- Create mock factories with `Partial<T>` for flexible test data
- Test the TypeScript contract, not just the implementation
- Use specific queries (`getByRole`, `getByLabelText`) over generic ones
- Test async behavior with `waitFor` and proper error boundaries

### Don't:

- Resort to `any` types in tests—it defeats the purpose
- Mock everything—test integration where it makes sense
- Ignore TypeScript errors in test files
- Test implementation details that TypeScript already guarantees

### Advanced Topics to Explore:

- **Visual regression testing**: Tools like Chromatic work great with TypeScript components
- **E2E testing**: Playwright and Cypress both have excellent TypeScript support
- **Property-based testing**: Libraries like `fast-check` can generate typed test data
- **Component testing**: Testing components in isolation with tools like Storybook

The goal isn't to test _everything_ TypeScript guarantees—it's to test the gaps where types meet runtime behavior. When you nail this balance, your tests become a powerful complement to TypeScript's compile-time safety, catching the issues that matter while staying maintainable and fast.

Your components work at compile-time AND runtime. Your users will thank you for it.
