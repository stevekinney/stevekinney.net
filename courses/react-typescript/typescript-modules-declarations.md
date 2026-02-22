---
title: Modules and Declaration Files for React
description: >-
  Master TypeScript's module system and declaration files in the context of
  React development
modified: '2025-09-27T13:49:32-06:00'
date: '2025-09-14T19:04:10.739Z'
---

Every React project eventually hits the "Cannot find module" error. Maybe it's that CSS-in-JS library without types, an image import that TypeScript doesn't understand, or a legacy JavaScript component you're trying to integrate. Declaration files are your escape hatch—they tell TypeScript about code it can't figure out on its own.

In React development, you'll encounter declaration files when:

- Importing CSS modules, images, or SVG files as components
- Using JavaScript libraries that don't ship with TypeScript definitions
- Extending global objects for analytics or feature flags
- Adding custom properties to React's built-in types
- Creating type-safe environment variables

Let's explore how to handle these scenarios with confidence.

## Asset Imports in React

The most common declaration files you'll write in React are for assets. TypeScript doesn't know what to do when you `import logo from './logo.svg'`—you need to tell it.

### CSS Modules

When using CSS modules for scoped styling:

```typescript
// types/css-modules.d.ts
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

// Now in your component:
import styles from './Button.module.css';

function Button() {
  return (
    <button className={styles.primary}>
      {/* TypeScript knows styles.primary is a string */}
    </button>
  );
}
```

**Real-world tip**: Some tools like `typed-css-modules` can generate specific types for your CSS modules, giving you autocomplete for actual class names.

### SVG as React Components

Many React apps import SVGs as components for better control:

```typescript
// types/assets.d.ts
declare module '*.svg' {
  import React from 'react';
  const SVG: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVG;
}

declare module '*.svg?react' {  // Vite's syntax
  import React from 'react';
  const SVG: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVG;
}

// Usage:
import Logo from './logo.svg';
// or with Vite:
import Logo from './logo.svg?react';

function Header() {
  return <Logo width={40} height={40} fill="currentColor" />;
}
```

### Image Imports

For optimized image loading:

```typescript
// types/images.d.ts
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.webp' {
  const value: string;
  export default value;
}

// For Next.js static imports:
declare module '*.png' {
  import { StaticImageData } from 'next/image';
  const content: StaticImageData;
  export default content;
}
```

## Working with Untyped Libraries

Not every library ships with TypeScript definitions. Here's how to handle them:

### Quick Fix: Basic Declaration

```typescript
// types/untyped-libs.d.ts
declare module 'old-carousel-library' {
  export default class Carousel {
    constructor(element: HTMLElement, options?: any);
    next(): void;
    prev(): void;
    goTo(index: number): void;
    destroy(): void;
  }
}

// Now you can use it:
import Carousel from 'old-carousel-library';

function ImageGallery() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const carousel = new Carousel(ref.current, {
        autoplay: true,
        duration: 5000
      });
      return () => carousel.destroy();
    }
  }, []);

  return <div ref={ref}>...</div>;
}
```

### Better: Detailed Types

For libraries you use extensively, invest in better types:

```typescript
// types/analytics-lib.d.ts
declare module 'analytics-lib' {
  export interface AnalyticsOptions {
    debug?: boolean;
    endpoint?: string;
    bufferSize?: number;
    flushInterval?: number;
  }

  export interface EventProperties {
    [key: string]: string | number | boolean | null;
    timestamp?: string;
    userId?: string;
    sessionId?: string;
  }

  export interface PageViewProperties extends EventProperties {
    url: string;
    title?: string;
    referrer?: string;
    path?: string;
  }

  export class Analytics {
    constructor(apiKey: string, options?: AnalyticsOptions);

    track(eventName: string, properties?: EventProperties): Promise<void>;
    page(properties?: PageViewProperties): Promise<void>;
    identify(userId: string, traits?: Record<string, any>): Promise<void>;
    reset(): void;
  }

  const analytics: Analytics;
  export default analytics;
}
```

## Global Objects in React Apps

Many React apps need to extend the global window object for analytics, feature flags, or third-party scripts:

