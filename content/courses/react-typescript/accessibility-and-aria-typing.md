---
title: Accessibility Types and ARIA Props
description: Bake a11y into types—ensure valid ARIA usage and constrain props so inaccessible states can't compile.
date: 2025-09-06T22:04:44.936Z
modified: 2025-09-06T22:04:44.936Z
published: true
tags: ['react', 'typescript', 'accessibility', 'aria', 'a11y']
---

TypeScript excels at catching errors at compile time, but accessibility often gets checked at runtime—if at all. What if we could make inaccessible component states literally impossible to compile? With proper TypeScript techniques, you can encode ARIA constraints directly into your types, ensuring screen readers and keyboard navigation work correctly before your code even runs.

We'll explore how to leverage TypeScript's type system to enforce accessibility best practices, create type-safe ARIA prop interfaces, and build components that guide developers toward inclusive design patterns. By the end, you'll be catching accessibility violations in your IDE instead of during testing (or worse, in production).

## Why Type Accessibility Constraints?

Before diving into implementation, let's establish why encoding accessibility rules in TypeScript matters. Traditional approaches rely on runtime linting tools like `eslint-plugin-jsx-a11y` or manual testing—both valuable, but they catch issues after code is written.

TypeScript accessibility constraints offer several advantages:

- **Compile-time safety**: Invalid ARIA combinations become TypeScript errors
- **Developer experience**: IntelliSense guides proper ARIA usage
- **Documentation**: Types serve as living documentation for accessibility requirements
- **Refactoring safety**: Breaking accessibility contracts shows up during code changes

Consider this common accessibility violation:

```tsx
// ❌ This compiles but creates accessibility issues
<button disabled aria-pressed="true">
  Toggle
</button>
```

A disabled button with `aria-pressed` creates confusion for screen readers—disabled elements shouldn't have press states. With proper typing, this becomes a compile error instead of a runtime discovery.

## Understanding ARIA in React

ARIA (Accessible Rich Internet Applications) attributes provide semantic information to assistive technologies. React supports all ARIA attributes, but TypeScript's built-in types don't enforce the complex relationships between them.

Here's what React's default ARIA typing looks like:

```tsx
interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-pressed'?: boolean | 'false' | 'true' | 'mixed';
  // ... many more
}
```

These types are permissive—they allow any combination of ARIA attributes without considering context or mutual exclusions. Real accessibility requires understanding relationships between attributes, element roles, and interaction states.

## Basic ARIA Constraint Types

Let's start with a simple example: ensuring buttons have proper labeling. A button needs either visible text content, an `aria-label`, or an `aria-labelledby` reference.

```tsx
type ButtonLabelProps = {
  children: React.ReactNode;
} | {
  'aria-label': string;
} | {
  'aria-labelledby': string;
};

interface AccessibleButtonProps extends ButtonLabelProps {
  onClick: () => void;
  disabled?: boolean;
}

// ✅ All of these work
<AccessibleButton onClick={handleClick}>
  Save Changes
</AccessibleButton>

<AccessibleButton onClick={handleClick} aria-label="Close dialog" />

<AccessibleButton onClick={handleClick} aria-labelledby="save-label" />

// ❌ TypeScript error: button needs a label
<AccessibleButton onClick={handleClick} />
```

This union type ensures every button instance has some form of accessible labeling, catching unlabeled buttons at compile time.

## Toggle Button State Constraints

Toggle buttons present interesting typing challenges. The `aria-pressed` attribute should only appear on buttons that actually toggle, and its value should reflect the current state.

```tsx
type ToggleButtonProps = {
  pressed: boolean;
  'aria-pressed': boolean;
  onToggle: (pressed: boolean) => void;
} | {
  // Regular button - no toggle state
  pressed?: never;
  'aria-pressed'?: never;
  onToggle?: never;
  onClick: () => void;
};

interface ButtonProps extends ToggleButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, disabled, ...props }) => {
  if ('onToggle' in props) {
    return (
      <button
        disabled={disabled}
        aria-pressed={props.pressed}
        onClick={() => props.onToggle(!props.pressed)}
      >
        {children}
      </button>
    );
  }

  return (
    <button disabled={disabled} onClick={props.onClick}>
      {children}
    </button>
  );
};

// ✅ Toggle button with proper state
<Button pressed={isExpanded} onToggle={setIsExpanded} aria-pressed={isExpanded}>
  Expand Details
</Button>

// ✅ Regular button
<Button onClick={handleSave}>
  Save
</Button>

// ❌ TypeScript error: can't mix toggle and regular button props
<Button pressed={true} onClick={handleSave}>
  Invalid
</Button>
```

