---
title: Type-Level Testing in Practice
description: >-
  Assert your types with tsd/expectTypeOf—lock generics, prevent regressions,
  and add type coverage to CI.
date: 2025-09-14T18:00:00.000Z
modified: '2025-09-22T09:27:10-06:00'
published: true
tags:
  - react
  - typescript
  - testing
  - types
  - tsd
  - expectTypeOf
  - ci
---

Types can regress silently. Add type-level tests to catch breaks when refactoring generics, overloads, and public APIs.

## `tsd` or `expectTypeOf`

```ts
// vitest + expectTypeOf
import { expectTypeOf, describe, it } from 'vitest';

type Foo<T> = { value: T };

describe('Foo', () => {
  it('preserves generic', () => {
    const x: Foo<number> = { value: 42 };
    expectTypeOf(x.value).toEqualTypeOf<number>();
  });
});
```

## CI and Type Coverage

- Run type tests in CI just like unit tests.
- Track “type coverage” budgets: disallow `any`, enforce `noUncheckedIndexedAccess`.
- Gate releases of component libraries on passing type assertions.

## Testing Polymorphic Components

```ts
import { expectTypeOf, it } from 'vitest';

// Polymorphic Button with `as` prop
declare function Button<C extends React.ElementType = 'button'>(props: {
  as?: C;
} & React.ComponentPropsWithoutRef<C>): React.ReactNode;

it('infers correct props for anchor', () => {
  const el = <Button as="a" href="/" />;
  expectTypeOf(el.props.href).toBeString(); // href must exist on anchor
});
```

## Higher Order Component Props Preservation

```ts
function withLogging<P>(Comp: React.ComponentType<P>) {
  return (props: P) => <Comp {...props} />;
}

type InputProps = { value: string; onChange: (v: string) => void };
const Input: React.FC<InputProps> = () => null;
const LoggedInput = withLogging(Input);

// ensure HOC preserves prop types
expectTypeOf<Parameters<typeof LoggedInput>[0]>().toEqualTypeOf<InputProps>();
```

## `tsd` Setup (Alternative)

```json
// package.json
{
  "scripts": {
    "test:types": "tsd"
  }
}
```

```ts
// tsd.config.json
{
  "entry": "./types/**/*.test-d.ts"
}
```

```ts
// types/button.test-d.ts
import { expectType } from 'tsd';
import { Button } from '../dist';

expectType<JSX.Element>(<Button />);
```

## Guarding Public APIs in Libraries

- Export types (`export type { ButtonProps }`) and assert them in `test:types`.
- Lock down overloads and generic defaults with targeted assertions.

## Snapshot Public Component Types

Lock down your public API with type snapshots using `tsd` or `expectTypeOf`.

```ts
// tsd: Button and TextField public types
import type { ComponentProps } from 'react';
import { expectType } from 'tsd';
import { Button } from '../dist';
import { TextField } from '../dist';

// Button supports as="a" | "button" and mirrors intrinsic attrs
type ButtonProps = ComponentProps<typeof Button>;
expectType<ButtonProps>({ as: 'button', onClick: () => {} });
expectType<ButtonProps>({ as: 'a', href: '/home' });
// @ts-expect-error - anchors need href
expectType<ButtonProps>({ as: 'a' });

// TextField narrows onChange to the correct event type
type TextFieldProps = ComponentProps<typeof TextField>;
expectType<TextFieldProps>({ label: 'Name', value: '', onChange: (e) => e.target.value });
expectType<TextFieldProps>({
  as: 'textarea',
  label: 'Bio',
  defaultValue: '',
  onChange: (e) => e.target.value,
});
// @ts-expect-error - wrong event type for textarea
expectType<TextFieldProps>({
  as: 'textarea',
  label: 'Bio',
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {},
});
```