```typescript
// types/global.d.ts
declare global {
  interface Window {
    // Google Analytics
    gtag?: (
      command: 'config' | 'event',
      targetId: string,
      config?: Record<string, any>
    ) => void;

    // Feature flags
    __FEATURES__?: {
      darkMode: boolean;
      betaFeatures: boolean;
      analyticsEnabled: boolean;
    };

    // Stripe
    Stripe?: (publicKey: string) => {
      redirectToCheckout: (options: any) => Promise<{ error?: any }>;
    };

    // Dev tools
    __REDUX_DEVTOOLS_EXTENSION__?: () => any;
  }
}

export {}; // Make this a module

// Usage in your React app:
function PaymentButton() {
  const handlePayment = async () => {
    if (window.Stripe) {
      const stripe = window.Stripe('pk_test_...');
      await stripe.redirectToCheckout({ sessionId: '...' });
    }
  };

  return <button onClick={handlePayment}>Pay Now</button>;
}
```

## React Component Type Declarations

When creating declaration files for React components (common when wrapping JavaScript components), you need to handle different component patterns:

```typescript
// types/ui-library.d.ts
declare module '@company/ui-library' {
  import { ComponentType, ReactNode, MouseEvent, ForwardRefExoticComponent, RefAttributes } from 'react';

  // Basic component
  export interface ButtonProps {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
    className?: string;
    'data-testid'?: string;
  }

  export const Button: ComponentType<ButtonProps>;

  // ForwardRef component for DOM access
  export interface InputProps {
    label?: string;
    error?: string;
    helperText?: string;
    required?: boolean;
    onChange?: (value: string) => void;
  }

  export const Input: ForwardRefExoticComponent<
    InputProps & RefAttributes<HTMLInputElement>
  >;

  // Component with static properties
  export interface ModalProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
  }

  export const Modal: ComponentType<ModalProps> & {
    Header: ComponentType<{ children: ReactNode }>;
    Body: ComponentType<{ children: ReactNode }>;
    Footer: ComponentType<{ children: ReactNode }>;
  };

  // Hook exports
  export function useToast(): {
    show: (message: string, options?: { duration?: number; type?: 'success' | 'error' }) => void;
    hide: () => void;
  };
}

// Usage in your app:
import { Button, Modal, useToast } from '@company/ui-library';

function App() {
  const toast = useToast();

  return (
    <Modal open={true} onClose={() => {}}>
      <Modal.Header>Title</Modal.Header>
      <Modal.Body>Content</Modal.Body>
      <Modal.Footer>
        <Button onClick={() => toast.show('Saved!', { type: 'success' })}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
```

## Extending React's Built-in Types

Sometimes you need to extend React's own types to support CSS custom properties, additional HTML attributes, or library-specific props:

### CSS Custom Properties

```typescript
// types/css-properties.d.ts
import 'react';

declare module 'react' {
  interface CSSProperties {
    // CSS Custom Properties (CSS Variables)
    '--primary-color'?: string;
    '--spacing'?: string | number;
    '--animation-duration'?: string;

    // CSS-in-JS libraries often use these
    [key: `--${string}`]: string | number | undefined;
  }
}

// Now you can use CSS variables in style prop:
function ThemedButton() {
  return (
    <button
      style={{
        '--primary-color': '#007bff',
        '--spacing': '1rem',
        backgroundColor: 'var(--primary-color)',
        padding: 'var(--spacing)'
      }}
    >
      Click me
    </button>
  );
}
```

### Custom HTML Attributes

For data attributes, ARIA extensions, or third-party integrations:

```typescript
// types/html-attributes.d.ts
declare module 'react' {
  interface HTMLAttributes<T> {
    // Intersection Observer attributes
    'data-lazy-src'?: string;
    'data-lazy-load'?: boolean;

    // Analytics attributes
    'data-track-event'?: string;
    'data-track-category'?: string;
    'data-track-label'?: string;

    // Testing attributes
    'data-cy'?: string;  // Cypress
    'data-test'?: string;  // Generic testing
  }
}

// Usage:
function TrackedButton() {
  return (
    <button
      data-track-event="click"
      data-track-category="engagement"
      data-cy="submit-button"
    >
      Submit
    </button>
  );
}
```

## Environment Variables and Build-Time Constants

React apps often use environment variables for configuration. Here's how to type them:

### Create React App / Standard Process.env

