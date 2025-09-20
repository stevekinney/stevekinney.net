---
title: Custom Equality Checks with areEqual
description: >-
  Write domain-smart equality functions that avoid deep-compare traps and make
  memoized components both fast and correct.
date: 2025-09-06T21:18:40.221Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - performance
  - memoization
  - equality
---

React's memoization features like `React.memo()`, `useMemo()`, and `useCallback()` are powerful performance tools, but they're only as smart as their equality checks. By default, React uses shallow comparison—which works great until it doesn't. When you need more control over when your components re-render, custom equality functions with `areEqual` let you write domain-specific logic that's both performant and correct.

Understanding when and how to write custom equality checks is crucial for building React applications that stay fast as they scale. We'll explore the tradeoffs, common patterns, and practical techniques for implementing `areEqual` functions that avoid the deep-compare performance trap while keeping your UI consistent.

## Why Default Equality Isn't Always Enough

React's default shallow equality works perfectly for primitives and simple object references:

```tsx
// ✅ Shallow equality handles these well
const MemoizedCounter = React.memo(({ count, label }) => (
  <div>
    {label}: {count}
  </div>
));

// Won't re-render if count and label haven't changed
<MemoizedCounter count={5} label="Items" />;
```

But things get tricky with complex objects, arrays, or when you need business-logic-specific comparisons:

```tsx
// ❌ This will always re-render due to new object reference
const user = { id: 123, name: 'Alice', lastSeen: new Date() };
<UserProfile user={user} />;

// ❌ Array contents are the same, but reference changes
const items = users.map((u) => u.id);
<ItemList items={items} />;

// ❌ Configuration object recreated on every render
const settings = { theme: 'dark', notifications: true };
<Dashboard settings={settings} />;
```

This is where custom equality functions shine—they let you define exactly what "equal" means for your specific use case.

## The areEqual Function Signature

When using `React.memo()` with a custom equality function, you're implementing the `areEqual` pattern:

```tsx
const areEqual = (prevProps: Props, nextProps: Props): boolean => {
  // Return true if props are "equal" (don't re-render)
  // Return false if props are "different" (do re-render)
};

const MemoizedComponent = React.memo(Component, areEqual);
```

> [!NOTE]
> The return value is inverted from what you might expect: `true` means "don't re-render" and `false` means "do re-render."

## Practical areEqual Patterns

### Comparing Specific Object Properties

Instead of deep-comparing entire objects, focus on the properties that actually matter:

```tsx
interface UserProfileProps {
  user: {
    id: number;
    name: string;
    email: string;
    lastLogin: Date;
    preferences: Record<string, unknown>;
  };
  onEdit: () => void;
}

const areEqual = (prev: UserProfileProps, next: UserProfileProps): boolean => {
  // Only care about user identity and display name, not lastLogin or preferences
  return (
    prev.user.id === next.user.id &&
    prev.user.name === next.user.name &&
    prev.user.email === next.user.email &&
    prev.onEdit === next.onEdit
  );
};

const UserProfile = React.memo(
  ({ user, onEdit }) => (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <button onClick={onEdit}>Edit Profile</button>
    </div>
  ),
  areEqual,
);
```

This component won't re-render when `lastLogin` or `preferences` change, but will update when the user's display information changes.

### Array Content Comparison

For arrays where order matters but you want to avoid unnecessary re-renders:

```tsx
interface TaskListProps {
  tasks: Array<{ id: string; title: string; completed: boolean }>;
  filter: 'all' | 'active' | 'completed';
}

const areEqual = (prev: TaskListProps, next: TaskListProps): boolean => {
  if (prev.filter !== next.filter) return false;
  if (prev.tasks.length !== next.tasks.length) return false;

  // Compare each task by its essential properties
  return prev.tasks.every((prevTask, index) => {
    const nextTask = next.tasks[index];
    return (
      prevTask.id === nextTask.id &&
      prevTask.title === nextTask.title &&
      prevTask.completed === nextTask.completed
    );
  });
};

const TaskList = React.memo(({ tasks, filter }) => {
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  return (
    <ul>
      {filteredTasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}, areEqual);
```

### Configuration Object Patterns

When dealing with settings or configuration objects, you often care about logical equality rather than reference equality:

