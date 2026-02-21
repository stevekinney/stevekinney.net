---
title: Polymorphic Components and the as Prop
description: >-
  Build components that render different tags while preserving proper props—no
  any, no lies, just safe polymorphism.
date: 2025-09-06T22:04:44.911Z
modified: '2025-09-27T18:40:11-06:00'
published: true
tags:
  - react
  - typescript
  - polymorphic-components
  - as-prop
  - component-composition
---

Ever wanted to build a `Button` component that could render as a `button`, an `a` tag, or even a custom React component—while still giving you proper TypeScript intellisense for whatever element it's actually rendering? Welcome to polymorphic components, where we trade a bit of type complexity for a lot of reusability. By the end of this, you'll understand how to build components that adapt their HTML output and TypeScript types based on an `as` prop, all without resorting to `any` or lying to the type checker.

The challenge is straightforward: you want one component that handles your styling and behavior logic, but you need it to render different HTML elements depending on the context. A button that's sometimes a `<button>`, sometimes an `<a href="...">`, and sometimes a custom `Link` component from your router library.

## The Problem with Traditional Approaches

Let's start with what doesn't work. You might be tempted to try something like this:

```tsx
// ❌ Don't do this
interface BadButtonProps {
  as?: string | React.ComponentType<any>; // Ugh, `any`
  children: React.ReactNode;
  onClick?: () => void;
  href?: string; // What if we're rendering a button?
  to?: string; // What if we're not using React Router?
  [key: string]: any; // More `any` sadness
}

const BadButton = ({ as: Component = 'button', children, ...props }: BadButtonProps) => {
  return <Component {...props}>{children}</Component>;
};
```

This works at runtime, but TypeScript has no idea what's going on. You lose all the benefits of type checking—no autocomplete for valid props, no warnings about invalid prop combinations, and no safety net when you refactor.

## Building a Proper Polymorphic Component

Here's how we solve this properly. We're going to build a `Button` component that can render as any HTML element or React component while preserving full type safety:

```tsx
import { ComponentPropsWithoutRef, ElementType } from 'react';

// First, let's define our base props that every Button should have
interface BaseButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

// Now for the magic: a polymorphic prop type that merges our base props
// with the props of whatever element we're rendering as
type PolymorphicButtonProps<T extends ElementType> = BaseButtonProps & {
  as?: T;
} & ComponentPropsWithoutRef<T>;

// The component itself, using a generic to preserve the element type
const Button = <T extends ElementType = 'button'>({
  as,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: PolymorphicButtonProps<T>) => {
  const Component = as || 'button';

  // Your styling logic goes here
  const baseClasses = 'px-4 py-2 rounded font-medium focus:outline-none focus:ring-2';
  const variantClasses = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
  };
  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-3',
  };

  const className = [baseClasses, variantClasses[variant], sizeClasses[size]].join(' ');

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

export default Button;
```

Let's break down what's happening here:

1. **`BaseButtonProps`**: These are the props that every Button should have, regardless of what element it renders as
2. **`PolymorphicButtonProps<T>`**: This is where the magic happens—we merge our base props with the props of whatever element type `T` represents
3. **`ComponentPropsWithoutRef<T>`**: This gives us all the standard props for element `T` (like `href` for anchors, `onClick` for buttons)
4. **Generic constraint `<T extends ElementType>`**: This ensures `T` can only be something that React can actually render

## Using Your Polymorphic Button

Now you can use your Button component in all sorts of ways, and TypeScript will keep you honest:

```tsx
// ✅ Renders a <button> with onClick
<Button onClick={() => console.log('clicked')}>
  Default Button
</Button>

// ✅ Renders an <a> with href - TypeScript knows href is valid here
<Button as="a" href="https://example.com" target="_blank">
  Link Button
</Button>

// ✅ Renders a Next.js Link component
import Link from 'next/link';
<Button as={Link} href="/dashboard">
  Next.js Link
</Button>

// ✅ All your custom props work too
<Button variant="danger" size="lg" onClick={handleDelete}>
  Delete Account
</Button>

// ❌ TypeScript will complain - buttons don't have href
<Button href="/somewhere">Won't compile</Button>

// ❌ TypeScript will also complain - anchors need href
<Button as="a">Missing href</Button>
```

