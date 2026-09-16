---
title: Merging and Deduplicating Class Names
description: Using tailwind-merge and clsx to keep your classes from clashing.
---

At lot of times when you're building out components, you might want to allow the component to be extended with additional classes, but how do you keep them from clashing with the classes you've already defined?

Luckily, this is a pretty commom problem and two libraries exist to help us. The former is a general-purpose library for working with CSS classnames and the latter is Tailwind-specific:

- [`clsx`](https://npm.im/clsx) handles conditional className logic (like `clsx('base', { 'active': isActive })`)
- [`tailwind-merge`](https://npm.im/tailwind-merge) resolves conflicts between Tailwind utility classes

## `clsx`

Without either, you might find yourself doing something like this:

```tsx
import type { ComponentProps } from 'preact';

export type ButtonProps = ComponentProps<'button'>;

export const Button = ({ className, ...props }: ButtonProps) => {
  return (
    <button
      class={`rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 ${className || ''}`}
      {...props}
    />
  );
};
```

There are a few problems here:

- You could end up with two different utility classes that allegedly do the same thing.
- This gets even rougher if you want to do any conditional logic.

The `clsx` library shines in this Button component example by cleaning up the manual string concatenation and conditional logic you're currently handling with template literals. Instead of `${className || ''}` and worrying about extra spaces, you could write `clsx('rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500', className)` which automatically handles undefined/null values and proper spacing. More importantly, if you later need conditional classes—like `disabled:opacity-50` when a `disabled` prop is true, or different sizes based on a `size` prop—`clsx` makes this trivial with its object syntax: `clsx('base-classes', { 'disabled:opacity-50': disabled, 'px-6 py-3': size === 'large' }, className)`. This keeps your component clean and readable while eliminating the manual string manipulation that becomes unwieldy as components grow more complex.

```tsx
import type { ComponentProps } from 'preact';
import { clsx } from 'clsx';

export type ButtonProps = ComponentProps<'button'> & {
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
};

export const Button = ({ className, size = 'md', disabled = false, ...props }: ButtonProps) => {
  return (
    <button
      class={clsx(
        'rounded-md bg-blue-600 text-sm font-semibold text-white shadow-xs hover:bg-blue-500',
        {
          'px-2 py-1 text-xs': size === 'sm',
          'px-3 py-2 text-sm': size === 'md',
          'px-4 py-3 text-base': size === 'lg',
        },
        {
          'cursor-not-allowed opacity-50 hover:bg-blue-600': disabled,
        },
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );
};
```

## `clsx` and `tailwind-merge`

Without this combo, you might write something like:

```js
const className = clsx('px-2 py-1', { 'px-4': isLarge });
// Result when isLarge=true: "px-2 py-1 px-4"
// Problem: Both px-2 and px-4 are applied!
```

With `tailwind-merge`:

```js
import { twMerge } from 'tailwind-merge';

const className = twMerge(clsx('px-2 py-1', { 'px-4': isLarge }));
// Result when isLarge=true: "py-1 px-4"
// px-2 is intelligently removed since px-4 overrides it
```

So, now our previous example might look something like this:

```tsx
export const Button = ({ className, size = 'md', disabled = false, ...props }: ButtonProps) => {
  return (
    <button
      class={twMerge(
        clsx(
          // Base styles
          'rounded-md bg-blue-600 text-sm font-semibold text-white shadow-xs hover:bg-blue-500',
          // Size variants
          {
            'px-2 py-1 text-xs': size === 'sm',
            'px-3 py-2 text-sm': size === 'md',
            'px-4 py-3 text-base': size === 'lg',
          },
          // Conditional styles
          {
            'cursor-not-allowed opacity-50 hover:bg-blue-600': disabled,
          },
          // User-provided classes (will override conflicts)
          className,
        ),
      )}
      disabled={disabled}
      {...props}
    />
  );
};
```

This new-and-improved version shows the real flex of combining both libraries. Now when someone uses your `<Button />` component like `<Button className="px-8 bg-red-500">Click me</Button>`, the `tailwind-merge` wrapper ensures that their `px-8` completely replaces your component's size-based padding (instead of both being applied), and their `bg-red-500` replaces your default `bg-blue-600`. Without `tailwind-merge`, you'd end up with conflicting classes where both the component's and user's padding/background classes are applied, leading to unpredictable styling results. This pattern makes your components truly customizable and prevents the frustrating "why isn't my override working?" moments.

## Combining Them

A lot of times, I'll make a simple utility that I'll call `cn`.

```tsx
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Is it really necessary?

For simple cases, probably not. But it becomes valuable when:

- Building reusable components that accept className props
- Dealing with variant-based styling systems
- Working with component libraries where class conflicts are common

## Alternatives

- [Class Variance Authority](cva-tailwind.md): `cva` combines both concepts
- `clsx` alone if you're careful about class conflicts
- Just write the conditional logic manually for simple cases