```typescript
// types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    // Required variables
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly REACT_APP_API_URL: string;
    readonly REACT_APP_AUTH_DOMAIN: string;

    // Optional variables
    readonly REACT_APP_SENTRY_DSN?: string;
    readonly REACT_APP_GA_TRACKING_ID?: string;
    readonly REACT_APP_FEATURE_FLAGS?: string;
  }
}

// Usage with type safety:
const apiUrl = process.env.REACT_APP_API_URL; // string
const isDev = process.env.NODE_ENV === 'development'; // boolean

// TypeScript will error if you typo:
// process.env.REACT_APP_API_ULR // Error: Property doesn't exist
```

### Vite Environment Variables

```typescript
// types/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_AUTH_DOMAIN: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly MODE: 'development' | 'production' | 'staging';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Usage:
const apiUrl = import.meta.env.VITE_API_URL;
const isProduction = import.meta.env.MODE === 'production';
```

**Real-world tip**: Use a validation library like Zod to validate environment variables at runtime:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_AUTH_DOMAIN: z.string(),
  VITE_ENABLE_ANALYTICS: z.enum(['true', 'false']).optional(),
});

export const env = envSchema.parse(import.meta.env);
```

## Typing Popular React Libraries Without Types

Here are real-world examples of typing libraries commonly used in React projects:

### React Markdown Editor

```typescript
// types/markdown-editor.d.ts
declare module 'react-markdown-editor-lite' {
  import { Component, ReactNode } from 'react';

  export interface EditorProps {
    value?: string;
    defaultValue?: string;
    onChange?: (data: { text: string; html: string }) => void;
    onImageUpload?: (file: File) => Promise<string>;
    style?: React.CSSProperties;
    height?: number | string;
    view?: {
      menu?: boolean;
      md?: boolean;
      html?: boolean;
    };
    canView?: {
      menu?: boolean;
      md?: boolean;
      html?: boolean;
      fullScreen?: boolean;
      hideMenu?: boolean;
    };
    plugins?: string[];
    renderHTML?: (text: string) => string;
    placeholder?: string;
    readOnly?: boolean;
  }

  export default class MdEditor extends Component<EditorProps> {
    getMdValue(): string;
    getHtmlValue(): string;
    clear(): void;
  }
}

// Usage:
import MdEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';

function BlogEditor() {
  const [content, setContent] = useState('');

  return (
    <MdEditor
      value={content}
      style={{ height: '500px' }}
      onChange={({ text }) => setContent(text)}
      onImageUpload={async (file) => {
        const url = await uploadImage(file);
        return url;
      }}
    />
  );
}
```

### Chart Library

```typescript
// types/charts.d.ts
declare module 'react-simple-charts' {
  import { ComponentType, ReactNode } from 'react';

  interface ChartProps {
    data: Array<{ x: number | string; y: number }>;
    width?: number;
    height?: number;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
    color?: string | ((d: any) => string);
  }

  interface TooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
    formatter?: (value: number) => string;
  }

  export const LineChart: ComponentType<
    ChartProps & {
      curve?: 'linear' | 'monotone' | 'step';
      strokeWidth?: number;
    }
  >;

  export const BarChart: ComponentType<
    ChartProps & {
      barGap?: number;
      barCategoryGap?: number;
    }
  >;

  export const Tooltip: ComponentType<TooltipProps>;
  export const Legend: ComponentType<{ align?: 'left' | 'center' | 'right' }>;
  export const XAxis: ComponentType<{ dataKey?: string; label?: string }>;
  export const YAxis: ComponentType<{ label?: string; domain?: [number, number] }>;
}
```

### Form Validation Library

```typescript
// types/form-validator.d.ts
declare module 'react-form-validator' {
  import { ComponentType, ReactElement } from 'react';

  export interface ValidationRule {
    rule: RegExp | ((value: any) => boolean);
    message: string;
  }

  export interface FormProps {
    onSubmit: (values: Record<string, any>) => void | Promise<void>;
    onError?: (errors: Record<string, string>) => void;
    children: ReactElement | ReactElement[];
  }

  export interface FieldProps {
    name: string;
    rules?: ValidationRule[];
    children: (props: {
      value: any;
      error?: string;
      onChange: (value: any) => void;
      onBlur: () => void;
    }) => ReactElement;
  }

  export const Form: ComponentType<FormProps>;
  export const Field: ComponentType<FieldProps>;

