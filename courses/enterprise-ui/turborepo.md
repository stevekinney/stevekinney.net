---
title: Turborepo
description: >-
  A cache- and graph-aware task runner for JavaScript and TypeScript
  workspaces—how it thinks about packages and tasks, where caching actually
  lives, and the ways teams most reliably sabotage themselves.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

Turborepo is Vercel's build system for JavaScript and TypeScript codebases. It's designed for monorepos, but the [official docs][2] are very clear that it also works for single-package workspaces. One current-version detail is worth getting out of the way immediately: modern Turborepo configuration uses `tasks` in `turbo.json`. If you run into older articles using `pipeline`, you're reading old material, and the official codemods literally include a `rename-pipeline` migration for 2.x. The internet, naturally, remains full of archaeological debris.

Turborepo is also not a package manager, not a replacement for workspaces, and not the thing that resolves dependencies. The official docs say it's built on top of package-manager workspaces, and they say outright that dependency installation, linking, and module resolution are still the package manager's job. Turborepo sits above that layer and optimizes task execution, task ordering, and caching.

## What Turborepo Is Actually For

The shortest accurate definition: Turborepo takes the package graph your workspace already has, lets you define a task graph on top of it, and then runs those tasks as fast as possible through parallelization, dependency-aware ordering, and caching. The [docs describe][3] the package graph as coming from your package manager's internal dependency relationships, and the task graph as the DAG you define in `turbo.json` with `dependsOn`.

That package-graph-first model matters because Turborepo is fundamentally workspace-aware. If `apps/web` depends on `@repo/ui`, and both have a `build` task, then `"dependsOn": ["^build"]` means the UI package's build must complete before the app's build starts. The docs also call out a subtle case called a **transit node**: if an intermediate package doesn't have its own task, Turborepo can still traverse through it to reach dependencies that do. That's why it feels smarter than "run all scripts in all folders" tools.

## The Core Mental Model

A healthy Turborepo starts with an ordinary workspace layout. The [official guidance][4] uses the usual `apps/*` and `packages/*` structure, plus a root `package.json`, a lockfile, and a root `turbo.json`. Turborepo can be added incrementally to an existing repo, and for multi-package workspaces it relies on the workspace definitions your package manager already understands.

A good baseline:

```text
repo/
  apps/
    web/
    docs/
  packages/
    ui/
    utils/
    eslint-config/
    typescript-config/
  package.json
  pnpm-workspace.yaml
  turbo.json
```

That shape isn't mandatory, but it matches the official examples and plays nicely with the way Turborepo thinks about application packages and library packages. The docs also recommend that application packages be the "end" of the package graph, with library or internal packages supporting them rather than the other way around.

## A Good Default Setup

If you want one starting point that will survive contact with reality:

```jsonc
{
  "$schema": "https://turborepo.com/schema.json",
  "globalDependencies": [".env", "tsconfig.base.json"],
  "globalEnv": ["NODE_ENV"],
  "envMode": "strict",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
    },
    "check-types": {
      "dependsOn": ["^check-types"],
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true,
    },
  },
}
```

This works because it models the three things Turborepo cares most about: dependency order, cacheable outputs, and which tasks are intentionally non-cacheable long-running processes. The [docs recommend][5] `dependsOn` for ordering, `outputs` for restoring files on cache hits, and `cache: false` plus `persistent: true` for development servers and other never-ending tasks.

## How Task Orchestration Actually Works

Every key in the root `tasks` object is a task Turborepo can run, and Turborepo looks for scripts with matching names in package `package.json` files. So `turbo run build` means "find every package with a `build` script, then run them according to the task graph." The docs also note that `turbo run` is aliased to `turbo`, though they [recommend][6] using the explicit `turbo run` form in CI to avoid future subcommand naming collisions.

