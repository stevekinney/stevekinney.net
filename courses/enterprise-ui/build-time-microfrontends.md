---
title: Build-Time Microfrontends
description: >-
  Build-time microfrontends trade runtime autonomy for package boundaries,
  static imports, and one shipped artifact—when that tradeoff is the right one,
  the result is a modular monolith with better manners instead of a distributed
  system you didn't need.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

Build-time microfrontends are the package-based version of microfrontends. Instead of loading independently deployed slices at runtime, you publish or link each slice as a package and let the shell import them as ordinary dependencies during the application build. Martin Fowler's [microfrontends article][1] describes this exact pattern: each microfrontend is published as a package and the container app includes them as library dependencies. He also calls out the central tradeoff immediately—you get a single deployable JavaScript bundle and can deduplicate common dependencies, but any change in one slice means recompiling and releasing the whole application.

That's why build-time microfrontends are usually closer to a modular monolith with package boundaries than to a fully runtime-composed microfrontend system. [Webpack][2] describes its own job as building a static dependency graph and turning that graph into one or more bundles, while npm and pnpm describe workspaces as one top-level project managing multiple local packages. Once your shell imports every slice and your bundler emits one app, the runtime is basically one application, even if the source tree is cut into many packages.

If what you actually need is independent deployability per slice, then this is the wrong tool. [single-spa's recommended setup][3] emphasizes that each application can be independently developed and deployed, and webpack's Module Federation docs describe runtime consumption of modules from separate builds. Build-time integration doesn't give you that property. It gives you package-level separation and build-time composition instead.

## Where It Makes Sense

Build-time microfrontends make sense when the real problem is code ownership, package boundaries, and team-scale maintainability—not runtime autonomy. They're a good fit when you want separate teams to own vertical slices of a product, but you're still happy shipping one artifact, one SSR/SSG output, one release, and one browser runtime. Fowler's guidance says teams should be organized around vertical business slices, often whole pages, rather than technical layers like styling or validation. single-spa similarly recommends route-based application splits over component-sized fragmentation.

That last point matters more than people admit. If your "microfrontends" are really just `@org/button`, `@org/forms`, and `@org/date-utils`, you don't have microfrontends. You have libraries, which is fine, but let's not put a fake mustache on package management and call it strategy. single-spa explicitly distinguishes route-based applications from utility modules, and it treats things like a component library, shared auth, and global error handling as utility modules, not as the main product slices.

A healthy build-time setup usually looks like one shell plus a small set of domain or route packages, with a few truly shared utility packages beside them.

```text
repo/
  apps/
    shell/
  packages/
    browse-restaurants/
    order-food/
    user-profile/
    design-system/
    auth/
    api-client/
```

That shape lines up with Fowler's page-level slicing and with the common "applications plus utility modules" split described in single-spa guidance.

## The Main Flavors

The monorepo flavor is the simplest and usually the best starting point. [npm workspaces][4] automatically symlink local packages into `node_modules`, and Node's normal module resolution lets the shell consume those workspaces by package name. pnpm has built-in workspace support as well. In practice, that means your shell can import `@acme/order-food` exactly as if it were a published dependency, while local development still uses workspace linking.

A minimal monorepo setup:

```json
// package.json at repo root
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

```json
// apps/shell/package.json
{
  "name": "@acme/shell",
  "dependencies": {
    "@acme/browse-restaurants": "workspace:*",
    "@acme/order-food": "workspace:*",
    "@acme/user-profile": "workspace:*"
  }
}
```

That's just Fowler's build-time package integration applied inside a workspace-aware repository. npm handles the linking, pnpm can make the local-package intent stricter, and the bundler sees an ordinary import graph.

The published-package flavor is the multi-repo or private-registry version of the same idea. Each slice is versioned and published, and the shell depends on semver ranges. At that point, [SemVer][5] stops being optional ceremony and becomes part of the architecture, because the published package boundary is now your product contract.

A hybrid is common in larger organizations: develop slices in a monorepo, but publish selected packages to an internal registry for use by other repos or products. [pnpm's docs][6] say workspace release management is complex enough that it points people to dedicated tools like Changesets or Rush, and Changesets is explicitly designed for monorepo-friendly multi-package versioning with automatic updating of inter-package dependencies.

## The Package Boundary Is the Contract

In build-time microfrontends, the package boundary matters more than the runtime boundary, because the package boundary is the only real boundary left. SemVer says the public API must be declared and clear. [Node's package docs][7] recommend the `exports` field for new packages, and they're explicit that once `exports` is defined, undeclared subpaths are encapsulated and unavailable to importers. Node's publishing guide adds the sharp edge: adding `exports` can be a breaking change because it blocks deep imports that consumers may already be using.

So, the rule is simple: don't let the shell or sibling slices import private files. No `@acme/order-food/src/internal/useSomething`. No `../../packages/foo/lib/private`. Export the entry points you support and nothing else.

```json
{
  "name": "@acme/order-food",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./routes": "./dist/routes.js",
    "./types": "./dist/index.d.ts"
  }
}
```

That's the adult version of package boundaries. `exports` gives you a deliberate surface area, subpath entry points let you expose multiple supported modules, and deep imports stop being an accidental contract.

Module format is another place where teams get sloppy and later discover that packaging was, regrettably, part of the system all along. Node uses the `type` field to decide how `.js` files are interpreted, and its publishing guidance says it's generally best to publish a single format—either CommonJS or ESM, not both. The same guide warns about the **dual-package hazard**: if both the CJS and ESM versions get loaded, you can end up with two instances of what you thought was one package, with separate state and surprising behavior. That's a real edge case for stateful shared packages in build-time microfrontend setups.

## Dependency Strategy

If slices are compiled into one application, shared dependencies still need discipline. In a workspace, npm auto-symlinks packages and pnpm links workspace packages directly, but pnpm also points out an important ambiguity with ordinary semver ranges: without the `workspace:` protocol, a dependency might resolve from the workspace or from the registry depending on what's available. `workspace:` removes that uncertainty and refuses to resolve to anything except a local workspace package. On publish, pnpm rewrites those `workspace:` ranges to normal semver ranges, which makes the resulting package consumable outside the workspace.

For host-provided frameworks like React, treat the relationship like a plugin/host contract. [npm's package docs][8] recommend keeping peer dependency requirements as broad as compatibility really allows, and pnpm has workspace settings specifically for peer resolution. In a pnpm monorepo, `resolvePeersFromWorkspaceRoot` can make every project resolve peers from the workspace root so they all use the same version, and `strictPeerDependencies` can turn bad peer trees into install failures instead of shrugged-at warnings. That's exactly what you want when several slices are supposed to share one framework runtime.

If you use pnpm, [catalogs][9] are a nice extra layer of sanity. They let you define shared version ranges like `react` and `react-dom` once in `pnpm-workspace.yaml`, reference them as `catalog:` in package manifests, and change them in one place later. The benefits are plain: unique versions are easier to maintain, upgrades become one-line edits, and duplicated dependency versions are reduced.

A reasonable package manifest for a host-coupled slice often looks like this:

```json
{
  "name": "@acme/order-food",
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "dependencies": {
    "@acme/design-system": "workspace:*",
    "@acme/api-client": "workspace:*"
  }
}
```

The point is to keep the framework truly shared, while ordinary internal packages remain ordinary dependencies. If you blur that line, duplicate runtimes and peer mismatches become your new hobby.

One hard rule: keep the package graph acyclic. pnpm warns about cyclic workspace dependencies and can be configured to fail installation when cycles exist. Cycles aren't just ugly. They're usually evidence that the slices aren't really slices anymore. They're clumps.

## Build System and TypeScript

Once you split a frontend into packages, the repo needs a real build graph—not one giant "hope TypeScript figures it out" config. [TypeScript project references][10] are specifically designed to split programs into smaller pieces, improve build times, enforce logical separation, and work with `tsc --build`. For build-time microfrontends in TypeScript, that's usually the cleanest way to keep package boundaries honest without turning editor performance into compost.

A small root config often looks like this:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/browse-restaurants" },
    { "path": "./packages/order-food" },
    { "path": "./packages/user-profile" },
    { "path": "./apps/shell" }
  ]
}
```

