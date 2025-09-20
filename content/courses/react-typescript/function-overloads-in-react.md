---
title: Function Overloads for Flexible APIs
description: >-
  Use overloads to model ergonomic APIs—curried helpers, either‑or props, and
  safe fallbacks.
date: 2025-09-06T22:23:57.282Z
modified: '2025-09-06T17:49:18-06:00'
published: true
tags:
  - react
  - typescript
  - function-overloads
  - api-design
  - flexible-apis
---

Function overloads in TypeScript let you define multiple type signatures for a single implementation, creating APIs that feel intuitive and adapt to how developers actually want to use them. In React applications, this translates to components and hooks that "just work" regardless of whether you pass a string, an object, or different combinations of arguments. We'll explore how to design flexible, type-safe APIs that make your components feel as polished as React's built-ins.

Think of overloads as a way to say "this function can be called in these specific ways, and TypeScript will know exactly what to expect in each case." Instead of forcing users into a single rigid API, you can support multiple calling patterns while maintaining full type safety.

## The Problem: Rigid APIs vs. Real Usage

Consider a simple `Button` component that accepts either a string or a configuration object:

```tsx
// ❌ Awkward: forces everyone into the same pattern
interface ButtonProps {
  config: string | { text: string; variant: 'primary' | 'secondary'; disabled?: boolean };
}

function Button({ config }: ButtonProps) {
  if (typeof config === 'string') {
    return <button>{config}</button>;
  }

  return (
    <button disabled={config.disabled} className={`btn-${config.variant}`}>
      {config.text}
    </button>
  );
}

// Usage feels clunky
<Button config="Click me" />
<Button config={{ text: "Submit", variant: "primary", disabled: false }} />
```

This works, but it feels unnatural. Users have to wrap simple strings in a `config` object, and TypeScript can't provide specific autocomplete based on how you're calling the component.

## Function Overloads: Multiple Signatures, One Implementation

Function overloads let you define multiple "call signatures" that map to the same underlying function. Here's how we'd improve that Button component:

```tsx
// ✅ Multiple call signatures
function Button(text: string): JSX.Element;
function Button(config: { text: string; variant: 'primary' | 'secondary'; disabled?: boolean }): JSX.Element;
function Button(textOrConfig: string | { text: string; variant: 'primary' | 'secondary'; disabled?: boolean }): JSX.Element {
  if (typeof textOrConfig === 'string') {
    return <button>{textOrConfig}</button>;
  }

  const { text, variant = 'primary', disabled = false } = textOrConfig;
  return (
    <button disabled={disabled} className={`btn-${variant}`}>
      {text}
    </button>
  );
}

// Usage feels natural
<Button text="Click me" />
<Button config={{ text: "Submit", variant: "primary" }} />
```

Now TypeScript knows that when you pass a string, you get a basic button. When you pass an object, it expects the full configuration interface and provides autocomplete for `variant` and `disabled`.

> [!NOTE]
> The implementation signature (the actual function body) must be compatible with all the overload signatures. TypeScript will only show users the overload signatures in IntelliSense, not the implementation signature.

## Real-World Pattern: Conditional Props

Here's a more sophisticated example—a `Modal` component that changes its props based on whether it's controlled or uncontrolled:

```tsx
interface BaseModalProps {
  title: string;
  children: React.ReactNode;
}

interface ControlledModalProps extends BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UncontrolledModalProps extends BaseModalProps {
  defaultOpen?: boolean;
}

// Overload signatures
function Modal(props: ControlledModalProps): JSX.Element;
function Modal(props: UncontrolledModalProps): JSX.Element;
function Modal(props: ControlledModalProps | UncontrolledModalProps): JSX.Element {
  // Type guards help us narrow the implementation
  if ('isOpen' in props) {
    // TypeScript knows this is ControlledModalProps
    const { isOpen, onClose, title, children } = props;
    return isOpen ? (
      <div className="modal">
        <div className="modal-content">
          <button onClick={onClose}>×</button>
          <h2>{title}</h2>
          {children}
        </div>
      </div>
    ) : null;
  }

  // TypeScript knows this is UncontrolledModalProps
  const { defaultOpen = false, title, children } = props;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return isOpen ? (
    <div className="modal">
      <div className="modal-content">
        <button onClick={() => setIsOpen(false)}>×</button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  ) : null;
}
```

Users get different TypeScript experiences based on their intent:

```tsx
// Controlled usage - TypeScript requires isOpen and onClose
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Settings"
>
  <SettingsForm />
</Modal>

// Uncontrolled usage - TypeScript knows onClose doesn't exist
<Modal
  defaultOpen={true}
  title="Welcome"
>
  <WelcomeMessage />
</Modal>
```

## Hook Overloads: Flexible State Management

Custom hooks benefit enormously from overloads. Here's a `useLocalStorage` hook that returns different shapes based on whether you want loading states:

