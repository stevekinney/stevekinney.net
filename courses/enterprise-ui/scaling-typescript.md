---
title: Scaling TypeScript
description: >-
  Where TypeScript starts to buckle under the weight of a large codebase, and the
  strategies that keep your tooling fast as the project grows.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

TypeScript is great until it isn't. At a few thousand lines of code, everything feels snappy—your editor highlights errors instantly, `tsc` finishes in seconds, and life is good. But, somewhere around the hundreds-of-thousands-of-lines mark, you start noticing that your IDE takes two minutes to show you a red squiggly, your CI pipeline burns through compute for tests that didn't need to run, and `tsc` eats enough RAM to make your laptop fan audible from across the room.

The frustrating part is that it's rarely _one_ thing. TypeScript doesn't "break" because you crossed some magical line-count threshold. It starts breaking when the compiler and language service are forced to understand too much at once, or when the type graph and module graph stop matching the real structure of the repository. The TypeScript docs and [performance guide][2] keep coming back to the same theme: for any non-trivial codebase, split it into smaller projects so the compiler loads fewer files, uses less memory, and does less work per edit and per build.

And here's the thing that trips people up: build slowness and editor slowness are basically the same problem wearing different outfits. TypeScript's editor service is tied to the same full-project checking behavior as `tsc`. The [docs explicitly note][2] that editor performance is related to the cost of checking the project, even if diagnostics for open files can appear faster than a full build.

## Where It Breaks

**Program size** is the most straightforward failure mode. A single `tsconfig` that accidentally includes source, tests, generated files, extra `@types` packages, and parts of `node_modules` turns every edit into a much larger problem than it needs to be. TypeScript's [performance guide][2] calls out oversized `include` globs, mixed project folders, tests living next to product code, and heavy directories under source roots as common causes of slow builds and high memory use.

**Barrel files** make program size worse by hiding it. You know the pattern—an `index.ts` that re-exports everything from a directory so consumers can write a clean one-line import. At small scale, it's a nice convenience. At large scale, it's a performance disaster. When you import a single component through a barrel file, TypeScript has to parse the _entire_ module graph connected to that barrel—every re-exported file, and every downstream dependency of those files. One import becomes a cascading chain of hundreds of modules.

Atlassian removed their barrel files and saw a 75% reduction in average build times, a 30% improvement in IDE highlighting speed, and an 88% drop in the number of unit tests executed per pull request. That's not a typo.

**Type complexity** is where otherwise sensible teams drift into type-level performance theater. Intersections are costlier than equivalent interface hierarchies because interfaces are flattened and their relationships can be cached. Large unions get expensive because members are compared repeatedly and can become quadratic to reduce. Deeply nested conditional and mapped types get re-evaluated over and over unless you give them stable names the compiler can cache. TypeScript's [performance wiki][2] is unusually blunt here: prefer interfaces over intersections, prefer base types over giant unions, and name complex conditional types instead of inlining them everywhere.

**Declaration complexity** is sneakier. Anonymous inferred export types can look elegant in source and turn into hideous `.d.ts` output, which makes incremental builds and downstream checking slower. The TypeScript team [specifically recommends][2] adding explicit annotations—especially return types on exported functions—because named types are more compact and reduce the work needed to read and write declaration files.

**Ambient type pollution** is another quiet offender. By default, TypeScript automatically includes every `@types` package it finds in `node_modules`, even if you never import it. That slows down program construction and creates the usual circus of duplicate global identifiers when test frameworks, browser globals, and Node globals all pile in together.

**Typed linting** adds yet another layer. Using `@typescript-eslint` with type-aware rules gives you incredible safety, but it requires TypeScript to analyze your whole project just to determine types for the linter. It's a tax, and on a large codebase, it's a steep one. Wide glob patterns in your `tsconfig.json` (like `**/*`) make it worse by accidentally pulling in build artifacts.

**Module-resolution drift** tends to show up in monorepos as "it works in the editor, it works in the bundler, and then it explodes for consumers." TypeScript supports `package.json` `exports` and `imports` in modern resolution modes, but `paths` only teaches the compiler how to resolve a name locally—it doesn't rewrite emitted import specifiers. On top of that, the [TypeScript docs warn][3] that `"moduleResolution": "bundler"` can allow extensionless imports that are fine in bundlers and wrong in Node.js, and those bad specifiers can leak into declaration files if you publish libraries carelessly.

**Circular dependencies** are the classic runtime surprise. When module A imports module B, and module B imports module A, you get "excessively deep" type instantiation errors, slow compilation, and sometimes runtime `undefined` values that are deeply confusing to debug.

