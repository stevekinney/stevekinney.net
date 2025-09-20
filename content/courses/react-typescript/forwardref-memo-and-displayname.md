---
title: 'forwardRef, memo, and displayName with TypeScript'
description: >-
  Compose forwardRef and memo without losing types—fix common inference pitfalls
  and keep good devtools labels.
date: 2025-09-06T22:04:44.912Z
modified: '2025-09-06T17:49:18-06:00'
published: true
tags:
  - react
  - typescript
  - forward-ref
  - memo
  - display-name
  - performance
---

React's `forwardRef`, `memo`, and `displayName` are fantastic tools for building performant, reusable components. But when you mix them with TypeScript—especially when you start combining them—things can get tricky fast. Type inference breaks, generics get confused, and your beautiful component APIs start looking like alphabet soup. Let's fix that.

By the end of this tutorial, you'll know how to compose these APIs without losing type safety, keep your DevTools readable, and avoid the common pitfalls that make other developers question your life choices.

## The Problem with Higher-Order Components and TypeScript

Here's what usually happens when you try to combine these APIs:

```tsx
// ❌ This looks reasonable but has problems
const MyComponent = memo(
  forwardRef<HTMLInputElement, Props>((props, ref) => {
    return <input ref={ref} {...props} />;
  }),
);
```

What's wrong here? Well, several things:

1. **Lost display name**: Your DevTools will show `Anonymous` or `ForwardRef(memo(...))`
2. **Generic inference**: If your component uses generics, TypeScript gets confused about the order
3. **Type complexity**: The resulting type is a mess of wrapped function signatures
4. **Poor IntelliSense**: Auto-completion suffers when types are overly complex

Let's tackle these issues one by one.

## Understanding forwardRef with TypeScript

`forwardRef` lets you pass refs through your component to DOM elements or child components. With TypeScript, you need to be explicit about what kind of ref you're forwarding.

```tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

// ✅ Good: Explicit ref type
interface InputProps extends ComponentPropsWithoutRef<'input'> {
  label: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, ...props }, ref) => (
  <div>
    <label>{label}</label>
    <input ref={ref} {...props} />
  </div>
));
```

The first generic parameter (`HTMLInputElement`) tells TypeScript what type of element the ref points to. The second parameter (`InputProps`) defines your component's props.

> [!TIP]
> Use `ComponentPropsWithoutRef<'input'>` instead of `HTMLProps<HTMLInputElement>` to get proper prop types while excluding the `ref` prop (since forwardRef handles that).

### Generic Components with forwardRef

Things get spicier when you want generic components:

```tsx
// ✅ Generic forwardRef component
interface ListProps<T> extends ComponentPropsWithoutRef<'ul'> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

// Note: We need to cast the result to preserve generics
const List = forwardRef(
  <T,>({ items, renderItem, ...props }: ListProps<T>, ref: React.Ref<HTMLUListElement>) => (
    <ul ref={ref} {...props}>
      {items.map((item, index) => (
        <li key={index}>{renderItem(item)}</li>
      ))}
    </ul>
  ),
) as <T>(props: ListProps<T> & { ref?: React.Ref<HTMLUListElement> }) => React.ReactElement;
```

That type assertion at the end is necessary because `forwardRef` doesn't play nicely with generic functions. It's verbose, but it preserves your generic API.

## `memo`: When and How to Use It

`React.memo` prevents unnecessary re-renders by memoizing your component. It's React's equivalent of `PureComponent` for function components.

```tsx
import { memo } from 'react';

interface UserCardProps {
  name: string;
  email: string;
  avatar?: string;
}

// ✅ Simple memo usage
const UserCard = memo<UserCardProps>(({ name, email, avatar }) => (
  <div className="user-card">
    {avatar && <img src={avatar} alt={`${name}'s avatar`} />}
    <div>
      <h3>{name}</h3>
      <p>{email}</p>
    </div>
  </div>
));
```

TypeScript can usually infer the props type from your component, but being explicit helps with complex prop types.

### Custom Comparison Functions

Sometimes you need custom logic to determine if props have changed:

```tsx
interface ExpensiveComponentProps {
  data: { id: string; value: number }[];
  threshold: number;
  onUpdate: (ids: string[]) => void;
}

