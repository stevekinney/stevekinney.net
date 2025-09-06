---
title: Prop Combinations: Permit, Limit, and Require
description: Make illegal prop combos unrepresentable—use unions, XOR patterns, and overloads.
date: 2025-09-06T22:23:57.314Z
modified: 2025-09-06T22:23:57.314Z
published: true
tags: ['react', 'typescript', 'prop-combinations', 'unions', 'conditional-props']
---

Component APIs are contracts—they define what combinations of props make sense and which ones don't. But too often, we design interfaces that allow nonsensical combinations to slip through, creating runtime confusion and maintenance headaches. TypeScript gives us the tools to encode these rules directly into our types, making invalid states literally impossible to represent.

By the end of this guide, you'll know how to design component APIs that permit valid combinations, limit problematic ones, and require essential groupings—all while providing excellent developer experience through IntelliSense and compile-time safety.

## The Problem with Permissive Props

Consider a common scenario: a `Dialog` component that can be controlled or uncontrolled, with different behaviors based on how it's used:

```ts
// ❌ This allows confusing combinations
interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, defaultOpen, onOpenChange, children }: DialogProps) {
  // What happens when both open AND defaultOpen are provided?
  // What if open is provided without onOpenChange?
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);

  // Confusing logic to handle all the edge cases...
  const actualOpen = open !== undefined ? open : isOpen;

  return actualOpen ? <div>{children}</div> : null;
}
```

This interface is technically flexible, but it's also confusing. Nothing prevents these problematic combinations:

```tsx
// All of these compile but create unclear behavior
<Dialog open={true} defaultOpen={false} /> {/* Which wins? */}
<Dialog open={isOpen} /> {/* Missing onOpenChange handler */}
<Dialog onOpenChange={setOpen} /> {/* Handler but no way to control */}
```

## Pattern 1: Permit Specific Combinations

The first pattern is about creating clear, mutually exclusive variants. Here's how to design a component that permits only valid controlled/uncontrolled patterns:

```ts
type ControlledDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOpen?: never; // Explicitly forbidden
};

type UncontrolledDialogProps = {
  defaultOpen?: boolean;
  open?: never; // Explicitly forbidden
  onOpenChange?: never; // Explicitly forbidden
};

type DialogProps = {
  children: React.ReactNode;
  title?: string;
} & (ControlledDialogProps | UncontrolledDialogProps);

function Dialog(props: DialogProps) {
  const { children, title } = props;

  // TypeScript narrows the type based on the presence of 'open'
  if ('open' in props) {
    // Controlled variant - TypeScript knows onOpenChange exists
    return (
      <dialog open={props.open}>
        {title && <h2>{title}</h2>}
        {children}
        <button onClick={() => props.onOpenChange(false)}>
          Close
        </button>
      </dialog>
    );
  }

  // Uncontrolled variant - manage state internally
  const [isOpen, setIsOpen] = useState(props.defaultOpen ?? false);

  return (
    <dialog open={isOpen}>
      {title && <h2>{title}</h2>}
      {children}
      <button onClick={() => setIsOpen(false)}>
        Close
      </button>
    </dialog>
  );
}
```

Usage becomes crystal clear:

```tsx
// ✅ Controlled - all required props present
<Dialog
  open={isOpen}
  onOpenChange={setIsOpen}
>
  Content here
</Dialog>

// ✅ Uncontrolled - simple and self-contained
<Dialog defaultOpen={true}>
  Content here
</Dialog>

// ❌ These combinations are impossible
<Dialog open={true} defaultOpen={false} /> {/* TypeScript error */}
<Dialog open={isOpen} /> {/* Missing onOpenChange */}
```

> [!TIP]
> Use the `never` type to explicitly forbid props in specific variants. This makes the mutual exclusivity obvious to both TypeScript and developers reading the code.

## Pattern 2: Limit Based on Conditions

Sometimes you want to limit certain prop combinations based on context. Here's a `Button` component that adapts its available props based on its variant:

```ts
type BaseButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

type PrimaryButtonProps = BaseButtonProps & {
  variant: 'primary';
  onClick: () => void;
  // Primary buttons must have click handlers
  href?: never;
  target?: never;
};

type SecondaryButtonProps = BaseButtonProps & {
  variant: 'secondary';
  onClick?: () => void; // Optional for secondary
  href?: never;
  target?: never;
};

type LinkButtonProps = BaseButtonProps & {
  variant: 'link';
  href: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  onClick?: never; // Links don't need onClick
};

type ButtonProps = PrimaryButtonProps | SecondaryButtonProps | LinkButtonProps;

function Button(props: ButtonProps) {
  const { children, disabled, className, variant } = props;

  const baseClasses = `btn btn-${variant} ${className || ''}`;

  if (variant === 'link') {
    return (
      <a
        href={props.href}
        target={props.target}
        className={baseClasses}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={baseClasses}
      disabled={disabled}
      onClick={props.onClick}
    >
      {children}
    </button>
  );
}
```

