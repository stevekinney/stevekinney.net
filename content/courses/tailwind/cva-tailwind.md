---
title: Class Variance Authority
description: A framework agnostic tool for creating variants of a component with different classes.
modified: 2024-09-28T11:31:16-06:00
---

[Class Variance Authority](https://cva.style) is a framework agnostic tool for creating variants of a component with different classes. It's super simple and you probably _could_ write it yourself if you had to—but, you don't have to because it already exists.

CVA allows you to:

1. Define a set of base styles for the component.
2. Define the styles unique to each variant.
3. Allow you to define default variants when one isn't explicitly specified.
4. It allows you to create compound variants.

It works _super well_ with Tailwind, but you don't need use Tailwind to use CVA. You can use any utility classes that you want or even just the classes from our CSS modules like we did earlier.

> [!TIP] Using Tailwind's IntelliSense with Class Variance Authority
> If you're using Tailwind and Visual Studio Code and CVA and the [Tailwind CSS IntelliSense extension](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss), then you might want to make [this](https://cva.style/docs/getting-started/installation#tailwind-css) tweak to the `settings.json` in your project.

## Example

```tsx
import type { ComponentProps } from 'preact';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const buttonVariants = cva(
  // Base classes
  'font-semibold shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600',
        secondary: 'bg-white text-slate-900 ring-1 ring-slate-300 ring-inset hover:bg-slate-50',
        danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600',
        ghost: 'bg-transparent text-slate-900 hover:bg-slate-50',
      },
      size: {
        'extra-small': 'rounded-sm px-2 py-1 text-xs',
        small: 'rounded-sm px-2 py-1 text-sm',
        medium: 'rounded-md px-2.5 py-1.5 text-sm',
        large: 'rounded-md px-3 py-2 text-sm',
        'extra-large': 'rounded-md px-3.5 py-2.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'medium',
    },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
  };

export const Button = ({ className, variant, size, ...props }: ButtonProps) => {
  return <button class={twMerge(buttonVariants({ variant, size }), className)} {...props} />;
};
```
