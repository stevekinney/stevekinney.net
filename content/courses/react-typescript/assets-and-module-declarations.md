---
title: Assets and Module Declarations
description: Teach TypeScript about CSS, images, and SVGs—write module declarations that make imports type-safe.
date: 2025-09-06T22:04:44.964Z
modified: 2025-09-06T22:04:44.964Z
published: true
tags: ['react', 'typescript', 'module-declarations', 'assets', 'css', 'svg', 'bundling']
---

When you're building a React application, you're not just writing JavaScript and TypeScript. You're importing CSS files, images, SVGs, fonts, and all sorts of other assets that help make your application actually look good and work properly. But here's the thing: TypeScript doesn't know what to do with these non-JavaScript files by default, and it'll throw a fit every time you try to import them.

Enter **module declarations**—TypeScript's way of saying "hey, I know what this weird file extension is, and here's how you should treat it." By writing custom module declarations, you can make TypeScript understand your assets, get proper autocompletion, and avoid those annoying "Cannot find module" errors that plague every React project at some point.

## Why TypeScript Gets Confused

Let's start with the problem. You've probably seen something like this in your React app:

```tsx
import './Button.css';
import logo from './logo.png';
import IconSvg from './icon.svg';

export function Button() {
  return (
    <button className="fancy-button">
      <img src={logo} alt="Company logo" />
      <IconSvg className="button-icon" />
    </button>
  );
}
```

Without proper module declarations, TypeScript will complain about every single import here:

```
❌ Cannot find module './Button.css' or its corresponding type declarations.
❌ Cannot find module './logo.png' or its corresponding type declarations.
❌ Cannot find module './icon.svg' or its corresponding type declarations.
```

The reason is simple: TypeScript only understands JavaScript and TypeScript files by default. When it encounters a `.css`, `.png`, or `.svg` file, it has no idea what these things are supposed to be or how they should behave in your code.

## Creating Your First Module Declaration File

Module declarations live in `.d.ts` files (the "d" stands for "declaration"). You can put them anywhere TypeScript can find them, but the conventional approach is to create a `types` directory or add them to your existing type definition files.

Let's start by creating a `src/types/assets.d.ts` file:

```ts
// src/types/assets.d.ts

// CSS Modules and regular CSS files
declare module '*.css' {
  const styles: { [className: string]: string };
  export default styles;
}

// Images
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}
```

This tells TypeScript: "When someone imports a `.css` file, treat it as an object with string keys and string values. When someone imports an image, treat it as a string (the URL to the image)."

> [!TIP]
> Make sure your `tsconfig.json` includes your `types` directory or that these declaration files are somewhere TypeScript will find them automatically.

## Handling Different Asset Types

### CSS and Styling

The CSS declaration above works for both regular CSS files and CSS Modules. If you're using CSS Modules exclusively and want more precise typing, you can be more specific:

```ts
// For CSS Modules specifically
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// For regular CSS files (side-effect imports)
declare module '*.css' {
  const content: string;
  export default content;
}
```

With CSS Modules, you might also want to add a more restrictive type if you know your class names ahead of time:

```ts
// For a specific CSS Module file
declare module './Button.module.css' {
  interface Classes {
    button: string;
    primary: string;
    secondary: string;
    disabled: string;
  }
  const classes: Classes;
  export default classes;
}
```

### SVG Files: The Tricky Case

SVGs are particularly interesting because bundlers often handle them in different ways. Some treat them as image URLs, others let you import them as React components. Here's how to handle both:

```ts
// SVGs as URLs (like images)
declare module '*.svg' {
  const src: string;
  export default src;
}

// SVGs as React components (common with SVGR)
declare module '*.svg' {
  import React from 'react';
  const SVGComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  export default SVGComponent;
}
```

But wait—you can't have two declarations for the same module pattern! If your bundler supports both (like Create React App or Vite with the right plugins), you'll need to be more specific:

```ts
// For SVGs imported as URLs
declare module '*.svg?url' {
  const src: string;
  export default src;
}

// For SVGs imported as React components
declare module '*.svg' {
  import React from 'react';
  const SVGComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  export default SVGComponent;
}
```

Then in your code:

```tsx
import IconComponent from './icon.svg'; // React component
import iconUrl from './icon.svg?url'; // URL string

// Use as component
<IconComponent className="w-6 h-6" />

// Use as image source
<img src={iconUrl} alt="Icon" />
```

## Advanced Asset Declarations

### Fonts and Other Files

Don't forget about other assets your app might use:

```ts
// Font files
declare module '*.woff' {
  const src: string;
  export default src;
}

declare module '*.woff2' {
  const src: string;
  export default src;
}

declare module '*.ttf' {
  const src: string;
  export default src;
}

// Data files
declare module '*.json' {
  const value: any;
  export default value;
}

// Text files
declare module '*.txt' {
  const content: string;
  export default content;
}
```

### Media Files

For audio and video:

```ts
declare module '*.mp4' {
  const src: string;
  export default src;
}

declare module '*.webm' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}

declare module '*.wav' {
  const src: string;
  export default src;
}
```

## Environment-Specific Declarations

