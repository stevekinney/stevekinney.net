---
title: Strictness Options That Pay Off for React
description: Turn on strict TypeScript options—catch subtle runtime bugs early without drowning in red squiggles.
date: 2025-09-06T22:04:44.908Z
modified: 2025-09-06T22:04:44.908Z
published: true
tags: ['react', 'typescript', 'strictness', 'compiler-options', 'configuration']
---

TypeScript's strict mode isn't just about appeasing the type-checker gods—it's about catching the subtle bugs that would otherwise ruin your Tuesday at 3 PM. When you're building React applications, certain strictness options act like an early warning system for the kind of runtime errors that make users click away and engineers question their life choices.

We'll explore the specific TypeScript compiler options that provide the biggest bang for your buck in React codebases, understand why they matter for component reliability, and see practical examples of the bugs they prevent. By the end, you'll know which options to enable first and how to gradually adopt stricter settings without your codebase turning into a sea of angry red squiggles.

## The Sweet Spot: Essential Strict Options

Not all TypeScript strict options are created equal. Some catch critical bugs; others feel like pedantic busywork. For React applications, these four options provide the most value:

### `strict: true` - The Foundation

The nuclear option that enables most strict checks at once. But here's the thing—you probably want to enable individual options incrementally rather than flipping this switch on an existing codebase (unless you enjoy debugging 400 TypeScript errors).

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true
  }
}
```

This enables several sub-options we'll discuss individually. For new projects, start here. For existing ones, read on.

### `noImplicitAny: true` - Stop Guessing Types

This prevents TypeScript from falling back to the dreaded `any` type when it can't infer what you meant. In React land, this catches props that should be typed, event handlers without proper signatures, and those mysterious `useState()` calls.

```tsx
// ❌ Without noImplicitAny - compiles but risky
function UserProfile({ user }) {
  // user is implicitly 'any' - no type safety
  return <div>{user.name}</div>;
}

// ✅ With noImplicitAny - forced to be explicit
interface User {
  name: string;
  email: string;
}

function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
```

The payoff: You'll catch typos in prop names, missing properties, and data structure mismatches before they hit production.

### `strictNullChecks: true` - Embrace the Null

This one's a game-changer for React apps. It makes TypeScript distinguish between `T` and `T | null | undefined`, forcing you to handle the reality that data might not exist.

```tsx
// ❌ Without strictNullChecks - runtime error waiting to happen
interface Props {
  user?: User;
}

function UserProfile({ user }: Props) {
  // TypeScript thinks user.name is always safe
  return <div>Welcome, {user.name}!</div>;
}

// ✅ With strictNullChecks - forced to handle missing data
function UserProfile({ user }: Props) {
  if (!user) {
    return <div>Loading...</div>;
  }

  return <div>Welcome, {user.name}!</div>;
}

// Or use optional chaining
function UserProfile({ user }: Props) {
  return <div>Welcome, {user?.name ?? 'Guest'}!</div>;
}
```

> [!NOTE]
> This option catches more React bugs than any other. Optional props, API responses that might be null, and async state all become much safer.

### `noImplicitReturns: true` - Every Path Must Return

React components should always return JSX (or `null`). This option ensures every code path in your functions returns something, preventing those confusing "undefined is not valid JSX" errors.

```tsx
// ❌ Without noImplicitReturns - missing return in some branches
function ConditionalComponent({ shouldShow, data }: Props) {
  if (shouldShow) {
    return <div>{data}</div>;
  }
  // Oops - no return here! Returns undefined at runtime
}

// ✅ With noImplicitReturns - all paths covered
function ConditionalComponent({ shouldShow, data }: Props) {
  if (shouldShow) {
    return <div>{data}</div>;
  }
  return null; // Explicit early return
}
```

### `strictFunctionTypes: true` - Parameter Safety

This ensures function parameters are checked more rigorously. It's particularly useful for event handlers and callback props in React.

```tsx
interface Props {
  onUserClick: (user: User) => void;
}

// ❌ Less strict - might accept incompatible functions
// Could accidentally pass a function expecting different params
function UserList({ onUserClick }: Props) {
  const handleClick = (event: MouseEvent) => {
    // Wrong signature but might compile without strictFunctionTypes
    onUserClick(event); // Runtime error!
  };
  // ...
}

