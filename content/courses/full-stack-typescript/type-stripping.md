---
title: Type Stripping in Node.js
description: Learn how Node.js handles TypeScript files by stripping types at runtime without a separate build step.
date: 2025-03-15T16:50:56-06:00
modified: 2025-03-20T07:03:05-05:00
---

Type stripping is Node.js’s way of “magically” running TypeScript files without a separate build step—by literally erasing all the type syntax from your source code at runtime. In other words, Node takes your `.ts` file, removes things like type annotations, interfaces, and type-only imports (by replacing them with whitespace so that line numbers stay the same), and then executes the remaining JavaScript code as if you’d handwritten it. It’s like having a “do it live” button for TypeScript—but don’t forget, it doesn’t check your types at runtime!

## How It Works

- **No Type Checking at Runtime:** Node simply strips out the type annotations (using a minimal transformation via a customized version of swc) without performing any type checks. So if you accidentally pass a number where a string is expected, Node will happily run your code and likely blow up later.
- **Source Map Preservation:** By replacing type code with whitespace instead of deleting it outright, Node preserves your original code’s line numbers. This means stack traces still point you to the correct location in your source—even though your types are gone.
- **Experimental Feature:** Initially flagged with warnings (which you can disable using `--disable-warning=ExperimentalWarning` or via `NODE_OPTIONS`), type stripping is experimental and may evolve over time.

## Configuring TypeScript for Node’s Type Stripping

To get the best of both worlds—fast execution with Node’s built-in type stripping and robust static type checking during development—here’s what you should do:

## Set Up Your `tsconfig.json`

Use a minimal configuration tailored for Node’s type stripping. For instance:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "allowImportingTsExtensions": true, // Import .ts files directly
    "rewriteRelativeImportExtensions": true, // Convert .ts imports to .js in output
    "verbatimModuleSyntax": true, // Enforce use of 'import type' for type-only imports
    "erasableSyntaxOnly": true // Warns on unsupported TS features (like enums, namespaces, etc.)
  }
}
```

This setup tells TypeScript to let Node.js know which parts are safe to strip.

## Use Type-Only Imports

Always import types using the `import type { … }` syntax. If you import types as runtime values (omitting `type`), Node’s type stripping won’t remove them, which can lead to runtime errors.

## Stick to Supported Syntax

Node’s current type stripping only supports a subset of TypeScript:

- No enums, parameter properties, or namespaces.
- JSX isn’t supported.
- Use plain `.ts` (or `.mts`/`.cts` for module-specific behavior) files.

Essentially, write your TS code with the mindset that Node is just “cleaning up” your types, not transforming your code in any deep way.

## Run Static Type Checking Separately

Since Node won’t check your types at runtime, make sure to run `tsc --noEmit` (or use your IDE’s language server) during development to catch type errors before you hit runtime.

## Best Practices & Key Takeaways

### Rapid Prototyping

Type stripping is awesome for quickly iterating without a build step. But don’t get too comfortable—rely on your type checker to catch mistakes.

### Debugging

Thanks to whitespace replacement, debugging remains accurate. Your stack traces point exactly where you expect.

### Stay Within Limits

Since not all TypeScript features are supported, avoid “exotic” TS syntax that requires full transpilation (like enums or certain advanced generics).

### Experimental Status

Remember this feature is experimental. Use it in development for prototyping, but for production code, you might still prefer a full build step until the feature matures.

In a nutshell, type stripping in Node.js is a nifty feature that lets you run TypeScript files as if they were JavaScript—stripping out the types on the fly. Just keep in mind that this is a “no type-check” runtime solution, so your safety net (the TypeScript compiler) has to be run separately during development.

Happy coding—and may your type errors be caught before runtime (or at least before your users notice)!
