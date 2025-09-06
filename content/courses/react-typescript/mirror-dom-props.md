---
title: Mirroring DOM Props with ComponentPropsWithoutRef
description: Wrap native elements without losing typing—pass through every valid prop and keep autocomplete.
date: 2025-09-06T22:23:57.294Z
modified: 2025-09-06T22:23:57.294Z
published: true
tags: ['react', 'typescript', 'dom-props', 'component-props', 'html-attributes']
---

Building wrapper components around native DOM elements is one of those things that looks simple until you realize you need to support all the props. You know the drill: you build a nice `Button` component, then someone needs `onClick`, then `disabled`, then `aria-label`, then `onMouseEnter`, and before you know it you're manually typing out dozens of props that the native `<button>` already supports perfectly.

Enter `ComponentPropsWithoutRef`—React's utility type that gives you all the props of a native element without the ref clutter. It's like getting a VIP pass to the DOM's prop buffet while keeping TypeScript happy and your autocomplete snappy.

## The Problem: Manual Prop Forwarding

Let's start with the common approach that makes everyone's life harder:

```tsx
// ❌ Bad - manually defining every prop you might need
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
  // ... what about onMouseEnter? onFocus? aria-label?
  // This list gets unwieldy fast
}

function Button({ children, onClick, disabled, type, className, style }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={className}
      style={style}
      // Oops, forgot to spread the rest props!
    >
      {children}
    </button>
  );
}
```

This approach has several problems:

- **Incomplete**: You'll inevitably forget props that users need
- **Maintenance burden**: Every new prop requirement means updating the interface
- **Type drift**: Your custom props might not match the actual DOM element behavior
- **No autocomplete**: Users don't get IntelliSense for standard HTML attributes

## The Solution: ComponentPropsWithoutRef