The most important `dependsOn` patterns are simple. `"^build"` means "run this task in dependency packages first." `"build"` means "run another task in the same package first." `"utils#build"` means "run this exact package task first," and you can also target a task itself in the root config like `"web#lint"`. The docs give all three patterns because they are the real vocabulary of the task graph.

Turborepo also parallelizes aggressively. The docs explicitly position this as a key reason it's fast: rather than forcing a repository through one giant serial sequence like "lint everything, then build everything, then test everything," it runs whatever can safely run in parallel and only respects the edges in the task graph where order actually matters.

There are also some advanced task controls that matter a lot in real repos. `persistent: true` marks a task as long-running, which means other tasks can't depend on it because it never exits. `interactive: true` lets it accept terminal input. `interruptible: true` allows a persistent task to be restarted by `turbo watch`. And `with` lets you say "whenever I run this task, also run these other tasks alongside it," which is particularly useful for development servers that should start together.

A common dev configuration:

```jsonc
{
  "tasks": {
    "dev": {
      "persistent": true,
      "cache": false,
      "with": ["api#dev"],
    },
    "test:watch": {
      "persistent": true,
      "interactive": true,
      "interruptible": true,
      "cache": false,
    },
  },
}
```

That setup follows the [official guidance][7] for long-running tasks much better than trying to force `dev` to act like a normal cacheable build step. Turborepo is fast, but it still understands that a server process that never exits is not a normal dependency. Shocking restraint from software, for once.

## Caching Is the Real Feature

The headline feature isn't "monorepo support." It's caching. Turborepo's [caching docs][8] describe caching as restoring task results from a fingerprint of the inputs instead of repeating work, and they're explicit that tasks are assumed to be deterministic. If a task can produce different outputs from inputs Turborepo is unaware of, cache correctness can break. That's the entire game: fast when deterministic, nonsense when sloppy.

Turborepo caches two things: file outputs and logs. File outputs only come back if you tell Turborepo what they are with the `outputs` key. If you omit `outputs` or leave it empty, Turborepo caches no file outputs, only logs. That's one of the most common causes of "cache hits but my build artifacts are missing" confusion. The docs say this very plainly, because apparently many people need to learn it the hard way.

The `inputs` key controls which files contribute to a task's hash. By default, Turborepo uses all files in the package that are checked into source control, and certain files like `package.json`, `turbo.json`, and the lockfile are always considered inputs. If you define `inputs`, you opt out of the default behavior, including `.gitignore` handling, unless you reintroduce it with `$TURBO_DEFAULT$`. That's powerful, but it's also how teams accidentally overfit cache behavior and then spend a week wondering why changes don't invalidate anything.

A careful `inputs` rule often looks like this:

```jsonc
{
  "tasks": {
    "check-types": {
      "inputs": ["$TURBO_DEFAULT$", "!README.md"],
    },
    "spell-check": {
      "inputs": ["**/*.md", "**/*.mdx"],
    },
  },
}
```

That follows the official pattern of starting from the default hash behavior and trimming only what you know shouldn't affect the output. The docs explicitly recommend `$TURBO_DEFAULT$` for that reason.

The local filesystem cache lives in `.turbo/cache` by default. [Remote Caching][9] extends the same idea to other machines and CI so the same task doesn't need to be re-executed separately by every developer, CI job, and deployment machine. The official docs say Vercel Remote Cache works with zero configuration as the default provider, but Turborepo also supports any provider implementing its Remote Cache API and even self-hosted caches.

If you care about artifact integrity, Turborepo also supports [signing remote-cache artifacts][10] with HMAC-SHA256. You enable this with `remoteCache.signature: true` and provide `TURBO_REMOTE_CACHE_SIGNATURE_KEY`; failed verification is treated as a cache miss. One of those features people ignore until the day they suddenly care very much about authenticity.

```jsonc
{
  "remoteCache": {
    "signature": true,
  },
}
```

