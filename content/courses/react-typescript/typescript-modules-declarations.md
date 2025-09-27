---
title: Modules and Declaration Files
description: >-
  Master TypeScript's module system and create declaration files for JavaScript
  libraries
modified: '2025-09-22T09:27:10-06:00'
date: '2025-09-14T19:04:10.739Z'
---

Declaration files describe the shape of JavaScript code for TypeScript.

### Basic Declaration File

```typescript
// math.d.ts
export function add(a: number, b: number): number;
export function subtract(a: number, b: number): number;

export interface MathOptions {
  precision?: number;
  rounding?: 'up' | 'down' | 'nearest';
}

export class Calculator {
  constructor(options?: MathOptions);
  calculate(expression: string): number;
}
```

### Global Declarations

```typescript
// global.d.ts
declare global {
  interface Window {
    myApp: {
      version: string;
      config: Record<string, any>;
    };
  }

  // Global variable
  const API_URL: string;

  // Global function
  function analytics(event: string, data?: any): void;
}

// Make this a module
export {};

// Usage anywhere in your app
window.myApp.version; // Works!
analytics('page_view'); // Works!
```

### Ambient Modules

For libraries without types:

```typescript
// declarations.d.ts
declare module 'untyped-library' {
  export function doSomething(input: string): string;
  export class SomeClass {
    constructor(options?: any);
    method(): void;
  }
}

// For CSS modules
declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// For images
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  import React from 'react';
  const SVG: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVG;
}

// For JSON
declare module '*.json' {
  const value: any;
  export default value;
}
```

## React Component Declarations

```typescript
// Button.d.ts
import { ComponentType, ReactNode, MouseEvent } from 'react';

export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export const Button: ComponentType<ButtonProps>;

// For class components
export class ButtonClass extends React.Component<ButtonProps> {
  focus(): void;
  blur(): void;
}

// For forwardRef components
export const ButtonWithRef: React.ForwardRefExoticComponent<
  ButtonProps & React.RefAttributes<HTMLButtonElement>
>;
```

## Module Augmentation

Extending existing modules:

```typescript
// Extend Express
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: 'admin' | 'user';
    };
  }

  interface Response {
    sendSuccess(data: any): void;
    sendError(message: string, code?: number): void;
  }
}

// Extend React
declare module 'react' {
  interface CSSProperties {
    '--custom-property'?: string;
    '--theme-color'?: string;
  }
}

// Usage
app.get('/profile', (req, res) => {
  if (req.user) {  // TypeScript knows about user
    res.sendSuccess(req.user);  // And sendSuccess
  }
});

// In React
<div style={{ '--theme-color': '#007bff' }}>  // Works!
```

## Namespace Declarations

For libraries that add to the global scope:

```typescript
// jquery.d.ts
declare namespace jQuery {
  interface AjaxSettings {
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    success?: (data: any) => void;
    error?: (xhr: any, status: string, error: string) => void;
  }

  interface JQuery<TElement = HTMLElement> {
    addClass(className: string): this;
    removeClass(className: string): this;
    on(event: string, handler: (e: Event) => void): this;
    ajax(settings: AjaxSettings): void;
  }
}

declare const $: jQuery.JQuery;
declare const jQuery: jQuery.JQuery;

// Usage
$('.button').addClass('active');
$.ajax({ url: '/api/data' });
```

## Triple-Slash Directives

Reference other files and libraries:

```typescript
/// <reference path="./types.d.ts" />
/// <reference types="node" />
/// <reference lib="es2020.promise" />

// For conditional compilation
/// <reference no-default-lib="true"/>

// In libraries
/// <amd-module name="MyModule"/>

// Preserve JSX
/// <reference jsx="preserve" />
```

## Creating Types for a JavaScript Library

Let's type a JavaScript library from scratch:

```javascript
// Original JavaScript library - analytics.js
class Analytics {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.debug = options.debug || false;
    this.endpoint = options.endpoint || 'https://api.analytics.com';
  }

  track(event, properties = {}) {
    // Send event
    return fetch(this.endpoint + '/track', {
      method: 'POST',
      body: JSON.stringify({ event, properties }),
    });
  }

  identify(userId, traits = {}) {
    // Identify user
    this.userId = userId;
    return this.track('identify', { userId, ...traits });
  }

  page(name, properties = {}) {
    // Track page view
    return this.track('page', { name, ...properties });
  }
}

module.exports = Analytics;
```