And then there's the **decomposition trade-off** itself. One giant project overloads the editor and checker. Too many tiny projects create overhead and repeated checking of shared dependency types. TypeScript's [performance guide][2] gives an empirical rule of thumb for multi-project workspaces: somewhere around 5 to 20 projects is often a reasonable range, with evenly sized projects and boundaries that match how files are edited together. Humans, naturally, prefer either one giant ball of mud or eighty-seven micro-packages named after feelings.

## Measure First

Before you start flipping flags and restructuring your entire repository, figure out where the time is actually going. TypeScript gives you the tools to do this—most people just don't know they exist.

Start with `--extendedDiagnostics` to get a breakdown of where `tsc` spends its time:

```bash
tsc -p tsconfig.json --extendedDiagnostics
```

A useful way to read the output: if `Files` and `I/O Read time` are high, the problem is usually your file set or module resolution. If `Check time` dominates, the problem is your types.

When you need to go deeper:

```bash
tsc -p tsconfig.json --listFilesOnly
tsc -p tsconfig.json --explainFiles > explain.txt
tsc -p tsconfig.json --traceResolution > resolution.txt
tsc -p tsconfig.json --generateTrace .trace --incremental false
```

`--listFilesOnly` shows you every file TypeScript decided to include—you'll probably be surprised by a few of them. `--explainFiles` tells you _why_ each file got pulled in. `--generateTrace` produces a Chrome-compatible trace where `checkSourceFile`, `checkExpression`, and `checkVariableDeclaration` are the events most worth staring at when you need to isolate a hotspot.

> [!TIP]
> Tracing with plain `tsc` is usually easier than trying to diagnose the same issue through a bundler, and still tends to be representative.

## Keeping TypeScript Fast

The goal is to decorrelate the size of your codebase from the latency of your development tools. A repository with ten times the code shouldn't have ten times the build time.

### Shrink the program

The easiest win. Keep `include` narrow—usually just `src` or another true input directory. Add explicit excludes for `**/node_modules` and dot-folders. Don't mix files from multiple projects in the same directory. If tests live beside product code, name or place them so they're easy to exclude from the production project.

```jsonc
{
  "compilerOptions": {
    "types": [],
  },
  "include": ["src"],
  "exclude": ["**/node_modules", "**/.*/"],
}
```

Setting `"types": []` is worth calling out. For application and library packages that don't need ambient globals, this stops TypeScript from auto-including every `@types` package it finds. For test projects, list only the globals you actually need. This reduces startup work and avoids global declaration conflicts across packages.

### Ditch the barrel files

Replace barrel imports with direct imports. Instead of `import { Button } from './components'`, write `import { Button } from './components/Button/Button'`. It's more verbose, sure. But, your tooling will thank you, and your coworkers will stop complaining about editor lag.

### Separate type checking from transpilation

Don't use `tsc` to transpile your code during development. Use a type-stripping transpiler written in a compiled language—**esbuild**, **SWC**, or **Rspack**—which processes code almost instantly because it doesn't care about your types. Then run type checking as a separate background process (`tsc --noEmit --watch`) or push full type checks to CI. You get fast feedback _and_ type safety—just not from the same tool at the same time.

TypeScript documents two complementary features that support this split. First, **`isolatedModules`** warns when you use constructs that can't be safely transpiled file-by-file by tools like Babel or `transpileModule`. It doesn't itself make emit faster—it just keeps you inside the subset that fast emitters can handle. Second, since TypeScript 5.6, **`--noCheck`** can skip full checking for faster emit workflows, and when paired with **`--isolatedDeclarations`**, declaration generation becomes mostly syntactic and therefore much faster. ([TypeScript 5.6 release notes][6])

In practice, that leads to two healthy patterns. For apps, let the bundler emit JavaScript and run TypeScript checking separately with `tsc --noEmit` or `tsc -b`. For libraries, keep `tsc` in charge of declarations, and if your codebase is disciplined enough for `isolatedDeclarations`, you can build a much faster declaration path with `--noCheck`. That's a much saner use of engineering time than arguing about whether one more conditional type can prove the existence of free will.

### Optimize your types

Optimize the public surface first. Add return types to exported functions. Pull repeated conditional or mapped types into named aliases. Prefer interface inheritance to large intersections. Prefer a shared base type over a giant union when you can model the domain that way. These changes matter because they improve caching and reduce repeated structural comparisons—especially across declaration emit and cross-package boundaries.