One newer wrinkle is Git worktree cache sharing, currently documented as pre-release. When no explicit `cacheDir` is set, Turborepo can share local cache between the main worktree and linked worktrees, which improves reuse across branches on the same machine. Set `cacheDir` explicitly and that behavior is disabled.

## Environment Variables Are Where Cache Correctness Lives or Dies

Turborepo's [environment docs][11] are unusually blunt about environment variables because this is where people most reliably poison their caches. The core split is `env` and `globalEnv` for variables that should affect hashing, and `passThroughEnv` and `globalPassThroughEnv` for variables that should be available at runtime but shouldn't change the cache key. `globalEnv` affects all task hashes, while `env` is task-specific.

`envMode` defaults to `"strict"`, which means only explicitly allowed variables are available to task runtime. `"loose"` makes everything available, which is easier during migration but much more dangerous because it makes it easier to restore cached artifacts produced under the wrong environment. The docs explicitly say Loose Mode raises the chance of wrong-environment cache hits, which is a refreshingly direct way of saying "don't be lazy unless you mean it."

**Framework Inference** softens the pain a bit. Turborepo automatically accounts for common framework-prefixed environment variables, so a Next.js package doesn't need you to manually list `NEXT_PUBLIC_*` variables. You can disable framework inference if needed, but the default is on.

For `.env` handling, the docs recommend keeping `.env` files inside the packages that use them rather than at the repository root. That better matches runtime reality and reduces environment leakage across apps. The docs also warn against creating or mutating environment variables during task execution, because Turborepo hashes env state at task start and can't account for mutations that happen afterward.

If you want guardrails, the official [`eslint-plugin-turbo`][13] package flags environment variables used in source code that aren't accounted for in `turbo.json`. Worth using in serious repos because undeclared env vars are one of the most boring ways to make a fast system subtly wrong.

## Packages, Dependencies, and Repository Structure

Turborepo's [official guidance on dependency management][14] is simple and good: install dependencies where they're used, keep very few dependencies in the repository root, and let the package manager do package-manager things. The docs specifically say this improves clarity, allows different packages to evolve dependency versions independently if needed, and avoids unnecessary cache misses from constantly touching the workspace root.

**Internal dependencies** are just workspace packages installed through your package manager's workspace syntax, such as `workspace:*`. Turborepo automatically builds the package graph from these relationships, which is why good `package.json` dependency declarations matter so much. If you lie in `package.json`, the graph lies back.

```jsonc
{
  "name": "web",
  "dependencies": {
    "next": "latest",
    "@repo/ui": "workspace:*",
  },
}
```

The docs also distinguish [application packages from library packages][15]. Application packages are typically your deployable endpoints, often living under `apps/`, and are best treated as the end of the package graph. Library packages are the shared internal packages that support them. That distinction helps keep the graph directional instead of turning your repo into a social network of mutual dependency.

For internal packages, the docs describe three strategies: **Just-in-Time packages**, **Compiled packages**, and **Publishable packages**. [JIT packages][16] export source directly and rely on consuming bundlers to compile them. Compiled packages build themselves with tools like `tsc`. Publishable packages prepare for npm publication. The docs note that JIT packages are low-config but can't have their own Turborepo-cached build step, because there's no build step to cache. They also warn that JIT packages can't use TypeScript `paths` the way people often hope.

For TypeScript internal libraries, the [official docs recommend][17] using `tsc` to compile packages whenever possible instead of bundling, because bundling adds extra complexity and can make downstream debugging harder. They also recommend `declaration` and `declarationMap` for compiled packages so editor go-to-definition works across package boundaries.

## Package Configurations

One root `turbo.json` works for many repos, but not all. Turborepo supports [package-level `turbo.json` files][18] that extend the root configuration with `extends: ["//"]`, and package configs can also extend other packages to share task setup. This is especially useful in mixed-framework repos where one global `outputs` setting would otherwise become a landfill of `.next/**`, `.svelte-kit/**`, and every other framework's leftovers.