Now create types for it:

```typescript
// analytics.d.ts
declare module 'analytics-lib' {
  export interface AnalyticsOptions {
    debug?: boolean;
    endpoint?: string;
    timeout?: number;
    retryCount?: number;
  }

  export interface EventProperties {
    [key: string]: any;
    timestamp?: Date | string;
    context?: {
      ip?: string;
      userAgent?: string;
    };
  }

  export interface UserTraits {
    email?: string;
    name?: string;
    plan?: 'free' | 'pro' | 'enterprise';
    [key: string]: any;
  }

  export interface PageProperties extends EventProperties {
    url?: string;
    title?: string;
    referrer?: string;
  }

  export default class Analytics {
    constructor(apiKey: string, options?: AnalyticsOptions);

    readonly apiKey: string;
    readonly debug: boolean;
    readonly endpoint: string;
    userId?: string;

    track(event: string, properties?: EventProperties): Promise<Response>;
    identify(userId: string, traits?: UserTraits): Promise<Response>;
    page(name?: string, properties?: PageProperties): Promise<Response>;
  }

  // If it also exports individual functions
  export function createAnalytics(apiKey: string): Analytics;
  export function validateApiKey(key: string): boolean;
}
```

## Package.json Types Configuration

Configure your package to include types:

```json
{
  "name": "my-library",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts", // TypeScript will look here
  "exports": {
    ".": {
      "types": "./dist/index.d.ts", // For Node.js exports field
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./react": {
      "types": "./dist/react.d.ts",
      "import": "./dist/react.mjs"
    }
  },
  "typesVersions": {
    "*": {
      "react": ["./dist/react.d.ts"],
      "utils": ["./dist/utils.d.ts"]
    }
  }
}
```

## DefinitelyTyped and @types

Using community types:

```bash
# Install types from DefinitelyTyped
npm install --save-dev @types/react @types/node @types/lodash

# Types are automatically discovered
import React from 'react';  // Has types!
import _ from 'lodash';     // Has types!
```

Creating your own @types:

```typescript
// In your project: types/untyped-lib/index.d.ts
declare module 'untyped-lib' {
  export function doSomething(): void;
}

// tsconfig.json
{
  "compilerOptions": {
    "typeRoots": ["./types", "./node_modules/@types"]
  }
}
```

## Conditional Types in Declarations

```typescript
// Advanced declaration with conditional types
declare module 'flexible-fetch' {
  type FetchOptions<T = unknown> = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: T extends object ? T : never;
    json?: boolean;
  };

  type FetchResponse<T> = T extends { json: true } ? Promise<any> : Promise<Response>;

  export function fetch<T extends FetchOptions>(url: string, options?: T): FetchResponse<T>;
}
```

## Working with Different Module Formats

### UMD (Universal Module Definition)

```typescript
// library.d.ts
export as namespace MyLibrary;
export = MyLibrary;

declare namespace MyLibrary {
  function initialize(config: Config): void;
  function process(data: any): Result;

  interface Config {
    apiKey: string;
    environment?: 'development' | 'production';
  }

  interface Result {
    success: boolean;
    data?: any;
    error?: string;
  }
}

// Can be used as:
// - Global: MyLibrary.initialize(...)
// - CommonJS: const lib = require('my-library')
// - ESM: import * as lib from 'my-library'
```

### ESM with CommonJS Fallback

```typescript
// index.d.ts
declare const MyComponent: React.FC<MyComponentProps>;

export = MyComponent;
export as namespace MyComponent;

// Allows both:
import MyComponent from 'my-component'; // ESM
const MyComponent = require('my-component'); // CommonJS
```

## React Native and Platform-Specific Types

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

## Dynamic Imports and Code Splitting

```typescript
// Types for dynamic imports
declare module 'my-app/routes' {
  import { ComponentType } from 'react';

  export interface Route {
    path: string;
    component: () => Promise<{ default: ComponentType<any> }>;
  }

  export const routes: Route[];
}

// Usage
import { routes } from 'my-app/routes';

const LazyComponent = lazy(() => import('./components/Heavy'));

// Type-safe dynamic imports
async function loadComponent(name: string) {
  const module = await import(`./components/${name}.tsx`);
  return module.default as ComponentType<any>;
}
```