This discriminated union prevents mixing toggle and regular button patterns, ensuring `aria-pressed` only appears with appropriate state management.

## Form Control Associations

Form controls require proper labeling and often need error announcements. Let's create types that enforce these associations:

```tsx
type FormControlLabel = {
  id: string;
  'aria-labelledby': string;
} | {
  'aria-label': string;
  id?: string;
};

type FormControlError = {
  'aria-invalid': true;
  'aria-describedby': string;
} | {
  'aria-invalid'?: false | undefined;
  'aria-describedby'?: string;
};

interface TextInputProps extends FormControlLabel, FormControlError {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({
  id,
  value,
  onChange,
  required,
  ...ariaProps
}) => (
  <input
    id={id}
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    required={required}
    {...ariaProps}
  />
);

// ✅ Properly labeled input
<>
  <label htmlFor="email">Email Address</label>
  <TextInput
    id="email"
    value={email}
    onChange={setEmail}
    aria-labelledby="email"
  />
</>

// ✅ Input with error state
<TextInput
  aria-label="Username"
  value={username}
  onChange={setUsername}
  aria-invalid={true}
  aria-describedby="username-error"
/>

// ❌ TypeScript error: invalid input needs error description
<TextInput
  aria-label="Username"
  value={username}
  onChange={setUsername}
  aria-invalid={true}
  // Missing aria-describedby
/>
```

## Advanced ARIA Role Constraints

Some elements have complex ARIA relationships. Modal dialogs, for instance, require specific attributes and focus management:

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  'aria-labelledby': string;
  'aria-describedby'?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  'aria-labelledby': labelledby,
  'aria-describedby': describedby,
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledby}
      aria-describedby={describedby}
      tabIndex={-1}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
};

// ✅ Properly structured modal
<>
  <Modal
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    aria-labelledby="modal-title"
    aria-describedby="modal-description"
  >
    <h2 id="modal-title">Confirm Action</h2>
    <p id="modal-description">This action cannot be undone.</p>
    <button onClick={handleConfirm}>Confirm</button>
  </Modal>
</>;
```

The type system ensures modals always have proper labeling, preventing the common mistake of unlabeled dialogs.

## Creating Accessible Component Libraries

When building component libraries, accessibility constraints become even more valuable. Let's create a comprehensive button system:

```tsx
// Base button requirements
type ButtonRole = 'button' | 'switch' | 'tab';

type ButtonLabel = {
  children: React.ReactNode;
  'aria-label'?: never;
  'aria-labelledby'?: never;
} | {
  children?: never;
  'aria-label': string;
  'aria-labelledby'?: never;
} | {
  children?: never;
  'aria-label'?: never;
  'aria-labelledby': string;
};

// Role-specific constraints
type ButtonByRole<R extends ButtonRole> = R extends 'switch' ? {
  role: 'switch';
  'aria-checked': boolean;
  onClick: (checked: boolean) => void;
} : R extends 'tab' ? {
  role: 'tab';
  'aria-selected': boolean;
  'aria-controls': string;
  onClick: () => void;
} : {
  role?: 'button';
  onClick: () => void;
};

type AccessibleButtonProps<R extends ButtonRole = 'button'> =
  ButtonLabel &
  ButtonByRole<R> & {
    disabled?: boolean;
    className?: string;
  };