If a utility type requires a PhD to read, it probably needs to be broken up. At system boundaries (API responses, form inputs), prefer runtime schema validation with something like Zod rather than encoding every constraint in the type system.

### Tune your `tsconfig`

**`incremental: true`** stores build state in a `.tsbuildinfo` file so subsequent builds only re-check what changed. In watch mode, `assumeChangesOnlyAffectDirectDependencies` can be a useful extra lever when most edits have local impact, because it tells TypeScript to assume a change only affects directly dependent files during incremental recompiles.

**`skipLibCheck: true`** tells TypeScript to stop type-checking every `.d.ts` file in `node_modules`. It's a valid speed lever, but treat it like a speed lever, not a healing crystal. The [docs explicitly warn][2] that `skipLibCheck` can hide misconfiguration and conflicting declarations. It's common in big application repos. It's a poor substitute for fixing broken public types in a library repo.

### Keep an eye on the native compiler

Microsoft is porting TypeScript to Go (Project Corsa, shipping as TypeScript 7.0). The native implementation eliminates JavaScript VM overhead and uses shared-memory parallelism, delivering 8–10x faster compile times and cutting memory usage roughly in half. It's available now as a preview via `@typescript/native-preview`. When it stabilizes, it's going to change the performance math for everyone.

### Upgrade first, panic second

TypeScript's own [performance guide][2] says newer TypeScript versions and newer `@types` packages can solve computationally expensive regressions. Recent releases shipped changes that directly help large repos: TypeScript 5.5 improved watch/editor reliability around deletes and symlinked directories in monorepo-like scenarios, and TypeScript 5.8 added program load and update optimizations to make large-project edits more responsive. When diagnosing a compiler performance issue, the TypeScript team even recommends trying `typescript@next` first to make sure you're not chasing a bug that's already been fixed.

## TypeScript in Monorepos

Monorepos amplify every TypeScript scaling problem. One team's barrel file habit becomes every team's build slowdown. But, monorepos also give you the structure to solve these problems properly.

### Project references

Instead of one massive compilation context, split your repository into independently buildable units. Give each package its own `tsconfig.json` with **`composite: true`**, and link them using the `references` array. Build with `tsc --build` (or just `tsc -b`), which orchestrates builds in dependency order and only recompiles packages whose inputs actually changed. Imports from a referenced project resolve through its declaration output—which is exactly why references improve scaling: each project depends on a stable API surface instead of the full source of every downstream package.

A clean monorepo setup usually has three layers: a shared base config, a root "solution" config, and one `tsconfig.json` per package. The reason for the extra root solution file is annoyingly specific and very real: `extends` [does not inherit `references`][4], so the build graph must live in configs that declare it directly.

```jsonc
// tsconfig.base.json — shared strictness and syntax defaults
{
  "compilerOptions": {
    "target": "es2022",
    "strict": true,
    "verbatimModuleSyntax": true,
    "declarationMap": true,
  },
}
```

```jsonc
// tsconfig.json at repo root — the "solution" config
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/api" },
    { "path": "./packages/web" },
  ],
}
```

```jsonc
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "nodenext",
    "composite": true,
    "declaration": true,
    "incremental": true,
    "rootDir": "src",
    "outDir": "dist",
    "types": [],
  },
  "include": ["src"],
  "exclude": ["**/node_modules", "**/.*/"],
}
```

```jsonc
// packages/api/tsconfig.json — references shared
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "nodenext",
    "composite": true,
    "declaration": true,
    "incremental": true,
    "rootDir": "src",
    "outDir": "dist",
    "types": [],
  },
  "include": ["src"],
  "exclude": ["**/node_modules", "**/.*/"],
  "references": [{ "path": "../shared" }],
}
```

Then building is just:

```bash
tsc -b
tsc -b --watch
```

A few reference-specific details that matter in practice: referenced projects must enable `composite`, which also requires declaration emit. **`declarationMap`** is worth enabling because it gives you cross-project "Go to Definition" and rename support in editors. For very large composite workspaces, VS Code generates in-memory `.d.ts` redirects behind the scenes—if that becomes expensive, `disableSourceOfProjectReferenceRedirect` can reduce the cost.

If the editor still runs out of memory in a multi-project workspace, TypeScript's [recommendation][2] is explicit: set `"disableReferencedProjectLoad": true` and `"disableSolutionSearching": true` so the language service stops eagerly loading everything. That reduces the amount of project context available immediately, but it's often the difference between a usable editor and a molten one.