```tsx
interface ChartProps {
  data: Array<{ x: number; y: number }>;
  options: {
    width: number;
    height: number;
    showGrid: boolean;
    colors: string[];
    animation?: { duration: number; easing: string };
  };
}

const areEqual = (prev: ChartProps, next: ChartProps): boolean => {
  // Data comparison - check length first for quick exit
  if (prev.data.length !== next.data.length) return false;
  if (!prev.data.every((point, i) => point.x === next.data[i].x && point.y === next.data[i].y)) {
    return false;
  }

  // Options comparison - focus on visual impact
  const prevOpts = prev.options;
  const nextOpts = next.options;

  if (prevOpts.width !== nextOpts.width) return false;
  if (prevOpts.height !== nextOpts.height) return false;
  if (prevOpts.showGrid !== nextOpts.showGrid) return false;

  // Array comparison for colors
  if (prevOpts.colors.length !== nextOpts.colors.length) return false;
  if (!prevOpts.colors.every((color, i) => color === nextOpts.colors[i])) {
    return false;
  }

  // Animation is optional and doesn't affect the chart structure
  return true;
};

const Chart = React.memo(({ data, options }) => {
  // Expensive chart rendering logic
  return <canvas {...options} />;
}, areEqual);
```

## Advanced areEqual Techniques

### Using WeakMap for Performance

For complex objects that you compare frequently, consider caching comparison results:

```tsx
const comparisonCache = new WeakMap();

const areEqual = (prev: ComplexProps, next: ComplexProps): boolean => {
  // Check cache first
  const cacheKey = prev.complexObject;
  const cachedResult = comparisonCache.get(cacheKey);

  if (cachedResult && cachedResult.nextObject === next.complexObject) {
    return cachedResult.result;
  }

  // Perform actual comparison
  const result =
    prev.complexObject.id === next.complexObject.id &&
    prev.complexObject.version === next.complexObject.version;

  // Cache the result
  comparisonCache.set(cacheKey, {
    nextObject: next.complexObject,
    result,
  });

  return result;
};
```

### Fuzzy Equality for Numeric Data

Sometimes exact equality is too strict—especially for floating-point numbers or visual properties:

```tsx
const EPSILON = 0.001;

interface AnimatedProps {
  position: { x: number; y: number };
  rotation: number;
  scale: number;
}

const areEqual = (prev: AnimatedProps, next: AnimatedProps): boolean => {
  const fuzzyEqual = (a: number, b: number) => Math.abs(a - b) < EPSILON;

  return (
    fuzzyEqual(prev.position.x, next.position.x) &&
    fuzzyEqual(prev.position.y, next.position.y) &&
    fuzzyEqual(prev.rotation, next.rotation) &&
    fuzzyEqual(prev.scale, next.scale)
  );
};

const AnimatedElement = React.memo(
  ({ position, rotation, scale }) => (
    <div
      style={{
        transform: `translate(${position.x}px, ${position.y}px) 
                rotate(${rotation}deg) 
                scale(${scale})`,
      }}
    >
      Animated Content
    </div>
  ),
  areEqual,
);
```

## Common Pitfalls and How to Avoid Them

### The Deep Equality Trap

```tsx
// ❌ Don't do this - it's slow and defeats the purpose
const areEqual = (prev: Props, next: Props): boolean => {
  return JSON.stringify(prev) === JSON.stringify(next);
};
```

Deep equality checks can be slower than just re-rendering. Instead, be selective about what you compare.

### Forgetting Function References

```tsx
// ❌ Missing function comparison
const areEqual = (prev: Props, next: Props): boolean => {
  return prev.data === next.data; // Forgot about prev.onSave!
};

// ✅ Include all relevant props
const areEqual = (prev: Props, next: Props): boolean => {
  return prev.data === next.data && prev.onSave === next.onSave;
};
```

### Over-Optimizing

Not every component needs custom equality. Profile first, optimize second:

```tsx
// ❌ Unnecessary complexity for a simple component
const SimpleButton = React.memo(
  ({ label, onClick }) => <button onClick={onClick}>{label}</button>,
  (prev, next) => prev.label === next.label && prev.onClick === next.onClick,
);

// ✅ Default shallow comparison is fine here
const SimpleButton = React.memo(({ label, onClick }) => <button onClick={onClick}>{label}</button>);
```

## Real World Use Cases™

### Form Field Optimization

Forms with many fields benefit from granular equality checks:

```tsx
interface FormFieldProps {
  field: {
    name: string;
    value: string;
    error?: string;
    touched: boolean;
  };
  onChange: (name: string, value: string) => void;
}

const areEqual = (prev: FormFieldProps, next: FormFieldProps): boolean => {
  const prevField = prev.field;
  const nextField = next.field;

  return (
    prevField.name === nextField.name &&
    prevField.value === nextField.value &&
    prevField.error === nextField.error &&
    prevField.touched === nextField.touched &&
    prev.onChange === next.onChange
  );
};

const FormField = React.memo(
  ({ field, onChange }) => (
    <div>
      <input value={field.value} onChange={(e) => onChange(field.name, e.target.value)} />
      {field.touched && field.error && <span className="error">{field.error}</span>}
    </div>
  ),
  areEqual,
);
```

