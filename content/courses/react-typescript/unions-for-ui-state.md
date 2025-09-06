---
title: Model UI State with Discriminated Unions
description: Express loading/success/error cleanly—exhaustive checks stop the foot‑guns before they fire.
date: 2025-09-06T22:23:57.267Z
modified: 2025-09-06T22:23:57.267Z
published: true
tags: ['react', 'typescript', 'unions', 'state-management', 'ui-state']
---

Managing UI state is where many React applications fall apart. You've seen the code: boolean flags scattered everywhere (`isLoading`, `hasError`, `isSuccess`), impossible states that somehow become possible at runtime, and endless `if` statements checking combinations that should never exist. Discriminated unions give you a better way—model your UI state so invalid combinations are literally unrepresentable.

By the end of this tutorial, you'll know how to design state that guides you toward correct implementations, catches bugs at compile time, and makes your loading/error/success flows bulletproof.

## The Problem: Boolean Soup

Let's start with the classic antipattern—what I like to call "boolean soup":

```ts
// ❌ The boolean soup approach
interface UserState {
  user: User | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

function UserProfile() {
  const [state, setState] = useState<UserState>({
    user: null,
    isLoading: false,
    isError: false,
    error: null,
  });

  // This state is technically possible but makes no sense
  // isLoading: true, isError: true, user: User { ... }
  if (state.isLoading && state.isError && state.user) {
    // What do we even render here?
  }
}
```

The problem is obvious once you see it: this approach allows impossible states. You can have `isLoading: true` and `user: User` at the same time. You can have `isError: false` but `error: "Something broke"`. The compiler is happy, but your runtime logic becomes a minefield of edge cases.

## Enter Discriminated Unions for State

Discriminated unions use a single "tag" field to represent exactly one state at a time. Here's the pattern:

```ts
// ✅ Discriminated union approach
type UserState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; user: User }
  | { status: 'error'; error: string };
```

Now your state tells a story. It's either idle (nothing's happened yet), loading (request in flight), successful (here's the data), or failed (here's what went wrong). No impossible combinations, no confusion about what to render.

```tsx
function UserProfile() {
  const [state, setState] = useState<UserState>({ status: 'idle' });

  const handleFetchUser = async () => {
    setState({ status: 'loading' });

    try {
      const user = await fetchUser();
      setState({ status: 'success', user });
    } catch (error) {
      setState({ status: 'error', error: error.message });
    }
  };

  // Exhaustive pattern matching with TypeScript's help
  switch (state.status) {
    case 'idle':
      return <button onClick={handleFetchUser}>Load User</button>;

    case 'loading':
      return <div>Loading user...</div>;

    case 'success':
      // TypeScript knows state.user exists and is type User
      return <div>Welcome, {state.user.name}!</div>;

    case 'error':
      // TypeScript knows state.error exists and is a string
      return <div>Error: {state.error}</div>;
  }
}
```

Notice what happened:

- Invalid states are impossible to represent
- TypeScript knows exactly which properties exist in each branch
- The logic is clear and linear
- Adding new states (like `'retrying'`) is straightforward

## Real-World Example: Form Submission

Let's tackle a more complex example—form submission with validation errors:

```ts
type FormState<T> =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'validation-error'; errors: Record<keyof T, string[]> }
  | { status: 'submitting'; data: T }
  | { status: 'success'; result: string }
  | { status: 'error'; error: string };

interface LoginForm {
  email: string;
  password: string;
}

function LoginForm() {
  const [state, setState] = useState<FormState<LoginForm>>({
    status: 'idle'
  });

  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate first
    setState({ status: 'validating' });
    const errors = validateForm(formData);

    if (Object.keys(errors).length > 0) {
      setState({ status: 'validation-error', errors });
      return;
    }

    // Submit
    setState({ status: 'submitting', data: formData });

    try {
      const result = await submitLogin(formData);
      setState({ status: 'success', result });
    } catch (error) {
      setState({ status: 'error', error: error.message });
    }
  };

  const renderByStatus = () => {
    switch (state.status) {
      case 'idle':
        return (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                email: e.target.value
              }))}
              placeholder="Email"
            />
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                password: e.target.value
              }))}
              placeholder="Password"
            />
            <button type="submit">Login</button>
          </form>
        );

      case 'validating':
        return (
          <form onSubmit={handleSubmit}>
            {/* Form fields with disabled state */}
            <input type="email" value={formData.email} disabled />
            <input type="password" value={formData.password} disabled />
            <button type="submit" disabled>Validating...</button>
          </form>
        );

      case 'validation-error':
        return (
          <form onSubmit={handleSubmit}>
            <div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  email: e.target.value
                }))}
                placeholder="Email"
              />
              {/* TypeScript knows state.errors exists */}
              {state.errors.email && (
                <div className="error">
                  {state.errors.email.join(', ')}
                </div>
              )}
            </div>

            <div>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  password: e.target.value
                }))}
                placeholder="Password"
              />
              {state.errors.password && (
                <div className="error">
                  {state.errors.password.join(', ')}
                </div>
              )}
            </div>

            <button type="submit">Try Again</button>
          </form>
        );

      case 'submitting':
        return (
          <div>
            <p>Submitting login for {state.data.email}...</p>
            <div className="spinner" />
          </div>
        );

      case 'success':
        return (
          <div className="success">
            Login successful! {state.result}
          </div>
        );

      case 'error':
        return (
          <div>
            <div className="error">Login failed: {state.error}</div>
            <button onClick={() => setState({ status: 'idle' })}>
              Try Again
            </button>
          </div>
        );
    }
  };

  return <div className="login-form">{renderByStatus()}</div>;
}
```

The beauty here is that every state is explicit and every transition is intentional. You can't accidentally show validation errors while submitting, or display success messages alongside error states.

## Generic Async State Pattern

Since this pattern is so common, let's extract it into a reusable type:

```ts
// Generic async state that you can reuse everywhere
type AsyncState<T, E = string> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

// Custom hook for async operations
function useAsyncState<T, E = string>(initialState: AsyncState<T, E> = { status: 'idle' }) {
  const [state, setState] = useState<AsyncState<T, E>>(initialState);

  const execute = async (asyncFn: () => Promise<T>) => {
    setState({ status: 'loading' });

    try {
      const data = await asyncFn();
      setState({ status: 'success', data });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({ status: 'error', error: errorMessage as E });
      throw error;
    }
  };

  const reset = () => setState({ status: 'idle' });

  return { state, execute, reset };
}
```

Now you can use this pattern anywhere:

```tsx
function UserList() {
  const { state, execute, reset } = useAsyncState<User[]>();

  const loadUsers = () => execute(() => fetchUsers());

  switch (state.status) {
    case 'idle':
      return <button onClick={loadUsers}>Load Users</button>;

    case 'loading':
      return <div>Loading users...</div>;

    case 'success':
      return (
        <div>
          <button onClick={reset}>Reset</button>
          <ul>
            {state.data.map((user) => (
              <li key={user.id}>{user.name}</li>
            ))}
          </ul>
        </div>
      );

    case 'error':
      return (
        <div>
          <div>Error: {state.error}</div>
          <button onClick={loadUsers}>Retry</button>
          <button onClick={reset}>Reset</button>
        </div>
      );
  }
}
```

## Advanced Pattern: Multi-Step Processes

For complex workflows, you can model multi-step processes with discriminated unions:

```ts
type OnboardingState =
  | { step: 'welcome' }
  | { step: 'profile'; data: { name: string } }
  | { step: 'preferences'; data: { name: string; email: string } }
  | { step: 'verification'; data: ProfileData; verificationSent: boolean }
  | { step: 'complete'; userData: User };

interface ProfileData {
  name: string;
  email: string;
  preferences: UserPreferences;
}

function OnboardingWizard() {
  const [state, setState] = useState<OnboardingState>({ step: 'welcome' });

  const handleWelcomeNext = (name: string) => {
    setState({ step: 'profile', data: { name } });
  };

  const handleProfileNext = (email: string) => {
    setState({
      step: 'preferences',
      data: {
        name: state.step === 'profile' ? state.data.name : '',
        email
      }
    });
  };

  // Each step knows exactly what data is available
  switch (state.step) {
    case 'welcome':
      return <WelcomeStep onNext={handleWelcomeNext} />;

    case 'profile':
      // TypeScript knows state.data.name exists
      return (
        <ProfileStep
          initialName={state.data.name}
          onNext={handleProfileNext}
        />
      );

    case 'preferences':
      // TypeScript knows state.data has name and email
      return (
        <PreferencesStep
          name={state.data.name}
          email={state.data.email}
          onNext={(preferences) => setState({
            step: 'verification',
            data: { ...state.data, preferences },
            verificationSent: false
          })}
        />
      );

    case 'verification':
      return (
        <VerificationStep
          email={state.data.email}
          verificationSent={state.verificationSent}
          onVerify={(userData) => setState({
            step: 'complete',
            userData
          })}
        />
      );

    case 'complete':
      return <CompleteStep user={state.userData} />;
  }
}
```

This approach ensures that each step in your process has access to exactly the data it needs, and no more.

## Runtime Validation with Zod

For production applications dealing with external data, combine discriminated unions with runtime validation:

```ts
import { z } from 'zod';

const AsyncStateSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.discriminatedUnion('status', [
    z.object({ status: z.literal('idle') }),
    z.object({ status: z.literal('loading') }),
    z.object({ status: z.literal('success'), data: dataSchema }),
    z.object({ status: z.literal('error'), error: z.string() }),
  ]);

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const UserStateSchema = AsyncStateSchema(UserSchema);
type UserState = z.infer<typeof UserStateSchema>;

// Safe parsing of state from external sources
function parseUserState(input: unknown): UserState | null {
  const result = UserStateSchema.safeParse(input);
  return result.success ? result.data : null;
}
```

This gives you both compile-time type safety and runtime validation—essential when working with APIs, local storage, or any external data source.

## Performance Considerations

Discriminated unions are compile-time constructs that disappear during build, so they add zero runtime overhead. However:

- **Keep discriminants simple**: Use string literals or numbers, not complex objects
- **Avoid deep nesting**: Deeply nested unions can slow TypeScript compilation
- **Use exhaustive checks**: `switch` statements with discriminated unions help TypeScript optimize your code
- **Consider state machines**: For very complex state logic, libraries like XState might be worth the extra dependency

## Common Pitfalls

### Forgetting Readonly for Complex Data

```ts
// ❌ Mutable data can lead to accidental mutations
type State = { status: 'success'; data: User[] };

// ✅ Make data readonly when appropriate
type State = { status: 'success'; data: readonly User[] };
```

### Overcomplicating Simple Cases

```ts
// ❌ Overkill for a simple toggle
type ModalState = { status: 'closed' } | { status: 'open'; content: string };

// ✅ Sometimes a boolean is fine
type ModalState = { open: boolean; content: string | null };
```

### Not Leveraging Type Narrowing

```ts
// ❌ Missing the power of discriminated unions
if (state.status === 'success') {
  const user = state.data; // TypeScript knows this is safe!
  return <UserProfile user={user} />;
}

// Instead of manually checking properties that might not exist
if (state.data && !state.isLoading && !state.isError) {
  // This is the old boolean soup approach
}
```

## When to Use This Pattern

**Use discriminated unions for UI state when**:

- You have clear, mutually exclusive states (loading OR success OR error)
- State transitions follow predictable patterns
- You want compile-time guarantees about data availability
- Complex conditional rendering is becoming hard to follow

**Stick with simpler approaches when**:

- You have truly independent boolean flags that can coexist
- State is very simple (a single boolean toggle)
- You're prototyping and need maximum flexibility

**Consider state machines when**:

- State transitions are complex with many rules
- You need to track transition history
- Multiple components need to coordinate complex state changes

## Next Steps

Now that you can model UI state safely with discriminated unions, consider exploring:

- **State machines** with XState for even more complex state logic
- **Branded types** for additional type safety on string literals
- **Template literal types** for dynamic state values
- **Conditional types** for advanced state relationships

The goal isn't to use discriminated unions everywhere, but to reach for them when they make impossible states unrepresentable. When your state can't be wrong, it won't be—and that's the kind of confidence you want when shipping to production.