const ExpensiveComponent = memo<ExpensiveComponentProps>(
  ({ data, threshold, onUpdate }) => {
    // Expensive computation here...
    const importantIds = data.filter((item) => item.value > threshold).map((item) => item.id);

    return (
      <div>
        {/* Complex rendering logic */}
        <button onClick={() => onUpdate(importantIds)}>Update Important Items</button>
      </div>
    );
  },
  // Custom comparison function
  (prevProps, nextProps) => {
    // Only re-render if data length changes or threshold changes
    return (
      prevProps.data.length === nextProps.data.length && prevProps.threshold === nextProps.threshold
    );
    // Note: We're ignoring onUpdate for this example
  },
);
```

> [!WARNING]
> Be careful with custom comparison functions. They run on every render and can become performance bottlenecks if they're too complex. Also, ignoring function props (like `onUpdate` above) can lead to stale closures.

## `displayName`: Making DevTools Readable

`displayName` is crucial for debugging. Without it, your DevTools show generic names that make debugging a nightmare.

```tsx
const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ children, ...props }, ref) => (
  <button ref={ref} {...props}>
    {children}
  </button>
));

// ✅ Always set displayName for HOCs
Button.displayName = 'Button';

// With memo, it gets trickier:
const MemoizedButton = memo(Button);
MemoizedButton.displayName = 'memo(Button)';
```

For complex compositions, be descriptive:

```tsx
const ComplexButton = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(({ children, ...props }, ref) => (
    <button ref={ref} {...props}>
      {children}
    </button>
  )),
);

// ✅ Clear, hierarchical display name
ComplexButton.displayName = 'memo(forwardRef(Button))';
```

## Composing `forwardRef` and `memo` Correctly

Now let's put it all together. Here's the pattern that works reliably:

```tsx
import { forwardRef, memo, type ComponentPropsWithoutRef } from 'react';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

// Step 1: Create the base component with forwardRef
const ButtonBase = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    const classes = `btn btn-${variant} btn-${size} ${className || ''}`.trim();

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  },
);

// Step 2: Wrap with memo
const Button = memo(ButtonBase);

// Step 3: Set display names
ButtonBase.displayName = 'Button';
Button.displayName = 'memo(Button)';

// Step 4: Export the memoized version
export { Button };
```

This approach gives you:

- ✅ Proper TypeScript inference
- ✅ Readable DevTools names
- ✅ Performance optimization
- ✅ Clean, maintainable code

### Generic Components with Both APIs

For generic components, the pattern is similar but requires that type assertion dance:

```tsx
interface SelectProps<T> extends ComponentPropsWithoutRef<'select'> {
  options: T[];
  value?: T;
  onChange: (value: T) => void;
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => string;
}

// Step 1: Base component with forwardRef
const SelectBase = forwardRef(
  <T,>(
    { options, value, onChange, getOptionLabel, getOptionValue, ...props }: SelectProps<T>,
    ref: React.Ref<HTMLSelectElement>,
  ) => (
    <select
      ref={ref}
      value={value ? getOptionValue(value) : ''}
      onChange={(e) => {
        const selectedOption = options.find((option) => getOptionValue(option) === e.target.value);
        if (selectedOption) onChange(selectedOption);
      }}
      {...props}
    >
      {options.map((option) => (
        <option key={getOptionValue(option)} value={getOptionValue(option)}>
          {getOptionLabel(option)}
        </option>
      ))}
    </select>
  ),
) as <T>(props: SelectProps<T> & { ref?: React.Ref<HTMLSelectElement> }) => React.ReactElement;

// Step 2: Wrap with memo
const Select = memo(SelectBase) as typeof SelectBase;

// Step 3: Display names
SelectBase.displayName = 'Select';
Select.displayName = 'memo(Select)';

export { Select };
```

The double type assertion (`memo(SelectBase) as typeof SelectBase`) preserves the generic signature through the memo wrapper.

## Common Pitfalls and Solutions

### Pitfall 1: Wrong Order of Composition

```tsx
// ❌ Wrong: memo wrapping forwardRef loses ref forwarding
const BadComponent = forwardRef(memo<Props>((props) => <div>{/* ... */}</div>));

// ✅ Correct: forwardRef first, then memo
const GoodComponent = memo(
  forwardRef<HTMLDivElement, Props>((props, ref) => <div ref={ref}>{/* ... */}</div>),
);
```

### Pitfall 2: Missing Display Names

```tsx
// ❌ DevTools will show "ForwardRef" or "Anonymous"
const MyComponent = memo(forwardRef((props, ref) => <div />));

// ✅ Always set display names
const MyComponent = memo(forwardRef((props, ref) => <div />));
MyComponent.displayName = 'MyComponent';
```

### Pitfall 3: Over-memoizing

```tsx
// ❌ Don't memo components that always receive new props
const AlwaysNewProps = memo(({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick}>Click me</button>
));