  export function useFormState(): {
    values: Record<string, any>;
    errors: Record<string, string>;
    isValid: boolean;
    isDirty: boolean;
    reset: () => void;
  };
}
```

## Publishing React Component Libraries with Types

If you're building a React component library, here's how to configure types correctly:

```json
{
  "name": "@company/react-ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.esm.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js"
    },
    "./styles": "./dist/styles.css"
  },
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0"
  },
  "files": ["dist", "README.md"]
}
```

**Pro tip**: Use `peerDependencies` for React to avoid version conflicts. Include types in `devDependencies` but not in regular dependencies.

## Using @types Packages in React Projects

Most popular React libraries have community-maintained types:

```bash
# Essential types for React projects
npm install --save-dev \
  @types/react \
  @types/react-dom \
  @types/node

# Common library types
npm install --save-dev \
  @types/react-router-dom \
  @types/styled-components \
  @types/jest \
  @types/testing-library__react
```

**Finding types for a library**:

1. Try installing `@types/package-name`
2. Check if the package includes its own types (look for "types" in package.json)
3. Search on [TypeSearch](https://www.typescriptlang.org/dt/search)
4. Create your own declaration file if needed

### When @types Packages Conflict

Sometimes @types packages have version mismatches:

```typescript
// types/overrides.d.ts
// Override conflicting types
declare module 'react-router-dom' {
  // Fix for @types/react-router-dom not matching your version
  export function useParams<T = Record<string, string>>(): T;
}
```

## Advanced Typing Patterns for React Libraries

### Polymorphic Component Types

For component libraries that support the `as` prop:

```typescript
// types/polymorphic-lib.d.ts
declare module 'polymorphic-ui' {
  import { ComponentPropsWithRef, ElementType, ReactElement } from 'react';

  type PolymorphicProps<C extends ElementType, Props = {}> = Props &
    Omit<ComponentPropsWithRef<C>, keyof Props | 'as'> & {
      as?: C;
    };

  export function Box<C extends ElementType = 'div'>(
    props: PolymorphicProps<C, { padding?: string; margin?: string }>
  ): ReactElement | null;

  export function Text<C extends ElementType = 'span'>(
    props: PolymorphicProps<C, { size?: 'small' | 'medium' | 'large' }>
  ): ReactElement | null;
}

// Usage:
import { Box, Text } from 'polymorphic-ui';

<Box as="section" padding="2rem" onClick={(e) => {}}>
  <Text as="h1" size="large">Title</Text>
</Box>
```

### Render Prop Libraries

```typescript
// types/render-prop-lib.d.ts
declare module 'react-intersection-observer' {
  import { ReactNode } from 'react';

  export interface IntersectionOptions {
    root?: Element | null;
    rootMargin?: string;
    threshold?: number | number[];
    triggerOnce?: boolean;
  }

  export interface IntersectionObserverProps extends IntersectionOptions {
    children: (props: {
      inView: boolean;
      ref: (node?: Element | null) => void;
      entry?: IntersectionObserverEntry;
    }) => ReactNode;
    onChange?: (inView: boolean, entry: IntersectionObserverEntry) => void;
  }

  export function InView(props: IntersectionObserverProps): JSX.Element;

  export function useInView(options?: IntersectionOptions): {
    ref: (node?: Element | null) => void;
    inView: boolean;
    entry?: IntersectionObserverEntry;
  };
}
```

## Dynamic Imports and Code Splitting in React

TypeScript needs to understand your lazy-loaded components:

### React.lazy with TypeScript

```typescript
// types/routes.d.ts
declare module '@/routes' {
  import { ComponentType, LazyExoticComponent } from 'react';

  export interface RouteConfig {
    path: string;
    exact?: boolean;
    component: LazyExoticComponent<ComponentType<any>>;
    preload?: () => Promise<void>;
  }

  export const routes: RouteConfig[];
}

// routes/index.ts
import { lazy } from 'react';
import type { RouteConfig } from '@/routes';

const HomePage = lazy(() => import('./HomePage'));
const ProfilePage = lazy(() => import('./ProfilePage'));
const SettingsPage = lazy(() => import('./SettingsPage'));