That doesn't make the frontend a distributed system. It just makes the build understand the same package graph your repo is already trying to express.

## Release Management

Build-time microfrontends usually have two release stories, and teams get burned when they pretend there's only one. One story is the package release story: which slice changed, what semver bump it needs, and whether downstream package versions need updating. The other story is the product release story: when the final shell application is built and shipped. pnpm explicitly says workspace versioning is complex and points people to external tooling, while Changesets is designed around coordinated versioning in multi-package repos and automatic inter-package dependency updates.

This is the part where build-time microfrontends most often reveal what they really are. If every meaningful change still waits for the shell app's release train, you have package modularity, not runtime independence. That's not bad. It's just different. Fowler's warning about lockstep release is the line not to forget.

## Testing and Integration

Because composition happens at build time, the ugly failures are usually package contract failures, not remote-loader or CDN-manifest failures. The highest-value tests are package-level tests inside each slice, shell integration tests that import the real exported entry points, and contract tests around any route or module interfaces that multiple slices rely on. Fowler makes the route-contract version of this point explicitly: when routes become the contract between microfrontends, they should be protected by automated tests.

It's also useful to run a slice package in some kind of standalone preview or example host, but not to trust that preview completely. Fowler warns that simplified standalone development can drift from the real container, especially around shared/global styles and other environmental differences, so you still need regular integration in production-like environments. Replace "container" with "shell app" and the lesson remains exactly the same.