`ComponentPropsWithoutRef` is a utility type that extracts all the props from a given HTML element type, minus the `ref` prop (which we'll handle separately if needed):

```tsx
import { ComponentPropsWithoutRef } from 'react';

// ✅ Good - get all button props automatically
interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  const variantClass = `btn--${variant}`;
  const sizeClass = `btn--${size}`;
  const classes = `btn ${variantClass} ${sizeClass} ${className || ''}`.trim();

  return <button className={classes} {...props} />;
}
```

Now your `Button` component automatically supports every prop that native `<button>` elements support:

```tsx
// ✅ All of these work automatically with full TypeScript support
<Button onClick={() => console.log('clicked')}>Basic</Button>
<Button disabled>Disabled</Button>
<Button type="submit" form="my-form">Submit</Button>
<Button onMouseEnter={() => console.log('hover')} aria-label="Close dialog">
  ×
</Button>
<Button
  onKeyDown={(e) => e.key === 'Enter' && console.log('enter pressed')}
  tabIndex={0}
>
  Accessible
</Button>
```

## Understanding the Type Magic

Let's peek under the hood to understand what `ComponentPropsWithoutRef` actually gives you:

```tsx
// This is roughly what ComponentPropsWithoutRef<'button'> expands to:
type ButtonElementProps = {
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  'aria-describedby'?: string;
  tabIndex?: number;
  style?: React.CSSProperties;
  // ... and about 50+ more props
};
```

The beauty is that you don't need to know or maintain this list—React's type definitions handle it for you, and they stay up-to-date with web standards.

## Working with Different HTML Elements

`ComponentPropsWithoutRef` works with any HTML element. Just change the string literal:

```tsx
// Input component
interface InputProps extends ComponentPropsWithoutRef<'input'> {
  label: string;
  error?: string;
}

function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div>
      <label>{label}</label>
      <input className={`input ${error ? 'input--error' : ''} ${className || ''}`} {...props} />
      {error && <span className="error">{error}</span>}
    </div>
  );
}

// Div wrapper component
interface CardProps extends ComponentPropsWithoutRef<'div'> {
  title: string;
  actions?: React.ReactNode;
}

function Card({ title, actions, children, className, ...props }: CardProps) {
  return (
    <div className={`card ${className || ''}`} {...props}>
      <header className="card-header">
        <h3>{title}</h3>
        {actions && <div className="card-actions">{actions}</div>}
      </header>
      <div className="card-content">{children}</div>
    </div>
  );
}
```

## Handling Prop Conflicts Gracefully

Sometimes your custom props might conflict with native DOM props. Here's how to handle that:

```tsx
// What if your custom 'size' conflicts with the native 'size' attribute?
interface InputProps extends ComponentPropsWithoutRef<'input'> {
  label: string;
  // Our custom size prop (different from input's native size)
  inputSize?: 'sm' | 'md' | 'lg';
}

function Input({ label, inputSize = 'md', ...props }: InputProps) {
  // Native 'size' prop is still available in ...props if needed
  return (
    <div>
      <label>{label}</label>
      <input className={`input input--${inputSize}`} {...props} />
    </div>
  );
}

// Usage:
<Input
  label="Username"
  inputSize="lg" // Our custom size
  size={20} // Native size attribute (character width)
  maxLength={50} // Native maxLength works too
/>;
```

If you need to completely override a native prop, use `Omit`:

```tsx
interface CustomButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'onClick'> {
  // Replace the native onClick with our own signature
  onClick: (buttonType: string) => void;
  buttonType: string;
}

function CustomButton({ onClick, buttonType, ...props }: CustomButtonProps) {
  return <button {...props} onClick={() => onClick(buttonType)} />;
}
```

## Adding forwardRef Support

When you need ref forwarding, combine `ComponentPropsWithoutRef` with `forwardRef`:

```tsx
import { forwardRef, ComponentPropsWithoutRef } from 'react';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => {
    const classes = `btn btn--${variant} btn--${size} ${className || ''}`.trim();

    return <button ref={ref} className={classes} {...props} />;
  },
);

Button.displayName = 'Button';
```

Now your component supports refs _and_ all native button props:

```tsx
function App() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <Button
      ref={buttonRef}
      onClick={() => buttonRef.current?.focus()}
      onMouseEnter={() => console.log('hovered')}
      disabled={false}
      type="button"
      aria-label="Focus me"
    >
      Click to focus myself
    </Button>
  );
}
```

## Real-World Example: Building a Link Component

Here's a comprehensive example that shows `ComponentPropsWithoutRef` in action:

```tsx
import { forwardRef, ComponentPropsWithoutRef } from 'react';

// Support both internal links (to) and external links (href)
type BaseLinkProps = ComponentPropsWithoutRef<'a'>;

interface InternalLinkProps extends Omit<BaseLinkProps, 'href'> {
  to: string;
  external?: false;
}

interface ExternalLinkProps extends Omit<BaseLinkProps, 'href'> {
  href: string;
  external: true;
  openInNewTab?: boolean;
}

type LinkProps = InternalLinkProps | ExternalLinkProps;

const Link = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => {
  if (props.external) {
    const { href, openInNewTab = true, ...rest } = props;
    return (
      <a
        ref={ref}
        href={href}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        {...rest}
      />
    );
  }

  const { to, ...rest } = props;
  // In a real app, you'd use your router's Link component here
  return <a ref={ref} href={to} {...rest} />;
});

Link.displayName = 'Link';

// Usage with full type safety and autocomplete:
<Link to="/dashboard" className="nav-link">
  Dashboard
</Link>

<Link
  external
  href="https://example.com"
  onMouseEnter={() => console.log('external link hovered')}
  aria-label="Visit external site"
>
  External Site
</Link>
```

## Advanced Pattern: Polymorphic Components

For ultimate flexibility, you can create components that can render as different HTML elements:

```tsx
import { ComponentPropsWithoutRef, ElementType, forwardRef } from 'react';

interface PolymorphicProps<T extends ElementType> {
  as?: T;
  variant?: 'primary' | 'secondary';
}

type PolymorphicComponentProps<T extends ElementType> =
  PolymorphicProps<T> & ComponentPropsWithoutRef<T>;

const PolymorphicComponent = forwardRef(
  <T extends ElementType = 'div'>(
    { as, variant = 'primary', className, ...props }: PolymorphicComponentProps<T>,
    ref: React.Ref<any>
  ) => {
    const Component = as || 'div';
    const classes = `component component--${variant} ${className || ''}`.trim();

    return <Component ref={ref} className={classes} {...props} />;
  }
);

// Usage: same component, different elements, all properly typed
<PolymorphicComponent>Default div</PolymorphicComponent>
<PolymorphicComponent as="button" onClick={() => alert('clicked')}>
  Button variant
</PolymorphicComponent>
<PolymorphicComponent as="a" href="/link">
  Link variant
</PolymorphicComponent>
```

> [!NOTE]
> Polymorphic components are powerful but complex. Use them sparingly—most components work better with a fixed element type.

## Common Patterns and Best Practices

### Pattern 1: The Wrapper Component

Perfect for adding styling or behavior to native elements:

```tsx
interface StyledInputProps extends ComponentPropsWithoutRef<'input'> {
  variant?: 'outline' | 'filled' | 'underline';
}

function StyledInput({ variant = 'outline', className, ...props }: StyledInputProps) {
  return <input className={`input input--${variant} ${className || ''}`} {...props} />;
}
```

### Pattern 2: The Enhanced Component

Adding functionality while preserving the native API:

```tsx
interface AutoResizeTextareaProps extends ComponentPropsWithoutRef<'textarea'> {
  minRows?: number;
  maxRows?: number;
}

function AutoResizeTextarea({
  minRows = 1,
  maxRows = 10,
  style,
  onChange,
  ...props
}: AutoResizeTextareaProps) {
  const [rows, setRows] = useState(minRows);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Auto-resize logic here...
    const newRows = Math.min(maxRows, Math.max(minRows /* calculated rows */));
    setRows(newRows);
    onChange?.(e);
  };

  return (
    <textarea rows={rows} style={{ resize: 'none', ...style }} onChange={handleChange} {...props} />
  );
}
```

### Pattern 3: The Compound Component

Building complex components from simple ones:

```tsx
interface FormFieldProps extends ComponentPropsWithoutRef<'div'> {
  label: string;
  error?: string;
  required?: boolean;
}

function FormField({ label, error, required, children, className, ...props }: FormFieldProps) {
  return (
    <div className={`form-field ${className || ''}`} {...props}>
      <label className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

// Usage:
<FormField label="Email" required error={emailError}>
  <StyledInput type="email" name="email" />
</FormField>;
```

## Performance Considerations

`ComponentPropsWithoutRef` has minimal runtime cost since it's purely a type-level construct. However, there are a few things to keep in mind:

```tsx
// ✅ Good - destructuring commonly used props
function Button({ disabled, className, ...props }: ButtonProps) {
  // Process disabled and className specifically
  return <button disabled={disabled} className={processClassName(className)} {...props} />;
}

// ❌ Less ideal - spreading everything always
function Button(props: ButtonProps) {
  // This works but you lose the ability to process specific props
  return <button {...props} />;
}
```

## Debugging Tips

When things go wrong with prop types, these patterns help with debugging:

```tsx
// Add type assertions to understand what you're working with
function debugComponent(props: ComponentPropsWithoutRef<'button'>) {
  // Hover over this in your IDE to see all available props
  const allProps: typeof props = props;
  console.log('Available props:', Object.keys(allProps));

  return <button {...props} />;
}

// Use satisfies to ensure your component meets the interface
const MyButton = ((props) => {
  return <button {...props} />;
}) satisfies React.FC<ComponentPropsWithoutRef<'button'>>;
```

## Migration Strategy

Moving from manual props to `ComponentPropsWithoutRef`? Here's a safe approach:

```tsx
// Step 1: Keep existing interface, extend ComponentPropsWithoutRef
interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  // Keep your existing custom props
  variant?: 'primary' | 'secondary';
  // Remove native props you were manually defining
  // onClick?: () => void;  // ← Remove this, comes from ComponentPropsWithoutRef
  // disabled?: boolean;    // ← Remove this too
}

// Step 2: Update implementation to use rest props
function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} ${className || ''}`}
      {...props} // ← Now forwards all native props
    />
  );
}
```

This approach is backwards-compatible and gives you immediate access to all native props.

## Looking Forward

`ComponentPropsWithoutRef` is the foundation for building robust, reusable components that feel natural to use. It eliminates the friction between your custom components and the native DOM, giving developers the full power of HTML attributes with the benefits of your custom logic.

The patterns we've covered—from simple wrappers to polymorphic components—scale from single-component libraries to comprehensive design systems. Your components become more powerful and your developers become more productive, all while TypeScript keeps everyone honest about what props are actually available.

Remember: the goal isn't just to make TypeScript happy, but to create components that feel like natural extensions of HTML. When you nail that balance, building UIs becomes a joy rather than a chore.

**Next up**: We'll explore advanced prop patterns, including render props, compound components, and event handler composition that work seamlessly with the DOM prop foundation we've established here.