function AccessibleButton<R extends ButtonRole = 'button'>({
  role = 'button' as R,
  disabled,
  className,
  ...props
}: AccessibleButtonProps<R>) {
  if (role === 'switch') {
    const switchProps = props as ButtonByRole<'switch'>;
    return (
      <button
        role="switch"
        disabled={disabled}
        className={className}
        aria-checked={switchProps['aria-checked']}
        onClick={() => switchProps.onClick(!switchProps['aria-checked'])}
        {...(('children' in props) ? { children: props.children } : {})}
        {...(('aria-label' in props) ? { 'aria-label': props['aria-label'] } : {})}
        {...(('aria-labelledby' in props) ? { 'aria-labelledby': props['aria-labelledby'] } : {})}
      />
    );
  }

  if (role === 'tab') {
    const tabProps = props as ButtonByRole<'tab'>;
    return (
      <button
        role="tab"
        disabled={disabled}
        className={className}
        aria-selected={tabProps['aria-selected']}
        aria-controls={tabProps['aria-controls']}
        onClick={tabProps.onClick}
        {...(('children' in props) ? { children: props.children } : {})}
        {...(('aria-label' in props) ? { 'aria-label': props['aria-label'] } : {})}
        {...(('aria-labelledby' in props) ? { 'aria-labelledby': props['aria-labelledby'] } : {})}
      />
    );
  }

  const buttonProps = props as ButtonByRole<'button'>;
  return (
    <button
      disabled={disabled}
      className={className}
      onClick={buttonProps.onClick}
      {...(('children' in props) ? { children: props.children } : {})}
      {...(('aria-label' in props) ? { 'aria-label': props['aria-label'] } : {})}
      {...(('aria-labelledby' in props) ? { 'aria-labelledby': props['aria-labelledby'] } : {})}
    />
  );
}

// Usage examples with full type safety
<AccessibleButton>
  Regular Button
</AccessibleButton>

<AccessibleButton
  role="switch"
  aria-checked={isEnabled}
  onClick={setIsEnabled}
  aria-label="Enable notifications"
/>

<AccessibleButton
  role="tab"
  aria-selected={activeTab === 'settings'}
  aria-controls="settings-panel"
  onClick={() => setActiveTab('settings')}
>
  Settings
</AccessibleButton>
```

> [!TIP]
> When building component libraries, start with the most restrictive types possible. You can always relax constraints later, but adding restrictions to existing APIs creates breaking changes.

## Runtime Validation with Zod

For additional safety, combine TypeScript constraints with runtime validation using Zod. This catches accessibility violations from dynamic data:

```tsx
import { z } from 'zod';

const ButtonPropsSchema = z
  .discriminatedUnion('role', [
    z.object({
      role: z.literal('button').optional(),
      onClick: z.function(),
      children: z.any().optional(),
      'aria-label': z.string().optional(),
    }),
    z.object({
      role: z.literal('switch'),
      'aria-checked': z.boolean(),
      onClick: z.function(),
      'aria-label': z.string(),
    }),
  ])
  .refine(
    (props) => {
      // Ensure button has some form of label
      if (props.role !== 'switch') {
        return props.children || props['aria-label'];
      }
      return props['aria-label'];
    },
    { message: 'Button must have accessible label' },
  );

const SafeButton: React.FC<z.infer<typeof ButtonPropsSchema>> = (props) => {
  // Runtime validation
  const validatedProps = ButtonPropsSchema.parse(props);

  return <AccessibleButton {...validatedProps} />;
};
```

This approach provides both compile-time and runtime safety, particularly valuable when props come from APIs or configuration files.

## Common Patterns and Gotchas

### Conditional ARIA Attributes

Sometimes ARIA attributes should only appear under certain conditions. Use mapped types to handle this:

```tsx
type ConditionalAria<T extends boolean> = T extends true ? {
  'aria-expanded': boolean;
  'aria-controls': string;
} : {
  'aria-expanded'?: never;
  'aria-controls'?: never;
};

interface CollapsibleProps<T extends boolean = false> extends ConditionalAria<T> {
  isCollapsible: T;
  children: React.ReactNode;
}

// ✅ Collapsible section with proper ARIA
<Collapsible
  isCollapsible={true}
  aria-expanded={isExpanded}
  aria-controls="content-panel"
>
  Section Content
</Collapsible>

// ✅ Regular section without ARIA clutter
<Collapsible isCollapsible={false}>
  Static Content
