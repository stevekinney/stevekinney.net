---
title: Styling Types: csstype, CSS Modules, and Inline Styles
description: Type your styles—inline style objects, CSS Modules declarations, and styled-system props without any escapes.
date: 2025-09-06T22:04:44.932Z
modified: 2025-09-06T22:04:44.932Z
published: true
tags: ['react', 'typescript', 'styling', 'css-type', 'css-modules', 'css']
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

### Basic csstype Usage

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

## CSS Modules with TypeScript

CSS Modules provide scoped styling, but by default, you lose type safety. Here's how to fix that.

### Setting Up Typed CSS Modules

First, create a type declaration file for CSS modules. Create `src/types/css-modules.d.ts`:

```ts
// src/types/css-modules.d.ts
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
```

### Generating Types from CSS Files

For even better type safety, you can use [`typescript-plugin-css-modules`](https://www.npmjs.com/package/typescript-plugin-css-modules) or [`css-modules-typescript-loader`](https://www.npmjs.com/package/css-modules-typescript-loader) to generate types from your actual CSS files.

With Vite, you can use [`vite-plugin-css-modules-typescript`](https://www.npmjs.com/package/vite-plugin-css-modules-typescript):

```bash
npm install -D vite-plugin-css-modules-typescript
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssModulesTypescript from 'vite-plugin-css-modules-typescript';

export default defineConfig({
  plugins: [react(), cssModulesTypescript()],
});
```

Now your CSS modules get proper type checking:

```css
/* Card.module.css */
.container {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.content {
  color: #6b7280;
  line-height: 1.6;
}
```

```tsx
// Card.tsx
import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.content}>{children}</div>
      {/* styles.invalidClass would be a TypeScript error! */}
    </div>
  );
};

export default Card;
```

### CSS Modules with Custom Properties

CSS custom properties (CSS variables) work great with TypeScript when typed properly:

```css
/* Theme.module.css */
.container {
  --primary-color: #3b82f6;
  --secondary-color: #6b7280;
  --border-radius: 0.375rem;
  --spacing-unit: 1rem;
}

.button {
  background-color: var(--primary-color);
  border-radius: var(--border-radius);
  padding: calc(var(--spacing-unit) * 0.75) var(--spacing-unit);
}
```

```tsx
// ThemeProvider.tsx
import React from 'react';
import styles from './Theme.module.css';

interface ThemeProps {
  primaryColor?: string;
  secondaryColor?: string;
  borderRadius?: string;
  spacingUnit?: string;
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProps> = ({
  primaryColor,
  secondaryColor,
  borderRadius,
  spacingUnit,
  children,
}) => {
  const customProperties: CSSProperties = {
    '--primary-color': primaryColor,
    '--secondary-color': secondaryColor,
    '--border-radius': borderRadius,
    '--spacing-unit': spacingUnit,
  } as CSSProperties; // Type assertion needed for CSS custom properties

  return (
    <div className={styles.container} style={customProperties}>
      {children}
    </div>
  );
};
```

> [!NOTE]
> CSS custom properties require a type assertion to `CSSProperties` because TypeScript doesn't know about arbitrary `--*` properties by default.

## Advanced Styling Patterns

### Styled System Props

Building a design system often involves style props that map to CSS properties. Here's a typed approach:

```ts
import { CSSProperties } from 'react';
import { Property } from 'csstype';

// Define your design tokens
type SpacingScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
type ColorScale = 'gray-50' | 'gray-100' | 'blue-500' | 'red-500' | 'green-500';

interface SpacingProps {
  m?: SpacingScale; // margin
  p?: SpacingScale; // padding
  mt?: SpacingScale; // margin-top
  mb?: SpacingScale; // margin-bottom
  ml?: SpacingScale; // margin-left
  mr?: SpacingScale; // margin-right
  pt?: SpacingScale; // padding-top
  pb?: SpacingScale; // padding-bottom
  pl?: SpacingScale; // padding-left
  pr?: SpacingScale; // padding-right
}

interface ColorProps {
  color?: ColorScale;
  bg?: ColorScale; // background-color
}

interface FlexProps {
  display?: 'flex' | 'inline-flex';
  direction?: Property.FlexDirection;
  justify?: Property.JustifyContent;
  align?: Property.AlignItems;
  wrap?: Property.FlexWrap;
}

type StyledSystemProps = SpacingProps & ColorProps & FlexProps;

// Utility function to convert props to CSS
const getSpacingValue = (value: SpacingScale): string => `${value * 0.25}rem`;
const getColorValue = (value: ColorScale): string => {
  const colors = {
    'gray-50': '#f9fafb',
    'gray-100': '#f3f4f6',
    'blue-500': '#3b82f6',
    'red-500': '#ef4444',
    'green-500': '#10b981',
  };
  return colors[value];
};

const createStylesFromProps = (props: StyledSystemProps): CSSProperties => {
  const styles: CSSProperties = {};

  // Spacing
  if (props.m !== undefined) styles.margin = getSpacingValue(props.m);
  if (props.p !== undefined) styles.padding = getSpacingValue(props.p);
  if (props.mt !== undefined) styles.marginTop = getSpacingValue(props.mt);
  if (props.mb !== undefined) styles.marginBottom = getSpacingValue(props.mb);
  if (props.ml !== undefined) styles.marginLeft = getSpacingValue(props.ml);
  if (props.mr !== undefined) styles.marginRight = getSpacingValue(props.mr);
  if (props.pt !== undefined) styles.paddingTop = getSpacingValue(props.pt);
  if (props.pb !== undefined) styles.paddingBottom = getSpacingValue(props.pb);
  if (props.pl !== undefined) styles.paddingLeft = getSpacingValue(props.pl);
  if (props.pr !== undefined) styles.paddingRight = getSpacingValue(props.pr);

  // Colors
  if (props.color) styles.color = getColorValue(props.color);
  if (props.bg) styles.backgroundColor = getColorValue(props.bg);

  // Flexbox
  if (props.display) styles.display = props.display;
  if (props.direction) styles.flexDirection = props.direction;
  if (props.justify) styles.justifyContent = props.justify;
  if (props.align) styles.alignItems = props.align;
  if (props.wrap) styles.flexWrap = props.wrap;

  return styles;
};

// Styled component using the system
interface BoxProps extends StyledSystemProps {
  children?: React.ReactNode;
  className?: string;
}

const Box: React.FC<BoxProps> = ({ children, className, ...styleProps }) => {
  const styles = createStylesFromProps(styleProps);

  return (
    <div className={className} style={styles}>
      {children}
    </div>
  );
};

// Usage with full type safety
const ExampleLayout = () => (
  <Box
    display="flex"
    direction="column"
    p={4}
    bg="gray-50"
    // gap={2} // ❌ Would be a TypeScript error - not defined in our props
  >
    <Box p={2} bg="blue-500" color="gray-50">
      Header
    </Box>
    <Box p={2} bg="gray-100">
      Content
    </Box>
  </Box>
);
```

### Runtime Style Validation with Zod

For cases where styles come from external sources (APIs, user input), you can validate them at runtime:

```ts
import { z } from 'zod';
import { Property } from 'csstype';

// Create Zod schemas for CSS properties
const DisplaySchema = z.enum(['block', 'inline', 'flex', 'grid', 'none']);
const ColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$|^[a-zA-Z]+$/);
const SpacingSchema = z.string().regex(/^\d+(px|rem|em|%)$/);

const StyleSchema = z.object({
  display: DisplaySchema.optional(),
  color: ColorSchema.optional(),
  backgroundColor: ColorSchema.optional(),
  padding: SpacingSchema.optional(),
  margin: SpacingSchema.optional(),
  borderRadius: SpacingSchema.optional(),
});

type ValidatedStyle = z.infer<typeof StyleSchema>;

interface DynamicStyledComponentProps {
  children: React.ReactNode;
  styleConfig: unknown; // Coming from API/user input
}

const DynamicStyledComponent: React.FC<DynamicStyledComponentProps> = ({
  children,
  styleConfig
}) => {
  const parseResult = StyleSchema.safeParse(styleConfig);

  if (!parseResult.success) {
    console.warn('Invalid style configuration:', parseResult.error.errors);
    return <div>{children}</div>;
  }

  const validStyles: CSSProperties = parseResult.data;

  return (
    <div style={validStyles}>
      {children}
    </div>
  );
};
```

## Real-World Tradeoffs

### Performance Considerations

- **Inline styles**: Create new objects on each render, potentially causing unnecessary re-renders. Consider memoization for complex styles:

```tsx
const ComplexComponent: React.FC<Props> = ({ theme, size }) => {
  const styles = useMemo(
    (): CSSProperties => ({
      backgroundColor: theme.primaryColor,
      padding: theme.spacing[size],
      borderRadius: theme.borderRadius,
    }),
    [theme.primaryColor, theme.spacing, size, theme.borderRadius],
  );

  return <div style={styles}>Content</div>;
};
```

- **CSS Modules**: Better performance than inline styles, but requires build-time processing and can increase bundle size if not tree-shaken properly.

### Maintenance Trade-offs

- **Type safety vs. flexibility**: Strict typing catches errors but can make dynamic styling more complex.
- **Build complexity**: Typed CSS modules require additional tooling but provide better developer experience.
- **Bundle size**: csstype adds minimal runtime overhead but increases TypeScript compilation time.

### Developer Experience

The sweet spot often involves:

- CSS Modules for component-specific styles
- Typed inline styles for dynamic/conditional styling
- Design system props for layout and spacing
- Runtime validation only for user-generated or external style data

## What's Next?

With typed styles in your toolkit, you're ready to build maintainable, type-safe React applications. Consider exploring:

- **CSS-in-JS libraries** like [Emotion](https://emotion.sh) or [Styled Components](https://styled-components.com) with TypeScript
- **Design system libraries** like [Chakra UI](https://chakra-ui.com) or [Mantine](https://mantine.dev) for inspiration on typed component APIs
- **Build tools** that generate types from your CSS automatically

Remember: the goal isn't to type every possible CSS property, but to create predictable, maintainable styling patterns that scale with your application and team.