> [!TIP]
> Notice how TypeScript automatically provides the right autocomplete suggestions based on the `as` prop. When you use `as="a"`, you get `href`, `target`, `download`, etc. When you use the default button, you get `onClick`, `disabled`, `type`, etc.

## Advanced Polymorphic Patterns

### Handling Ref Forwarding

If you need ref forwarding (and you probably will), here's how to add it without breaking the polymorphism:

```tsx
import { ComponentPropsWithoutRef, ElementType, forwardRef } from 'react';

type PolymorphicRef<T extends ElementType> = React.ComponentPropsWithRef<T>['ref'];

type PolymorphicButtonProps<T extends ElementType> = BaseButtonProps & {
  as?: T;
} & ComponentPropsWithoutRef<T>;

type ButtonComponent = <T extends ElementType = 'button'>(
  props: PolymorphicButtonProps<T> & { ref?: PolymorphicRef<T> },
) => React.ReactElement | null;

const Button: ButtonComponent = forwardRef(
  <T extends ElementType = 'button'>(
    { as, variant = 'primary', size = 'md', children, ...props }: PolymorphicButtonProps<T>,
    ref?: PolymorphicRef<T>,
  ) => {
    const Component = as || 'button';

    // ... same styling logic as before

    return (
      <Component ref={ref} className={className} {...props}>
        {children}
      </Component>
    );
  },
);

Button.displayName = 'Button';
```

> [!NOTE]
> The ref typing gets a bit gnarly, but it's worth it for the full polymorphic experience. Your refs will now be correctly typed based on what element you're actually rendering.

### Creating a Reusable Polymorphic Type

If you're building multiple polymorphic components (and you probably should), extract the pattern into a reusable type:

```tsx
type PolymorphicComponentProps<T extends ElementType, Props = {}> = Props & {
  as?: T;
} & ComponentPropsWithoutRef<T>;

type PolymorphicRef<T extends ElementType> = React.ComponentPropsWithRef<T>['ref'];

type PolymorphicComponent<DefaultElement extends ElementType, Props = {}> = <
  T extends ElementType = DefaultElement,
>(
  props: PolymorphicComponentProps<T, Props> & { ref?: PolymorphicRef<T> },
) => React.ReactElement | null;
```

Now you can build polymorphic components with less boilerplate:

````tsx
interface CardProps {
  padding?: 'sm' | 'md' | 'lg';
  shadow?: boolean;
}

const Card: PolymorphicComponent<'div', CardProps> = forwardRef(
  ({ as, padding = 'md', shadow = true, children, ...props }, ref) => {
    const Component = as || 'div';

    // Your card styling logic here

    return (
      <Component ref={ref} {...props}>
        {children}
      </Component>
    );
  },
);

## “asChild” Pattern

Some design systems expose an `asChild` prop to render whatever child element you pass while preserving the component’s styling and behavior. This keeps DOM semantics under your control (use a `Link`, `button`, or any element) without sacrificing typing.

