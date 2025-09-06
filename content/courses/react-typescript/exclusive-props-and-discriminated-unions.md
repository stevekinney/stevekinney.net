---
title: Exclusive Props and Discriminated Unions
description: Make invalid prop combos impossible—encode either-or props and narrow with discriminants cleanly.
date: 2025-09-06T22:04:45.047Z
modified: 2025-09-06T22:04:45.047Z
published: true
tags: ['react', 'typescript', 'discriminated-unions', 'exclusive-props', 'type-safety']
---

React components often need to handle either-or scenarios: show a loading state _or_ display data, accept an `onClick` _or_ an `href`, render different layouts based on a variant. The naive approach is to make all props optional and hope developers use them correctly. But TypeScript gives us better tools: **exclusive props** and **discriminated unions** that make invalid states literally impossible to represent.

By the end of this tutorial, you'll know how to design component APIs that guide developers toward success and catch misconfigurations at compile time—because the best bugs are the ones that never make it to production.

## The Problem with Optional Everything

Let's start with a common antipattern. Imagine a `Button` component that can either be a regular button or a link:

```ts
// ❌ This allows invalid combinations
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

function Button({ children, onClick, href, disabled }: ButtonProps) {
  if (href) {
    return (
      <a href={href} className={disabled ? 'disabled' : ''}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
```

This component _works_, but it's fragile. Nothing prevents someone from writing:

```tsx
// All of these compile but make no sense
<Button onClick={handleClick} href="/somewhere">Click me</Button>
<Button disabled>No action defined</Button>
<Button onClick={handleClick} href="/link" disabled>Chaos</Button>
```

The compiler is happy, but the runtime behavior is unpredictable. Worse, there's no IntelliSense guidance about which props go together.

## Enter Discriminated Unions

Discriminated unions use a "discriminant" property to narrow types precisely. Here's the pattern:

```ts
// ✅ Mutually exclusive types with a discriminant
type ButtonAsButton = {
  variant: 'button';
  onClick: () => void;
  disabled?: boolean;
};

type ButtonAsLink = {
  variant: 'link';
  href: string;
  disabled?: boolean; // Could mean different things for links
};

type ButtonProps = {
  children: React.ReactNode;
} & (ButtonAsButton | ButtonAsLink);
```

Now the component becomes self-documenting:

```tsx
function Button(props: ButtonProps) {
  const { children } = props;

  if (props.variant === 'button') {
    // TypeScript knows this is ButtonAsButton
    return (
      <button onClick={props.onClick} disabled={props.disabled}>
        {children}
      </button>
    );
  }

  // TypeScript knows this is ButtonAsLink
  return (
    <a href={props.href} className={props.disabled ? 'disabled' : ''}>
      {children}
    </a>
  );
}
```

Usage becomes explicit and error-resistant:

```tsx
// ✅ Clear, valid combinations
<Button variant="button" onClick={handleClick}>
  Click me
</Button>

<Button variant="link" href="/somewhere">
  Go somewhere
</Button>

// ❌ TypeScript catches invalid combinations
<Button variant="button" href="/oops"> {/* Error: href doesn't exist on ButtonAsButton */}
  Won't compile
</Button>
```

## Exclusive Props Without Discriminants

Sometimes you want mutual exclusivity without an explicit variant prop. Here's a pattern using union types and the `never` type:

```ts
type ExclusiveProps<T, U> =
  | (T & { [K in keyof U]?: never })
  | (U & { [K in keyof T]?: never });

type IconButtonProps = ExclusiveProps<
  { icon: string; 'aria-label': string },
  { children: React.ReactNode }
>;

function IconButton(props: IconButtonProps) {
  if ('icon' in props) {
    return (
      <button aria-label={props['aria-label']}>
        <Icon name={props.icon} />
      </button>
    );
  }

  return <button>{props.children}</button>;
}
```

This creates an either-or relationship without needing a discriminant:

```tsx
// ✅ Valid uses
<IconButton icon="search" aria-label="Search" />
<IconButton>Click me</IconButton>

// ❌ Invalid combinations caught by TypeScript
<IconButton icon="search">Text and icon</IconButton>
<IconButton aria-label="Label only" /> {/* Missing icon */}
```

The `ExclusiveProps` utility makes properties from one type `never` when the other type is active, preventing mixed usage.

## Real-World Example: Loading States

Here's a practical example handling async data with discriminated unions:

```ts
type AsyncState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

interface DataDisplayProps<T> {
  state: AsyncState<T>;
  renderSuccess: (data: T) => React.ReactNode;
  renderError?: (error: Error) => React.ReactNode;
  loadingText?: string;
}

function DataDisplay<T>({
  state,
  renderSuccess,
  renderError = (error) => <div>Error: {error.message}</div>,
  loadingText = 'Loading...'
}: DataDisplayProps<T>) {
  switch (state.status) {
    case 'idle':
      return null;

    case 'loading':
      return <div>{loadingText}</div>;

    case 'success':
      // TypeScript knows state.data exists and is type T
      return <>{renderSuccess(state.data)}</>;

    case 'error':
      // TypeScript knows state.error exists
      return renderError(state.error);
  }
}
```

Usage is bulletproof:

```tsx
const [userState, setUserState] = useState<AsyncState<User>>({
  status: 'idle',
});

// In your render
<DataDisplay
  state={userState}
  renderSuccess={(user) => <UserProfile user={user} />}
  renderError={(error) => <ErrorBoundary error={error} />}
/>;
```

No more `data && !loading && !error` conditional chains or forgetting to handle edge cases.

## Advanced Pattern: Form Field Unions

Let's build a flexible form field component that handles different input types:

```ts
type BaseFieldProps = {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
};

type TextFieldProps = BaseFieldProps & {
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

type SelectFieldProps = BaseFieldProps & {
  type: 'select';
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
};

type CheckboxFieldProps = BaseFieldProps & {
  type: 'checkbox';
  checked: boolean;
  onChange: (checked: boolean) => void;
};

type FieldProps = TextFieldProps | SelectFieldProps | CheckboxFieldProps;

function Field(props: FieldProps) {
  const { label, name, required, error } = props;

  const renderInput = () => {
    switch (props.type) {
      case 'text':
      case 'email':
      case 'password':
        return (
          <input
            type={props.type}
            name={name}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.placeholder}
            required={required}
          />
        );

      case 'select':
        return (
          <select
            name={name}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            required={required}
          >
            {props.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            name={name}
            checked={props.checked}
            onChange={(e) => props.onChange(e.target.checked)}
            required={required}
          />
        );
    }
  };

  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {renderInput()}
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

Now each field type gets exactly the props it needs:

```tsx
<Field
  type="email"
  name="email"
  label="Email Address"
  value={email}
  onChange={setEmail}
  placeholder="you@example.com"
  required
/>

<Field
  type="select"
  name="country"
  label="Country"
  value={country}
  onChange={setCountry}
  options={countryOptions}
/>

<Field
  type="checkbox"
  name="newsletter"
  label="Subscribe to newsletter"
  checked={newsletter}
  onChange={setNewsletter}
/>
```

TypeScript ensures you can't mix incompatible props—no `placeholder` on selects, no `options` on text fields.

## Runtime Validation with Zod

For extra safety, especially when dealing with external data, combine discriminated unions with runtime validation:

```ts
import { z } from 'zod';

const ButtonSchemaAsButton = z.object({
  variant: z.literal('button'),
  onClick: z.function(),
  disabled: z.boolean().optional(),
});

const ButtonSchemaAsLink = z.object({
  variant: z.literal('link'),
  href: z.string().url(),
  disabled: z.boolean().optional(),
});

const ButtonPropsSchema = z
  .object({
    children: z.any(), // React.ReactNode is hard to validate
  })
  .and(z.union([ButtonSchemaAsButton, ButtonSchemaAsLink]));

type ButtonProps = z.infer<typeof ButtonPropsSchema>;

function Button(props: ButtonProps) {
  // Runtime validation catches props that TypeScript might miss
  const validatedProps = ButtonPropsSchema.parse(props);

  // Your component logic here...
}
```

This is particularly valuable for components that receive props from APIs or configuration files where TypeScript can't help.

## When to Use Each Pattern

**Use discriminated unions when**:

- You have clear variants of component behavior
- Props have completely different meanings based on context
- You want explicit, self-documenting APIs
- You need exhaustive pattern matching in switch statements

**Use exclusive props when**:

- You have a smaller number of mutually exclusive options
- The relationship is more about "either this or that" than distinct variants
- You want a cleaner API without extra discriminant props

**Combine with runtime validation when**:

- Props come from external sources (APIs, config files)
- You're building a component library for external consumption
- Data integrity is critical for security or business logic

## Performance Considerations

Discriminated unions and exclusive props are compile-time constructs—they add zero runtime overhead. The discriminant checks become simple property access, and TypeScript's union narrowing is eliminated during compilation.

However, be mindful of:

- **Complex union types** can slow TypeScript compilation on very large codebases
- **Deep nesting** of discriminated unions can make error messages harder to read
- **Runtime validation** has a cost—use it judiciously in performance-critical paths

## Common Pitfalls

### Forgetting the Discriminant

```ts
// ❌ This doesn't work—no discriminant
type BadUnion = { a: string } | { b: number };

function process(props: BadUnion) {
  if ('a' in props) {
    // This is a runtime check, not great
    return props.a;
  }
  return props.b.toString();
}
```

### Making Discriminants Optional

```ts
// ❌ Optional discriminants defeat the purpose
type WeakUnion = { type?: 'A'; propA: string } | { type?: 'B'; propB: number };
```

### Overcomplicating Simple Cases

```ts
// ❌ Overkill for a simple boolean flag
type OverEngineered = { visible: true; content: string } | { visible: false };

// ✅ Sometimes simple is better
type Simple = { visible: boolean; content?: string };
```

## Next Steps

Now that you can design bulletproof component APIs with exclusive props and discriminated unions, consider exploring:

- **Generic discriminated unions** for reusable patterns across different data types
- **Branded types** for even stronger type safety
- **Template literal types** for dynamic discriminants
- **Conditional types** for complex prop relationships

The goal isn't to use these patterns everywhere, but to reach for them when they make your code more reliable and your APIs more intuitive. When props can't be misused, they won't be—and that's a superpower worth having.