```tsx
// Overload 1: Simple usage
function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void];

// Overload 2: With loading state
function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  includeLoading: true,
): [T, (value: T | ((prev: T) => T)) => void, boolean];

// Implementation
function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  includeLoading?: boolean,
):
  | [T, (value: T | ((prev: T) => T)) => void]
  | [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const [loading, setLoading] = useState(includeLoading ? true : false);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const newValue = value instanceof Function ? value(state) : value;
        setState(newValue);
        window.localStorage.setItem(key, JSON.stringify(newValue));
        setLoading(false);
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, state],
  );

  useEffect(() => {
    if (includeLoading) {
      setLoading(false);
    }
  }, [includeLoading]);

  // TypeScript uses the overloads to determine the return type
  if (includeLoading) {
    return [state, setValue, loading];
  }

  return [state, setValue];
}
```

Now users get exactly the API they expect:

```tsx
// Simple usage - no loading state
const [user, setUser] = useLocalStorage('user', null);

// With loading - includes loading boolean
const [settings, setSettings, isLoading] = useLocalStorage('settings', {}, true);

if (isLoading) {
  return <div>Loading settings...</div>;
}
```

## Advanced Pattern: Method Overloads

You can also use overloads for object methods, which is particularly useful for builder patterns or fluent interfaces:

```tsx
class QueryBuilder<T> {
  private conditions: string[] = [];

  // Overload for single condition
  where(field: keyof T, operator: string, value: any): QueryBuilder<T>;
  // Overload for object condition
  where(conditions: Partial<Record<keyof T, any>>): QueryBuilder<T>;
  // Implementation
  where(
    fieldOrConditions: keyof T | Partial<Record<keyof T, any>>,
    operator?: string,
    value?: any,
  ): QueryBuilder<T> {
    if (typeof fieldOrConditions === 'object') {
      // Handle object conditions
      Object.entries(fieldOrConditions).forEach(([field, val]) => {
        this.conditions.push(`${String(field)} = ${JSON.stringify(val)}`);
      });
    } else {
      // Handle single condition
      this.conditions.push(`${String(fieldOrConditions)} ${operator} ${JSON.stringify(value)}`);
    }
    return this;
  }

  build(): string {
    return this.conditions.join(' AND ');
  }
}

// Usage supports both patterns
const query1 = new QueryBuilder<User>()
  .where('age', '>', 18)
  .where('status', '=', 'active')
  .build();

const query2 = new QueryBuilder<User>().where({ age: 25, status: 'active' }).build();
```

## Gotchas and Best Practices

### Implementation Must Handle All Cases

Your implementation function must handle every possible combination defined in your overloads:

```tsx
// ❌ Implementation doesn't handle all overload cases
function processData(data: string): string;
function processData(data: number[]): number;
function processData(data: string | number[]): string | number {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
  // Forgot to handle number[] case!
  // This will cause runtime errors
}

// ✅ Complete implementation
function processData(data: string): string;
function processData(data: number[]): number;
function processData(data: string | number[]): string | number {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }

  return data.reduce((sum, num) => sum + num, 0);
}
```

### Order Matters

TypeScript checks overloads from top to bottom and uses the first match:

```tsx
// ❌ Order can cause unexpected behavior
function format(value: any): string; // Too broad - matches everything
function format(value: number): string; // Never reached!
function format(value: string): string; // Never reached!

// ✅ Most specific first
function format(value: number): string;
function format(value: string): string;
function format(value: any): string;
```

### Don't Overuse Overloads

Sometimes a simple union type or generic is clearer than overloads:

```tsx
// ❌ Overloads for something simple
function getId(user: User): string;
function getId(id: string): string;
function getId(userOrId: User | string): string {
  return typeof userOrId === 'string' ? userOrId : userOrId.id;
}

// ✅ Simple union is clearer
function getId(userOrId: User | string): string {
  return typeof userOrId === 'string' ? userOrId : userOrId.id;
}
```

Use overloads when you want to provide fundamentally different return types or when the calling patterns are distinct enough to warrant separate interfaces.

## When to Reach for Overloads

Function overloads shine when you have:

- **Different return types based on inputs**: Like `useLocalStorage` returning different tuple lengths
- **Mutually exclusive prop patterns**: Controlled vs. uncontrolled components
- **Progressive enhancement**: Basic usage vs. advanced configuration
- **Backward compatibility**: Supporting old API alongside new features

Overloads transform good TypeScript APIs into great ones. They let you support multiple usage patterns without sacrificing type safety, creating components and hooks that feel intuitive and adapt to how developers actually want to work. The key is finding the right balance—use them when they genuinely improve the developer experience, not just because you can.

When designed thoughtfully, overloaded functions become indistinguishable from React's built-in APIs. Users don't think about the overloads; they just use your API naturally and get the exact TypeScript experience they expect.