```jsonc
// apps/web/turbo.json
{
  "extends": ["//"],
  "tasks": {
    "build": {
      "outputs": [".next/**", "!.next/cache/**"],
    },
    "dev": {
      "cache": false,
      "persistent": true,
    },
  },
}
```

```jsonc
// apps/docs/turbo.json
{
  "extends": ["//", "web"],
  "tasks": {
    "build": {
      "env": ["NEXT_PUBLIC_DOCS_URL"],
    },
  },
}
```

The important nuance is that package-specific `package#task` entries in the root config fully overwrite task configuration, whereas Package Configurations inherit scalar fields and override only what they specify. The official docs increasingly position Package Configurations as the cleaner default for most package-specific behavior.

## Running Less Work

Turborepo's [`run` command][12] is where the practical ergonomics live. `--filter` supports package names, directories, and Git commit ranges, with a small microsyntax language for dependencies, dependents, negation, and commit ranges. `...web` selects dependents, `web...` selects dependencies, `!` removes targets, and commit-based filters use `[]`. It's a little weird at first, then annoyingly useful forever.

`--affected` is the friendlier entry point for change-based execution. The docs say it's equivalent by default to `--filter=...[main...HEAD]`, and they warn that it requires sufficient Git history in the checkout. In shallow CI clones, everything may look changed unless you fetch enough history or adjust `TURBO_SCM_BASE` and `TURBO_SCM_HEAD`.

Some useful examples:

```bash
turbo run build --filter=web
turbo run test --filter=@repo/*{./packages/*}[HEAD^1]
turbo run lint --affected
turbo run web#lint --only
```

All of those patterns are direct extensions of the official filter model, and they're where Turborepo starts paying for itself in larger repositories. It's much nicer to say "run the right work" than to pretend every CI job needs to lovingly recheck the entire universe.

If you want to skip even more work, [`turbo-ignore`][19] exists for the pre-install phase of CI. The docs describe it as a way to determine whether a package or its dependencies have changed, so you can skip expensive setup like container preparation or dependency installation when a later Turborepo run would only hit cache anyway. It's a more advanced optimization, but it becomes very attractive once CI bills start getting theatrical.

## Local Development and Watch Mode

[`turbo watch`][20] is dependency-aware and reruns tasks based on code changes, following the ordering in your task graph. That makes it useful for tasks that need graph-aware restarts rather than just file-local watching. But the docs also say that if your tool already understands dependency changes on its own—like a framework dev server that watches internal packages correctly—you should just use that tool's native watcher and mark the task as `persistent`.

Persistent tasks behave specially in watch mode. Because they don't exit, they can't participate as normal dependency edges. By default they're ignored for restart purposes, and if you want `turbo watch` to restart them, you need `interruptible: true`. The docs also warn that cache writes in watch mode are still experimental behind `--experimental-write-cache`.

There's a nasty edge case here: if a watched task writes files that are checked into source control, watch mode can loop because it sees its own outputs as changes. The docs say Turborepo has some hash-based protections, but they're not foolproof, and the recommended fix is not to keep those task outputs in Git. Sensible advice, which of course many repos will ignore until the fans start spinning.

## CI, Remote Caching, and Docker

The [CI story][19] is straightforward. Remote Caching in CI is enabled by setting `TURBO_TOKEN` and `TURBO_TEAM`, after which your CI machines can read and write the shared cache. The docs recommend leaning on caching first, then layering in filtering and more targeted optimizations later. They also explicitly recommend using `turbo run` in CI and pinning any global `turbo` install to the same major version declared in your repository, especially in cases like `turbo prune` where you may be running before dependencies are installed.

Turborepo's daemon is a local performance optimization and is disabled in CI regardless of config. Useful to know because people love hunting phantom CI differences that are actually just "the daemon isn't there."

