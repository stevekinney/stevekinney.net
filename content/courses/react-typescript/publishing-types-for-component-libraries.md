---
title: Publishing Types for Component Libraries
description: Ship library-quality types—d.ts output, stable public APIs, and semver discipline for React component kits.
date: 2025-09-06T22:04:45.049Z
modified: 2025-09-06T22:04:45.049Z
published: true
tags: ['react', 'typescript', 'publishing', 'component-libraries', 'types', 'npm']
---

Building a React component library isn't just about crafting beautiful, reusable components—it's about creating a delightful developer experience for the teams that will use your work. And nothing says "professional-grade library" quite like rock-solid TypeScript definitions that make autocomplete sing and catch bugs before they ship. Let's dive into how to publish types that'll make your users smile (instead of filing GitHub issues about broken intellisense).

By the end of this guide, you'll know how to configure TypeScript for library publishing, design stable public APIs, handle breaking changes with semver discipline, and ship type definitions that work seamlessly across different TypeScript versions.

## Why TypeScript Definitions Matter for Component Libraries

When you're building components for internal use, you can get away with some TypeScript shortcuts. But when you're publishing a library, your type definitions become part of your public API contract. Consumers depend on them for:

- **IDE autocomplete and intellisense** that helps them use your components correctly
- **Compile-time error checking** that catches integration issues early
- **Documentation** that's always up-to-date and embedded in their workflow
- **Confidence** that upgrades won't silently break their code

Think about how frustrating it is when a popular library has missing or incorrect types. Don't be that library.

## Setting Up TypeScript for Library Publishing

Let's start with the TypeScript configuration that'll generate clean, distributable type definitions. Your `tsconfig.json` needs to be configured differently than a typical application.

### Library-Focused TypeScript Configuration

```json
{
  "compilerOptions": {
    // Generate declaration files (.d.ts)
    "declaration": true,
    "declarationMap": true,

    // Output configuration
    "outDir": "./dist",
    "declarationDir": "./dist/types",

    // Modern target for libraries
    "target": "ES2018",
    "module": "ESNext",
    "moduleResolution": "node",

    // Strict mode for better type safety
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    // JSX configuration
    "jsx": "react-jsx",

    // Skip type checking of declaration files
    "skipLibCheck": true,

    // Ensure consistent casing
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts", "**/*.stories.tsx"]
}
```

The key settings here are `declaration: true` (generates `.d.ts` files) and `declarationMap: true` (enables go-to-definition in IDEs). The `declarationDir` keeps your types organized in a predictable location.

### Package.json Type Configuration

Your `package.json` needs to tell the world where to find your types:

```json
{
  "name": "my-component-library",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc && rollup -c",
    "prepublishOnly": "npm run build"
  }
}
```

The `types` field points to your main declaration file, while `exports` provides more granular control for modern tooling. The `prepublishOnly` script ensures you always publish fresh builds.

## Designing Your Public API Surface

The components you export and how you structure their props become your public API. Once published, changes to these interfaces can break your users' code—so design thoughtfully from the start.

### Explicit vs. Implicit Exports

Be intentional about what you export. Don't accidentally expose internal utilities:

```tsx
// ✅ Explicit, intentional exports
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';

// Export types that consumers might need
export type { ButtonProps } from './Button';
export type { InputProps } from './Input';
export type { ModalProps } from './Modal';

// ❌ Avoid star exports - they export everything
export * from './Button'; // This might export internal helpers
```

### Stable Prop Interfaces

Design your component props with future extensibility in mind:

```tsx
// ✅ Well-designed component props
interface ButtonProps {
  /** The button content */
  children: React.ReactNode;

  /** Button visual variant */
  variant?: 'primary' | 'secondary' | 'danger';

  /** Button size */
  size?: 'small' | 'medium' | 'large';

  /** Whether the button is disabled */
  disabled?: boolean;

  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;

  /** Additional CSS class names */
  className?: string;

  /** Forward HTML button attributes */
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>;
```

This pattern provides a clean interface while allowing HTML attributes to be passed through. The `Omit` ensures your typed `onClick` takes precedence over the generic HTML one.

### Using Generic Types Wisely

Generics make your components more flexible, but use them judiciously:

```tsx
// ✅ Good use of generics for data-driven components
interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

interface SelectProps<T = string> {
  options: SelectOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  placeholder?: string;
}

export function Select<T = string>({ options, value, onChange, placeholder }: SelectProps<T>) {
  // Implementation
}

// Usage allows for type-safe values
const numericSelect = (
  <Select<number>
    options={[
      { label: 'One', value: 1 },
      { label: 'Two', value: 2 },
    ]}
    onChange={(value) => {
      // value is correctly typed as number
      console.log(value * 2);
    }}
  />
);
```

## Handling Complex Prop Patterns

Real-world components often have complex prop relationships that need careful typing.

### Discriminated Unions for Variants

When props depend on each other, use discriminated unions:

```tsx
// ✅ Discriminated union ensures correct prop combinations
type ModalProps =
  | {
      type: 'dialog';
      title: string;
      onClose: () => void;
      children: React.ReactNode;
    }
  | {
      type: 'alert';
      message: string;
      onConfirm: () => void;
      confirmText?: string;
    }
  | {
      type: 'confirm';
      message: string;
      onConfirm: () => void;
      onCancel: () => void;
      confirmText?: string;
      cancelText?: string;
    };

export function Modal(props: ModalProps) {
  switch (props.type) {
    case 'dialog':
      // TypeScript knows props.title exists here
      return <DialogModal {...props} />;
    case 'alert':
      // TypeScript knows props.message exists here
      return <AlertModal {...props} />;
    case 'confirm':
      // TypeScript knows props.onCancel exists here
      return <ConfirmModal {...props} />;
  }
}
```

### Polymorphic Components

For components that can render as different HTML elements:

```tsx
// Polymorphic component that can render as different elements
type AsProp<C extends React.ElementType> = {
  as?: C;
};

type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);

type PolymorphicComponentProp<C extends React.ElementType, Props = {}> = React.PropsWithChildren<
  Props & AsProp<C>
> &
  Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;

interface BoxProps {
  variant?: 'filled' | 'outlined';
  padding?: 'small' | 'medium' | 'large';
}

export function Box<C extends React.ElementType = 'div'>({
  as,
  variant = 'filled',
  padding = 'medium',
  children,
  ...props
}: PolymorphicComponentProp<C, BoxProps>) {
  const Component = as || 'div';

  return (
    <Component className={`box box--${variant} box--${padding}`} {...props}>
      {children}
    </Component>
  );
}

// Usage with full type safety
const linkBox = (
  <Box
    as="a"
    href="/home" // TypeScript knows this is valid for anchor elements
    variant="outlined"
  >
    Click me
  </Box>
);
```

This pattern is complex but incredibly powerful—it's used by libraries like Chakra UI and Mantine for maximum flexibility.

## Build Configuration for Type Generation

Your build process needs to generate clean, distributable type definitions alongside your JavaScript bundles.

### TypeScript-First Build Process

Here's a robust build setup using TypeScript and Rollup:

```javascript
// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';

export default {
  input: 'src/index.ts',
  external: ['react', 'react-dom'],
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
  ],
  plugins: [
    peerDepsExternal(),
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist/types',
      exclude: ['**/*.test.ts', '**/*.stories.tsx'],
    }),
  ],
};
```

### Type-Only Exports

Sometimes you want to export types without any runtime code:

```tsx
// types/index.ts - pure type exports
export type { ButtonProps } from '../components/Button';
export type { InputProps } from '../components/Input';

// Utility types that might be useful to consumers
export type ComponentSize = 'small' | 'medium' | 'large';
export type ComponentVariant = 'primary' | 'secondary' | 'danger';

// src/index.ts - main entry point
export { Button } from './components/Button';
export { Input } from './components/Input';

// Re-export types for convenience
export type { ButtonProps, InputProps, ComponentSize, ComponentVariant } from './types';
```

## Semantic Versioning for Type Changes

Changes to your TypeScript definitions can break consuming code just like runtime changes. Follow semantic versioning strictly:

### Major Version Changes (Breaking)

These require a major version bump:

```tsx
// v1.0.0
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: (event: MouseEvent) => void;
}

// v2.0.0 - BREAKING: removed variant option
interface ButtonProps {
  variant: 'primary' | 'danger'; // ❌ 'secondary' removed
  onClick: (event: MouseEvent) => void;
}

// v2.0.0 - BREAKING: made required prop optional or vice versa
interface ButtonProps {
  variant?: 'primary' | 'secondary'; // ❌ Now optional
  onClick: (event: MouseEvent) => void;
  children: React.ReactNode; // ❌ Now required
}
```

### Minor Version Changes (Additive)

These can be minor versions:

```tsx
// v1.0.0
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: (event: MouseEvent) => void;
}

// v1.1.0 - SAFE: added optional prop
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: (event: MouseEvent) => void;
  disabled?: boolean; // ✅ New optional prop
}

// v1.2.0 - SAFE: added variant option
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger'; // ✅ Added option
  onClick: (event: MouseEvent) => void;
  disabled?: boolean;
}
```

### Patch Version Changes (Fixes)

Only for truly non-breaking improvements:

```tsx
// v1.0.0
interface ButtonProps {
  onClick: (event: Event) => void; // Too generic
}

// v1.0.1 - SAFE: more specific types (usually safe)
interface ButtonProps {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void; // ✅ More specific
}
```

> [!WARNING]
> Making types more specific can sometimes break code that depended on the looser types. Test thoroughly and consider if it warrants a major version.

## Testing Your Type Definitions

Don't forget to test your types! Type tests catch breaking changes before your users do.

### Type-Level Testing with tsd

Install `tsd` for type testing:

```bash
npm install --save-dev tsd
```

Create type tests in a `test-types` directory:

```tsx
// test-types/button.test-d.ts
import { expectType, expectError } from 'tsd';
import { Button, ButtonProps } from '../src';
import { ComponentPropsWithoutRef } from 'react';

// Test basic usage
expectType<JSX.Element>(
  <Button variant="primary" onClick={() => {}}>
    Click me
  </Button>,
);

// Test prop types
expectType<ButtonProps>({
  variant: 'primary',
  children: 'Test',
  onClick: () => {},
});

// Test that invalid variants are rejected
expectError(
  <Button variant="invalid" onClick={() => {}}>
    Should error
  </Button>,
);

// Test HTML attributes are forwarded
expectType<JSX.Element>(
  <Button variant="primary" onClick={() => {}} data-testid="button" className="custom-class">
    With HTML attrs
  </Button>,
);
```

Add to your `package.json`:

```json
{
  "scripts": {
    "test:types": "tsd",
    "test": "jest && npm run test:types"
  },
  "tsd": {
    "directory": "test-types"
  }
}
```

### Runtime vs. Type Testing

Remember to test both your runtime behavior and your types:

```tsx
// __tests__/Button.test.tsx - Runtime tests
import { render } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children correctly', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    const { getByRole } = render(<Button onClick={handleClick}>Click me</Button>);

    getByRole('button').click();
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Documentation and Examples

Great types are self-documenting, but examples help users understand the intended usage patterns.

### JSDoc Comments for Better DX

Use JSDoc comments to provide rich documentation that appears in IDE tooltips:

````tsx
interface TooltipProps {
  /**
   * Content to show inside the tooltip
   * @example
   * ```tsx
   * <Tooltip content="This explains something">
   *   <button>Hover me</button>
   * </Tooltip>
   * ```
   */
  content: React.ReactNode;

  /**
   * Placement of the tooltip relative to the trigger
   * @default 'top'
   */
  placement?: 'top' | 'right' | 'bottom' | 'left';

  /**
   * Whether to show an arrow pointing to the trigger
   * @default true
   */
  showArrow?: boolean;

  /**
   * Delay in milliseconds before showing tooltip
   * @default 200
   */
  delay?: number;
}
````

### README Type Examples

Include TypeScript examples in your README:

````markdown
## Basic Usage

```tsx
import { Button, ButtonProps } from 'my-component-library';

// Simple usage
<Button variant="primary" onClick={() => console.log('clicked')}>
  Click me
</Button>;

// With TypeScript
const handleClick: ButtonProps['onClick'] = (event) => {
  event.preventDefault();
  // Handle click
};

<Button variant="secondary" onClick={handleClick}>
  Type-safe button
</Button>;
```

## Advanced Usage

```tsx
// Polymorphic usage
<Button as="a" href="/home" variant="primary">
  Button as link
</Button>

// With generic types
<Select<number>
  options={[
    { label: 'One', value: 1 },
    { label: 'Two', value: 2 }
  ]}
  onChange={(value) => {
    // value is typed as number
  }}
/>
```
````

## Real-World Migration Strategies

When you need to make breaking changes, provide migration paths for your users.

### Deprecation Warnings

Use TypeScript's `@deprecated` JSDoc tag to warn about upcoming changes:

```tsx
interface ButtonProps {
  /**
   * @deprecated Use `variant` instead. Will be removed in v2.0.0
   * @example
   * // Before
   * <Button type="primary" />
   * // After
   * <Button variant="primary" />
   */
  type?: 'primary' | 'secondary';

  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ type, variant, ...props }: ButtonProps) {
  // Support both during transition
  const actualVariant = variant || type || 'primary';

  if (process.env.NODE_ENV === 'development' && type) {
    console.warn('Button: `type` prop is deprecated. Use `variant` instead.');
  }

  // Implementation using actualVariant
}
```

### Codemods for Breaking Changes

For major changes, consider providing codemods to help users migrate:

```javascript
// transform-button-type-to-variant.js
module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;

  return j(fileInfo.source)
    .find(j.JSXElement, {
      openingElement: { name: { name: 'Button' } },
    })
    .find(j.JSXAttribute, { name: { name: 'type' } })
    .forEach((path) => {
      path.node.name.name = 'variant';
    })
    .toSource();
};
```

## Wrapping Up

Publishing TypeScript definitions for component libraries isn't just about making your code compile—it's about creating a developer experience that feels intentional, predictable, and delightful. When you nail the types, you're not just preventing bugs; you're providing documentation, enabling better tooling, and building trust with your users.

The investment in proper type definitions pays dividends every time someone uses your library without having to dig through source code or file issues about confusing APIs. It's the difference between a library that people tolerate and one they recommend to their colleagues.

Start with strict TypeScript configurations, design your public APIs thoughtfully, test your types alongside your runtime code, and respect semantic versioning. Your future self (and your users) will thank you for the discipline.

Ready to level up your component library's type game? Start with your build configuration, add some type tests, and remember—every type error caught at compile time is a runtime bug that never makes it to production.