We'll set up project references hands-on in the exercise.

### Real packages, not folders with aspirations

Treat workspace packages as real packages. npm workspaces automatically symlink local packages into `node_modules`, and pnpm's **`workspace:*`** protocol exists specifically to remove ambiguity about whether a dependency should resolve to a local workspace package or to the registry. Your internal package dependency graph should be mirrored in project references. That gives you one runtime graph, one package graph, and one type graph instead of three slightly different lies.

For internal and published packages, prefer real package imports plus `package.json` `exports` over TypeScript-only alias tricks. TypeScript [supports `exports` and `imports`][9] in modern resolution modes. By contrast, `paths` is only a compiler hint—it doesn't rewrite emitted imports—so it should be used only when your runtime or bundler already implements the same mapping.

```jsonc
// packages/shared/package.json
{
  "name": "@acme/shared",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
    },
  },
}
```

### Align module settings with reality

The current [TypeScript docs][8] say modern Node.js packages will usually want `nodenext`, while bundled code will usually want `preserve` or `esnext`. Publishing code checked only under `"moduleResolution": "bundler"` is risky unless your declaration output is bundled appropriately—bundler resolution can accept extensionless relative imports that break in Node.js, and declaration files can preserve those unsafe specifiers.

### Keep source and output separate

Give every package distinct `rootDir` and `outDir` values. TypeScript's [library guidance][10] explicitly notes that for libraries which publish source, a separate output directory is necessary so consumers don't accidentally load `.ts` files instead of `.d.ts` files through extension substitution. That's both a correctness issue and a performance issue.

### Separate concerns into separate projects

Keep tests, generated code, and global declarations in their own projects when possible. This gives you smaller production graphs, narrower ambient contexts, and fewer accidental dependencies from product code into test code.

### Architectural boundaries

In a monorepo, it's _easy_ to accidentally couple domains by reaching into a sibling package's internals. Tools like **`eslint-plugin-boundaries`** or Nx's `@nx/enforce-module-boundaries` let you tag projects (e.g., `type:ui`, `scope:admin`) and programmatically restrict which packages can import from which. We'll dig into this in a later exercise.

### Task orchestration

Tools like **Turborepo** and **Nx** analyze your dependency graph to run tasks in parallel, share build artifacts through remote caching, and support "affected" commands so CI only tests the packages altered by a given pull request. At scale, this is the difference between a 45-minute pipeline and a 5-minute one.

### Single version policy

Keep external dependency versions uniform across all packages. If one package uses React 18 and another uses React 19, you're in for diamond dependency conflicts and mysterious runtime bugs. Tools like **Syncpack** can audit and auto-fix `package.json` files across the repo to enforce version alignment.

## A Default Setup That Ages Well

The setup that tends to survive growth is boring in the best way. Put shared strictness and syntax defaults in a root base config. Put only `references` in a root solution config. Give each package its own `tsconfig` with `composite`, `declaration`, `incremental`, and clear `rootDir`/`outDir` boundaries. Scope `types` tightly. Use real package dependencies and real package exports. For app packages, let the bundler emit and let TypeScript check. For library packages, make declaration quality a first-class concern.

When TypeScript starts to feel slow, resist the urge to hunt for one magical flag. First check how many files got pulled in. Then check whether the pain is in program construction, module resolution, or type checking. Then fix the structure that caused it. That's less glamorous than inventing a seventh layer of generic helper types, but reality has always been hostile to glamour.

[1]: https://www.typescriptlang.org/docs/handbook/project-references.html 'TypeScript: Documentation - Project References'
[2]: https://github.com/microsoft/Typescript/wiki/Performance 'Performance · microsoft/TypeScript Wiki · GitHub'
[3]: https://www.typescriptlang.org/docs/handbook/compiler-options.html 'TypeScript: Documentation - tsc CLI Options'
[4]: https://www.typescriptlang.org/tsconfig/extends.html 'TSConfig Option: extends'
[5]: https://www.typescriptlang.org/tsconfig/isolatedModules.html 'TypeScript: TSConfig Option: isolatedModules'
[6]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html 'TypeScript: Documentation - TypeScript 5.6'
[7]: https://docs.npmjs.com/cli/v7/using-npm/workspaces/ 'workspaces | npm Docs'
[8]: https://www.typescriptlang.org/tsconfig/module 'TypeScript: TSConfig Option: module'
[9]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html 'TypeScript: Documentation - TypeScript 4.7'
[10]: https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html 'TypeScript: Documentation - Modules - Choosing Compiler Options'