For Docker, [`turbo prune`][21] is one of the most valuable commands in the tool. The docs say it generates a partial monorepo for a target package, including the full source of required internal packages, a pruned lockfile, and a copy of the root `package.json`. With `--docker`, it splits the output into `json/` for package manifests and `full/` for full source, which aligns with Docker layer caching so dependency installation and source copying can be separated.

```bash
turbo prune web --docker
```

That split is exactly what you want in container builds. Copy `out/json` and install first, then copy `out/full` and build. The [official Docker guide][22] uses this to avoid invalidating dependency layers for unrelated monorepo changes, which is one of those savings that becomes enormous once you stop pretending every service deserves a fresh lockfile-driven reinstall on every build.

One useful nuance from the docs: `turbo prune` and `pnpm deploy` are not the same thing. `turbo prune` produces a partial monorepo, preserving repo structure for the target package and its internal dependencies. `pnpm deploy` produces a self-contained deployable package with its own `node_modules`. Use the one that matches the thing you're actually trying to ship.

## Debugging and Understanding the Repo

Turborepo has grown a decent introspection toolbox. `--graph` visualizes the task graph for a run. `turbo ls` lists packages and can be filtered just like `run`. `turbo devtools` provides a browser-based package graph visualization. And since 2.2.0, [`turbo query`][3] exposes a GraphQL interface over repository metadata so you can ask questions like which packages are affected, which have a given task, or which packages have too many dependents. That's much better than the old debugging strategy of "stare at the repo and hope revelation occurs."

There's also [`turbo scan`][23], which is basically an interactive performance checklist. The docs say it can help enable Git FS Monitor, the Turborepo daemon, Remote Caching, version checks, and [editor integration][24]. It's not magic, but it's a good sanity pass for a repo that feels slower than it should.

If you care about editor ergonomics, the docs recommend adding the `$schema` key to `turbo.json` so editors can validate and autocomplete configuration. A tiny improvement with a surprisingly good payoff, because hand-writing invalid build-system config is one of humanity's least productive hobbies.

## Boundaries and Governance

Turborepo also has an experimental [`boundaries` command][25]. The docs say it checks two kinds of violations out of the box: importing files outside a package's directory and importing a package that isn't declared in `package.json`. On top of that, you can add package tags and define rules about what tagged packages may depend on or be depended on by.

That's especially relevant in monorepos because repo-local imports make it very easy to cheat. A fast monorepo is nice. A fast monorepo where every package secretly reaches into every other package's private files is just a quicker route to structural decay. Boundaries are experimental, but the problem they address is absolutely real.

## Single-Package Workspaces Are Still Valid

Turborepo is not monorepo-only. The [official single-package guide][26] says the important features still work in single-package repos, including task parallelization and local or remote caching. The features that don't work are mostly the ones that are meaningless without multiple packages, such as package-scoped task identifiers.

This makes Turborepo a reasonable incremental adoption path. The docs say you can add it to an existing single-package or multi-package repo, and in a single-package app it can still orchestrate complex local workflows, parallelize independent checks, and cache expensive tasks. Useful when a repo hasn't become a monorepo yet, but its scripts already resemble a small festival of avoidable repetition.

## The Common Ways Teams Blunt Turborepo

**Treating it like a package manager.** It isn't. The package manager owns dependency installation and resolution; Turborepo builds on top of that. When teams blame Turborepo for workspace-resolution weirdness, they're often aiming at the wrong layer.

**Bad `outputs`.** If cache hits don't restore the files your build needs, the usual cause is that `outputs` is incomplete or missing. The docs call this out repeatedly because it's the most common "cache is broken" report that is actually "config is incomplete."

**Bad environment-variable hygiene.** Strict Mode is the default for a reason. If you use Loose Mode casually, or forget to account for build-affecting env vars in `env` or `globalEnv`, wrong-environment cache hits become much easier. The docs are especially blunt about this in the environment guide.