// ✅ With strictFunctionTypes - catches parameter mismatches
function UserList({ onUserClick }: Props) {
  const handleClick = (user: User) => {
    onUserClick(user); // Type-safe
  };
  // ...
}
```

## The Gradual Adoption Strategy

Enabling strict options on an existing React codebase doesn't have to be painful. Here's a battle-tested approach:

### Step 1: Start with `noImplicitAny`

This usually has the highest error-to-value ratio. Most errors are about adding explicit type annotations—tedious but straightforward.

```json
// tsconfig.json
{
  "compilerOptions": {
    "noImplicitAny": true
  }
}
```

Fix the errors by adding proper prop interfaces, typing your `useState` calls, and annotating event handlers:

```tsx
// Before
const [user, setUser] = useState();

// After
const [user, setUser] = useState<User | null>(null);
```

### Step 2: Add `strictNullChecks`

This one requires more thought but catches the most runtime bugs. Work through components one by one:

```tsx
// Common pattern: optional props become explicit
interface Props {
  user?: User; // Already nullable in the type
}

function UserProfile({ user }: Props) {
  // Now you must handle the undefined case
  return user ? <UserDetails user={user} /> : <LoginPrompt />;
}
```

### Step 3: Layer on the Rest

Once those two are solid, add `noImplicitReturns` and `strictFunctionTypes`. These typically generate fewer errors but catch subtle edge cases.

## Real-World Gotchas and Solutions

### The Optional Prop Trap

One of the most common strictNullChecks errors in React:

```tsx
interface Props {
  title?: string;
}

// ❌ Error: title might be undefined
function Header({ title }: Props) {
  return <h1>{title.toUpperCase()}</h1>;
}

// ✅ Handle the optional case
function Header({ title }: Props) {
  return <h1>{title?.toUpperCase() ?? 'Untitled'}</h1>;
}

// ✅ Or provide a default
function Header({ title = 'Untitled' }: Props) {
  return <h1>{title.toUpperCase()}</h1>;
}
```

### The Event Handler Signature Dance

Strict function types can be finicky with event handlers:

```tsx
interface Props {
  onChange: (value: string) => void;
}

// ❌ Might not match if function types aren't strict
function Input({ onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // onChange expects string, but we might pass the whole event
    onChange(e); // Type error with strictFunctionTypes
  };

  return <input onChange={handleChange} />;
}

// ✅ Extract the value explicitly
function Input({ onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value); // Now matches the expected signature
  };

  return <input onChange={handleChange} />;
}
```

### Async Data Loading Patterns

`strictNullChecks` shines with async state:

```tsx
interface User {
  name: string;
  email: string;
}

function useUser(id: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((res) => res.json())
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  return { user, loading, error };
}

function UserProfile({ userId }: { userId: string }) {
  const { user, loading, error } = useUser(userId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>; // Required with strictNullChecks

  return <div>Welcome, {user.name}</div>; // TypeScript knows user exists here
}
```

## Beyond the Basics: Advanced Strict Options

Once you're comfortable with the essentials, consider these power-user options:

### `exactOptionalPropertyTypes: true`

Makes optional properties truly optional—you can't explicitly set them to `undefined`:

```tsx
interface Props {
  title?: string;
}

// ❌ With exactOptionalPropertyTypes
const props: Props = { title: undefined }; // Error!

// ✅ Either include it or don't
const props: Props = { title: 'Hello' }; // OK
const props: Props = {}; // Also OK
```

### `noUncheckedIndexedAccess: true`

Makes array and object index access safer:

```tsx
const items = ['a', 'b', 'c'];

// ❌ Without the option - assumes items[10] exists
const item = items[10]; // Type: string (but actually undefined!)

// ✅ With the option - acknowledges it might not exist
const item = items[10]; // Type: string | undefined
if (item) {
  // Now you must check before using
  console.log(item.toUpperCase());
}
```

## The Tradeoff Assessment

**Pros of strict options:**

- Catch runtime errors at compile time
- Force explicit handling of edge cases
- Better IDE support and refactoring safety
- Self-documenting code (types reveal intent)
- Easier debugging (fewer "undefined is not a function" errors)

**Cons to consider:**

- Initial migration effort on existing codebases
- More verbose code (sometimes)
- Learning curve for team members new to strict TypeScript
- Occasional false positives where you know better than the compiler

**Performance impact:** Minimal at runtime—most strictness is compile-time only. The main cost is development velocity during adoption.

## Making the Call

Start with `noImplicitAny` and `strictNullChecks` on any React codebase. These two catch the most bugs with reasonable effort. Add the others gradually as your team gets comfortable.

For new projects, enable `strict: true` from day one. The development overhead pays for itself within weeks.

> [!TIP]
> Use `// @ts-expect-error` comments for the rare cases where you legitimately know better than TypeScript, but add a comment explaining why.

The goal isn't type purity for its own sake—it's shipping React applications that don't break when users interact with them in ways you didn't anticipate. Strict TypeScript options are your first line of defense against the chaos of the runtime world.
