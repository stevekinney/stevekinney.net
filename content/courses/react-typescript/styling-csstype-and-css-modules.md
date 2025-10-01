---
title: Styling Csstype And Css Modules
description: >-
  Styling in React with TypeScript doesn't have to feel like a constant battle
  with the type checker. Whether you're using inline styles, CSS Modules, or
  building a design system, TypeScript can actually make your styling more
  robust and d...
modified: '2025-09-06T17:49:18-06:00'
date: '2025-09-06T17:49:18-06:00'
---

Styling in React with TypeScript doesn't have to feel like a constant battle with the type checker. Whether you're using inline styles, CSS Modules, or building a design system, TypeScript can actually make your styling more robust and developer-friendly. Let's explore how to properly type your styles using `csstype`, CSS Modules, and inline style patterns that scale.

## The Challenge with Styling and TypeScript

When you're styling React components, you often find yourself in one of these situations:

- Writing inline styles and wondering what properties are actually valid
- Using CSS Modules and losing type safety between your CSS and TypeScript
- Building design system components where style props need strict typing
- Getting frustrated with `any` escapes just to make the type checker happy

The good news? TypeScript's ecosystem has evolved sophisticated tools to handle all of these scenarios gracefully.

## Enter csstype: The Foundation

The [`csstype`](https://www.npmjs.com/package/csstype) package provides comprehensive TypeScript definitions for all CSS properties and values. It's what React's built-in `CSSProperties` type is based on, and understanding it unlocks better styling patterns.

```bash
npm install csstype
```

### Basic `csstype` Usage

At its simplest, `csstype` gives you precise types for CSS properties:

```ts
import { Property } from 'csstype';

// ✅ Specific property types
const borderRadius: Property.BorderRadius = '8px';
const display: Property.Display = 'flex';
const color: Property.Color = '#3b82f6';

// ❌ TypeScript will catch invalid values
// const invalidDisplay: Property.Display = 'invalid'; // Type error!
```

This is already more precise than using `string` everywhere, but the real power comes when building reusable components.

## Typing Inline Styles Properly

React's `CSSProperties` is built on `csstype`, but you can extend it for more specific use cases:

```ts
import React from 'react';
import { CSSProperties } from 'react';

interface StyledBoxProps {
  children: React.ReactNode;
  style?: CSSProperties;
}

const StyledBox: React.FC<StyledBoxProps> = ({ children, style }) => {
  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: '8px',
        backgroundColor: '#f3f4f6',
        ...style, // User styles override defaults
      }}
    >
      {children}
    </div>
  );
};

// Usage with full type safety
<StyledBox
  style={{
    backgroundColor: '#3b82f6', // ✅ Valid
    padding: '2rem',           // ✅ Valid
    // invalidProp: 'value'    // ❌ Type error
  }}
>
  Content here
</StyledBox>
```

### Creating Custom Style Types

For design systems, you often want to restrict certain properties to specific values:

```ts
import { CSSProperties } from 'react';
import { Property } from 'csstype';

interface DesignSystemColors {
  primary: '#3b82f6';
  secondary: '#6b7280';
  success: '#10b981';
  warning: '#f59e0b';
  danger: '#ef4444';
}

interface ThemeSpacing {
  xs: '0.25rem';
  sm: '0.5rem';
  md: '1rem';
  lg: '1.5rem';
  xl: '2rem';
}

// Restrict certain CSS properties to design system values
interface RestrictedStyleProps {
  color?: keyof DesignSystemColors;
  backgroundColor?: keyof DesignSystemColors;
  padding?: keyof ThemeSpacing;
  margin?: keyof ThemeSpacing;
  // Allow other CSS properties without restriction
  [K in keyof Omit<CSSProperties, 'color' | 'backgroundColor' | 'padding' | 'margin'>]?: CSSProperties[K];
}

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  style?: RestrictedStyleProps;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', style }) => {
  const baseStyles: CSSProperties = {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: 600,
  };

  const variantStyles: Record<NonNullable<ButtonProps['variant']>, CSSProperties> = {
    primary: {
      backgroundColor: '#3b82f6',
      color: 'white',
    },
    secondary: {
      backgroundColor: '#6b7280',
      color: 'white',
    },
  };

  return (
    <button
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
};
```