**Installing too much at the root.** The docs say root-level dependency churn causes unnecessary cache misses and obscures ownership. Keep root dependencies for repo-management tooling, and install app or library dependencies where they're used.

**Confusing JIT packages with free lunch.** JIT internal packages are nice when modern bundlers can consume them, but the docs are clear that they don't have their own Turborepo-cached build step and come with limitations like no TypeScript `paths` in the package itself. They're a trade, not a cheat code.

## When Turborepo Is the Right Answer

Turborepo is a very good fit when you already have a JS or TS workspace and your pain is task orchestration, CI cost, repeated work, or repository-wide developer ergonomics. It's especially good when you want incremental adoption, because the official docs support adding it to existing single-package or multi-package repos instead of forcing a giant migration ritual.

The best way to think about it isn't "a monorepo framework." It's "a cache- and graph-aware task runner for JS/TS workspaces." Once you keep that model straight, the rest becomes much easier: let the package manager manage packages, let Turborepo manage work, and be ruthlessly explicit about outputs, inputs, and environment variables. That's where the speed comes from, and also where teams most reliably sabotage themselves.

[1]: https://turborepo.com/repo/docs 'Introduction | Turborepo'
[2]: https://turborepo.com/docs/getting-started/add-to-existing-repository 'Add to an existing repository | Turborepo'
[3]: https://turborepo.com/repo/docs/core-concepts/package-and-task-graph 'Package and Task Graphs | Turborepo'
[4]: https://turborepo.com/docs/guides/workspaces 'Structuring a repository | Turborepo'
[5]: https://turborepo.com/repo/docs/crafting-your-repository/configuring-tasks 'Configuring tasks | Turborepo'
[6]: https://turborepo.com/repo/docs/reference/configuration 'Configuring turbo.json | Turborepo'
[7]: https://turborepo.com/docs/reference/configuration 'Configuring turbo.json | Turborepo'
[8]: https://turborepo.com/repo/docs/crafting-your-repository/caching 'Caching | Turborepo'
[9]: https://turborepo.com/docs/crafting-your-repository/caching 'Caching | Turborepo'
[10]: https://turborepo.com/repo/docs/core-concepts/remote-caching 'Remote Caching | Turborepo'
[11]: https://turborepo.com/docs/crafting-your-repository/using-environment-variables 'Using environment variables | Turborepo'
[12]: https://turborepo.com/repo/docs/reference/run 'run | Turborepo'
[13]: https://turborepo.com/docs/reference/eslint-plugin-turbo 'eslint-plugin-turbo | Turborepo'
[14]: https://turborepo.com/docs/crafting-your-repository/managing-dependencies 'Managing dependencies | Turborepo'
[15]: https://turborepo.com/docs/core-concepts/package-types 'Package types | Turborepo'
[16]: https://turborepo.com/repo/docs/core-concepts/internal-packages 'Internal Packages | Turborepo'
[17]: https://turborepo.com/docs/guides/tools/typescript 'TypeScript | Turborepo'
[18]: https://turborepo.com/repo/docs/reference/package-configurations 'Package Configurations | Turborepo'
[19]: https://turborepo.com/repo/docs/crafting-your-repository/constructing-ci 'Constructing CI | Turborepo'
[20]: https://turborepo.com/repo/docs/reference/watch 'watch | Turborepo'
[21]: https://turborepo.com/docs/reference/prune 'prune | Turborepo'
[22]: https://turborepo.com/repo/docs/handbook/deploying-with-docker 'Docker | Turborepo'
[23]: https://turborepo.com/repo/docs/reference/scan 'scan | Turborepo'
[24]: https://turborepo.com/docs/getting-started/editor-integration 'Editor integration | Turborepo'
[25]: https://turborepo.com/docs/reference/boundaries 'boundaries | Turborepo'
[26]: https://turborepo.com/docs/guides/single-package-workspaces 'Single-package workspaces | Turborepo'