## Testing Your Types

```typescript
// types.test.ts
import { expectType, expectError, expectAssignable } from 'tsd';
import { MyFunction, MyType } from './index';

// Test that types work as expected
expectType<string>(MyFunction('input'));
expectError(MyFunction(123)); // Should error with number
expectAssignable<MyType>({ prop: 'value' });

// Or use type assertions
type Assert<T extends true> = T;
type Test1 = Assert<MyType extends { prop: string } ? true : false>;

// Compile-time type tests
const testTypes = () => {
  const result: string = MyFunction('test'); // Should compile
  // @ts-expect-error
  const error: number = MyFunction('test'); // Should error
};
```

## Module Best Practices

### 1. Organize Exports

```typescript
// components/index.ts - Barrel exports
export { Button } from './Button';
export { Input } from './Input';
export { Card } from './Card';
export type { ButtonProps, InputProps, CardProps } from './types';

// Use named exports for better tree-shaking
export { specific } from './module'; // ✅
export default everything; // ❌ Harder to tree-shake
```

### 2. Type-Only Imports

```typescript
// Separate type imports for better performance
import type { User, Post } from './types';
import { getUser, getPost } from './api';

// Or use type modifier
import { getUser, type User } from './module';
```

### 3. Path Mapping

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@components/*": ["components/*"],
      "@utils/*": ["utils/*"],
      "@types/*": ["types/*"],
      "@/*": ["*"]
    }
  }
}

// Now you can use:
import { Button } from '@components/Button';
import { formatDate } from '@utils/date';
import type { User } from '@types/user';
```

### 4. Ambient Declarations Organization

```typescript
// types/global.d.ts - Global types
// types/modules.d.ts - Module declarations
// types/assets.d.ts - Asset modules
// types/env.d.ts - Environment variables

// types/index.d.ts - Main entry
/// <reference path="./global.d.ts" />
/// <reference path="./modules.d.ts" />
/// <reference path="./assets.d.ts" />
/// <reference path="./env.d.ts" />
```

## Troubleshooting Common Issues

### 1. Cannot Find Module

```typescript
// Solution 1: Create declaration
declare module 'problem-library';

// Solution 2: Install types
npm install --save-dev @types/problem-library

// Solution 3: Check tsconfig paths
{
  "compilerOptions": {
    "moduleResolution": "node",
    "typeRoots": ["./types", "./node_modules/@types"]
  }
}
```

### 2. Conflicting Types

```typescript
// Use type-only imports to avoid conflicts
import type { Props as ButtonProps } from './Button';
import type { Props as InputProps } from './Input';

// Or use namespace imports
import * as Button from './Button';
import * as Input from './Input';

type BP = Button.Props;
type IP = Input.Props;
```

### 3. Module Resolution Issues

```typescript
// Check your tsconfig.json
{
  "compilerOptions": {
    "module": "esnext",  // or "commonjs"
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

## Publishing Types

### As Part of Your Package

```typescript
// package.json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist/**/*"
  ],
  "scripts": {
    "build": "tsc",
    "prepare": "npm run build"
  }
}

// tsconfig.json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  }
}
```

### To DefinitelyTyped

```typescript
// Structure for @types/your-library
// index.d.ts - Main declarations
// tests/index.ts - Type tests
// tsconfig.json - Configuration
// tslint.json - Linting rules

// Follow the contribution guide at:
// https://github.com/DefinitelyTyped/DefinitelyTyped
```

## Summary

Mastering modules and declarations enables you to:

1. **Work with any JavaScript library** - Create types for untyped libraries
2. **Organize large codebases** - Use modules to structure your application
3. **Share type definitions** - Publish types for your libraries
4. **Extend existing types** - Augment modules to add functionality
5. **Handle different environments** - Support Node.js, browsers, and bundlers

Understanding these concepts is essential for professional TypeScript development. You'll be able to integrate any library, create maintainable architectures, and provide excellent developer experience for your package users!