```tsx
import { forwardRef, cloneElement, isValidElement } from 'react';

type AsChildProps = {
  asChild?: boolean;
  children: React.ReactElement;
};

type BaseButtonProps = {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
} & AsChildProps;

const cx = (...xs: Array<string | false | undefined>) => xs.filter(Boolean).join(' ');

export const Button = forwardRef<HTMLElement, BaseButtonProps>(
  ({ asChild, children, variant = 'primary', disabled, ...rest }, ref) => {
    const className = cx('btn', `btn-${variant}`, disabled && 'btn-disabled');

    if (asChild) {
      // Render the passed child, merging props and ref
      if (isValidElement(children)) {
        return cloneElement(children as React.ReactElement, {
          className: cx((children.props as any).className, className),
          ref,
          ...rest,
        });
      }
      return null;
    }

    return (
      <button className={className} disabled={disabled} ref={ref as any} {...rest}>
        {children}
      </button>
    );
  },
);
````

- Use `asChild` when you need to control the rendered element (e.g., Next.js `Link`, Reach Router links) but want to keep Button's styling and behavior.
- The ref type becomes a bit more flexible (generic + element guards are possible); for most cases, forwarding as `HTMLElement` works well with DOM elements.

## Real-World Use Cases™

### Design System Components

Polymorphic components shine in design systems where you need consistent styling across different semantic elements:

```tsx
// Your design system's Text component
interface TextProps {
  variant?: 'body' | 'caption' | 'heading';
  weight?: 'normal' | 'medium' | 'bold';
}

const Text: PolymorphicComponent<'span', TextProps> = /* ... */;

// Usage across your app
<Text as="h1" variant="heading" weight="bold">Page Title</Text>
<Text as="p" variant="body">Regular paragraph text</Text>
<Text as="label" variant="caption" weight="medium">Form label</Text>
```

### Router Integration

Perfect for integrating with different routing libraries:

```tsx
// Works with React Router
<Button as={NavLink} to="/profile" variant="secondary">
  Profile
</Button>

// Works with Next.js
<Button as={Link} href="/profile" variant="secondary">
  Profile
</Button>

// Works with Gatsby
<Button as={GatsbyLink} to="/profile" variant="secondary">
  Profile
</Button>
```

## Performance Considerations

Polymorphic components are essentially zero-cost abstractions at runtime—the generic types disappear after compilation, and you're just passing props to regular React elements. The main performance consideration is the same as any React component: avoid recreating the component on every render if you're passing it inline.

```tsx
// ✅ Good - component reference is stable
const LinkComponent = Link;
<Button as={LinkComponent} href="/dashboard">Dashboard</Button>

// ❌ Potentially problematic - creates new component reference each render
<Button as={React.forwardRef((props, ref) => <Link ref={ref} {...props} />)}>
  Dashboard
</Button>
```

## Common Gotchas and How to Avoid Them

### The `displayName` Mystery

Always set `displayName` on your polymorphic components, especially when using `forwardRef`. React DevTools will thank you:

```tsx
const Button: PolymorphicComponent<'button', ButtonProps> = forwardRef(/* ... */);
Button.displayName = 'Button'; // ✅ Good
```

### Prop Conflicts

Sometimes your base props might conflict with HTML attributes. Handle this explicitly:

```tsx
interface BaseProps {
  size?: string; // Conflicts with HTML img size attribute
}

// If rendering as img, prefer HTML size over your custom size
const Component = ({ size, ...props }: PolymorphicComponentProps<T, BaseProps>) => {
  const { size: _, ...cleanProps } = props; // Remove conflicting props
  // Handle the conflict appropriately
};
```

### TypeScript Performance

Very complex polymorphic types can slow down TypeScript's compiler. If you notice slowdowns, consider simplifying your types or splitting complex components into smaller, focused ones.

## Next Steps

Now you've got the tools to build truly reusable components that don't sacrifice type safety for flexibility. Start with a simple Button or Text component, get comfortable with the patterns, then expand to more complex use cases.

Consider building polymorphic versions of common components like:

- `Box` (div by default, but can be any container)
- `Heading` (h2 by default, but can be h1-h6)
- `List` (ul by default, but can be ol or div)

The `as` prop pattern has become increasingly popular in modern React libraries (Chakra UI, Mantine, Stitches) because it solves real problems without compromising developer experience. Once you start using polymorphic components, you'll wonder how you ever built reusable UIs without them.