export const routes: RouteConfig[] = [
  {
    path: '/',
    exact: true,
    component: HomePage,
    preload: () => import('./HomePage')
  },
  {
    path: '/profile',
    component: ProfilePage,
    preload: () => import('./ProfilePage')
  },
  {
    path: '/settings',
    component: SettingsPage,
    preload: () => import('./SettingsPage')
  }
];

// Usage in App:
import { Suspense } from 'react';
import { routes } from '@/routes';

function App() {
  return (
    <Suspense fallback={<Loading />}>
      {routes.map(({ path, component: Component }) => (
        <Route key={path} path={path} element={<Component />} />
      ))}
    </Suspense>
  );
}
```

### Dynamic Component Imports

```typescript
// For dynamically importing components based on strings
declare module '@/components/icons/*.svg' {
  import { FC, SVGProps } from 'react';
  const Icon: FC<SVGProps<SVGSVGElement>>;
  export default Icon;
}

// Helper for dynamic imports
async function loadIcon(name: string) {
  const module = await import(`@/components/icons/${name}.svg`);
  return module.default;
}

// With type safety:
type IconName = 'user' | 'settings' | 'logout';

const iconLoaders: Record<IconName, () => Promise<any>> = {
  user: () => import('@/components/icons/user.svg'),
  settings: () => import('@/components/icons/settings.svg'),
  logout: () => import('@/components/icons/logout.svg'),
};
```

## Platform-Specific Types (Web vs React Native)

```typescript
// index.d.ts
export interface ComponentProps {
  title: string;
  onPress?: () => void;
}

// index.native.d.ts
import { ViewStyle } from 'react-native';

export interface ComponentProps {
  title: string;
  onPress?: () => void;
  style?: ViewStyle; // React Native specific
}

// index.web.d.ts
import { CSSProperties } from 'react';

export interface ComponentProps {
  title: string;
  onClick?: () => void; // Web uses onClick
  style?: CSSProperties; // Web CSS
}
```

## Testing Component Type Declarations

When creating type declarations for React components, test them to ensure they work correctly:

```typescript
// types/__tests__/component-types.test.tsx
import { expectType, expectError } from 'tsd';
import { Button, Input, Modal } from '@company/ui-library';

// Test basic props
expectType<JSX.Element>(
  <Button variant="primary" onClick={() => {}}>Click</Button>
);

// Test that invalid props error
expectError(
  // @ts-expect-error: invalid variant
  <Button variant="invalid">Click</Button>
);

// Test ref forwarding
const inputRef = useRef<HTMLInputElement>(null);
expectType<JSX.Element>(
  <Input ref={inputRef} label="Name" />
);

// Test compound components
expectType<JSX.Element>(
  <Modal open={true} onClose={() => {}}>
    <Modal.Header>Title</Modal.Header>
    <Modal.Body>Content</Modal.Body>
  </Modal>
);

// Runtime type checking in tests
test('Button renders with correct props', () => {
  const { getByRole } = render(
    <Button variant="primary" data-testid="test-button">
      Click me
    </Button>
  );

  expect(getByRole('button')).toBeInTheDocument();
});
```

## Best Practices for React Type Declarations

### Organize Your Type Files

```
src/
  types/
    assets.d.ts      // SVG, images, CSS modules
    env.d.ts          // Environment variables
    global.d.ts       // Window object, global functions
    modules.d.ts      // Third-party libraries without types
    augmentations.d.ts // Extensions to existing types
```

### Use Type-Only Imports for Better Performance

```typescript
// ✅ Good: Type-only imports are removed in production
import type { User, Post } from './types';
import { getUser, getPost } from './api';

// ❌ Bad: Imports the entire module even if only using types
import { User, getUser } from './api';
```

### Configure Path Aliases for Clean Imports

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/components/*": ["components/*"],
      "@/hooks/*": ["hooks/*"],
      "@/utils/*": ["utils/*"],
      "@/types/*": ["types/*"],
      "@/assets/*": ["assets/*"]
    }
  }
}

// vite.config.ts (if using Vite)
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### Type React Context Properly

```typescript
// types/auth-context.d.ts
declare module '@/contexts/auth' {
  export interface User {
    id: string;
    email: string;
    name: string;
  }

  export interface AuthContextValue {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
  }

  export const AuthContext: React.Context<AuthContextValue | undefined>;
  export const useAuth: () => AuthContextValue;
  export const AuthProvider: React.FC<{ children: React.ReactNode }>;
}
```

### Version Your Types with Your Components

```typescript
// When breaking changes occur, export versioned types
export interface ButtonPropsV1 {
  label: string;
  onClick: () => void;
}

