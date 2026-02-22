---
title: Tailwind Cva Typed Variants
description: >-
  Pair Tailwind with class-variance-authority (CVA) to create discoverable,
  type-safe variant APIs—no more stringly-typed class soups.
modified: '2025-10-01T00:19:35-05:00'
date: '2025-09-14T18:35:49.574Z'
---

Pair Tailwind with `class-variance-authority` (CVA) to create discoverable, type-safe variant APIs—no more stringly-typed class soups.

## Core Pattern

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const button = cva('inline-flex items-center justify-center rounded-md font-medium', {
  variants: {
    variant: { primary: 'bg-blue-600 text-white', ghost: 'hover:bg-gray-100' },
    size: { sm: 'h-8 px-3', md: 'h-10 px-4' },
  },
  compoundVariants: [{ variant: 'primary', size: 'md', class: 'shadow' }],
  defaultVariants: { variant: 'primary', size: 'md' },
});

export type ButtonVariants = VariantProps<typeof button>;

export function Button({
  variant,
  size,
  className,
  ...rest
}: ButtonVariants & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={button({ variant, size, className })} {...rest} />;
}
```

## Slots and Polymorphism

Use CVA per slot and a polymorphic `as` prop with constrained generics to keep refs and props typed.

```tsx
import { forwardRef, ElementType, ComponentPropsWithRef } from 'react';

const card = cva('rounded-lg border bg-white', {
  variants: { elevated: { true: 'shadow-md', false: '' } },
  defaultVariants: { elevated: true },
});

type CardVariants = VariantProps<typeof card>;

type PolymorphicProps<C extends ElementType, P> = P & {
  as?: C;
} & Omit<ComponentPropsWithRef<C>, keyof P | 'as'>;

const Card = forwardRef(
  <C extends ElementType = 'div'>(
    { as, elevated, className, ...rest }: PolymorphicProps<C, CardVariants>,
    ref: React.Ref<Element>,
  ) => {
    const Comp = (as ?? 'div') as C;
    return <Comp ref={ref as any} className={card({ elevated, className })} {...rest} />;
  },
);
```

## Compound Variants and Strictness

Define mutually exclusive or combined states with compile‑time safety.

```ts
const badge = cva('inline-flex items-center rounded px-2 py-0.5 text-xs', {
  variants: {
    color: { gray: 'bg-gray-100 text-gray-800', red: 'bg-red-100 text-red-800' },
    tone: { solid: '', outline: 'bg-transparent ring-1' },
  },
  compoundVariants: [{ color: 'red', tone: 'outline', class: 'ring-red-300' }],
  defaultVariants: { color: 'gray', tone: 'solid' },
});
```

## Slot Classes Pattern

Use a record of CVAs for multi‑part components (e.g., `input`, `label`, `helper`).

```ts
const inputSlots = {
  root: cva('grid gap-1'),
  label: cva('text-sm font-medium'),
  input: cva('rounded border px-3 py-2 focus:outline-none focus:ring'),
  helper: cva('text-xs text-gray-500'),
};

type InputProps = {
  label?: string;
  helper?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

function Input({ label, helper, className, ...rest }: InputProps) {
  return (
    <div className={inputSlots.root()}>
      {label && <label className={inputSlots.label()}>{label}</label>}
      <input className={inputSlots.input({ className })} {...rest} />
      {helper && <p className={inputSlots.helper()}>{helper}</p>}
    </div>
  );
}
```
