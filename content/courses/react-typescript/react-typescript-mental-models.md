---
title: React 19 + TypeScript Mental Models
description: >-
  Build a rock‑solid mental model—JSX as function calls, compile‑time vs
  runtime, and why types are executable design docs.
date: 2025-09-06T22:23:57.258Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - typescript
---

The secret to mastering React with TypeScript isn't memorizing every hook signature or generic constraint—it's building the right mental models. When you understand how JSX transforms into function calls, why types disappear at runtime, and how TypeScript becomes your design documentation, everything else clicks into place.

Let's build those mental models from the ground up, starting with the fundamental shift that changes how you think about React components forever.

## JSX is Just Function Calls

Here's the thing that changes everything: JSX isn't magic markup. It's syntactic sugar for function calls. Once you internalize this, React components start making sense in a whole new way.

```tsx
// ✅ This JSX...
const element = <div className="container">Hello, world!</div>;

// ✅ ...becomes this function call
const element = React.createElement('div', { className: 'container' }, 'Hello, world!');
```

This mental model explains why you can do things that seem impossible with HTML:

```tsx
// ✅ You can store JSX in variables (because it's just function return values)
const greeting = <h1>Hello!</h1>;

// ✅ You can pass JSX as props (because it's just values)
const Modal = ({ children }: { children: React.ReactNode }) => (
  <div className="modal">{children}</div>
);

// ✅ You can return JSX from functions (because functions can return values)
const getWelcomeMessage = (isLoggedIn: boolean) => {
  return isLoggedIn ? <Welcome /> : <Login />;
};
```

### Components Are Just Functions

Since JSX compiles to function calls, React components are literally just functions that return what `React.createElement` expects:

```tsx
// ✅ A component is a function that returns JSX
function UserProfile({ name, email }: { name: string; email: string }) {
  return (
    <div>
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
}

// ✅ Which means you can call it like any function
const profile = UserProfile({ name: 'Alice', email: 'alice@example.com' });
```

This is why props work the way they do—they're just function parameters! And it's why TypeScript can give you such precise intellisense: it knows exactly what arguments each "function" expects.

## Compile-Time vs Runtime Reality

TypeScript types exist in a parallel universe that disappears when your code runs. This creates a fascinating duality that trips up many developers, but once you get it, you'll write better React code.

### Types Disappear at Runtime

```tsx
// ✅ At compile time, TypeScript knows about these types
interface User {
  id: number;
  name: string;
  email: string;
}

function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
}

// ❌ At runtime, there's no User interface—it's gone!
// This compiled JavaScript has no type information:
function UserCard({ user }) {
  return React.createElement('div', null, user.name);
}
```

This explains why you need runtime validation for external data:

```tsx
// ❌ TypeScript can't protect you from bad API data
const fetchUser = async (id: number): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return data; // TypeScript says this is a User, but what if it's not?
};

// ✅ Runtime validation bridges the gap
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

const fetchUser = async (id: number): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return UserSchema.parse(data); // Now we're safe!
};

type User = z.infer<typeof UserSchema>;
```

### Component Props Live in Both Worlds

Props are fascinating because they exist at compile-time (for TypeScript) and runtime (for React):

```tsx
// ✅ Compile-time: TypeScript enforces the contract
interface ButtonProps {
  variant: 'primary' | 'secondary';
  disabled?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

function Button({ variant, disabled = false, onClick }: ButtonProps) {
  // ✅ Runtime: JavaScript receives actual values
  const className = `btn btn--${variant}`;

  return (
    <button className={className} disabled={disabled} onClick={onClick}>
      Click me
    </button>
  );
}
```

## Types as Design Documentation

The best React TypeScript code treats types as executable design documentation. Your types should tell the story of your component's purpose, constraints, and relationships.

### Types That Tell Stories

```tsx
// ❌ Vague types that don't communicate intent
interface Props {
  data: any[];
  loading: boolean;
  error: string | null;
}

// ✅ Types that document your design decisions
interface UserListProps {
  /** The users to display. Empty array shows "no users" message. */
  users: User[];
  /** Whether we're currently fetching users from the API */
  isLoading: boolean;
  /** Error message to display if user fetching failed */
  fetchError: string | null;
  /** Called when user clicks on a user card */
  onUserSelect: (userId: User['id']) => void;
}
```

**Further Exploration**:

- [Discriminated Unions](typescript-discriminated-unions.md)
- [TypeScript and React 19](setting-up-react-and-typescript.md)

## The TypeScript-React Feedback Loop

The most powerful aspect of React with TypeScript is the tight feedback loop between your types and your implementation. Changes in one place ripple through your entire codebase, catching errors before they become bugs.

### Refactoring with Confidence

When you change an interface, TypeScript shows you every place that needs updating:

```tsx
// ✅ Before: Simple user interface
interface User {
  id: number;
  name: string;
}

// ✅ After: Add email field
interface User {
  id: number;
  name: string;
  email: string; // TypeScript will now error everywhere this is missing
}

// ✅ TypeScript forces you to update all usage sites
function UserCard({ user }: { user: User }) {
  return (
    <div>
      <h3>{user.name}</h3>
      <p>{user.email}</p> {/* Had to add this */}
    </div>
  );
}
```

### Types Guide Implementation

Well-designed types can guide you toward better component architecture:

```tsx
// ✅ This type suggests a clear separation of concerns
interface ProductProps {
  product: Product;
  displayMode: 'card' | 'list' | 'grid';
  onAddToCart: (productId: string) => void;
  onToggleWishlist: (productId: string) => void;
}

// ✅ The implementation naturally follows the type structure
function ProductItem({ product, displayMode, onAddToCart, onToggleWishlist }: ProductProps) {
  const handleAddToCart = () => onAddToCart(product.id);
  const handleToggleWishlist = () => onToggleWishlist(product.id);

  const baseClasses = 'product-item';
  const modeClasses = `product-item--${displayMode}`;

  return (
    <div className={`${baseClasses} ${modeClasses}`}>
      {/* Implementation guided by the type contract */}
    </div>
  );
}
```

## Putting It All Together

These mental models work together to create a powerful development experience. JSX as function calls helps you understand component composition. Compile-time vs runtime awareness keeps you safe from external data. Types as documentation make your code self-explaining. React 19's improvements make everything smoother. And the feedback loop helps you build better software.

The key insight is that TypeScript + React isn't about adding complexity—it's about surfacing complexity that was already there and giving you tools to manage it systematically. Once you internalize these mental models, you'll find yourself writing components that are easier to understand, modify, and debug.

> [!TIP]
> Start with one mental model at a time. Pick the "JSX as function calls" concept and practice seeing your components through that lens for a week. Then add the compile-time vs runtime model. Building these intuitions gradually is much more effective than trying to absorb everything at once.

The beautiful thing about mental models is that they compound. Each one you internalize makes the next one easier to grasp, until suddenly you're thinking in React + TypeScript fluently—and wondering how you ever built user interfaces any other way.