## Where Build-Time Microfrontends Start Breaking

They start breaking when the organization expects independent deployment from a model that fundamentally doesn't provide it. Fowler says the package-based build-time approach forces recompilation and release of every slice for any change and recommends strongly against it for that reason. If the business wants per-slice release cadence, canaries, instant rollbacks, or late-binding runtime composition, package integration isn't enough.

They also start breaking when the slice boundaries are too fine-grained or too chatty. single-spa's guidance is to prefer route-based applications over component-level fragmentation, and it flatly says that if microfrontends are frequently sharing UI state you should consider merging them. Constant shared state is usually the architecture telling you it wanted a larger boundary all along.

And they break when package hygiene is weak. Deep imports create accidental APIs. Ambiguous `type` / `exports` configuration creates module-format bugs. Dual CJS/ESM publishing can load two copies of the same stateful package. Invalid peers let slices silently drift. Workspace cycles tangle ownership. None of these are glamorous problems, but they're the ones that actually hurt package-based architectures in real codebases.

## Build-Time Versus Runtime

The clean distinction is this. Build-time microfrontends give you package boundaries, static imports, one application build, one release artifact, and ordinary bundler behavior. Runtime microfrontends keep multiple builds alive past compilation and compose them in the browser or at runtime. single-spa's recommended setup is based on in-browser ES modules and import maps, where each application can be independently developed and deployed. Webpack describes Module Federation as providing and consuming modules from separate builds at runtime.

Build-time microfrontends optimize for simpler operations and stronger compile-time integration. Runtime microfrontends optimize for autonomy and late binding. single-spa also highlights the runtime advantages directly: common libraries can be downloaded once, lazy loading of applications is straightforward, and teams can deploy on their own schedules. If those are the benefits you need, build-time packages are the wrong answer. If those aren't your bottleneck, runtime composition may just be extra machinery with a heroic marketing budget.

## The Recommendation

Use build-time microfrontends when you want vertical-slice packages, strong API boundaries, maybe multiple teams, and a cleaner codebase—but you're still happy with one shipped artifact. Put them in workspaces, make the package exports explicit, use peer dependencies for host-provided frameworks, keep the graph acyclic, add TypeScript project references, and version the packages like real products.

Don't use build-time microfrontends when the real goal is independent deployment. Fowler already gave the verdict on that: package-based build-time integration reintroduces lockstep release. At that point, stop flattering the package graph and move to runtime composition. Otherwise you haven't built independently deployable frontends. You've built a modular monolith with better manners.

[1]: https://martinfowler.com/articles/micro-frontends.html 'Micro Frontends'
[2]: https://webpack.js.org/concepts/ 'Concepts | webpack'
[3]: https://single-spa.js.org/docs/recommended-setup/ 'The Recommended Setup | single-spa'
[4]: https://docs.npmjs.com/cli/v9/using-npm/workspaces/ 'workspaces | npm Docs'
[5]: https://semver.org/ 'Semantic Versioning 2.0.0'
[6]: https://pnpm.io/workspaces 'Workspace | pnpm'
[7]: https://nodejs.org/api/packages.html 'Modules: Packages | Node.js Documentation'
[8]: https://docs.npmjs.com/cli/v9/configuring-npm/package-json/ 'package.json | npm Docs'
[9]: https://pnpm.io/catalogs 'Catalogs | pnpm'
[10]: https://www.typescriptlang.org/docs/handbook/project-references.html 'TypeScript: Documentation - Project References'