</Collapsible>
```

### Invalid Combinations

Use `never` types to prevent invalid attribute combinations:

```tsx
type LinkOrButton =
  | {
      href: string;
      onClick?: never;
      type?: never;
    }
  | {
      href?: never;
      onClick: () => void;
      type?: 'button' | 'submit' | 'reset';
    };

// This prevents the classic "button with href" antipattern
interface ActionElementProps extends LinkOrButton {
  children: React.ReactNode;
  disabled?: boolean;
}
```

### Performance Considerations

TypeScript's type checking happens at compile time, so complex accessibility constraints don't impact runtime performance. However, be mindful of:

- **Build time**: Extremely complex types can slow TypeScript compilation
- **Bundle size**: Runtime validation with Zod adds to bundle size
- **Developer experience**: Overly restrictive types can frustrate developers

> [!WARNING]
> Don't let perfect accessibility typing become the enemy of good accessibility practice. Start simple and iterate based on team needs.

## Testing Type-Safe Accessibility

Your accessibility constraints should be tested just like any other code. Here's an approach using TypeScript's utility types:

```tsx
import { expectType } from 'tsd';

// Test valid button configurations
expectType<AccessibleButtonProps>({
  children: 'Click me',
  onClick: () => {},
});

expectType<AccessibleButtonProps>({
  'aria-label': 'Close',
  onClick: () => {},
});

// Test that invalid configurations don't compile
// This would cause a TypeScript error in your test file
/* 
expectType<AccessibleButtonProps>({
  onClick: () => {},
  // Missing label - should error
});
*/
```

Consider using tools like `tsd` for formal type testing, ensuring your accessibility constraints work as expected.

## Integration with Design Systems

When building design systems, accessibility types become documentation and enforcement mechanisms. Here's a pattern for systematic accessibility:

```tsx
// Define accessibility levels
type A11yLevel = 'AA' | 'AAA';

// Component metadata
interface ComponentA11y {
  level: A11yLevel;
  features: ('keyboard' | 'screen-reader' | 'high-contrast')[];
  wcagCriteria: string[];
}

// Attach metadata to components
const ButtonA11y: ComponentA11y = {
  level: 'AA',
  features: ['keyboard', 'screen-reader'],
  wcagCriteria: ['2.1.1', '4.1.2'],
};

// Runtime and build-time accessibility checks
const AccessibleButton: React.FC<AccessibleButtonProps> & {
  a11y: ComponentA11y;
} = (props) => {
  return <button {...props} />;
};

AccessibleButton.a11y = ButtonA11y;
```

This creates a systematic approach to accessibility that scales across large component libraries.

## Real-World Integration

Here's how to integrate accessibility types into an existing React project:

1. **Start small**: Begin with critical components (buttons, forms, modals)
2. **Gradual adoption**: Use generic types initially, then add constraints over time
3. **Team education**: Document patterns and provide examples
4. **Tooling integration**: Configure ESLint and Prettier to work with your types
5. **Testing strategy**: Include accessibility in your component testing approach

```tsx
// Example migration strategy
interface LegacyButtonProps {
  onClick: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
  // ... other props
}

// Extend existing interface with accessibility constraints
interface ModernButtonProps extends Omit<LegacyButtonProps, 'children'>, ButtonLabelProps {
  // New accessibility requirements
}

// Gradual migration helper
type ButtonProps = LegacyButtonProps | ModernButtonProps;
```

## Next Steps

With accessibility baked into your type system, you've created a foundation for inclusive development that scales with your codebase. Consider exploring:

- **Custom ESLint rules** that enforce your accessibility types
- **Storybook integration** that validates accessibility in your component documentation
- **Build-time checks** that prevent deployment of inaccessible code
- **Advanced patterns** like polymorphic components with accessibility constraints

The goal isn't to catch every accessibility issue at compile time—that's impossible and impractical. Instead, use TypeScript to encode the most critical patterns and relationships, creating guardrails that guide developers toward accessible solutions.

Remember: accessibility is ultimately about people, not just types. Use these techniques to support good practices, but always validate with real users and assistive technologies. TypeScript can prevent many accessibility bugs, but it can't replace human testing and empathy.