// Parent component:
// <AlwaysNewProps onClick={() => console.log('clicked')} /> // New function every render!

// ✅ Memo is pointless here—the function prop changes every time
const JustAButton = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick}>Click me</button>
);
```

### Pitfall 4: Forgetting `useCallback` with `memo`

```tsx
// ❌ memo is useless because handleClick changes every render
const Parent = () => {
  const [count, setCount] = useState(0);

  const handleClick = () => setCount((c) => c + 1); // New function every render

  return <MemoizedChild onClick={handleClick} />;
};

// ✅ Stable callback makes memo effective
const Parent = () => {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => setCount((c) => c + 1), []);

  return <MemoizedChild onClick={handleClick} />;
};
```

## Real-World Example: A Reusable Input Component

Let's build a comprehensive input component that demonstrates all these concepts:

```tsx
import { forwardRef, memo, useId, type ComponentPropsWithoutRef } from 'react';

interface InputProps extends ComponentPropsWithoutRef<'input'> {
  label: string;
  error?: string;
  helperText?: string;
}

// Base component with forwardRef
const InputBase = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    const id = useId();
    const inputId = props.id || id;

    return (
      <div className="input-field">
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          className={`input ${error ? 'input--error' : ''} ${className || ''}`}
          aria-describedby={error || helperText ? `${inputId}-description` : undefined}
          {...props}
        />
        {(error || helperText) && (
          <div id={`${inputId}-description`} className="input-description">
            {error && <span className="input-error">{error}</span>}
            {!error && helperText && <span className="input-helper">{helperText}</span>}
          </div>
        )}
      </div>
    );
  },
);

// Memoized version
const Input = memo(InputBase);

// Display names for DevTools
InputBase.displayName = 'Input';
Input.displayName = 'memo(Input)';

export { Input };
```

This component is:

- **Accessible**: Proper labeling and ARIA attributes
- **Performant**: Memoized to prevent unnecessary re-renders
- **Ref-enabled**: Can focus the input imperatively
- **Type-safe**: Full TypeScript support with proper prop types
- **Debuggable**: Clear display names in DevTools

## Usage Patterns and Best Practices

### When to Use Each API

**`forwardRef`**:

- ✅ Building reusable UI components (inputs, buttons)
- ✅ Creating component libraries
- ✅ When parent components need imperative access to DOM elements
- ❌ Every component (only use when refs are actually needed)

**`memo`**:

- ✅ Components that receive stable props most of the time
- ✅ Expensive components that render frequently
- ✅ Components in large lists (with stable keys)
- ❌ Components that always receive new props
- ❌ Very cheap components (the memo check might cost more than re-rendering)

**`displayName`**:

- ✅ Always use with HOCs (memo, forwardRef, etc.)
- ✅ Complex component compositions
- ✅ Component libraries (for better DX)
- ❌ Simple components without HOCs (React infers the name from the function)

### Performance Considerations

Remember that both `memo` and `forwardRef` add slight overhead:

```tsx
// ✅ Good use case: Expensive component with stable props
const ExpensiveChart = memo(
  forwardRef<SVGSVGElement, ChartProps>(({ data, width, height }, ref) => {
    // Complex chart rendering logic...
    return <svg ref={ref}>{/* ... */}</svg>;
  }),
);

// ❌ Probably overkill: Simple component
const SimpleDiv = memo(
  forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => (
    <div ref={ref}>{children}</div>
  )),
);
```

## Debugging and DevTools

With proper `displayName` usage, your component tree looks like this:

```
App
├── memo(UserList)
│   ├── memo(forwardRef(UserCard))
│   ├── memo(forwardRef(UserCard))
│   └── memo(forwardRef(UserCard))
└── memo(forwardRef(SearchInput))
```

Without it, you get:

```
App
├── Anonymous
│   ├── ForwardRef
│   ├── ForwardRef
│   └── ForwardRef
└── ForwardRef
```

Guess which one is easier to debug at 2 AM?

## Final Thoughts

`forwardRef`, `memo`, and `displayName` are powerful tools, but they're also easy to misuse. The key is understanding when each provides value:

- **`forwardRef`**: Use when refs need to pass through your component
- **`memo`**: Use for expensive components with stable props
- **`displayName`**: Always use with HOCs for better debugging

When you combine them thoughtfully with TypeScript, you get components that are performant, type-safe, and maintainable. Your future self (and your teammates) will thank you for the extra effort.

Remember: premature optimization is the root of all evil, but when you do need these tools, use them correctly. The patterns in this guide will serve you well as you build robust React applications with TypeScript.