### Data Visualization Components

Charts and graphs often need custom equality for performance:

```tsx
interface DataVisualizationProps {
  dataset: Array<{ id: string; values: number[] }>;
  viewport: { startIndex: number; endIndex: number };
  styling: { colors: string[]; lineWidth: number };
}

const areEqual = (prev: DataVisualizationProps, next: DataVisualizationProps): boolean => {
  // Quick viewport check first
  if (
    prev.viewport.startIndex !== next.viewport.startIndex ||
    prev.viewport.endIndex !== next.viewport.endIndex
  ) {
    return false;
  }

  // Only compare data in the visible range
  const visiblePrev = prev.dataset.slice(prev.viewport.startIndex, prev.viewport.endIndex);
  const visibleNext = next.dataset.slice(next.viewport.startIndex, next.viewport.endIndex);

  if (visiblePrev.length !== visibleNext.length) return false;

  for (let i = 0; i < visiblePrev.length; i++) {
    if (visiblePrev[i].id !== visibleNext[i].id) return false;
    // Values array comparison could be optimized further based on your needs
  }

  // Styling comparison
  return (
    prev.styling.lineWidth === next.styling.lineWidth &&
    prev.styling.colors.length === next.styling.colors.length &&
    prev.styling.colors.every((color, i) => color === next.styling.colors[i])
  );
};
```

## Testing Your areEqual Functions

Custom equality functions should be tested like any other business logic:

```tsx
describe('UserProfile areEqual', () => {
  const baseUser = { id: 1, name: 'Alice', email: 'alice@example.com', lastLogin: new Date() };
  const baseProps = { user: baseUser, onEdit: jest.fn() };

  it('should return true when relevant props are unchanged', () => {
    const nextProps = {
      user: { ...baseUser, lastLogin: new Date() }, // Changed irrelevant prop
      onEdit: baseProps.onEdit,
    };

    expect(areEqual(baseProps, nextProps)).toBe(true);
  });

  it('should return false when user name changes', () => {
    const nextProps = {
      user: { ...baseUser, name: 'Bob' },
      onEdit: baseProps.onEdit,
    };

    expect(areEqual(baseProps, nextProps)).toBe(false);
  });

  it('should return false when callback changes', () => {
    const nextProps = {
      user: baseUser,
      onEdit: jest.fn(), // Different function reference
    };

    expect(areEqual(baseProps, nextProps)).toBe(false);
  });
});
```

## Performance Considerations

### When to Use areEqual

Use custom equality when:

- Default shallow comparison causes unnecessary re-renders
- You're dealing with complex nested objects
- The component is expensive to render
- You have domain-specific equality requirements

### When NOT to Use areEqual

Skip custom equality when:

- The component is already fast to render
- Props change frequently anyway
- The equality logic itself is complex and slow
- Default behavior works fine

> [!TIP]
> Profile your app with React DevTools Profiler before optimizing. Sometimes the equality check itself can be more expensive than just re-rendering.

## Integration with Other Hooks

Custom equality isn't just for `React.memo()`. You can apply similar patterns with other hooks:

```tsx
// Custom comparison in useMemo
const expensiveValue = useMemo(() => {
  return processData(data);
}, [data.id, data.version]); // Only depend on relevant properties

// Custom comparison function for useCallback
const memoizedCallback = useCallback(
  (id: string) => handleUserAction(id),
  [currentUser?.id], // Only recreate when current user changes
);
```

## Related Topics

- **[Identity Stability Props](./identity-stability-props.md)** - Understand the deeper principles behind stable references
- **[React Memo React 19 and Compiler Era](./react-memo-react-19-and-compiler-era.md)** - How memoization evolves with the React compiler
- **[Avoiding Over Memoization](./avoiding-over-memoization.md)** - Balance custom equality with development complexity
- **[useMemo useCallback in React 19](./usememo-usecallback-in-react-19.md)** - Apply equality concepts to hook dependencies
- **[Context API Performance Pitfalls](./context-api-performance-pitfalls.md)** - Use custom equality to optimize context consumers

## Wrapping Up

Custom equality functions with `areEqual` give you precise control over React's memoization behavior. The key is being strategic: focus on the properties that actually affect your component's output, avoid deep comparisons that are slower than re-rendering, and always measure the performance impact.

Remember that premature optimization is still the root of all evil—profile first, then optimize the components that actually need it. When you do need custom equality, these patterns will help you write functions that are both fast and correct.

Your components will thank you by staying snappy, and your users will thank you by sticking around instead of bouncing to a faster competitor. That's what I call a win-win.