This design limits prop combinations based on the button's intended behavior:

```tsx
// ✅ Primary buttons require onClick
<Button variant="primary" onClick={handleSubmit}>
  Submit Form
</Button>

// ✅ Link buttons require href
<Button variant="link" href="/dashboard" target="_blank">
  Go to Dashboard
</Button>

// ✅ Secondary buttons work with or without onClick
<Button variant="secondary">
  Cancel
</Button>

// ❌ Invalid combinations caught at compile time
<Button variant="primary" href="/somewhere" /> {/* href not allowed */}
<Button variant="link" onClick={handleClick} /> {/* onClick not allowed */}
```

## Pattern 3: Require Dependent Props

Some props only make sense when used together. Here's a pattern for requiring dependent combinations using conditional types:

```ts
type HasIcon<T> = T extends { icon: string }
  ? T & { 'aria-label': string } // Icon requires aria-label
  : T;

type HasTooltip<T> = T extends { tooltip: string }
  ? T & { 'aria-describedby'?: string } // Tooltip can have describedby
  : T;

type IconButtonProps = HasTooltip<HasIcon<{
  icon?: string;
  tooltip?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  onClick: () => void;
  children?: never; // Icon buttons don't show text
}>>;

function IconButton(props: IconButtonProps) {
  if (!props.icon) {
    // Without icon, this becomes a regular button
    // But TypeScript still enforces the constraints above
    return <button onClick={props.onClick} />;
  }

  return (
    <button
      onClick={props.onClick}
      aria-label={props['aria-label']} // Required when icon exists
      aria-describedby={props['aria-describedby']}
      title={props.tooltip}
    >
      <Icon name={props.icon} />
    </button>
  );
}
```

Usage enforces accessibility requirements:

```tsx
// ✅ Icon with required aria-label
<IconButton
  icon="search"
  aria-label="Search products"
  onClick={handleSearch}
/>

// ✅ Icon with tooltip and aria-label
<IconButton
  icon="help"
  tooltip="Get help with this feature"
  aria-label="Help"
  aria-describedby="help-tooltip"
  onClick={showHelp}
/>

// ❌ Icon without aria-label is caught
<IconButton icon="search" onClick={handleSearch} /> {/* Missing aria-label */}
```

## Real-World Example: Form Field Combinations

Let's build a comprehensive form field component that demonstrates all three patterns:

```ts
type BaseFieldProps = {
  name: string;
  label: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
};

// Pattern 1: Permit specific input types
type TextFieldProps = BaseFieldProps & {
  type: 'text' | 'email' | 'password' | 'tel';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  // These don't make sense for text inputs
  multiple?: never;
  options?: never;
};

type SelectFieldProps = BaseFieldProps & {
  type: 'select';
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  // Pattern 2: Limit multiple based on value type
  multiple?: boolean;
  // These don't make sense for selects
  placeholder?: never;
  maxLength?: never;
};

type FileFieldProps = BaseFieldProps & {
  type: 'file';
  value?: never; // File inputs handle their own state
  onChange: (files: FileList | null) => void;
  accept?: string;
  multiple?: boolean;
  // These don't make sense for file inputs
  placeholder?: never;
  maxLength?: never;
  options?: never;
};

// Pattern 3: Require validation when needed
type WithValidation<T> = T extends { required: true }
  ? T & { validationMessage?: string }
  : T;

type FieldProps = WithValidation<TextFieldProps | SelectFieldProps | FileFieldProps>;

function Field(props: FieldProps) {
  const { label, name, error, disabled, required } = props;

  const renderInput = () => {
    switch (props.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'tel':
        return (
          <input
            type={props.type}
            name={name}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.placeholder}
            maxLength={props.maxLength}
            disabled={disabled}
            required={required}
          />
        );

      case 'select':
        return (
          <select
            name={name}
            value={props.value}
            onChange={(e) => {
              if (props.multiple) {
                const values = Array.from(e.target.selectedOptions).map(o => o.value);
                props.onChange(values);
              } else {
                props.onChange(e.target.value);
              }
            }}
            multiple={props.multiple}
            disabled={disabled}
            required={required}
          >
            {props.options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'file':
        return (
          <input
            type="file"
            name={name}
            onChange={(e) => props.onChange(e.target.files)}
            accept={props.accept}
            multiple={props.multiple}
            disabled={disabled}
            required={required}
          />
        );
    }
  };

  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required && <span className="required">*</span>}
      </label>
      {renderInput()}
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

This design creates a robust, type-safe field component:

```tsx
// ✅ Text field with proper props
<Field
  type="email"
  name="email"
  label="Email Address"
  value={email}
  onChange={setEmail}
  placeholder="you@example.com"
  required
/>

// ✅ Multi-select with array value
<Field
  type="select"
  name="skills"
  label="Skills"
  value={selectedSkills}
  onChange={setSelectedSkills}
  options={skillOptions}
  multiple