Sometimes you need different declarations for different environments. You can use TypeScript's module augmentation for this:

```ts
// In development, you might want more detailed image information
declare module '*.png' {
  const src: string;
  export default src;
  export const width: number;
  export const height: number;
}

// This allows you to import both the src and metadata
import logoSrc, { width, height } from './logo.png';
```

## Real-World Example: Complete Asset Setup

Here's a comprehensive `src/types/assets.d.ts` file that covers most common use cases:

```ts
// CSS and styling
declare module '*.css' {
  const styles: { [className: string]: string };
  export default styles;
}

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.scss' {
  const styles: { [className: string]: string };
  export default styles;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

// Images
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.avif' {
  const src: string;
  export default src;
}

// SVGs (as React components)
declare module '*.svg' {
  import React from 'react';
  const SVGComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  export default SVGComponent;
}

// SVGs as URLs (when using ?url suffix)
declare module '*.svg?url' {
  const src: string;
  export default src;
}

// Fonts
declare module '*.woff' {
  const src: string;
  export default src;
}

declare module '*.woff2' {
  const src: string;
  export default src;
}

declare module '*.ttf' {
  const src: string;
  export default src;
}

declare module '*.otf' {
  const src: string;
  export default src;
}

// Audio/Video
declare module '*.mp4' {
  const src: string;
  export default src;
}

declare module '*.webm' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}

declare module '*.wav' {
  const src: string;
  export default src;
}

// Documents and data
declare module '*.pdf' {
  const src: string;
  export default src;
}

declare module '*.txt' {
  const content: string;
  export default content;
}
```

## Using Your Declarations

Once you have your module declarations in place, importing assets becomes a breeze:

```tsx
// All of these now have proper TypeScript support
import styles from './Component.module.css';
import './global.css';
import heroImage from './hero.jpg';
import LogoIcon from './logo.svg';
import logoUrl from './logo.svg?url';
import fontFile from './custom-font.woff2';

export function Hero() {
  return (
    <div className={styles.hero}>
      <img src={heroImage} alt="Hero" />
      <LogoIcon className={styles.logo} />
      {/* TypeScript knows all about these imports! */}
    </div>
  );
}
```

## Framework-Specific Considerations

### Create React App

If you're using Create React App, it comes with some asset declarations built-in, but you might want to extend them. CRA looks for declaration files in `src/`, so your `src/types/assets.d.ts` should work perfectly.

### Vite

Vite has excellent built-in support for assets and provides its own type definitions. You can extend them in your `vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

// Extend Vite's built-in asset handling
declare module '*.svg?component' {
  import React from 'react';
  const SVGComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}
```

### Next.js

Next.js handles many assets automatically, but you might need custom declarations for specialized assets:

```ts
// next-env.d.ts (or in your custom declaration file)
declare module '*.md' {
  const content: string;
  export default content;
}

declare module '*.mdx' {
  import { ComponentType } from 'react';
  const MDXComponent: ComponentType;
  export default MDXComponent;
}
```

## Common Pitfalls and How to Avoid Them

### Missing Type Roots

If your declarations aren't being picked up, check your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "typeRoots": ["./types", "./node_modules/@types"]
  },
  "include": ["src/**/*", "types/**/*"]
}
```

### Conflicting Declarations

If you have multiple declaration files defining the same module patterns, TypeScript will complain. Make sure each pattern is only declared once across all your `.d.ts` files.

### Too Generic vs. Too Specific

```ts
// ❌ Too generic - loses type information
declare module '*' {
  const content: any;
  export default content;
}

// ✅ Just right - specific enough to be useful
declare module '*.css' {
  const styles: { [className: string]: string };
  export default styles;
}

// ❌ Too specific - maintenance nightmare
declare module './specific-file.css' {
  const styles: {
    button: string;
    primary: string;
    // ... every class name
  };
  export default styles;
}
```

## Testing Your Module Declarations

You can verify your declarations work by importing an asset and checking the inferred types:

```tsx
import styles from './test.css';
import image from './test.png';

// Hover over these in your IDE to see the inferred types
const buttonClass = styles.button; // string
const imageSrc = image; // string

// TypeScript should catch these errors:
// const invalid = styles.nonexistentClass; // Should work (CSS modules are flexible)
// const alsoInvalid: number = image; // Should error
```

## When Module Declarations Aren't Enough

Sometimes you need more than basic module declarations. For complex scenarios, consider:

1. **Custom bundler plugins** that generate types automatically
2. **Build-time type generation** for things like GraphQL or API schemas
3. **Runtime validation** with libraries like Zod for dynamic imports

But for 90% of asset importing needs in React applications, the module declarations we've covered here will serve you well.

---

Module declarations might seem like boilerplate, but they're the foundation that makes asset imports in TypeScript React apps actually pleasant to work with. Set them up once, and you'll get proper autocompletion, error checking, and that warm fuzzy feeling of type safety every time you import an image, stylesheet, or any other asset.

The next time you see a "Cannot find module" error for an asset, you'll know exactly what to do: write a declaration, teach TypeScript what that file should be, and get back to building great user experiences.
