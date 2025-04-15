---
title: TypeScript Configuration Best Practices
description: An in-depth guide to configuring TypeScript with strict type checking and other important compiler options for maximum safety and reliability.
date: 2025-03-15T16:58:14-06:00
modified: 2025-03-15T16:58:14-06:00
---

Let's consider this `tsconfig.json` for a hot minute.

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
  },
}
```

Even if some of these are enabled by default when `"strict": true` is set, having them explicitly declared can help with clarity—and ensures your settings remain in place if you ever toggle `"strict"` off or on in the future.

## `strict: true`

- **What it does:** Turns on TypeScript’s “strict mode,” which is actually a group of several related settings that tighten the compiler’s type-checking rules. Specifically, it enables:
  - `noImplicitAny`
  - `strictNullChecks`
  - `strictBindCallApply`
  - `strictFunctionTypes`
  - `strictPropertyInitialization`
- **Why it’s helpful:** You get the most robust type-checking TypeScript can offer, catching potential errors at compile time rather than during runtime. Strict mode often forces you to be more explicit with types, which leads to more maintainable code.

> **Note:** You’re also specifying some of these strict-mode flags (`noImplicitAny`, `strictNullChecks`, `strictPropertyInitialization`) individually below, which can be redundant—but also makes your config super explicit.

## `noImplicitAny: true`

- **What it does:** If you forget to specify (or let TS infer) the type of a variable or function parameter, TypeScript will not fallback to `any`. Instead, it’ll throw an error, making you either:

  1. Explicitly type the variable/parameter, or
  2. Let TypeScript infer a suitable type from usage.

- **Why it’s helpful:** Eliminates the surprise “black hole” type: `any`. This ensures you’re always aware of the types you’re working with and prevents hidden type mismatches that can emerge as runtime errors.

---

## `strictNullChecks: true`

- **What it does:** Makes `null` and `undefined` distinct types rather than letting them slip into every type. With `strictNullChecks` on, if a value can be `null` or `undefined`, you must explicitly include `| null` or `| undefined` in the type.
- **Why it’s helpful:** One of the biggest sources of runtime errors in JavaScript is unhandled `null` or `undefined`. Enforcing strict null checks forces you to acknowledge the possibility—or impossibility—of nullish values in your code.

---

## `strictPropertyInitialization: true`

- **What it does:** Requires that class properties (other than those marked optional or with definite assignment using `!`) be _initialized_ in the constructor (or declared with a default value) before you try to use them.
- **Why it’s helpful:** Prevents the classic “property is undefined because the class never assigned it” bug. This ensures that every declared property has a safe and expected value at runtime.

## `noUnusedLocals: true`

- **What it does:** Throws errors if you have a local variable (inside a function or a block scope) that is declared but never used.
- **Why it’s helpful:** Helps you keep your codebase clean. Unused variables can clutter code and often indicate logic that either changed or was never completed.

## `noUnusedParameters: true`

- **What it does:** Similar to `noUnusedLocals`, but for function parameters. If a parameter is never used within its function body, TypeScript will complain.
- **Why it’s helpful:** Discourages having leftover or “dead” parameters—common when you refactor code. It also can prevent confusion for other developers trying to understand function signatures.

## `exactOptionalPropertyTypes: true`

- **What it does:** Makes the treatment of optional properties more precise. By default, TypeScript allows writing or overwriting an optional property with `undefined` even if it’s not explicitly `T | undefined`. With `exactOptionalPropertyTypes`, an optional property `foo?: T` behaves more strictly: the property may be omitted entirely, or if present, must match `T | undefined` exactly—no sneaky expansions.
- **Why it’s helpful:** It reduces the guesswork around optional properties. You don’t accidentally assign `undefined` to a property that’s optional in a more liberal sense and then discover type mismatches. This keeps code involving optional properties more predictable and explicit.

## `forceConsistentCasingInFileNames: true`

- **What it does:** Ensures that the case of your import paths matches the actual file name on disk. For instance, if your file is named `MyComponent.ts`, but you try to import it via `myComponent.ts`, you’ll get an error on case-sensitive file systems.
- **Why it’s helpful:** Prevents the dreaded “works on my machine but not on the server” bug that can appear when you develop on Windows (case-insensitive) but deploy on Linux (case-sensitive). It enforces consistent casing for all imports, making your project more portable across different OSes.

All these options combine to enforce rigor in how you write and maintain your TypeScript code. Enabling `strict` mode plus these complementary flags helps eliminate a lot of subtle bugs, fosters cleaner code, and promotes consistent coding practices—making life easier when scaling or refactoring your codebase. If your goal is maximum correctness and minimal “mystery errors,” this is a great config to use.
