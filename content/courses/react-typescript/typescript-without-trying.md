---
title: Using TypeScript Without Even Trying
description: >-
  Let inference do the heavy lifting—see how much TypeScript you get "for free"
  in everyday React files.
date: 2025-09-06T22:23:57.262Z
modified: '2025-09-27T13:14:43-06:00'
published: true
tags:
  - react
  - typescript
  - gradual-typing
  - inference
  - beginner
---

**Here is a main theme for this workshop**: TypeScript's biggest superpower isn't the explicit types you write—it's the types you _don't_ have to write. Modern TypeScript is super good at figuring out what you meant, often giving you bulletproof type safety with zero extra effort. In our time together, I am going to argue that you know you're on the right path when you can barely tell that you're using TypeScript at all in your project.

## The Magic of Type Inference

TypeScript's inference engine has gotten _scary good_. In many cases, you can write what looks like regular JavaScript and still get comprehensive type checking, autocomplete, and refactoring support. The secret? TypeScript analyzes your code's structure, function signatures, and return values to build a complete picture of your types.

Here's the beautiful part: you're probably already getting more TypeScript benefits than you realize.

## Component Props: Inference in Action

Consider this silly little component. As far as we can tell at this point, there is little-to-no evidence that it uses TypeScript at all. Granted, it both looks like JavaScript and behaves like JavaScript. If TypeScript cannot figure out the type of a given property, it will just denote it as `any`.

```tsx
// @ts-ignore
export const NameTag = ({ name, title, level, isOnline }) => {
  return (
    <div className="w-96 overflow-hidden rounded-xl border-2 border-red-600 bg-white shadow-md">
      <div className="bg-red-600 px-4 py-2 text-center font-bold tracking-widest text-white uppercase">
        <div className="text-3xl">Hello</div>
        <div>My name is</div>
      </div>
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="text-3xl font-bold">{name}</div>
        <div className="text-gray-700">
          <div className="text-sm">{title}</div>
          <div className="text-xs">Level {level}</div>
        </div>
        {isOnline && (
          <div className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
            <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
            Online
          </div>
        )}
      </div>
    </div>
  );
};
```

It technically works, and we get a _tiny_ benefit: IntelliSense is at least aware of what properties this component can take—even if it doesn't know what the types those values ought to be.

While this works, we can get even better inference by providing default parameters:

```tsx
// ✅ Better: defaults help TypeScript infer more precisely
export const NameTag = ({ name = '', title = '', level = 0, isOnline = false }) => {
  return (
    <div className="w-96 overflow-hidden rounded-xl border-2 border-red-600 bg-white shadow-md">
      {/* The rest of the component… */}
    </div>
  );
};
```

Now TypeScript knows that `name` should be a string, `level` should be a number, and `isOnline` should be a boolean—all without writing a single type annotation.

## Defining Types for Props

Of course, we can make this even easier by explicitly calling out the props that our component expects.

```tsx
type NameTagProps = {
  name: string;
  title: string;
  level: number;
  isOnline?: boolean;
};

// 🏆 Best: explicitly define the types for the component's props.
export const NameTag = ({ name, title, level, isOnline = false }: NameTagProps) => {
  return (
    <div className="w-96 overflow-hidden rounded-xl border-2 border-red-600 bg-white shadow-md">
      {/* The rest of the component… */}
    </div>
  );
};
```