/>

// ✅ File upload with proper handlers
<Field
  type="file"
  name="resume"
  label="Upload Resume"
  onChange={handleFileChange}
  accept=".pdf,.doc,.docx"
/>

// ❌ Invalid combinations prevented
<Field type="text" options={[]} /> {/* options not allowed on text */}
<Field type="select" placeholder="Choose" /> {/* placeholder not allowed on select */}
```

## Advanced Pattern: Function Overloads

For even more precise control, you can use function overloads to define exact prop combinations:

```ts
// Define overloads for different use cases
function Toast(props: {
  type: 'success';
  message: string;
  duration?: number;
}): JSX.Element;

function Toast(props: {
  type: 'error';
  message: string;
  action?: { label: string; onClick: () => void };
  persistent?: true; // Error toasts can be persistent
}): JSX.Element;

function Toast(props: {
  type: 'loading';
  message: string;
  duration?: never; // Loading toasts don't auto-dismiss
  persistent?: true;
}): JSX.Element;

// Implementation handles all cases
function Toast(props: {
  type: 'success' | 'error' | 'loading';
  message: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
  persistent?: boolean;
}) {
  const { type, message, duration, action, persistent } = props;

  useEffect(() => {
    if (type === 'success' && !persistent && duration !== undefined) {
      const timer = setTimeout(() => dismiss(), duration);
      return () => clearTimeout(timer);
    }
  }, [type, persistent, duration]);

  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      {action && (
        <button onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
```

## Runtime Validation with Zod

For components that receive props from external sources, combine your TypeScript patterns with runtime validation:

```ts
import { z } from 'zod';

const ControlledDialogSchema = z.object({
  open: z.boolean(),
  onOpenChange: z.function().args(z.boolean()).returns(z.void()),
  defaultOpen: z.undefined(),
});

const UncontrolledDialogSchema = z.object({
  defaultOpen: z.boolean().optional(),
  open: z.undefined(),
  onOpenChange: z.undefined(),
});

const DialogPropsSchema = z
  .object({
    children: z.any(),
    title: z.string().optional(),
  })
  .and(z.union([ControlledDialogSchema, UncontrolledDialogSchema]));

type DialogProps = z.infer<typeof DialogPropsSchema>;

function Dialog(props: DialogProps) {
  // Runtime validation for props from external sources
  const validatedProps = DialogPropsSchema.safeParse(props);

  if (!validatedProps.success) {
    throw new Error(`Invalid props: ${validatedProps.error.message}`);
  }

  // Your component logic here...
}
```

## When to Use Each Pattern

**Permit patterns** work best when:

- You have distinct modes of operation (controlled vs uncontrolled)
- Props have fundamentally different meanings in different contexts
- You want to prevent conceptual confusion

**Limit patterns** are ideal for:

- Components with multiple variants that need different props
- Preventing props that don't make sense together
- Creating focused, single-purpose interfaces

**Require patterns** shine when:

- Accessibility requirements must be enforced
- Props have strong dependencies (e.g., validation rules)
- You want to guide developers toward best practices

## Performance and Maintainability

These patterns are compile-time constructs—they add zero runtime overhead. However, consider these tradeoffs:

- **Complex union types** can slow TypeScript compilation on large codebases
- **Deeply nested conditionals** may create confusing error messages
- **Over-engineering** simple components reduces readability

The goal is to use these patterns judiciously—when they prevent real bugs and improve the developer experience, not just because you can.

## Common Pitfalls

### Over-constraining Simple Cases

```ts
// ❌ Overkill for a simple optional prop
type OverEngineered = { showIcon: true; iconName: string } | { showIcon: false; iconName?: never };

// ✅ Sometimes simple is better
type Simple = { showIcon?: boolean; iconName?: string };
```

### Forgetting About Partial Application

```ts
// ❌ This breaks when props are spread or partially applied
type StrictProps = { a: string } & { b: string };

// ✅ More resilient to partial application
type FlexibleProps = { a: string; b?: string } | { a?: string; b: string };
```

### Making Maintenance Harder

```ts
// ❌ Brittle - adding new variants requires touching everything
type Variant = 'primary' | 'secondary' | 'danger';
type ButtonProps = Variant extends 'primary'
  ? PrimaryProps
  : Variant extends 'secondary'
    ? SecondaryProps
    : DangerProps;

// ✅ More maintainable union
type ButtonProps = PrimaryProps | SecondaryProps | DangerProps;
```

## Next Steps

Now that you can design precise component APIs, consider exploring:

- **Generic constraint patterns** for reusable prop combinations
- **Template literal types** for dynamic prop validation
- **Mapped types** for transforming existing interfaces
- **Branded types** for even stronger guarantees

Remember: the best component API is one that makes correct usage easy and incorrect usage impossible. These patterns help you build that kind of bulletproof interface—use them when they add value, not complexity.