export interface ButtonProps {
  children: ReactNode; // Breaking change from v1
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

// For migration period
export type ButtonPropsCompat = ButtonPropsV1 | ButtonProps;
```

## Common React TypeScript Issues and Solutions

### "Cannot find module" for CSS/Images

```typescript
// Quick fix: Create declarations
// types/assets.d.ts
declare module '*.module.css';
declare module '*.png';
declare module '*.svg';

// Better: Add specific types
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
```

### React 18 Types Conflicts

```typescript
// If you see errors with React 18 types:
// 1. Update all @types packages together
npm update @types/react @types/react-dom

// 2. Ensure consistent versions in package.json
"devDependencies": {
  "@types/react": "^18.0.0",
  "@types/react-dom": "^18.0.0"
}

// 3. Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### JSX Element Type Errors

```typescript
// Error: JSX element type 'Component' does not have any construct or call signatures

// Fix: Ensure proper export/import
// ❌ Wrong
declare module 'my-lib' {
  const Component: any; // Too vague
}

// ✅ Correct
declare module 'my-lib' {
  import { ComponentType } from 'react';
  export const Component: ComponentType<{ title: string }>;
}
```

### Props Type Inference Issues

```typescript
// When TypeScript can't infer prop types:

// ❌ Problem: Generic component loses type
const MyComponent = <T,>(props: T) => <div />;

// ✅ Solution: Add extends constraint
const MyComponent = <T extends Record<string, any>>(
  props: T
) => <div />;

// Or use function declaration
function MyComponent<T>(props: T) {
  return <div />;
}
```

## Real-World React Declaration Examples

### Typing a Headless UI Component

```typescript
// types/headless-ui.d.ts
declare module '@company/headless-ui' {
  import { ReactNode, Dispatch, SetStateAction } from 'react';

  export interface UseDisclosureReturn {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
  }

  export function useDisclosure(defaultOpen?: boolean): UseDisclosureReturn;

  export interface UseClickOutsideOptions {
    enabled?: boolean;
    handler: (event: MouseEvent | TouchEvent) => void;
  }

  export function useClickOutside<T extends HTMLElement>(
    ref: React.RefObject<T>,
    options: UseClickOutsideOptions,
  ): void;

  export interface UseFocusTrapOptions {
    enabled?: boolean;
    initialFocus?: React.RefObject<HTMLElement>;
    finalFocus?: React.RefObject<HTMLElement>;
  }

  export function useFocusTrap<T extends HTMLElement>(
    ref: React.RefObject<T>,
    options?: UseFocusTrapOptions,
  ): void;
}
```

### Typing a Form Library Integration

```typescript
// types/form-library.d.ts
declare module 'react-hook-form-helpers' {
  import { UseFormReturn, FieldValues, Path } from 'react-hook-form';
  import { ReactElement } from 'react';

  export interface FormFieldProps<TFieldValues extends FieldValues> {
    name: Path<TFieldValues>;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
  }

  export function FormField<TFieldValues extends FieldValues>(
    props: FormFieldProps<TFieldValues> & {
      form: UseFormReturn<TFieldValues>;
    },
  ): ReactElement;

  export function FormProvider<TFieldValues extends FieldValues>(props: {
    form: UseFormReturn<TFieldValues>;
    children: ReactNode;
  }): ReactElement;
}
```

## Summary

Declaration files are your bridge between the TypeScript world and the vast ecosystem of JavaScript libraries, assets, and global objects in React applications. You'll use them to:

1. **Import non-JavaScript assets** - CSS modules, images, SVGs as React components
2. **Type JavaScript libraries** - Create types for libraries that don't ship with TypeScript definitions
3. **Extend React's types** - Add CSS custom properties, data attributes, and library-specific augmentations
4. **Handle environment variables** - Create type-safe access to build-time configuration
5. **Support dynamic imports** - Type lazy-loaded components and code-split modules

Most React projects need just a few declaration files in a `types/` folder. Start simple with basic declarations when you hit "Cannot find module" errors, then progressively enhance them as you learn more about the libraries you're using. Remember: declaration files are about developer experience—good types make your IDE helpful instead of hostile.
